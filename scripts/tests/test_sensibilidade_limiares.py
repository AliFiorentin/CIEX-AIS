"""
Sensibilidade dos limiares da mancha do 16/05/2024 (scripts/sensibilidade_limiares.py): funcoes puras de area.

Modulo novo, sem testes anteriores. Instrucao do usuario: "implemente a auditoria e as melhorias" (sensibilidade
dos limiares de 45 cm e da faixa 86-253). Precisa de numpy/rasterio/geopandas (o script os importa no topo);
sem eles os testes sao pulados.
"""

import importlib.util
import sys
import unittest
from pathlib import Path

try:
    import numpy as np
    import rasterio  # noqa: F401
    import geopandas  # noqa: F401

    TEM_GEO = True
except ImportError:  # pragma: no cover
    TEM_GEO = False

SCRIPT = Path(__file__).resolve().parent.parent / "sensibilidade_limiares.py"


def _carregar():
    sys.path.insert(0, str(SCRIPT.parent))
    spec = importlib.util.spec_from_file_location("sensibilidade_limiares", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["sensibilidade_limiares"] = mod
    spec.loader.exec_module(mod)
    return mod


@unittest.skipUnless(TEM_GEO, "numpy/rasterio/geopandas nao instalados")
class AreaPorLimiar(unittest.TestCase):
    def setUp(self):
        self.mod = _carregar()
        self.banda = np.array([[10, 45, 50], [np.nan, 100, 300]], dtype=np.float32)

    def test_conta_pixels_maiores_ou_iguais_ao_limiar(self):
        r = self.mod.area_por_limiar(self.banda, [45, 100], px_km2=0.5)
        self.assertEqual(r, {45: 2.0, 100: 1.0})

    def test_nan_nunca_conta(self):
        r = self.mod.area_por_limiar(self.banda, [0], px_km2=1.0)
        self.assertEqual(r[0], 5.0)  # 5 pixels validos de 6

    def test_limiar_acima_de_tudo_da_zero(self):
        self.assertEqual(self.mod.area_por_limiar(self.banda, [1000], px_km2=1.0), {1000: 0.0})


@unittest.skipUnless(TEM_GEO, "numpy/rasterio/geopandas nao instalados")
class AreaPorFaixa(unittest.TestCase):
    def setUp(self):
        self.mod = _carregar()
        self.banda = np.array([[85, 86, 253], [254, 255, np.nan]], dtype=np.float32)

    def test_faixa_e_fechada_embaixo_e_aberta_em_cima(self):
        # 86 <= v < 254: entram 86 e 253
        self.assertEqual(self.mod.area_por_faixa(self.banda, 86, 254, px_km2=1.0), 2.0)

    def test_sem_limite_superior_conta_tudo_acima(self):
        self.assertEqual(self.mod.area_por_faixa(self.banda, 86, None, px_km2=1.0), 4.0)

    def test_nan_fica_fora(self):
        self.assertEqual(self.mod.area_por_faixa(self.banda, 0, None, px_km2=1.0), 5.0)


if __name__ == "__main__":
    unittest.main()
