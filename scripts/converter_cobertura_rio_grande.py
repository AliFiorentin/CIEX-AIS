"""
Converte o TIFF de Cobertura 30m do MapBiomas (Colecao 10) para GeoJSONs do dashboard CIEX.
Inclui todas as classes exceto Agua/Ambiente Marinho e Area Nao Vegetada.

Classes incluidas:
  9  = Silvicultura
  11 = Campo Alagado e Area Pantanosa
  12 = Formacao Campestre
  21 = Mosaico de Usos
  39 = Soja
  40 = Arroz
  41 = Outras Lavouras Temporarias
  49 = Restinga Arborea
  50 = Restinga Herbacea

Classes excluidas:
  Agua/Ambiente Marinho: 33 (Rio/Lago/Oceano), 31 (Aquicultura)
  Area Nao Vegetada: 23 (Praia/Duna), 24 (Area Urbanizada), 25 (Outras Areas nao Vegetadas), 30, 75

Gera:
  public/dados_convertidos/rio_grande/cobertura_BASE.fgb
  public/dados_convertidos/rio_grande/cenarios/
    cobertura_ATINGIDOS_rio_grande___<cenario>.fgb  (um por cenario; o app le .fgb)

Requer: rasterio, geopandas, numpy, shapely (conda: climada_env)
Uso:    conda run -n climada_env python scripts/converter_cobertura_rio_grande.py
"""

import re
import unicodedata
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.features import shapes
from rasterio.mask import mask as rasterio_mask
from shapely.geometry import shape

from filtro_ruido import MIN_FRAGMENTO_HA, remover_fragmentos

# -- Configuracao --------------------------------------------------------------

ROOT     = Path(__file__).parent.parent
TIFF     = ROOT / "scripts/data/cobertura_30m_mapbiomas.tif"
LIMITE   = ROOT / "scripts/data/rio_grande_limite.geojson"
OUT_BASE     = ROOT / "public/dados_convertidos/rio_grande/cobertura_BASE.fgb"
CENARIOS_DIR = ROOT / "public/dados_convertidos/rio_grande/cenarios"

CLASSES = {
    9:  "Silvicultura",
    11: "Campo Alagado e Area Pantanosa",
    12: "Formacao Campestre",
    21: "Mosaico de Usos",
    # 39 Soja / 40 Arroz / 41 Outras Lavouras tratadas pela camada Agricultura
    49: "Restinga Arborea",
    50: "Restinga Herbacea",
}

CENARIOS = {
    "cenario_setembro_2023": "rio_grande___cenario_setembro_2023.geojson",
    "cenario_maio_2024":    "rio_grande___cenario_maio_2024.geojson",
    "cenario_maio_2024_50": "rio_grande___cenario_maio_2024_50.geojson",
    "nivel_da_lagoa_chuva_acumulada_16_05_2024": "rio_grande___nivel_da_lagoa_chuva_acumulada_16_05_2024.geojson",
}

# ~30m (1 pixel). Com 0.001 (~100m) a Restinga Arborea perdia area mesmo sem o filtro; ver
# filtro_ruido.py para o corte de fragmentos (0,5 ha em hectares reais, nao em graus**2).
SIMPLIFY_TOL  = 0.0003


def vectorizar_tiff(tiff_path: Path, limite_path: Path) -> gpd.GeoDataFrame:
    print(f"  Lendo limite: {limite_path.name}...")
    limite = gpd.read_file(limite_path).to_crs("EPSG:4326")
    shapes_limite = [f.__geo_interface__ for f in limite.geometry]

    print(f"  Lendo {tiff_path.name} e clipando ao municipio...")
    with rasterio.open(tiff_path) as src:
        band_clipped, transform = rasterio_mask(src, shapes_limite, crop=True, nodata=0)
        band = band_clipped[0]
        crs  = src.crs

    mascara = np.isin(band, list(CLASSES.keys()))
    print(f"    Pixels incluidos: {mascara.sum():,}")

    geoms = []
    for geom, val in shapes(band, mask=mascara.astype(np.uint8), transform=transform):
        classe = int(val)
        if classe in CLASSES:
            geoms.append({
                "geometry":     shape(geom),
                "classe":       classe,
                "tipo_classe":  CLASSES[classe],
            })

    gdf = gpd.GeoDataFrame(geoms, crs=crs).to_crs("EPSG:4326")
    print(f"    {len(gdf):,} poligonos antes da simplificacao")

    # Descarta ruido de vetorizacao (fragmentos < 0,5 ha, medidos em m2) antes de simplificar/dissolver
    gdf = remover_fragmentos(gdf)
    print(f"    {len(gdf):,} poligonos apos filtro de ruido (>= {MIN_FRAGMENTO_HA} ha)")
    gdf["geometry"] = gdf["geometry"].simplify(SIMPLIFY_TOL, preserve_topology=True)
    gdf["geometry"] = gdf["geometry"].buffer(0)  # repara topologia invalida
    gdf = gdf[gdf.geometry.is_valid & (gdf.geometry.area > 0)].copy()
    limite_valido = limite.copy()
    limite_valido["geometry"] = limite_valido["geometry"].buffer(0)
    gdf = gpd.clip(gdf, limite_valido)
    print(f"    {len(gdf):,} poligonos apos simplificacao e clip")

    gdf = gdf.dissolve(by="tipo_classe").reset_index()
    gdf["classe"] = gdf["tipo_classe"].map({v: k for k, v in CLASSES.items()})
    print(f"    {len(gdf):,} classes apos dissolve")

    # Suaviza bordas de pixel com buffer round-trip
    gdf["geometry"] = gdf.geometry.buffer(0.0003, join_style=1, resolution=8).buffer(-0.0003, join_style=1, resolution=8)
    gdf = gdf[gdf.geometry.is_valid & (gdf.geometry.area > 0)].copy()

    return gdf[["tipo_classe", "classe", "geometry"]]


def salvar_fgb(gdf: gpd.GeoDataFrame, path: Path) -> None:
    """FlatGeobuf e o formato que o app le (flatgeobuf.geojson.deserialize)."""
    if gdf is None or len(gdf) == 0:
        # Sem feicoes = sem arquivo (o app trata 404 como "nada atingido"). Remove o antigo para nao
        # deixar um resultado desatualizado no lugar.
        if path.exists():
            path.unlink()
            print(f"    (vazio) {path.name} removido (arquivo antigo desatualizado)")
        else:
            print(f"    (vazio) {path.name} nao gerado")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_file(path, driver="FlatGeobuf")
    print(f"    Salvo: {path.name} ({path.stat().st_size / 1024:.0f} KB)")


def intersectar_com_cenario(base: gpd.GeoDataFrame, mancha_path: Path) -> gpd.GeoDataFrame:
    mancha = gpd.read_file(mancha_path).to_crs("EPSG:4326")
    atingidos = gpd.overlay(base, mancha[["geometry"]], how="intersection")
    return atingidos[["tipo_classe", "classe", "geometry"]].copy()


# -- Main ----------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Converter Cobertura 30m MapBiomas (Col.10) -> GeoJSON ===\n")

    print("1. Vetorizando TIFF...")
    base = vectorizar_tiff(TIFF, LIMITE)

    print("\n2. Salvando BASE...")
    salvar_fgb(base, OUT_BASE)

    print("\n3. Intersectando com cenarios...")
    for slug, mancha_file in CENARIOS.items():
        mancha_path = CENARIOS_DIR / mancha_file
        if not mancha_path.exists():
            print(f"    AVISO: {mancha_file} nao encontrado -- pulando")
            continue
        print(f"  {slug}...")
        atingidos = intersectar_com_cenario(base, mancha_path)
        salvar_fgb(atingidos, CENARIOS_DIR / f"cobertura_ATINGIDOS_rio_grande___{slug}.fgb")

    print("\nConcluido.")
