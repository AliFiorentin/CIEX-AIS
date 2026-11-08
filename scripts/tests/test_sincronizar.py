import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "sincronizar_dados_externos.py"
spec = importlib.util.spec_from_file_location("sincronizar_dados_bid", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

CEN = "rio_grande/cenarios/"
LAGOA = "nivel_da_lagoa_chuva_acumulada_16_05_2024"

# (rel, existe_bid, existe_ciex, acao esperada)
CASOS = [
    ("rio_grande/cota_mapa.webp", True, False, "copiar"),
    # Regenerado a partir das mascaras brutas (scripts/gerar_cota_mapa.py): a imagem da origem desenhava ~34% mais agua.
    ("rio_grande/cota_mapa.webp", True, True, "manter"),
    ("climada_cota_rio_grande.json", True, False, "copiar"),
    (CEN + "empresas_ATINGIDOS_rio_grande___cenario_setembro_2023.geojson", True, True, "copiar"),
    (CEN + f"empresas_ATINGIDOS_rio_grande___{LAGOA}.geojson", False, True, "manter"),
    (CEN + f"altura_raster_rio_grande___{LAGOA}.png", False, True, "manter"),
    (CEN + "agricultura_stats_rio_grande___cenario_maio_2024.json", True, True, "copiar"),
    (CEN + f"agricultura_stats_rio_grande___{LAGOA}.json", False, True, "manter"),
    (CEN + "agricultura_ATINGIDOS_rio_grande___cenario_setembro_2023.geojson", True, False, "ignorar"),
    ("rio_grande/cobertura_BASE.fgb", False, True, "manter"),
    (CEN + "infra_terrenos_ATINGIDOS_rio_grande___cenario_maio_2024.geojson", True, True, "manter"),
    ("rio_grande/infraestrutura/edificacoes_BASE.geojson", True, False, "ignorar"),
    ("rio_grande/limite_BASE.geojson", True, False, "ignorar"),
    ("rio_grande/saude_BASE.geojson", True, True, "copiar"),
    (CEN + "rio_grande___cenario_maio_2024.geojson", True, True, "copiar"),
    (CEN + "infra_imoveis_ATINGIDOS_rio_grande___cenario_setembro_2023.geojson", True, False, "ignorar"),
    # O 16/05 e CIEX-only: protegido por qualquer grafia do slug, nao so por "nivel_da_lagoa".
    (CEN + "saude_ATINGIDOS_rio_grande___cenario_16_05_2024.geojson", True, True, "manter"),
    (CEN + "rio_grande___cenario_16_05_2024.geojson", True, True, "manter"),
    # infra_stats_* e gerado localmente por gerar_infra_stats.py: nunca vem da origem.
    (CEN + "infra_stats_rio_grande___cenario_setembro_2023.json", True, True, "manter"),
    (CEN + "infra_stats_rio_grande___cenario_setembro_2023.json", True, False, "ignorar"),
]


class Classificar(unittest.TestCase):
    def test_tabela_de_politica(self):
        for rel, origem, ciex, esperado in CASOS:
            with self.subTest(rel=rel):
                self.assertEqual(mod.classificar(rel, origem, ciex), esperado)


class Aplicar(unittest.TestCase):
    def test_copia_so_o_que_e_copiar_e_diferente(self):
        with tempfile.TemporaryDirectory() as tmp:
            origem, ciex = Path(tmp) / "origem", Path(tmp) / "ciex"
            for raiz in (origem, ciex):
                (raiz / "rio_grande").mkdir(parents=True)
            (origem / "rio_grande" / "saude_BASE.geojson").write_text(json.dumps({"v": "origem"}))
            (ciex / "rio_grande" / "saude_BASE.geojson").write_text(json.dumps({"v": "ciex"}))
            (origem / "rio_grande" / "cobertura_BASE.fgb").write_bytes(b"origem")
            (ciex / "rio_grande" / "cobertura_BASE.fgb").write_bytes(b"ciex")
            (origem / "climada_cota_rio_grande.json").write_text(json.dumps({"c": 1}))

            itens = mod.relatorio(origem, ciex)
            copiados = mod.aplicar(origem, ciex, itens)

            self.assertEqual(sorted(copiados), ["climada_cota_rio_grande.json", "rio_grande/saude_BASE.geojson"])
            self.assertEqual(json.loads((ciex / "rio_grande" / "saude_BASE.geojson").read_text()), {"v": "origem"})
            self.assertEqual((ciex / "rio_grande" / "cobertura_BASE.fgb").read_bytes(), b"ciex")
            self.assertTrue((ciex / "climada_cota_rio_grande.json").exists())


def _fc(*props):
    return {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": p, "geometry": {"type": "Point", "coordinates": [0, 0]}} for p in props]}


class Seguranca(unittest.TestCase):
    """Regressao de Setembro/2023: a copia cega trocou logradouros com atributos por feicoes sem nenhum."""

    REL = "rio_grande/cenarios/infra_logradouros_ATINGIDOS_rio_grande___cenario_setembro_2023.geojson"

    def _montar(self, tmp, bid_props, ciex_props):
        origem, ciex = Path(tmp) / "origem", Path(tmp) / "ciex"
        for raiz, props in ((origem, bid_props), (ciex, ciex_props)):
            (raiz / self.REL).parent.mkdir(parents=True)
            (raiz / self.REL).write_text(json.dumps(_fc(*props)))
        return origem, ciex

    def test_nao_copia_arquivo_do_bid_que_perde_atributos(self):
        with tempfile.TemporaryDirectory() as tmp:
            origem, ciex = self._montar(tmp, [{}, {}], [{"tipo": "rua", "nome": "A"}])
            itens = mod.relatorio(origem, ciex)
            self.assertEqual(mod.aplicar(origem, ciex, itens), [])
            self.assertIn("tipo", json.loads((ciex / self.REL).read_text())["features"][0]["properties"])
            self.assertEqual([i["rel"] for i in itens if i.get("bloqueado")], [self.REL])

    def test_copia_arquivo_do_bid_que_mantem_os_atributos(self):
        with tempfile.TemporaryDirectory() as tmp:
            origem, ciex = self._montar(tmp, [{"tipo": "rua", "nome": "B", "extra": 1}], [{"tipo": "rua", "nome": "A"}])
            self.assertEqual(mod.aplicar(origem, ciex, mod.relatorio(origem, ciex)), [self.REL])
            self.assertEqual(json.loads((ciex / self.REL).read_text())["features"][0]["properties"]["nome"], "B")

    def test_copia_e_atomica_e_faz_backup_do_original(self):
        with tempfile.TemporaryDirectory() as tmp:
            origem, ciex = self._montar(tmp, [{"tipo": "rua", "nome": "B"}], [{"tipo": "rua", "nome": "A"}])
            backup = Path(tmp) / "backup"
            mod.aplicar(origem, ciex, mod.relatorio(origem, ciex), backup_dir=backup)
            sobras = [p.name for p in (ciex / self.REL).parent.iterdir() if p.name != Path(self.REL).name]
            self.assertEqual(sobras, [])
            salvo = json.loads((backup / self.REL).read_text())
            self.assertEqual(salvo["features"][0]["properties"]["nome"], "A")


if __name__ == "__main__":
    unittest.main()
