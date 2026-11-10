"""
Dias DaLA interpolados pela area (calcular_perdas_rio_grande.py): a funcao, as constantes de Novembro de 2023 e Junho
de 2025 e a conferencia com as areas reais das simulacoes sem intervencao (scripts/data/intervencoes_mancha_meta.json).
So stdlib; o modulo de perdas precisa de shapely/geopandas, entao o teste e pulado sem eles.
"""

import importlib.util
import json
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))

try:
    import cenarios_intervencao as ci  # noqa: E402

    spec = importlib.util.spec_from_file_location("calcular_perdas", SCRIPTS / "calcular_perdas_rio_grande.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    TEM_MODULO = True
except ImportError:  # pragma: no cover
    TEM_MODULO = False

META = SCRIPTS / "data" / "intervencoes_mancha_meta.json"


@unittest.skipUnless(TEM_MODULO, "precisa das dependencias do calculo de perdas")
class TestDalaInterpolado(unittest.TestCase):
    def test_referencias_dao_os_parametros_originais(self):
        (a0, _), (a1, _) = mod.DALA_REF
        self.assertEqual(mod.dias_dala_interpolados(a0), mod.INTERRUPCAO_DALA["setembro_2023"])
        self.assertEqual(mod.dias_dala_interpolados(a1), mod.INTERRUPCAO_DALA["maio_2024"])

    def test_agudo_mais_metade_da_recuperacao_fecha_os_dias_efetivos(self):
        for area in (200.0, 253.6, 352.2, 500.0):
            p = mod.dias_dala_interpolados(area)
            efetivos = p["dias_agudo"] + p["dias_recuperacao"] / 2
            (a0, d0), (a1, d1) = mod.DALA_REF
            self.assertEqual(efetivos, round(d0 + (area - a0) / (a1 - a0) * (d1 - d0)))

    def test_monotono_na_area(self):
        dias = [mod.dias_dala_interpolados(a)["dias_agudo"] for a in (150, 250, 350, 450, 550, 650)]
        self.assertEqual(dias, sorted(dias))

    def test_constantes_batem_com_as_areas_reais(self):
        meta = json.loads(META.read_text(encoding="utf-8"))
        for evento, periodo in (("2023-11-29", "novembro_2023"), ("2025-06-28", "junho_2025")):
            area = meta[ci.scenario_slug(ci.nome_cenario(evento, "sem-intervencao"))]["area_ha"]
            self.assertEqual(mod.dias_dala_interpolados(area), mod.INTERRUPCAO_DALA[periodo], evento)

    def test_referencias_batem_com_as_areas_reais(self):
        meta = json.loads(META.read_text(encoding="utf-8"))
        for evento, ref in (("2023-09-29", mod.DALA_REF[0][0]), ("2024-05-21", mod.DALA_REF[1][0])):
            area = meta[ci.scenario_slug(ci.nome_cenario(evento, "sem-intervencao"))]["area_ha"]
            self.assertAlmostEqual(area, ref, places=3, msg=evento)


if __name__ == "__main__":
    unittest.main()
