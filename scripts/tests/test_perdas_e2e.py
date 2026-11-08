"""
Ponta a ponta de scripts/calcular_perdas_rio_grande.py (so stdlib).

Dois testes diferentes:
  1. Sintetico: ATINGIDOS minusculos em pasta temporaria, com o resultado calculado a mao (VAB por labor share,
     DaLA, VAAT por dia letivo contado em dobro, producao SUS, coeficiente agricola) para os 4 cenarios.
  2. Dados reais: recalcula as perdas a partir dos ATINGIDOS publicados e compara com perdas_operacionais.json.
     Pega o desvio entre os dados servidos e os totais exibidos em /danos (como o do 16/05 apos corrigir a mancha).

Instrucao do usuario: "implemente ... testes ponta a ponta" para o calculo de perdas.
"""

import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "calcular_perdas_rio_grande.py"
spec = importlib.util.spec_from_file_location("calcular_perdas_e2e", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

DADOS_REAIS = SCRIPT.parent.parent / "public" / "dados_convertidos"
SLUGS = {
    "Cenário Setembro 2023": "cenario_setembro_2023",
    "Cenário Maio 2024": "cenario_maio_2024",
    "Cenário Maio 2024 + 50%": "cenario_maio_2024_50",
    "Nível da Lagoa + Chuva Acumulada – 16/05/2024": "nivel_da_lagoa_chuva_acumulada_16_05_2024",
}


def _fc(props_lista):
    return {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": None, "properties": p} for p in props_lista]}


class Ambiente:
    """Troca DASH_DATA e SUS_INDEX_PATH do modulo por uma pasta temporaria (e restaura ao sair)."""

    def __init__(self, raiz: Path, sus: Path):
        self.raiz, self.sus = raiz, sus

    def __enter__(self):
        self.o = (mod.DASH_DATA, mod.SUS_INDEX_PATH)
        mod.DASH_DATA, mod.SUS_INDEX_PATH = self.raiz, self.sus
        return self

    def __exit__(self, *a):
        mod.DASH_DATA, mod.SUS_INDEX_PATH = self.o


class Sintetico(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        raiz = Path(self.tmp.name)
        pasta = raiz / mod.SLUG / "cenarios"
        pasta.mkdir(parents=True)
        for slug in SLUGS.values():
            # 1 empresa industrial com folha de R$ 1.000/mes; 1 escola com 100 matriculas; 1 unidade de saude
            (pasta / f"empresas_ATINGIDOS_{mod.SLUG}___{slug}.geojson").write_text(
                json.dumps(_fc([{"massa_salarial": 1000, "cnae_classe": 25000}])), encoding="utf-8")
            (pasta / f"educacao_ATINGIDOS_{mod.SLUG}___{slug}.geojson").write_text(
                json.dumps(_fc([{"qtd_matri_fund": 60, "qtd_matri_med": 40}])), encoding="utf-8")
            (pasta / f"saude_ATINGIDOS_{mod.SLUG}___{slug}.geojson").write_text(
                json.dumps(_fc([{"co_cnes": "123456"}])), encoding="utf-8")
            (pasta / f"agricultura_stats_{mod.SLUG}___{slug}.json").write_text(json.dumps({"Arroz": 10}), encoding="utf-8")
        self.sus = raiz / "sus.json"
        self.sus.write_text(json.dumps({"0123456": 36500.0}), encoding="utf-8")  # producao SUS anual
        self.raiz = raiz

    def tearDown(self):
        self.tmp.cleanup()

    def rodar(self, **kw):
        with Ambiente(self.raiz, self.sus):
            return mod.calcular_perdas(**kw)["Rio Grande"]

    def test_maio_2024_bate_com_a_conta_a_mao(self):
        r = self.rodar()["Cenário Maio 2024"]
        f = (30 + 60 * 0.5) / 365
        self.assertAlmostEqual(r["f_interrup"], f, places=6)
        self.assertEqual((r["dias_agudo"], r["dias_efetivos"]), (30, 60))
        self.assertAlmostEqual(r["empresas_vab"], 1000 * 12 / 0.338 * f, places=2)
        edu = 100 * (8481.21 / 200) * 30
        self.assertAlmostEqual(r["educacao_perdas"], edu, places=2)
        self.assertAlmostEqual(r["educacao_custo_adicional"], edu, places=2)  # contada em dobro, por desenho
        self.assertAlmostEqual(r["saude_producao"], 36500.0 * f, places=2)
        self.assertEqual(r["agricultura_perdas"], 10 * 1100)
        self.assertAlmostEqual(
            r["total"], r["empresas_vab"] + 2 * r["educacao_perdas"] + r["saude_producao"] + r["agricultura_perdas"], places=1)

    def test_setembro_2023_usa_periodo_e_coeficiente_proprios(self):
        r = self.rodar()["Cenário Setembro 2023"]
        f = (15 + 30 * 0.5) / 365
        self.assertEqual((r["dias_agudo"], r["dias_efetivos"]), (15, 30))
        self.assertAlmostEqual(r["empresas_vab"], 1000 * 12 / 0.338 * f, places=2)
        self.assertAlmostEqual(r["educacao_perdas"], 100 * (8481.21 / 200) * 15, places=2)
        self.assertEqual(r["agricultura_perdas"], 10 * 250)  # arroz em Setembro: R$ 250/ha

    def test_mais_50_e_16_05_usam_os_parametros_de_maio_2024(self):
        res = self.rodar()
        for cen in ("Cenário Maio 2024 + 50%", "Nível da Lagoa + Chuva Acumulada – 16/05/2024"):
            with self.subTest(cenario=cen):
                self.assertEqual(res[cen]["dias_efetivos"], 60)
                self.assertEqual(res[cen]["agricultura_perdas"], 10 * 1100)

    def test_modo_dias_plano_usa_f_e_metade_de_dias_agudos(self):
        r = self.rodar(dias=30)["Cenário Maio 2024"]
        self.assertAlmostEqual(r["f_interrup"], 30 / 365, places=6)
        self.assertEqual(r["dias_efetivos"], 30)
        self.assertEqual(r["dias_agudo"], 15)  # N/2, so a educacao usa
        self.assertAlmostEqual(r["educacao_perdas"], 100 * (8481.21 / 200) * 15, places=2)
        self.assertTrue((self.raiz / "perdas_operacionais_sens_30d.json").exists())

    def test_grava_o_json_com_os_4_cenarios(self):
        self.rodar()
        dados = json.loads((self.raiz / "perdas_operacionais.json").read_text(encoding="utf-8"))
        self.assertEqual(sorted(dados["Rio Grande"]), sorted(SLUGS))

    def test_arquivo_ausente_zera_o_componente_sem_quebrar(self):
        os.remove(self.raiz / mod.SLUG / "cenarios" / f"saude_ATINGIDOS_{mod.SLUG}___cenario_maio_2024.geojson")
        r = self.rodar()["Cenário Maio 2024"]
        self.assertEqual(r["saude_producao"], 0)
        self.assertGreater(r["empresas_vab"], 0)


@unittest.skipUnless((DADOS_REAIS / "perdas_operacionais.json").exists(), "dados reais ausentes")
class DadosReais(unittest.TestCase):
    """O JSON servido ao /danos tem de ser o que sai dos ATINGIDOS publicados."""

    def test_perdas_publicadas_batem_com_o_recalculo(self):
        publicado = json.loads((DADOS_REAIS / "perdas_operacionais.json").read_text(encoding="utf-8"))["Rio Grande"]
        with tempfile.TemporaryDirectory() as tmp:
            raiz = Path(tmp)
            os.symlink(DADOS_REAIS / "rio_grande", raiz / "rio_grande")  # entrada somente leitura
            with Ambiente(raiz, mod.ROOT / "scripts" / "data" / "producao_sus_por_cnes_rio_grande.json"):
                recalculado = mod.calcular_perdas()["Rio Grande"]
        for cen in SLUGS:
            for campo in ("empresas_vab", "educacao_perdas", "educacao_custo_adicional", "saude_producao",
                          "agricultura_perdas", "total"):
                with self.subTest(cenario=cen, campo=campo):
                    self.assertAlmostEqual(recalculado[cen][campo], publicado[cen][campo], delta=0.02)

    def test_total_e_a_soma_dos_componentes(self):
        publicado = json.loads((DADOS_REAIS / "perdas_operacionais.json").read_text(encoding="utf-8"))["Rio Grande"]
        for cen, v in publicado.items():
            with self.subTest(cenario=cen):
                soma = v["empresas_vab"] + v["educacao_perdas"] + v["educacao_custo_adicional"] + v["saude_producao"] + v["agricultura_perdas"]
                self.assertAlmostEqual(v["total"], soma, delta=0.05)


if __name__ == "__main__":
    unittest.main()
