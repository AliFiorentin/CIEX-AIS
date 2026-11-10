"""
Perdas operacionais (DaLA) dos 12 cenarios de intervencao em scripts/calcular_perdas_rio_grande.py (so stdlib).

Sinteticos, em pasta temporaria: periodo DaLA por evento, total = soma dos componentes, arquivo de saida proprio
(perdas_intervencoes.json) e perdas_operacionais.json intocado.
"""

import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location("calcular_perdas_intervencoes", SCRIPTS / "calcular_perdas_rio_grande.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

import cenarios_intervencao as ci  # noqa: E402

REAL = SCRIPTS.parent / "public" / "dados_convertidos" / "perdas_operacionais.json"
COMPONENTES = ("empresas_vab", "educacao_perdas", "educacao_custo_adicional", "saude_producao", "agricultura_perdas")


def _fc(props_lista):
    return {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": None, "properties": p} for p in props_lista]}


class Ambiente:
    def __init__(self, raiz: Path, sus: Path):
        self.raiz, self.sus = raiz, sus

    def __enter__(self):
        self.o = (mod.DASH_DATA, mod.SUS_INDEX_PATH)
        mod.DASH_DATA, mod.SUS_INDEX_PATH = self.raiz, self.sus
        return self

    def __exit__(self, *a):
        mod.DASH_DATA, mod.SUS_INDEX_PATH = self.o


class TestPerdasIntervencoes(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.raiz = Path(self.tmp.name)
        pasta = self.raiz / mod.SLUG / "cenarios"
        pasta.mkdir(parents=True)
        for e, v in ci.todos():
            slug = ci.slug_cenario(e, v)
            (pasta / f"empresas_ATINGIDOS_{mod.SLUG}___{slug}.geojson").write_text(
                json.dumps(_fc([{"massa_salarial": 1000, "cnae_classe": 25000}])), encoding="utf-8")
            (pasta / f"educacao_ATINGIDOS_{mod.SLUG}___{slug}.geojson").write_text(
                json.dumps(_fc([{"qtd_matri_fund": 60, "qtd_matri_med": 40}])), encoding="utf-8")
            (pasta / f"saude_ATINGIDOS_{mod.SLUG}___{slug}.geojson").write_text(
                json.dumps(_fc([{"co_cnes": "123456"}])), encoding="utf-8")
            (pasta / f"agricultura_stats_{mod.SLUG}___{slug}.json").write_text(json.dumps({"Arroz": 10}), encoding="utf-8")
        self.sus = self.raiz / "sus.json"
        self.sus.write_text(json.dumps({"0123456": 36500.0}), encoding="utf-8")
        self.nomes = [ci.nome_cenario(e, v) for e, v in ci.todos()]

    def tearDown(self):
        self.tmp.cleanup()

    def rodar(self, **kw):
        with Ambiente(self.raiz, self.sus):
            return mod.calcular_perdas(cenarios=self.nomes, arquivo="perdas_intervencoes.json", **kw)

    def test_periodo_por_evento(self):
        self.assertEqual(mod.CENARIO_PERIODO["simulacao_de_setembro_de_2023_diques"], "setembro_2023")
        esperado = {"novembro_de_2023": "novembro_2023", "maio_de_2024": "maio_2024", "junho_de_2025": "junho_2025"}
        for data, periodo in esperado.items():
            for variante in ("sem_intervencao", "diques", "diques_barragens"):
                self.assertEqual(mod.CENARIO_PERIODO[f"simulacao_de_{data}_{variante}"], periodo)

    def test_periodo_dala_aplicado_aos_resultados(self):
        r = self.rodar()["Rio Grande"]
        self.assertEqual(r[ci.nome_cenario("2023-09-29", "diques")]["dias_agudo"], 15)
        self.assertEqual(r[ci.nome_cenario("2023-11-29", "diques")]["dias_agudo"], 16)
        self.assertEqual(r[ci.nome_cenario("2024-05-21", "diques")]["dias_agudo"], 30)
        self.assertEqual(r[ci.nome_cenario("2025-06-28", "diques")]["dias_agudo"], 12)

    def test_total_e_soma_dos_componentes(self):
        r = self.rodar()["Rio Grande"]
        self.assertEqual(sorted(r), sorted(self.nomes))
        for nome, v in r.items():
            # cada componente e arredondado a 2 casas antes do total: a soma pode diferir em alguns centavos
            self.assertAlmostEqual(v["total"], sum(v[c] for c in COMPONENTES), delta=0.03, msg=nome)
            self.assertGreater(v["total"], 0, nome)

    def test_grava_perdas_intervencoes_json_e_nao_perdas_operacionais(self):
        self.rodar()
        self.assertTrue((self.raiz / "perdas_intervencoes.json").exists())
        self.assertFalse((self.raiz / "perdas_operacionais.json").exists())
        gravado = json.loads((self.raiz / "perdas_intervencoes.json").read_text(encoding="utf-8"))
        self.assertEqual(sorted(gravado["Rio Grande"]), sorted(self.nomes))

    def test_sensibilidade_mantem_o_prefixo_do_arquivo(self):
        self.rodar(dias=30)
        self.assertTrue((self.raiz / "perdas_intervencoes_sens_30d.json").exists())

    def test_perdas_operacionais_inalterado(self):
        antes = hashlib.sha256(REAL.read_bytes()).hexdigest()
        self.rodar()
        self.assertEqual(hashlib.sha256(REAL.read_bytes()).hexdigest(), antes)

    def test_cenarios_padrao_continuam_sendo_os_4_antigos(self):
        self.assertEqual(len(mod.CENARIOS), 4)
        self.assertEqual(sorted(json.loads(REAL.read_text(encoding="utf-8"))["Rio Grande"]), sorted(mod.CENARIOS))


if __name__ == "__main__":
    unittest.main()
