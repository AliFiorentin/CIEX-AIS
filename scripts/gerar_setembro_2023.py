"""
Gera, para o Cenario Setembro 2023, so o que a fonte externa NAO fornece.

A fonte externa fornece a mancha e os ATINGIDOS de empresas, educacao, saude, logradouros e agricultura (+ stats) de
Setembro 2023, e `sincronizar_dados_externos.py` copia esses arquivos (docs/dados-externos-rio-grande.md). Este script
os reescrevia a partir das BASEs do CIEX, em conflito com essa politica; agora nao toca neles.

Gera apenas camadas que sao so do CIEX:
  - patrimonio_ATINGIDOS (a fonte externa nao tem patrimonio historico)
  - infra_quadras / infra_terrenos _ATINGIDOS em .fgb, com forma original (intersect_whole), que o sync mantem
Cobertura e agricultura de Setembro 2023 vem de converter_cobertura_rio_grande.py e
converter_agricultura_rio_grande.py (que ja incluem este cenario e aplicam o filtro de ruido).

Uso: python scripts/gerar_setembro_2023.py
"""

from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).parent.parent
DASH = ROOT / "public" / "dados_convertidos" / "rio_grande"
CENARIOS_DIR = DASH / "cenarios"
INFRA_DIR = DASH / "infraestrutura"

SLUG = "rio_grande___cenario_setembro_2023"
TARGET_CRS = "EPSG:4326"


def intersect_whole(base: gpd.GeoDataFrame, mancha: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    res = gpd.sjoin(base, mancha[["geometry"]], how="inner", predicate="intersects")
    return res[base.columns].drop_duplicates()


def salvar_geojson(gdf, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if gdf is None or len(gdf) == 0:
        print(f"    (vazio) {path.name} nao salvo")
        return
    gdf.to_crs(TARGET_CRS).to_file(path, driver="GeoJSON")
    print(f"    salvo {path.name} ({len(gdf)} feats)")


def salvar_fgb(gdf, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if gdf is None or len(gdf) == 0:
        print(f"    (vazio) {path.name} nao salvo")
        return
    gdf.to_crs(TARGET_CRS).to_file(path, driver="FlatGeobuf")
    print(f"    salvo {path.name} ({len(gdf)} feats)")


def main() -> None:
    mancha = gpd.read_file(CENARIOS_DIR / f"{SLUG}.geojson").to_crs(TARGET_CRS)
    print(f"Mancha Setembro 2023: {len(mancha)} feature(s)")

    print("Patrimonio historico...")
    base = gpd.read_file(DASH / "patrimonio_BASE.geojson").to_crs(TARGET_CRS)
    salvar_geojson(intersect_whole(base, mancha), CENARIOS_DIR / f"patrimonio_ATINGIDOS_{SLUG}.geojson")

    print("Quadras e Terrenos (forma original)...")
    for slug, fname in [("quadras", "quadras_BASE.fgb"), ("terrenos", "terrenos_BASE.fgb")]:
        base = gpd.read_file(INFRA_DIR / fname).to_crs(TARGET_CRS)
        salvar_fgb(intersect_whole(base, mancha), CENARIOS_DIR / f"infra_{slug}_ATINGIDOS_{SLUG}.fgb")

    print("\nConcluido.")


if __name__ == "__main__":
    main()
