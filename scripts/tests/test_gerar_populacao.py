"""
Mescla de cenarios em populacao_atingida.json (scripts/gerar_populacao_atingida.py).

Regressao: o script fazia `rg["cenarios"] = novos_cenarios`, apagando do JSON todo cenario que nao
fosse recalculado na rodada (mancha ausente, raster so parcial...). A mescla preserva os existentes.

Precisa de geopandas/rasterio (o script os importa no topo); sem eles os testes sao pulados.
"""

import importlib.util
import sys
import unittest
from pathlib import Path

try:
    import geopandas  # noqa: F401
    import rasterio  # noqa: F401

    TEM_GEO = True
except ImportError:  # pragma: no cover
    TEM_GEO = False

SCRIPT = Path(__file__).resolve().parent.parent / "gerar_populacao_atingida.py"


def _carregar():
    spec = importlib.util.spec_from_file_location("gerar_populacao_atingida", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["gerar_populacao_atingida"] = mod
    spec.loader.exec_module(mod)
    return mod


@unittest.skipUnless(TEM_GEO, "geopandas/rasterio nao instalados")
class MesclarCenarios(unittest.TestCase):
    def setUp(self):
        self.mod = _carregar()

    def test_cenario_nao_recalculado_e_preservado(self):
        existentes = {
            "Cenario Maio 2024": {"pop_atingida": 23058, "pct_atingida": 11.6},
            "Cenario Setembro 2023": {"pop_atingida": 7844, "pct_atingida": 4.0},
        }
        novos = {"Cenario Maio 2024": {"pop_atingida": 24000, "pct_atingida": 12.1}}
        out = self.mod.mesclar_cenarios(existentes, novos)
        self.assertEqual(out["Cenario Setembro 2023"], {"pop_atingida": 7844, "pct_atingida": 4.0})
        self.assertEqual(out["Cenario Maio 2024"]["pop_atingida"], 24000)

    def test_cenario_novo_e_adicionado(self):
        out = self.mod.mesclar_cenarios({"A": {"pop_atingida": 1}}, {"B": {"pop_atingida": 2}})
        self.assertEqual(sorted(out), ["A", "B"])

    def test_nao_altera_os_dicionarios_de_entrada(self):
        existentes = {"A": {"pop_atingida": 1}}
        self.mod.mesclar_cenarios(existentes, {"B": {"pop_atingida": 2}})
        self.assertEqual(list(existentes), ["A"])

    def test_sem_cenarios_existentes(self):
        self.assertEqual(self.mod.mesclar_cenarios(None, {"B": {"pop_atingida": 2}}), {"B": {"pop_atingida": 2}})


if __name__ == "__main__":
    unittest.main()
