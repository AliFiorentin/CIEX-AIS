"""
calcular_populacao_intervencoes.py: soma no raster (pixels cujo centro cai na mancha, recortada pelo limite) e a
chave sem acento do JSON. Raster e geometrias sinteticos; precisa de rasterio, geopandas e shapely.
"""

import sys
import tempfile
import unittest
from pathlib import Path

try:
    import geopandas as gpd
    import numpy as np
    import rasterio
    from rasterio.transform import from_origin
    from shapely.geometry import box

    TEM_GIS = True
except ImportError:  # pragma: no cover
    TEM_GIS = False

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))
if TEM_GIS:
    import calcular_populacao_intervencoes as mod  # noqa: E402


@unittest.skipUnless(TEM_GIS, "precisa de rasterio e geopandas")
class TestPopulacaoRaster(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.raster = Path(self.tmp.name) / "pop.tif"
        # 10 x 10 pixels de 1 grau, canto superior esquerdo em (0, 10); cada pixel tem 10 pessoas, um tem -99999 (nodata)
        dados = np.full((10, 10), 10.0, dtype="float32")
        dados[0, 0] = -99999.0
        with rasterio.open(
            self.raster, "w", driver="GTiff", height=10, width=10, count=1, dtype="float32",
            crs="EPSG:4326", transform=from_origin(0, 10, 1, 1), nodata=-99999.0,
        ) as dst:
            dst.write(dados, 1)

    def tearDown(self):
        self.tmp.cleanup()

    def _gdf(self, *geoms):
        return gpd.GeoDataFrame(geometry=list(geoms), crs="EPSG:4326")

    def test_soma_so_pixels_com_centro_dentro(self):
        # cobre 2 x 2 pixels inteiros (colunas 2-3, linhas 2-3): 4 pixels x 10
        with rasterio.open(self.raster) as src:
            self.assertEqual(mod.soma_no_raster(src, self._gdf(box(2, 5, 4, 7))), 40.0)

    def test_nodata_nao_conta(self):
        # o pixel (0, 0) e nodata: a faixa da primeira linha e coluna soma so os 3 validos
        with rasterio.open(self.raster) as src:
            self.assertEqual(mod.soma_no_raster(src, self._gdf(box(0, 8, 2, 10))), 30.0)

    def test_mancha_recortada_pelo_limite(self):
        mancha = Path(self.tmp.name) / "mancha.geojson"
        self._gdf(box(2, 5, 6, 7)).to_file(mancha, driver="GeoJSON")  # 4 x 2 pixels
        limite = self._gdf(box(0, 0, 4, 10))  # so as colunas 0-3: sobram 2 x 2 pixels
        with rasterio.open(self.raster) as src:
            self.assertEqual(mod.pop_na_mancha(src, mancha, limite), 40.0)

    def test_mancha_fora_do_limite_vale_zero(self):
        mancha = Path(self.tmp.name) / "fora.geojson"
        self._gdf(box(8, 0, 9, 1)).to_file(mancha, driver="GeoJSON")
        with rasterio.open(self.raster) as src:
            self.assertEqual(mod.pop_na_mancha(src, mancha, self._gdf(box(0, 0, 4, 10))), 0.0)

    def test_chave_sem_acento_igual_a_da_interface(self):
        self.assertEqual(mod.sem_acento("Simulação de Maio de 2024 – Diques"), "Simulacao de Maio de 2024 – Diques")


if __name__ == "__main__":
    unittest.main()
