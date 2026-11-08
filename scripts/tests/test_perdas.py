import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "calcular_perdas_rio_grande.py"
spec = importlib.util.spec_from_file_location("calcular_perdas", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class CnaeToSetor(unittest.TestCase):
    def test_cnae_inteiro_sem_zero_a_esquerda_e_agro(self):
        self.assertEqual(mod.cnae_to_setor(1113), "agro")
        self.assertEqual(mod.cnae_to_setor("1113.0"), "agro")

    def test_cnae_inteiro_divisao_05_e_industria(self):
        self.assertEqual(mod.cnae_to_setor(5101), "industria")

    def test_cnae_cinco_digitos(self):
        self.assertEqual(mod.cnae_to_setor("47113"), "servicos")
        self.assertEqual(mod.cnae_to_setor(84116), "adm_pub")

    def test_cnae_invalido_cai_em_servicos(self):
        self.assertEqual(mod.cnae_to_setor(None), "servicos")
        self.assertEqual(mod.cnae_to_setor(""), "servicos")


class DanoEmpresas(unittest.TestCase):
    def test_vab_empresa_agro_com_cnae_inteiro(self):
        gj = {"features": [{"properties": {"massa_salarial": 1000, "cnae_classe": 1113}}]}
        esperado = 1000 * 12 / 0.176 * 0.1
        self.assertAlmostEqual(mod.calcular_dano_empresas(gj, 0.1), esperado, places=2)


class DanoAgricultura(unittest.TestCase):
    def test_agricultura_chave_sem_acento_tambem_conta(self):
        with tempfile.TemporaryDirectory() as tmp:
            pasta = Path(tmp) / mod.SLUG / "cenarios"
            pasta.mkdir(parents=True)
            stats = {"Arroz": 10, "Outras Lavouras Temporarias": 2}
            (pasta / f"agricultura_stats_{mod.SLUG}___cenario_maio_2024.json").write_text(
                json.dumps(stats), encoding="utf-8"
            )
            original = mod.DASH_DATA
            mod.DASH_DATA = Path(tmp)
            try:
                total = mod.calcular_dano_agricultura("cenario_maio_2024")
            finally:
                mod.DASH_DATA = original
        self.assertAlmostEqual(total, 10 * 1100 + 2 * 1400)


if __name__ == "__main__":
    unittest.main()
