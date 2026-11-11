"""
Populacao atingida por cota (scripts/calcular_populacao_cotas.py).

Regras: soma so pixels positivos dentro do limite municipal; o valor e acumulado entre cotas (pixel molhado numa cota
continua contando nas maiores, mesmo que a mascara de uma cota maior o mostre seco); e o JSON gerado bate com a lista
de cotas de `cota_mapa.json`.

Precisa de numpy (o script o importa no topo); sem ele os testes sao pulados.
"""

import importlib.util
import json
import sys
import unittest
from pathlib import Path

try:
    import numpy as np

    TEM_NP = True
except ImportError:  # pragma: no cover
    TEM_NP = False

SCRIPTS = Path(__file__).resolve().parent.parent
SCRIPT = SCRIPTS / "calcular_populacao_cotas.py"
DASH = SCRIPTS.parent / "public" / "dados_convertidos"


def _carregar():
    sys.path.insert(0, str(SCRIPTS))
    spec = importlib.util.spec_from_file_location("calcular_populacao_cotas", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["calcular_populacao_cotas"] = mod
    spec.loader.exec_module(mod)
    return mod


@unittest.skipUnless(TEM_NP, "numpy nao instalado")
class SomarAcumulado(unittest.TestCase):
    def setUp(self):
        self.mod = _carregar()

    def test_acumula_e_ignora_invalidos_e_fora_do_limite(self):
        pop = np.array([[10.0, 20.0, -5.0], [np.nan, 40.0, 0.0]])
        dentro = np.array([[True, True, True], [True, True, True]])
        dentro[1, 1] = False  # 40 fica fora do limite municipal
        m1 = np.array([[True, False, True], [True, True, True]])
        m2 = np.array([[False, True, False], [False, True, False]])  # (0,0) "seca" na cota maior
        self.assertEqual(self.mod.somar_acumulado(pop, dentro, [m1, m2]), [10.0, 30.0])

    def test_serie_e_monotonica(self):
        pop = np.ones((3, 3))
        dentro = np.ones((3, 3), dtype=bool)
        molhados = [np.eye(3, dtype=bool), np.zeros((3, 3), dtype=bool), np.ones((3, 3), dtype=bool)]
        soma = self.mod.somar_acumulado(pop, dentro, molhados)
        self.assertEqual(soma, [3.0, 3.0, 9.0])

    def test_pasta_da_cota(self):
        self.assertEqual(self.mod.pasta_da_cota(1.0), "100cm")
        self.assertEqual(self.mod.pasta_da_cota(2.6215), "262_15cm")


class JsonGerado(unittest.TestCase):
    def test_cotas_batem_com_cota_mapa_e_sao_crescentes(self):
        pop = json.loads((DASH / "populacao_atingida.json").read_text(encoding="utf-8"))["Rio Grande"]
        meta = json.loads((DASH / "rio_grande" / "cota_mapa.json").read_text(encoding="utf-8"))
        por_cota = pop["cotas"]["por_cota"]
        self.assertEqual([p["cota"] for p in por_cota], meta["cotas"])
        valores = [p["pop_atingida"] for p in por_cota]
        self.assertEqual(valores, sorted(valores))
        self.assertLessEqual(valores[-1], pop["pop_total"])
        for p in por_cota:
            self.assertAlmostEqual(p["pct_atingida"], 100 * p["pop_atingida"] / pop["pop_total"], delta=0.05)


if __name__ == "__main__":
    unittest.main()
