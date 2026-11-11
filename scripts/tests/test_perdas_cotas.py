"""
Perdas operacionais por cota (scripts/calcular_perdas_cotas.py).

Regras: so entram os pontos molhados ate a cota (indice por ponto 1..N, acumulado; 0 e -1 nunca); indice desalinhado com a
base e erro; e o perdas_cotas.json gerado bate com as cotas do detalhe, e a serie e monotonica.
"""

import importlib.util
import json
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
DASH = SCRIPTS.parent / "public" / "dados_convertidos"


def _carregar():
    sys.path.insert(0, str(SCRIPTS))
    spec = importlib.util.spec_from_file_location("calcular_perdas_cotas", SCRIPTS / "calcular_perdas_cotas.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules["calcular_perdas_cotas"] = mod
    spec.loader.exec_module(mod)
    return mod


class Selecionar(unittest.TestCase):
    def setUp(self):
        self.mod = _carregar()
        self.gj = {"features": [{"id": i} for i in range(5)]}

    def test_so_molhados_ate_a_cota_e_acumulado(self):
        idx = [1, 0, 3, -1, 2]
        ids = lambda n: [f["id"] for f in self.mod.selecionar(self.gj, idx, n)["features"]]  # noqa: E731
        self.assertEqual(ids(1), [0])
        self.assertEqual(ids(2), [0, 4])
        self.assertEqual(ids(3), [0, 2, 4])

    def test_indice_desalinhado_e_erro(self):
        with self.assertRaises(ValueError):
            self.mod.selecionar(self.gj, [1, 2], 1)

    def test_agricultura_usa_coeficiente_de_maio_2024(self):
        self.assertEqual(self.mod.perdas_agricolas({"Soja": 2, "Outras Lavouras Temporárias": 1}), 2 * 1100 + 1400)
        self.assertEqual(self.mod.perdas_agricolas(None), 0)


class JsonGerado(unittest.TestCase):
    def test_cotas_batem_com_o_detalhe_e_sao_crescentes(self):
        perdas = json.loads((DASH / "perdas_cotas.json").read_text(encoding="utf-8"))["Rio Grande"]["por_cota"]
        detalhe = json.loads((DASH / "climada_cota_detalhe_rio_grande.json").read_text(encoding="utf-8"))["por_cota"]
        self.assertEqual(list(perdas), list(detalhe))
        totais = [p["total"] for p in perdas.values()]
        self.assertEqual(totais, sorted(totais))
        for k, p in perdas.items():
            self.assertEqual(p["empresas_n"], detalhe[k]["empresas"]["n"], k)
            self.assertEqual(p["educacao_n"], detalhe[k]["educacao"]["n"], k)
            self.assertEqual(p["saude_n"], detalhe[k]["saude"]["n"], k)


if __name__ == "__main__":
    unittest.main()
