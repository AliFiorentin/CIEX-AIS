"""
Proposta de realocacao das "pilhas" de geocodificacao (scripts/propor_realocacao_pilhas.py).

Modulo novo, sem testes anteriores. Instrucao do usuario: tratar a pilha de 777 empresas num ponto so.
O geocodificador de origem colocou centenas de estabelecimentos de ruas e CEPs diferentes no mesmo ponto; a proposta
reposiciona cada um no centroide (mediana) dos demais estabelecimentos do mesmo CEP, ou da mesma rua+bairro.
So biblioteca padrao.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import propor_realocacao_pilhas as prp  # noqa: E402

PILHA = (-52.1, -32.0)


def reg(i, cep, rua, bairro, xy):
    return {"id": i, "cep": cep, "rua": rua, "bairro": bairro, "lon": xy[0], "lat": xy[1]}


class DetectarPilha(unittest.TestCase):
    def test_devolve_coordenada_mais_repetida_com_ceps_distintos(self):
        regs = [reg(i, f"9620{i:04d}", "R A", "B", PILHA) for i in range(12)] + [reg(99, "1", "R", "B", (-52.2, -32.1))]
        self.assertEqual(prp.detectar_pilha(regs, min_pontos=10, min_ceps=5), PILHA)

    def test_sem_pilha_devolve_none(self):
        regs = [reg(i, "96200000", "R A", "B", (-52.1 - i / 1000, -32.0)) for i in range(12)]
        self.assertIsNone(prp.detectar_pilha(regs, min_pontos=10, min_ceps=5))

    def test_muitos_pontos_mas_um_cep_so_nao_e_pilha(self):
        # um predio com varias empresas no mesmo CEP e legitimo
        regs = [reg(i, "96200000", "R A", "B", PILHA) for i in range(12)]
        self.assertIsNone(prp.detectar_pilha(regs, min_pontos=10, min_ceps=5))


class ProporRealocacao(unittest.TestCase):
    def setUp(self):
        self.refs = [
            reg(1, "96200001", "R UM", "CENTRO", (-52.10, -32.03)),
            reg(2, "96200001", "R UM", "CENTRO", (-52.12, -32.05)),
            reg(3, "96200001", "R UM", "CENTRO", (-52.11, -32.04)),
            reg(4, "96200099", "R DOIS", "CASSINO", (-52.15, -32.20)),
        ]

    def test_cep_igual_usa_mediana_dos_demais(self):
        pilha = [reg(10, "96200001", "R QUALQUER", "X", PILHA)]
        r = prp.propor(self.refs + pilha, PILHA)[0]
        self.assertEqual(r["metodo"], "cep")
        self.assertAlmostEqual(r["lon_proposta"], -52.11)
        self.assertAlmostEqual(r["lat_proposta"], -32.04)
        self.assertEqual(r["n_referencias"], 3)

    def test_sem_cep_conhecido_usa_rua_e_bairro(self):
        pilha = [reg(10, "00000000", "R DOIS", "CASSINO", PILHA)]
        r = prp.propor(self.refs + pilha, PILHA)[0]
        self.assertEqual(r["metodo"], "rua_bairro")
        self.assertAlmostEqual(r["lon_proposta"], -52.15)

    def test_sem_referencia_nao_propoe(self):
        pilha = [reg(10, "11111111", "R NOVA", "LONGE", PILHA)]
        r = prp.propor(self.refs + pilha, PILHA)[0]
        self.assertEqual(r["metodo"], "sem_referencia")
        self.assertIsNone(r["lon_proposta"])

    def test_membros_da_pilha_nao_servem_de_referencia(self):
        # outro membro da pilha com o mesmo CEP nao pode puxar a mediana para o ponto falso
        pilha = [reg(10, "11111111", "R A", "B", PILHA), reg(11, "11111111", "R A", "B", PILHA)]
        for r in prp.propor(self.refs + pilha, PILHA):
            self.assertEqual(r["metodo"], "sem_referencia")

    def test_so_devolve_membros_da_pilha(self):
        pilha = [reg(10, "96200001", "R", "B", PILHA)]
        out = prp.propor(self.refs + pilha, PILHA)
        self.assertEqual([r["id"] for r in out], [10])


if __name__ == "__main__":
    unittest.main()
