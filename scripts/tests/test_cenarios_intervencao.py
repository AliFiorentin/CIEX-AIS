"""
Cenarios de intervencao (scripts/cenarios_intervencao.py): nomes efetivos, slugs e periodo DaLA dos 12 cenarios
(4 eventos x sem intervencao/diques/diques+barragens). So stdlib.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cenarios_intervencao as c  # noqa: E402

SLUGS = [
    f"simulacao_de_{data}_{variante}"
    for data in ("setembro_de_2023", "novembro_de_2023", "maio_de_2024", "junho_de_2025")
    for variante in ("sem_intervencao", "diques", "diques_barragens")
]


class TestCenariosIntervencao(unittest.TestCase):
    def test_12_slugs_exatos(self):
        self.assertEqual(len(SLUGS), 12)
        self.assertEqual(sorted(c.slug_cenario(e, v) for e, v in c.todos()), sorted(SLUGS))

    def test_nome_cenario(self):
        self.assertEqual(
            c.nome_cenario("2023-09-29", "diques-barragens"),
            "Simulação de Setembro de 2023 – Diques + barragens",
        )
        self.assertEqual(
            c.nome_cenario("2025-06-28", "sem-intervencao"),
            "Simulação de Junho de 2025 – Sem intervenção",
        )

    def test_slug_vem_do_nome(self):
        for e, v in c.todos():
            self.assertEqual(c.slugify(c.nome_cenario(e, v)), c.slug_cenario(e, v))

    def test_periodo_dala(self):
        self.assertEqual(c.EVENTOS["2023-09-29"]["periodo_dala"], "setembro_2023")
        self.assertEqual(c.EVENTOS["2024-05-21"]["periodo_dala"], "maio_2024")
        # sem parametros proprios: periodos com dias interpolados pela area (calcular_perdas_rio_grande.py)
        self.assertEqual(c.EVENTOS["2023-11-29"]["periodo_dala"], "novembro_2023")
        self.assertEqual(c.EVENTOS["2025-06-28"]["periodo_dala"], "junho_2025")

    def test_slugify_remove_acentos_e_pontuacao(self):
        self.assertEqual(
            c.slugify("Nível da Lagoa + Chuva Acumulada – 16/05/2024"),
            "nivel_da_lagoa_chuva_acumulada_16_05_2024",
        )

    def test_variantes(self):
        self.assertEqual(
            c.VARIANTES,
            {"sem-intervencao": "Sem intervenção", "diques": "Diques", "diques-barragens": "Diques + barragens"},
        )


if __name__ == "__main__":
    unittest.main()
