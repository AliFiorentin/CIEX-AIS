"""
Ponta a ponta dos conversores de dados (scripts/converter_*.py), com entradas sinteticas em pasta temporaria.

Cobre o fluxo inteiro de cada conversor que da para exercitar sem os dados brutos: raster -> poligonos por
classe (cobertura e agricultura), ruido < 0,5 ha removido e area preservada, interseccao com a mancha do cenario,
patrimonio (shapefile -> BASE e ATINGIDOS) e vetorizacao da mascara da mancha.

Instrucao do usuario: "implemente ... testes ponta a ponta" para os conversores.
Precisa de geopandas, rasterio e shapely (e scipy/PIL para a mancha); sem eles os testes sao pulados.
"""

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

try:
    import geopandas as gpd
    import numpy as np
    import rasterio
    from rasterio.transform import from_origin
    from shapely.geometry import Point, box

    TEM_GEO = True
except ImportError:  # pragma: no cover
    TEM_GEO = False

SCRIPTS = Path(__file__).resolve().parent.parent
PX = 0.00027  # ~30 m em graus (a resolucao do MapBiomas)
OESTE, NORTE = -52.10, -32.00
AREA_CRS = "EPSG:31982"


def _carregar(nome):
    sys.path.insert(0, str(SCRIPTS))
    spec = importlib.util.spec_from_file_location(nome, SCRIPTS / f"{nome}.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[nome] = mod
    spec.loader.exec_module(mod)
    return mod


def _escrever_tif(caminho: Path, banda):
    h, w = banda.shape
    with rasterio.open(caminho, "w", driver="GTiff", height=h, width=w, count=1, dtype="uint8",
                       crs="EPSG:4326", transform=from_origin(OESTE, NORTE, PX, PX), nodata=0) as dst:
        dst.write(banda, 1)


def _limite(caminho: Path, w, h):
    gpd.GeoDataFrame(geometry=[box(OESTE - 0.001, NORTE - h * PX - 0.001, OESTE + w * PX + 0.001, NORTE + 0.001)],
                     crs="EPSG:4326").to_file(caminho, driver="GeoJSON")


def _ha(gdf):
    return gdf.to_crs(AREA_CRS).area / 1e4


def _ha_pixels(n):
    """Area de n pixels, em hectares (pela mesma projecao de area do conversor)."""
    return float(_ha(gpd.GeoDataFrame(geometry=[box(OESTE, NORTE - PX, OESTE + PX, NORTE)], crs="EPSG:4326")).iloc[0]) * n


@unittest.skipUnless(TEM_GEO, "geopandas/rasterio/shapely nao instalados")
class CoberturaEAgricultura(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.cob = _carregar("converter_cobertura_rio_grande")
        self.agr = _carregar("converter_agricultura_rio_grande")
        self.w = self.h = 120
        self.limite = self.dir / "limite.geojson"
        _limite(self.limite, self.w, self.h)

    def tearDown(self):
        self.tmp.cleanup()

    def _raster(self, nome, blocos):
        """blocos: (classe, linha0, linha1, col0, col1)."""
        banda = np.zeros((self.h, self.w), dtype="uint8")
        for classe, r0, r1, c0, c1 in blocos:
            banda[r0:r1, c0:c1] = classe
        caminho = self.dir / nome
        _escrever_tif(caminho, banda)
        return caminho

    def test_cobertura_mantem_blocos_grandes_e_descarta_o_ruido(self):
        tif = self._raster("cob.tif", [
            (12, 10, 50, 10, 50),   # 1.600 px ~ 120 ha: Formacao Campestre
            (21, 70, 90, 70, 90),   # 400 px ~ 30 ha: Mosaico de Usos
            (49, 100, 101, 100, 101),  # 1 px ~ 0,08 ha: ruido de vetorizacao (< 0,5 ha)
        ])
        gdf = self.cob.vectorizar_tiff(tif, self.limite)
        por_classe = gdf.set_index("classe")
        self.assertEqual(sorted(por_classe.index), [12, 21])  # a Restinga Arborea (49) era ruido
        self.assertAlmostEqual(float(_ha(gdf[gdf["classe"] == 12]).iloc[0]), _ha_pixels(1600), delta=_ha_pixels(1600) * 0.05)
        self.assertAlmostEqual(float(_ha(gdf[gdf["classe"] == 21]).iloc[0]), _ha_pixels(400), delta=_ha_pixels(400) * 0.08)
        self.assertEqual(set(gdf.columns) >= {"tipo_classe", "classe", "geometry"}, True)

    def test_cobertura_uma_linha_por_classe_dissolvida(self):
        tif = self._raster("cob2.tif", [(12, 5, 25, 5, 25), (12, 60, 80, 60, 80)])  # dois blocos da mesma classe
        gdf = self.cob.vectorizar_tiff(tif, self.limite)
        self.assertEqual(len(gdf), 1)
        self.assertEqual(gdf["classe"].iloc[0], 12)

    def test_cobertura_atingida_e_a_parte_dentro_da_mancha(self):
        tif = self._raster("cob3.tif", [(12, 10, 50, 10, 50)])
        base = self.cob.vectorizar_tiff(tif, self.limite)
        # mancha cobrindo a metade esquerda do bloco (colunas 10 a 30)
        mancha = self.dir / "mancha.geojson"
        gpd.GeoDataFrame(geometry=[box(OESTE, NORTE - 60 * PX, OESTE + 30 * PX, NORTE)], crs="EPSG:4326").to_file(mancha, driver="GeoJSON")
        ating = self.cob.intersectar_com_cenario(base, mancha)
        razao = float(_ha(ating).sum() / _ha(base).sum())
        self.assertAlmostEqual(razao, 0.5, delta=0.06)

    def test_agricultura_mantem_culturas_e_descarta_o_ruido(self):
        tif = self._raster("agr.tif", [
            (39, 10, 50, 10, 50),     # Soja
            (40, 70, 100, 70, 100),   # Arroz
            (41, 110, 111, 110, 111),  # 1 px de "outras lavouras": ruido
        ])
        gdf = self.agr.vectorizar_tiff(tif, self.limite)
        self.assertEqual(sorted(gdf["tipo_cultura"]), ["Arroz", "Soja"])
        soja = float(_ha(gdf[gdf["tipo_cultura"] == "Soja"]).iloc[0])
        self.assertAlmostEqual(soja, _ha_pixels(1600), delta=_ha_pixels(1600) * 0.05)

    def test_salvar_fgb_de_camada_vazia_remove_o_arquivo_antigo(self):
        antigo = self.dir / "agricultura_ATINGIDOS_x.fgb"
        antigo.write_bytes(b"velho")
        vazio = gpd.GeoDataFrame({"tipo_cultura": []}, geometry=[], crs="EPSG:4326")
        self.agr.salvar_fgb(vazio, antigo)
        self.assertFalse(antigo.exists())  # o app trata 404 como "nada atingido"

    def test_salvar_fgb_grava_e_le_de_volta(self):
        tif = self._raster("agr2.tif", [(39, 10, 50, 10, 50)])
        gdf = self.agr.vectorizar_tiff(tif, self.limite)
        saida = self.dir / "agr.fgb"
        self.agr.salvar_fgb(gdf, saida)
        lido = gpd.read_file(saida)
        self.assertEqual(len(lido), len(gdf))
        self.assertEqual(lido["tipo_cultura"].iloc[0], "Soja")


@unittest.skipUnless(TEM_GEO, "geopandas/rasterio/shapely nao instalados")
class Patrimonio(unittest.TestCase):
    def test_main_gera_base_e_atingidos_por_cenario(self):
        mod = _carregar("converter_patrimonio_rio_grande")
        with tempfile.TemporaryDirectory() as tmp:
            raiz = Path(tmp)
            base_out, cen_dir = raiz / "base", raiz / "base" / "cenarios"
            cen_dir.mkdir(parents=True)
            pontos = [Point(-52.10, -32.00), Point(-52.11, -32.01), Point(-52.20, -32.20)]
            gpd.GeoDataFrame({"Label": ["a", "b", "c"], "Tipologia": ["Casa", "Casa", "Igreja"], "Nome": ["A", "B", "C"]},
                             geometry=pontos, crs="EPSG:4326").to_file(raiz / "pat.shp")
            # Maio 2024 cobre so o ponto "a"; o "+50%" cobre "a" e "b"
            gpd.GeoDataFrame(geometry=[box(-52.105, -32.005, -52.095, -31.995)], crs="EPSG:4326").to_file(
                cen_dir / f"{mod.CENARIOS['Cenário Maio 2024']}.geojson", driver="GeoJSON")
            gpd.GeoDataFrame(geometry=[box(-52.115, -32.015, -52.095, -31.995)], crs="EPSG:4326").to_file(
                cen_dir / f"{mod.CENARIOS['Simulação de Maio de 2024 + 50%']}.geojson", driver="GeoJSON")
            antes = (mod.SHP_PATH, mod.BASE_OUT, mod.CENARIOS_DIR)
            mod.SHP_PATH, mod.BASE_OUT, mod.CENARIOS_DIR = str(raiz / "pat.shp"), str(base_out), str(cen_dir)
            try:
                mod.main()
            finally:
                mod.SHP_PATH, mod.BASE_OUT, mod.CENARIOS_DIR = antes
            contagem = lambda p: len(json.loads(Path(p).read_text(encoding="utf-8"))["features"])
            self.assertEqual(contagem(base_out / "patrimonio_BASE.geojson"), 3)
            self.assertEqual(contagem(cen_dir / f"patrimonio_ATINGIDOS_{mod.CENARIOS['Cenário Maio 2024']}.geojson"), 1)
            self.assertEqual(contagem(cen_dir / f"patrimonio_ATINGIDOS_{mod.CENARIOS['Simulação de Maio de 2024 + 50%']}.geojson"), 2)

    def test_main_sem_shapefile_falha_com_mensagem_clara(self):
        mod = _carregar("converter_patrimonio_rio_grande")
        antes = mod.SHP_PATH
        mod.SHP_PATH = "/caminho/que/nao/existe.shp"
        try:
            with self.assertRaises(SystemExit) as e:
                mod.main()
        finally:
            mod.SHP_PATH = antes
        self.assertIn("PATRIMONIO_SHP", str(e.exception))


@unittest.skipUnless(TEM_GEO, "geopandas/rasterio/shapely nao instalados")
class MascaraDaMancha(unittest.TestCase):
    def test_vetorizacao_preserva_a_area_molhada(self):
        try:
            mod = _carregar("converter_manchas_altura")
        except ImportError:  # scipy/PIL ausentes
            self.skipTest("scipy/PIL nao instalados")
        mascara = np.zeros((600, 600), dtype=bool)
        mascara[100:500, 100:500] = True  # 160.000 px molhados
        pixel = 1e-5  # ~1 m em graus
        gdf = mod.vectorize_mask(mascara, from_origin(OESTE, NORTE, pixel, pixel))
        self.assertIsNotNone(gdf)
        esperado = _ha(gpd.GeoDataFrame(geometry=[box(OESTE, NORTE - 600 * pixel, OESTE + 600 * pixel, NORTE)], crs="EPSG:4326")).iloc[0] * (400 * 400) / (600 * 600)
        obtido = float(_ha(gdf).sum())
        self.assertAlmostEqual(obtido, float(esperado), delta=float(esperado) * 0.10)

    def test_mascara_toda_seca_nao_gera_mancha(self):
        try:
            mod = _carregar("converter_manchas_altura")
        except ImportError:
            self.skipTest("scipy/PIL nao instalados")
        self.assertIsNone(mod.vectorize_mask(np.zeros((200, 200), dtype=bool), from_origin(OESTE, NORTE, 1e-5, 1e-5)))


if __name__ == "__main__":
    unittest.main()
