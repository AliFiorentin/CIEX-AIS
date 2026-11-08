"""
Calibracao da estimativa de populacao atingida por proxy (scripts/estimar_populacao_atingida.py).

O alfa do populacao.png subestima a populacao por um fator quase constante (0,52 a 0,61 nos 3 cenarios
com valor exato da fonte externa). A estimativa do 16/05/2024 divide o valor do proxy por esse fator, ajustado
pelos cenarios de referencia.

Precisa de geopandas/rasterio/PIL (o script os importa no topo); sem eles os testes sao pulados.
"""

import importlib.util
import sys
import unittest
from pathlib import Path

try:
    import geopandas  # noqa: F401
    import rasterio  # noqa: F401
    from PIL import Image  # noqa: F401

    TEM_GEO = True
except ImportError:  # pragma: no cover
    TEM_GEO = False

SCRIPT = Path(__file__).resolve().parent.parent / "estimar_populacao_atingida.py"


def _carregar():
    spec = importlib.util.spec_from_file_location("estimar_populacao_atingida", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["estimar_populacao_atingida"] = mod
    spec.loader.exec_module(mod)
    return mod


@unittest.skipUnless(TEM_GEO, "geopandas/rasterio/PIL nao instalados")
class FatorCalibracao(unittest.TestCase):
    def setUp(self):
        self.mod = _carregar()

    def test_fator_e_razao_das_somas(self):
        # proxy = 0,5 x exato em todos: fator 0,5
        self.assertAlmostEqual(self.mod.fator_calibracao([(50, 100), (25, 50)]), 0.5)

    def test_cenario_grande_pesa_mais_que_o_pequeno(self):
        # razoes 0,5 e 1,0; pelas somas: (10+100)/(20+100) = 0,9167 (media simples daria 0,75)
        self.assertAlmostEqual(self.mod.fator_calibracao([(10, 20), (100, 100)]), 110 / 120)

    def test_sem_referencias_levanta_erro(self):
        with self.assertRaises(ValueError):
            self.mod.fator_calibracao([])

    def test_referencia_com_valor_exato_zero_e_ignorada(self):
        self.assertAlmostEqual(self.mod.fator_calibracao([(5, 0), (50, 100)]), 0.5)

    def test_faixa_de_incerteza_usa_menor_e_maior_razao(self):
        lo, hi = self.mod.faixa_razoes([(52, 100), (61, 100), (55, 100)])
        self.assertAlmostEqual(lo, 0.52)
        self.assertAlmostEqual(hi, 0.61)


if __name__ == "__main__":
    unittest.main()
