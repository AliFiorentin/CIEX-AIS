"""
Filtro de ruido de vetorizacao para as camadas MapBiomas (Uso e Cobertura, Agricultura).

O README documenta que fragmentos < 0,5 ha sao descartados como ruido de vetorizacao do raster de 30 m.
Antes isso nao acontecia: a cobertura filtrava em graus**2 (0,00002 deg2 ~ 21 ha, nao os "~2 ha" do
comentario), a agricultura declarava a constante e nao a usava, e o frontend aplicava o corte de 0,5 ha
sobre a classe inteira (as camadas sao dissolvidas em 1 MultiPolygon por classe).

Aqui o corte e aplicado onde faz sentido: por fragmento (poligono, nao classe), em hectares reais
(CRS metrico) e antes do dissolve.
"""

import geopandas as gpd
from shapely.geometry import GeometryCollection, MultiPolygon
from shapely.ops import unary_union

MIN_FRAGMENTO_HA = 0.5
AREA_CRS = "EPSG:31982"  # SIRGAS 2000 / UTM 22S (mesmo CRS de area dos demais scripts)


def remover_fragmentos(
    gdf: gpd.GeoDataFrame, min_ha: float = MIN_FRAGMENTO_HA, crs_area: str = AREA_CRS
) -> gpd.GeoDataFrame:
    """Explode MultiPolygons e descarta os poligonos com area < `min_ha` (area medida em `crs_area`).

    Mantem atributos e CRS originais do `gdf`.
    """
    if len(gdf) == 0:
        return gdf.copy()
    partes = gdf.explode(index_parts=False).reset_index(drop=True)
    ha = partes.geometry.to_crs(crs_area).area / 10_000
    return partes[ha >= min_ha].copy()


def _somente_poligonos(geom):
    """make_valid pode devolver GeometryCollection (poligono + linhas soltas): fica so com a parte poligonal."""
    if isinstance(geom, GeometryCollection) and not isinstance(geom, MultiPolygon):
        partes = [g for g in geom.geoms if g.geom_type in ("Polygon", "MultiPolygon")]
        return unary_union(partes) if partes else geom
    return geom


def reparar_geometrias(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Repara geometrias invalidas (make_valid) em vez de descarta-las, e remove so as nulas e as vazias.

    Antes os conversores faziam `gdf[gdf.geometry.is_valid]`, que apaga em silencio os poligonos com
    auto-intersecao (e a area deles some da analise). Nao altera o original; mantem atributos e CRS."""
    out = gdf.copy()
    reparadas = out.geometry.make_valid()
    out["geometry"] = reparadas.apply(lambda g: _somente_poligonos(g) if g is not None else g)
    return out[out.geometry.notna() & ~out.geometry.is_empty].copy()

