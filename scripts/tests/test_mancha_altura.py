"""
Reducao de resolucao da mascara da mancha de 16/05/2024 (scripts/converter_manchas_altura.py::downsample_mask).

Regressao: a reducao 4x4 usava max-pool (`any`): um bloco de 16 pixels virava "molhado" com um unico pixel
molhado, inflando a mancha (7,05 km2 contra 5,79 km2 pelo limiar bruto). Agora vota por maioria (>= 50%).

Modulo existente (converter_manchas_altura.py), sem testes anteriores; instrucao do usuario: arrumar a mancha
do 16/05 (C21/C22). Precisa de geopandas/rasterio (o script os importa no topo); sem eles os testes sao pulados.
"""

import importlib.util
import sys
import unittest
from pathlib import Path

try:
    import geopandas  # noqa: F401
    import numpy as np
    import rasterio  # noqa: F401

    TEM_GEO = True
except ImportError:  # pragma: no cover
    TEM_GEO = False

SCRIPT = Path(__file__).resolve().parent.parent / "converter_manchas_altura.py"


def _carregar():
    sys.path.insert(0, str(SCRIPT.parent))
    spec = importlib.util.spec_from_file_location("converter_manchas_altura", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["converter_manchas_altura"] = mod
    spec.loader.exec_module(mod)
    return mod


@unittest.skipUnless(TEM_GEO, "geopandas/rasterio nao instalados")
class DownsampleMask(unittest.TestCase):
    def setUp(self):
        self.mod = _carregar()

    def test_um_pixel_molhado_em_16_nao_molha_o_bloco(self):
        m = np.zeros((4, 4), dtype=bool)
        m[0, 0] = True
        self.assertFalse(self.mod.downsample_mask(m, 4)[0, 0])

    def test_metade_ou_mais_molhada_molha_o_bloco(self):
        m = np.zeros((4, 4), dtype=bool)
        m[:2, :] = True  # 8 de 16
        self.assertTrue(self.mod.downsample_mask(m, 4)[0, 0])

    def test_menos_da_metade_nao_molha(self):
        m = np.zeros((4, 4), dtype=bool)
        m[:2, :3] = True  # 6 de 16
        self.assertFalse(self.mod.downsample_mask(m, 4)[0, 0])

    def test_area_total_e_preservada_em_mancha_difusa(self):
        rng = np.random.default_rng(0)
        m = rng.random((400, 400)) < 0.2  # 20% molhado, espalhado
        antes = m.sum()
        depois = self.mod.downsample_mask(m, 4).sum() * 16
        # max-pool daria ~ 400*400*(1-0.8**16) = 97% da area; votacao nao pode passar de 2x o original
        self.assertLess(depois, 2 * antes)

    def test_forma_e_reduzida_pelo_fator(self):
        self.assertEqual(self.mod.downsample_mask(np.zeros((8, 12), dtype=bool), 4).shape, (2, 3))


if __name__ == "__main__":
    unittest.main()
