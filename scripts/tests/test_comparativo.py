"""
Comparativo do dano evitado (scripts/gerar_comparativo_intervencoes.py): evitado = baseline - intervencao,
percentual nulo com baseline 0, consistencia das perdas e exposicao calculada a mao. So stdlib + shapely.

Os 12 cenarios sao sinteticos: o baseline tem 3 pontos por setor, `diques` 1 e `diques-barragens` 2.
"""

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

try:
    import shapely  # noqa: F401

    TEM_SHAPELY = True
except ImportError:  # pragma: no cover
    TEM_SHAPELY = False

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))
if TEM_SHAPELY:
    import cenarios_intervencao as ci  # noqa: E402

    spec = importlib.util.spec_from_file_location("gerar_comparativo", SCRIPTS / "gerar_comparativo_intervencoes.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

INSIDE = [-52.10, -32.03]
N_POR_VARIANTE = {"sem-intervencao": 3, "diques": 1, "diques-barragens": 2}
VALOR_EMPRESA = 10 * 9 * 2604.24 * 2.0  # 10 vinculos, setor comercial


def _fc(features):
    return {"type": "FeatureCollection", "features": features}


def _pt(**props):
    return {"type": "Feature", "geometry": {"type": "Point", "coordinates": INSIDE}, "properties": props}


@unittest.skipUnless(TEM_SHAPELY, "precisa de shapely")
class TestComparar(unittest.TestCase):
    def test_comparar_caso_a_mao(self):
        r = mod.comparar(298.0, 159.0)
        self.assertEqual(r["valor"], 139.0)
        self.assertAlmostEqual(r["pct"], 139.0 / 298.0, places=5)

    def test_baseline_zero_pct_nulo(self):
        self.assertEqual(mod.comparar(0, 0), {"valor": 0, "pct": None})
        r = mod.comparar(0, 3)
        self.assertEqual(r["valor"], -3)
        self.assertIsNone(r["pct"])

    def test_evitado_negativo_mantido(self):
        r = mod.comparar(158.7, 161.9)
        self.assertLess(r["valor"], 0)
        self.assertLess(r["pct"], 0)


@unittest.skipUnless(TEM_SHAPELY, "precisa de shapely")
class TestMontar(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        raiz = Path(self.tmp.name)
        self.cen = raiz / "cenarios"
        self.cen.mkdir()
        meta, perdas = {}, {"Rio Grande": {}}
        for e, v in ci.todos():
            n = N_POR_VARIANTE[v]
            slug = ci.scenario_slug(ci.nome_cenario(e, v))
            self._gj(f"empresas_ATINGIDOS_{slug}.geojson", [_pt(qtd_vinculos=10, massa_salarial=1000.0, setor="COMERCIO") for _ in range(n)])
            self._gj(f"educacao_ATINGIDOS_{slug}.geojson", [_pt(qtd_mat_total=100, qtd_mat_fundamental=644) for _ in range(n)])
            self._gj(f"saude_ATINGIDOS_{slug}.geojson", [_pt(qtd_profissionais=6, leitos_total=4, co_cnes=str(i)) for i in range(n)])
            self._gj(f"patrimonio_ATINGIDOS_{slug}.geojson", [_pt(nome=f"p{i}") for i in range(n)])
            (self.cen / f"infra_stats_{slug}.json").write_text(
                json.dumps({"Logradouros": {"ruas_atingidas": 10 * n}, "Quadras": {"atingidas": 5 * n}}), encoding="utf-8")
            meta[slug] = {"area_ha": 100.0 * n, "prof_max_cm": 50.0 + n, "area_por_faixa_ha": {"10-44": 60.0 * n, "45-64": 40.0 * n}, "bounds": [0, 0, 1, 1]}
            nome = ci.nome_cenario(e, v)
            perdas["Rio Grande"][nome] = {
                "dias_agudo": 30, "dias_efetivos": 60, "f_interrup": 0.16,
                "empresas_vab": 1000.0 * n, "educacao_perdas": 200.0 * n, "educacao_custo_adicional": 200.0 * n,
                "saude_producao": 50.0 * n, "agricultura_perdas": 10.0 * n,
                "total": 1000.0 * n + 400.0 * n + 50.0 * n + 10.0 * n,
            }
        self.meta = raiz / "meta.json"
        self.meta.write_text(json.dumps(meta), encoding="utf-8")
        self.perdas = raiz / "perdas_intervencoes.json"
        self.perdas.write_text(json.dumps(perdas), encoding="utf-8")
        self.sinal = raiz / "EXPOSICAO_INDISPONIVEL"
        self._orig = (mod.CENARIOS_DIR, mod.META_PATH, mod.PERDAS_PATH, mod.SINAL_EXPOSICAO_INDISPONIVEL)
        mod.CENARIOS_DIR, mod.META_PATH, mod.PERDAS_PATH, mod.SINAL_EXPOSICAO_INDISPONIVEL = self.cen, self.meta, self.perdas, self.sinal

    def tearDown(self):
        mod.CENARIOS_DIR, mod.META_PATH, mod.PERDAS_PATH, mod.SINAL_EXPOSICAO_INDISPONIVEL = self._orig
        self.tmp.cleanup()

    def _gj(self, nome, feats):
        (self.cen / nome).write_text(json.dumps(_fc(feats)), encoding="utf-8")

    def test_json_tem_12_conjuntos(self):
        r = mod.montar()
        self.assertEqual(r["limiar_cm"], 10)
        self.assertEqual(sorted(r["eventos"]), ["2023-09-29", "2023-11-29", "2024-05-21", "2025-06-28"])
        for ev in r["eventos"].values():
            self.assertEqual(sorted(ev["variantes"]), ["diques", "diques-barragens", "sem-intervencao"])
            self.assertEqual(sorted(ev["evitado"]), ["diques", "diques-barragens"])

    def test_flags_de_disponibilidade(self):
        r = mod.montar()
        self.assertTrue(r["exposicao_disponivel"])
        self.assertFalse(r["populacao_disponivel"])

    def test_indicadores_contagens_e_somas(self):
        i = mod.montar()["eventos"]["2023-09-29"]["variantes"]["sem-intervencao"]
        self.assertEqual(i["empresas"], 3)
        self.assertEqual(i["vinculos"], 30)
        self.assertEqual(i["massa_salarial"], 3000.0)
        self.assertEqual(i["escolas"], 3)
        self.assertEqual(i["matriculas"], 300)
        self.assertEqual(i["unidades_saude"], 3)
        self.assertEqual(i["patrimonio"], 3)
        self.assertEqual(i["logradouros"], 30)
        self.assertEqual(i["quadras"], 15)
        self.assertEqual(i["area_ha"], 300.0)
        self.assertEqual(i["area_por_faixa_ha"], {"10-44": 180.0, "45-64": 120.0})

    def test_evitado_a_mao(self):
        ev = mod.montar()["eventos"]["2023-09-29"]["evitado"]
        self.assertEqual(ev["diques"]["empresas"], {"valor": 2, "pct": round(2 / 3, 6)})
        self.assertEqual(ev["diques"]["area_ha"]["valor"], 200.0)
        self.assertEqual(ev["diques-barragens"]["empresas"]["valor"], 1)

    def test_perdas_total_consistente(self):
        ev = mod.montar()["eventos"]["2023-09-29"]["evitado"]["diques"]
        componentes = sum(ev[k]["valor"] for k in ("perdas_empresas", "perdas_educacao", "perdas_saude", "perdas_agricultura"))
        self.assertAlmostEqual(ev["perdas_total"]["valor"], componentes, places=2)
        self.assertEqual(ev["perdas_educacao"]["valor"], 2 * (200.0 + 200.0))  # perdas + custo adicional

    def test_exposicao_calculada_a_mao(self):
        v = mod.montar()["eventos"]["2023-09-29"]["variantes"]
        self.assertAlmostEqual(v["sem-intervencao"]["exposicao_empresas"], 3 * VALOR_EMPRESA, places=2)
        self.assertAlmostEqual(v["diques"]["exposicao_empresas"], 1 * VALOR_EMPRESA, places=2)
        ev = mod.montar()["eventos"]["2023-09-29"]["evitado"]["diques"]
        self.assertAlmostEqual(ev["exposicao_empresas"]["valor"], 2 * VALOR_EMPRESA, places=2)
        soma = sum(ev[k]["valor"] for k in ("exposicao_empresas", "exposicao_educacao", "exposicao_saude"))
        self.assertAlmostEqual(ev["exposicao_total"]["valor"], soma, places=2)

    def test_sinal_desliga_a_exposicao(self):
        self.sinal.write_text("x", encoding="utf-8")
        r = mod.montar()
        self.assertFalse(r["exposicao_disponivel"])
        for ev in r["eventos"].values():
            for v in ev["variantes"].values():
                self.assertNotIn("exposicao_total", v)

    def test_arquivo_ausente_falha_claro(self):
        slug = ci.scenario_slug(ci.nome_cenario("2023-09-29", "diques"))
        (self.cen / f"empresas_ATINGIDOS_{slug}.geojson").unlink()
        with self.assertRaises(FileNotFoundError) as cm:
            mod.montar()
        self.assertIn("empresas_ATINGIDOS", str(cm.exception))


if __name__ == "__main__":
    unittest.main()
