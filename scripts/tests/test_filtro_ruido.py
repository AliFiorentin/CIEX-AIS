"""
Filtro de ruido de vetorizacao (scripts/filtro_ruido.py).

Precisa de geopandas/shapely; sem eles os testes sao pulados (o `python3` do sistema nao os tem).
Para rodar de verdade, num venv com geopandas, a partir da raiz do projeto:
    <venv>/bin/python -m unittest discover -s scripts/tests -p 'test_filtro_ruido.py'
"""

import importlib.util
import sys
import unittest
from pathlib import Path

try:
    import geopandas as gpd
    from shapely.geometry import MultiPolygon, box

    TEM_GEO = True
except ImportError:  # pragma: no cover
    TEM_GEO = False

SCRIPTS = Path(__file__).resolve().parent.parent


def _carregar():
    spec = importlib.util.spec_from_file_location("filtro_ruido", SCRIPTS / "filtro_ruido.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules["filtro_ruido"] = mod
    spec.loader.exec_module(mod)
    return mod


# Em ~-32,05 de latitude: 0,0003 grau ~ 28 m x 33 m (~0,09 ha, 1 pixel de 30 m); 0,001 grau ~ 94 m x 111 m (~1,0 ha).
if TEM_GEO:
    X0, Y0 = -52.10, -32.05
    PIXEL = box(X0, Y0, X0 + 0.0003, Y0 + 0.0003)
    GRANDE = box(X0 + 0.01, Y0, X0 + 0.011, Y0 + 0.001)
    OUTRO_PIXEL = box(X0 + 0.02, Y0, X0 + 0.0203, Y0 + 0.0003)


@unittest.skipUnless(TEM_GEO, "geopandas/shapely nao instalados")
class RemoverFragmentos(unittest.TestCase):
    def setUp(self):
        self.mod = _carregar()

    def _gdf(self, *geoms):
        return gpd.GeoDataFrame({"classe": list(range(len(geoms)))}, geometry=list(geoms), crs="EPSG:4326")

    def test_descarta_poligono_menor_que_o_minimo_e_mantem_o_maior(self):
        out = self.mod.remover_fragmentos(self._gdf(PIXEL, GRANDE), min_ha=0.5)
        self.assertEqual(len(out), 1)
        self.assertTrue(out.geometry.iloc[0].equals(GRANDE))

    def test_limiar_e_em_hectares_reais_e_nao_em_graus(self):
        # ~1 ha passa em 0,5 ha; o mesmo poligono cai se o minimo for 5 ha. Em graus**2 o antigo
        # MIN_AREA_DEG2 (0,00002) valia ~21 ha, e descartava o poligono de 1 ha.
        self.assertEqual(len(self.mod.remover_fragmentos(self._gdf(GRANDE), min_ha=0.5)), 1)
        self.assertEqual(len(self.mod.remover_fragmentos(self._gdf(GRANDE), min_ha=5.0)), 0)

    def test_multipolygon_e_explodido_e_so_o_fragmento_pequeno_sai(self):
        multi = MultiPolygon([PIXEL, GRANDE, OUTRO_PIXEL])
        out = self.mod.remover_fragmentos(self._gdf(multi), min_ha=0.5)
        self.assertEqual(len(out), 1)
        self.assertTrue(out.geometry.iloc[0].equals(GRANDE))

    def test_preserva_atributos_e_crs(self):
        out = self.mod.remover_fragmentos(self._gdf(GRANDE), min_ha=0.5)
        self.assertEqual(list(out["classe"]), [0])
        self.assertEqual(out.crs.to_string(), "EPSG:4326")

    def test_gdf_vazio_nao_quebra(self):
        vazio = gpd.GeoDataFrame({"classe": []}, geometry=[], crs="EPSG:4326")
        self.assertEqual(len(self.mod.remover_fragmentos(vazio, min_ha=0.5)), 0)


@unittest.skipUnless(TEM_GEO, "geopandas nao instalado")
class RepararGeometrias(unittest.TestCase):
    """Geometrias invalidas devem ser REPARADAS (make_valid), nao descartadas em silencio."""

    def setUp(self):
        self.mod = _carregar()

    def gdf(self, geoms):
        return gpd.GeoDataFrame({"id": list(range(len(geoms)))}, geometry=geoms, crs="EPSG:4326")

    def test_gravata_borboleta_e_reparada_e_mantem_area(self):
        from shapely.geometry import Polygon

        gravata = Polygon([(0, 0), (2, 2), (2, 0), (0, 2)])  # auto-intersecao: invalida
        self.assertFalse(gravata.is_valid)
        out = self.mod.reparar_geometrias(self.gdf([gravata]))
        self.assertEqual(len(out), 1)
        self.assertTrue(out.geometry.iloc[0].is_valid)
        self.assertGreater(out.geometry.iloc[0].area, 0)

    def test_geometria_valida_fica_igual(self):
        quadrado = box(0, 0, 1, 1)
        out = self.mod.reparar_geometrias(self.gdf([quadrado]))
        self.assertTrue(out.geometry.iloc[0].equals(quadrado))

    def test_nulas_e_vazias_sao_removidas(self):
        from shapely.geometry import Polygon

        out = self.mod.reparar_geometrias(self.gdf([box(0, 0, 1, 1), None, Polygon()]))
        self.assertEqual(out["id"].tolist(), [0])

    def test_atributos_e_crs_sao_preservados(self):
        out = self.mod.reparar_geometrias(self.gdf([box(0, 0, 1, 1)]))
        self.assertEqual(out["id"].tolist(), [0])
        self.assertEqual(out.crs.to_string(), "EPSG:4326")

    def test_nao_altera_o_original(self):
        from shapely.geometry import Polygon

        original = self.gdf([Polygon([(0, 0), (2, 2), (2, 0), (0, 2)])])
        self.mod.reparar_geometrias(original)
        self.assertFalse(original.geometry.iloc[0].is_valid)

    def test_poligono_reparado_nao_vira_colecao_com_linhas(self):
        from shapely.geometry import Polygon

        out = self.mod.reparar_geometrias(self.gdf([Polygon([(0, 0), (2, 2), (2, 0), (0, 2)])]))
        self.assertIn(out.geometry.iloc[0].geom_type, ("Polygon", "MultiPolygon"))


if __name__ == "__main__":
    unittest.main()
