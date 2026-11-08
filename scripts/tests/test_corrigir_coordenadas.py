import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "corrigir_coordenadas.py"
spec = importlib.util.spec_from_file_location("corrigir_coordenadas", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

CNES = "6303609"
NOVO = (-52.0985, -32.0317)
ANTIGO = (-52.0883, -32.0290)


def quadrado(x0, y0, x1, y1):
    return {"type": "FeatureCollection", "features": [{
        "type": "Feature", "properties": {},
        "geometry": {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]},
    }]}


def unidade(cnes, lon, lat):
    return {"type": "Feature", "properties": {"co_cnes": int(cnes), "no_fantasia": f"U{cnes}"},
            "geometry": {"type": "Point", "coordinates": [lon, lat]}}


def fc(*feats):
    return {"type": "FeatureCollection", "features": list(feats)}


def montar(tmp):
    """Base com 2 unidades; 3 cenarios: A (mancha contem NOVO, ATINGIDOS ja tem a SMS no ponto antigo),
    B (mancha NAO contem NOVO, ATINGIDOS tem a SMS), C (mancha contem NOVO, ATINGIDOS nao tem a SMS)."""
    rg = Path(tmp) / "rio_grande"
    (rg / "cenarios").mkdir(parents=True)
    outra = unidade("1111111", -52.2, -32.1)
    (rg / "saude_BASE.geojson").write_text(json.dumps(fc(outra, unidade(CNES, *ANTIGO))))
    contem = quadrado(-52.10, -32.033, -52.097, -32.030)
    nao_contem = quadrado(-52.20, -32.20, -52.15, -32.15)
    for slug, mancha, tem in [("a", contem, True), ("b", nao_contem, True), ("c", contem, False)]:
        (rg / "cenarios" / f"rio_grande___{slug}.geojson").write_text(json.dumps(mancha))
        feats = [outra] + ([unidade(CNES, *ANTIGO)] if tem else [])
        (rg / "cenarios" / f"saude_ATINGIDOS_rio_grande___{slug}.geojson").write_text(json.dumps(fc(*feats)))
    (rg / "cota_pontos.json").write_text(json.dumps({"cotas": [1.0], "n": {"saude": 2}, "idx": {"saude": [0, -1]}}))
    return rg


def ler(p):
    return json.loads(Path(p).read_text())


def coord_da_sms(gj):
    for f in gj["features"]:
        if str(f["properties"]["co_cnes"]) == CNES:
            return f["geometry"]["coordinates"]
    return None


class NaoRegravaArquivoInalterado(unittest.TestCase):
    """Cenario sem a unidade e cuja mancha nao a contem (ex.: 16/05, CIEX-only) nao pode ser reescrito."""

    def test_cenario_inalterado_mantem_o_arquivo_intacto(self):
        import os
        with tempfile.TemporaryDirectory() as tmp:
            rg = montar(tmp)
            mancha = quadrado(-52.20, -32.20, -52.15, -32.15)
            (rg / "cenarios" / "rio_grande___d.geojson").write_text(json.dumps(mancha))
            alvo = rg / "cenarios" / "saude_ATINGIDOS_rio_grande___d.geojson"
            alvo.write_text(json.dumps(fc(unidade("1111111", -52.2, -32.1))))
            os.utime(alvo, ns=(10**18, 10**18))
            antes = alvo.stat().st_mtime_ns
            res = mod.corrigir_saude(rg, CNES, NOVO[0], NOVO[1], idx_cota=0)
            self.assertEqual(res["cenarios"]["rio_grande___d"], "inalterada")
            self.assertEqual(alvo.stat().st_mtime_ns, antes)


class CorrigirSaude(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.rg = montar(self.tmp.name)
        self.res = mod.corrigir_saude(self.rg, CNES, NOVO[0], NOVO[1], idx_cota=0)

    def tearDown(self):
        self.tmp.cleanup()

    def test_base_recebe_a_coordenada_nova(self):
        self.assertEqual(coord_da_sms(ler(self.rg / "saude_BASE.geojson")), list(NOVO))

    def test_outras_unidades_nao_mudam(self):
        base = ler(self.rg / "saude_BASE.geojson")["features"]
        self.assertEqual(base[0]["geometry"]["coordinates"], [-52.2, -32.1])

    def test_cenario_cuja_mancha_ainda_contem_o_ponto_so_atualiza_a_coordenada(self):
        gj = ler(self.rg / "cenarios" / "saude_ATINGIDOS_rio_grande___a.geojson")
        self.assertEqual(coord_da_sms(gj), list(NOVO))

    def test_cenario_cuja_mancha_nao_contem_mais_o_ponto_remove_a_unidade(self):
        gj = ler(self.rg / "cenarios" / "saude_ATINGIDOS_rio_grande___b.geojson")
        self.assertIsNone(coord_da_sms(gj))
        self.assertEqual(len(gj["features"]), 1)

    def test_cenario_cuja_mancha_passa_a_conter_o_ponto_inclui_a_unidade(self):
        gj = ler(self.rg / "cenarios" / "saude_ATINGIDOS_rio_grande___c.geojson")
        self.assertEqual(coord_da_sms(gj), list(NOVO))

    def test_indice_de_cota_deixa_de_ser_fora_do_municipio(self):
        self.assertEqual(ler(self.rg / "cota_pontos.json")["idx"]["saude"], [0, 0])

    def test_segunda_execucao_nao_muda_nada(self):
        antes = {p.name: p.read_text() for p in sorted(self.rg.rglob("*.json*"))}
        mod.corrigir_saude(self.rg, CNES, NOVO[0], NOVO[1], idx_cota=0)
        depois = {p.name: p.read_text() for p in sorted(self.rg.rglob("*.json*"))}
        self.assertEqual(antes, depois)

    def test_cnes_inexistente_levanta_erro(self):
        with self.assertRaises(ValueError):
            mod.corrigir_saude(self.rg, "9999999", NOVO[0], NOVO[1], idx_cota=0)


if __name__ == "__main__":
    unittest.main()
