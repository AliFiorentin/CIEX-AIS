"""
Indice de primeira cota do raster `cota_mapa.webp` (scripts/gerar_cota_mapa.py).

Modulo novo, sem testes anteriores. Instrucao do usuario: as mascaras brutas por cota de Rio Grande estao em
~/Downloads/pico210524_evolucaoPorCota; o `cota_mapa.webp` desenhava ~34% mais agua que a declarada.
A regra: uma celula do raster so alaga numa cota quando >= 50% dela esta molhada nas mascaras de 1 m, e o
indice guardado e o da PRIMEIRA cota em que isso acontece (maximo acumulado entre cotas).

Precisa de numpy/rasterio (o script os importa no topo); sem eles os testes sao pulados.
"""

import importlib.util
import sys
import unittest
from pathlib import Path

try:
    import numpy as np
    import rasterio  # noqa: F401

    TEM_GEO = True
except ImportError:  # pragma: no cover
    TEM_GEO = False

SCRIPT = Path(__file__).resolve().parent.parent / "gerar_cota_mapa.py"


def _carregar():
    spec = importlib.util.spec_from_file_location("gerar_cota_mapa", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["gerar_cota_mapa"] = mod
    spec.loader.exec_module(mod)
    return mod


@unittest.skipUnless(TEM_GEO, "numpy/rasterio nao instalados")
class IndicePrimeiraCota(unittest.TestCase):
    def setUp(self):
        self.mod = _carregar()

    def f(self, *valores):
        return np.array([valores], dtype=np.float32)  # 1 x N

    def test_celula_seca_em_todas_as_cotas_e_zero(self):
        out = self.mod.indice_primeira_cota([self.f(0.0), self.f(0.0)])
        self.assertEqual(out.tolist(), [[0]])

    def test_indice_e_o_da_primeira_cota_molhada(self):
        out = self.mod.indice_primeira_cota([self.f(0, 0, 1), self.f(0, 1, 1), self.f(0, 1, 1)])
        self.assertEqual(out.tolist(), [[0, 2, 1]])

    def test_celula_que_seca_depois_continua_com_a_primeira_cota(self):
        # molhada na cota 1 e seca na 2 (raster nao monotonico): maximo acumulado mantem 1
        out = self.mod.indice_primeira_cota([self.f(1.0), self.f(0.0)])
        self.assertEqual(out.tolist(), [[1]])

    def test_limiar_de_cinquenta_por_cento_e_inclusivo(self):
        out = self.mod.indice_primeira_cota([self.f(0.49, 0.5, 0.51)])
        self.assertEqual(out.tolist(), [[0, 1, 1]])

    def test_um_pixel_molhado_em_varios_nao_alaga_a_celula(self):
        # regressao do max-pool: 1 pixel de 16 (fracao 0,0625) nao pode molhar a celula
        out = self.mod.indice_primeira_cota([self.f(1 / 16)])
        self.assertEqual(out.tolist(), [[0]])

    def test_tipo_uint8_e_forma_preservada(self):
        out = self.mod.indice_primeira_cota([np.zeros((3, 4), np.float32)])
        self.assertEqual(out.dtype, np.uint8)
        self.assertEqual(out.shape, (3, 4))

    def test_sem_cotas_levanta_erro(self):
        with self.assertRaises(ValueError):
            self.mod.indice_primeira_cota([])


@unittest.skipUnless(TEM_GEO, "numpy/rasterio nao instalados")
class NomeDaPasta(unittest.TestCase):
    def setUp(self):
        self.mod = _carregar()

    def test_nomes_das_pastas_de_cota(self):
        self.assertEqual(self.mod.pasta_da_cota(1.0), "100cm")
        self.assertEqual(self.mod.pasta_da_cota(2.5), "250cm")
        self.assertEqual(self.mod.pasta_da_cota(2.6215), "262_15cm")


if __name__ == "__main__":
    unittest.main()
