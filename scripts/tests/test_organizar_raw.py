"""
Organizacao dos arquivos originais em RAW/ (scripts/organizar_raw.py): mover e renomear com sha256 conferido.
So stdlib. Os arquivos sao falsos (bytes curtos) em diretorios temporarios.
"""

import csv
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import organizar_raw as o  # noqa: E402

EVENTOS = ["29setembro2023", "29novembro2023", "21maio2024", "28junho2025"]


def _tocar(p: Path, conteudo: bytes = b"x") -> Path:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(conteudo)
    return p


def _monta_intervencoes(downloads: Path) -> int:
    """Cria os 4 eventos x 3 variantes x 6 bacias x 3 arquivos (216). Devolve quantos criou."""
    base = downloads / "imagensGeoTIFF_Alisson"
    n = 0
    for ev in EVENTOS:
        pastas = [
            base / "cenario1" / f"cenario1_{ev}",
            base / "cenario6" / ev / f"cenario6_{ev}_diques",
            base / "cenario6" / ev / f"cenario6_{ev}_diquesBarragens",
        ]
        for pasta in pastas:
            for b in (1, 2, 3, 4, 5, 7):
                stem = f"bacia{b}Prof_Nivel_{ev}_telemac_Valor_1_cm"
                for ext in (".tif", ".qml", ".tif.aux.xml"):
                    _tocar(pasta / f"{stem}{ext}", f"{ev}{b}{ext}".encode() + pasta.name.encode())
                    n += 1
    return n


def _ler_manifesto(p: Path) -> list[dict]:
    with p.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


class TestDestino(unittest.TestCase):
    def test_destino_cenario1(self):
        rel = Path("cenario1/cenario1_29setembro2023/bacia1Prof_Nivel_29_setembro_2023_x_Valor_1_cm.tif")
        self.assertEqual(o.destino_intervencao(rel), Path("2023-09-29/sem-intervencao/bacia1.tif"))
        self.assertEqual(
            o.destino_intervencao(rel.with_name(rel.name[:-4] + ".qml")),
            Path("2023-09-29/sem-intervencao/bacia1.qml"),
        )
        self.assertEqual(
            o.destino_intervencao(rel.with_name(rel.name + ".aux.xml")),
            Path("2023-09-29/sem-intervencao/bacia1.tif.aux.xml"),
        )

    def test_destino_cenario6(self):
        d = Path("cenario6/21maio2024/cenario6_21maio24_diques/bacia2Prof_x_Valor_1_cm.tif")
        b = Path("cenario6/21maio2024/cenario6_21maio24_diquesBarragens/bacia2Prof_x_Valor_1_cm.tif")
        self.assertEqual(o.destino_intervencao(d), Path("2024-05-21/diques/bacia2.tif"))
        self.assertEqual(o.destino_intervencao(b), Path("2024-05-21/diques-barragens/bacia2.tif"))

    def test_destino_caixa_diferente(self):
        rel = Path(
            "cenario6/28junho2025/cenario6_28jun25_diquesBarragens/"
            "bacia5Prof_Nivel_28_JUNHO_2025_00_h_telemac_c06_diques_BARRAGENS_Valor_1_cm.tif"
        )
        self.assertEqual(o.destino_intervencao(rel), Path("2025-06-28/diques-barragens/bacia5.tif"))

    def test_todos_os_eventos(self):
        esperado = {
            "29setembro2023": "2023-09-29",
            "29novembro2023": "2023-11-29",
            "21maio2024": "2024-05-21",
            "28junho2025": "2025-06-28",
        }
        for ev, iso in esperado.items():
            rel = Path(f"cenario1/cenario1_{ev}/bacia3Prof_x_Valor_1_cm.tif")
            self.assertEqual(o.destino_intervencao(rel), Path(f"{iso}/sem-intervencao/bacia3.tif"))


class TestPlano(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.downloads = self.tmp / "Downloads"
        self.projeto = self.tmp / "CIEX" / "dashboard-ciex"
        self.raw = self.tmp / "CIEX" / "RAW"
        self.n = _monta_intervencoes(self.downloads)

    def tearDown(self):
        self._tmp.cleanup()

    def _intervencao(self, mov):
        return [m for m in mov if "simulacoes-intervencoes" in m.destino.parts]

    def test_planejar_cobre_216_arquivos_de_intervencao(self):
        mov = o.planejar(self.downloads, self.projeto, self.raw)
        self.assertEqual(self.n, 216)
        self.assertEqual(len(self._intervencao(mov)), 216)

    def test_planejar_inclui_outras_fontes(self):
        _tocar(self.projeto.parent / "dados-brutos" / "plataforma-economia-azul" / "2024-05-16_nivel-lagoa-20h" / "bacia1" / "a.tif")
        _tocar(self.downloads / "pico210524_evolucaoPorCota" / "cota_100" / "m.tif")
        _tocar(self.projeto / "scripts" / "data" / "cobertura_30m_mapbiomas.tif")
        mov = o.planejar(self.downloads, self.projeto, self.raw)
        destinos = {str(m.destino.relative_to(self.raw)) for m in mov}
        self.assertIn("simulacoes-2024-05-16/2024-05-16_nivel-lagoa-20h/bacia1/a.tif", destinos)
        self.assertIn("cotas-pico-2024-05-21/cota_100/m.tif", destinos)
        self.assertIn("mapbiomas/cobertura_30m_mapbiomas.tif", destinos)

    def test_simulacao_nao_altera_nada(self):
        antes = sorted(str(p) for p in self.tmp.rglob("*") if p.is_file())
        o.planejar(self.downloads, self.projeto, self.raw)
        depois = sorted(str(p) for p in self.tmp.rglob("*") if p.is_file())
        self.assertEqual(antes, depois)
        self.assertFalse(self.raw.exists())

    def test_apply_move_confere_sha256_e_grava_manifesto(self):
        mov = o.planejar(self.downloads, self.projeto, self.raw)
        origens = {m.origem: hashlib.sha256(m.origem.read_bytes()).hexdigest() for m in mov}
        manifesto = self.raw / "MANIFESTO.csv"
        o.aplicar(mov, manifesto)
        for m in mov:
            self.assertFalse(m.origem.exists(), m.origem)
            self.assertEqual(hashlib.sha256(m.destino.read_bytes()).hexdigest(), origens[m.origem])
        linhas = _ler_manifesto(manifesto)
        self.assertEqual(len(linhas), len(mov))
        self.assertEqual(set(linhas[0].keys()), {"caminho_novo", "caminho_original", "sha256", "bytes"})

    def test_apply_escreve_leiame_com_nao_localizados(self):
        o.aplicar(o.planejar(self.downloads, self.projeto, self.raw), self.raw / "MANIFESTO.csv")
        texto = (self.raw / "LEIAME.md").read_text(encoding="utf-8")
        for esperado in ("simulacoes-intervencoes", "INFRA_DADOS_DIR", "PATRIMONIO_SHP", "POP_RASTER"):
            self.assertIn(esperado, texto)

    def test_nao_sobrescreve(self):
        mov = o.planejar(self.downloads, self.projeto, self.raw)
        m0 = mov[0]
        _tocar(m0.destino, b"ja existe")
        with self.assertRaises(SystemExit):
            o.aplicar(mov, self.raw / "MANIFESTO.csv")
        self.assertEqual(m0.destino.read_bytes(), b"ja existe")
        self.assertTrue(m0.origem.exists())

    def test_segunda_execucao_zero_movimentos(self):
        o.aplicar(o.planejar(self.downloads, self.projeto, self.raw), self.raw / "MANIFESTO.csv")
        self.assertEqual(o.planejar(self.downloads, self.projeto, self.raw), [])

    def test_retoma_apos_interrupcao(self):
        mov = o.planejar(self.downloads, self.projeto, self.raw)
        metade = mov[: len(mov) // 2]
        o.aplicar(metade, self.raw / "MANIFESTO.csv")  # simula a interrupcao
        restante = o.planejar(self.downloads, self.projeto, self.raw)
        self.assertEqual(len(restante), len(mov) - len(metade))
        o.aplicar(restante, self.raw / "MANIFESTO.csv")
        linhas = _ler_manifesto(self.raw / "MANIFESTO.csv")
        self.assertEqual(len(linhas), len(mov))
        self.assertEqual(len({l["caminho_novo"] for l in linhas}), len(mov))


SCRIPTS = Path(__file__).resolve().parent.parent
# script -> constantes de raw_paths que ele deve usar
USO = {
    "converter_manchas_altura.py": ["SIM_16_05"],
    "gerar_cota_mapa.py": ["COTAS_PICO"],
    "converter_cobertura_rio_grande.py": ["MAPBIOMAS"],
    "converter_agricultura_rio_grande.py": ["MAPBIOMAS"],
}


class TestScriptsApontamParaRaw(unittest.TestCase):
    def test_scripts_usam_raw_paths_e_nao_os_caminhos_antigos(self):
        for nome, constantes in USO.items():
            src = (SCRIPTS / nome).read_text(encoding="utf-8")
            self.assertIn("from raw_paths import", src, nome)
            for c in constantes:
                self.assertIn(c, src.split("from raw_paths import", 1)[1].splitlines()[0], f"{nome}: {c}")
            self.assertNotIn('"dados-brutos"', src, nome)
            self.assertNotIn('"pico210524_evolucaoPorCota"', src, nome)
            self.assertNotIn("scripts/data/cobertura_30m", src, nome)
            self.assertNotIn("scripts/data/agricultura_30m", src, nome)

    def test_scripts_apontam_para_raw_existente(self):
        import raw_paths as rp

        if not rp.RAW_DIR.is_dir():
            self.skipTest("RAW/ ainda nao existe (rode organizar_raw.py --apply)")
        for caminho in (
            rp.SIM_16_05 / "2024-05-16_nivel-lagoa-20h",
            rp.SIM_16_05 / "2024-05-16_chuva-acumulada-60-8mm",
            rp.COTAS_PICO,
            rp.MAPBIOMAS / "cobertura_30m_mapbiomas.tif",
            rp.MAPBIOMAS / "agricultura_30m_mapbiomas.tif",
        ):
            self.assertTrue(caminho.exists(), caminho)


if __name__ == "__main__":
    unittest.main()
