"""
Funcoes de raster/vetor compartilhadas pelos conversores de mancha (converter_manchas_altura.py e
converter_intervencoes.py): grade compartilhada, reprojecao, suavizacao, vetorizacao, salvamento e cruzamento
espacial com as camadas base (gerar_atingidos).

Extraido de converter_manchas_altura.py sem mudar o comportamento.
"""

from __future__ import annotations  # `X | None` nas anotacoes tambem no Python 3.9

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image
from rasterio.features import shapes as rio_shapes
from rasterio.warp import Resampling, calculate_default_transform, reproject
from scipy.ndimage import gaussian_filter
from shapely.geometry import shape

from filtro_ruido import reparar_geometrias

ROOT = Path(__file__).resolve().parent.parent
DASH = ROOT / "public" / "dados_convertidos" / "rio_grande"
CENARIOS_DIR = DASH / "cenarios"
INFRA_DIR = DASH / "infraestrutura"

TARGET_CRS = "EPSG:4326"
AREA_CRS = "EPSG:31982"  # SIRGAS 2000 / UTM 22S -- mesmo CRS de origem dos TIFFs


def compute_shared_grid(all_tif_paths: list[Path]):
    opened = [rasterio.open(p) for p in all_tif_paths if p.exists()]
    src_crs = opened[0].crs
    px = abs(opened[0].transform.a)

    lefts   = [s.bounds.left   for s in opened]
    rights  = [s.bounds.right  for s in opened]
    bottoms = [s.bounds.bottom for s in opened]
    tops    = [s.bounds.top    for s in opened]
    union_bounds = (min(lefts), min(bottoms), max(rights), max(tops))
    union_w = int(round((union_bounds[2] - union_bounds[0]) / px))
    union_h = int(round((union_bounds[3] - union_bounds[1]) / px))
    for s in opened:
        s.close()

    dst_transform, w, h = calculate_default_transform(
        src_crs, TARGET_CRS, union_w, union_h, *union_bounds
    )
    return src_crs, dst_transform, w, h

def reproject_group(tif_paths: list[Path], src_crs, dst_transform, w: int, h: int) -> np.ndarray:
    """Reprojeta e combina (ultimo valido vence) um grupo de TIFFs de bacia na
    grade compartilhada. Nao usa rasterio.merge.merge(): nesta instalacao
    (rasterio 1.5.1) ela retorna um array zerado mesmo para um unico arquivo
    de entrada (bug verificado isoladamente)."""
    dst = np.full((h, w), np.nan, dtype=np.float32)
    for p in tif_paths:
        if not p.exists():
            continue
        with rasterio.open(p) as src:
            tmp = np.full((h, w), np.nan, dtype=np.float32)
            reproject(
                source=rasterio.band(src, 1),
                destination=tmp,
                src_transform=src.transform,
                src_crs=src_crs,
                dst_transform=dst_transform,
                dst_crs=TARGET_CRS,
                src_nodata=src.nodata,
                dst_nodata=np.nan,
                resampling=Resampling.nearest,
            )
        m = ~np.isnan(tmp)
        dst[m] = tmp[m]
    return dst

def smooth_band(band: np.ndarray, sigma: float) -> np.ndarray:
    """Suaviza um campo continuo com um blur gaussiano ciente de NaN (normaliza
    pela mascara de validade borrada, para nao vazar zeros nas bordas dos
    dados). Usado só para a Lagoa: sua rampa é multi-classe (6 cores) e se
    beneficia de um gradiente contínuo suave. NÃO usar isto para decidir a
    área "atingida" (ver `smooth_mask`) — borrar o VALOR antes de comparar
    contra um limiar estreito (como o da Chuva, 86-253, entre "seco" e "água
    pré-existente") apaga a maior parte da área: testado empiricamente, sigma
    2.5 nesse limiar estreito derruba a contagem de pixels válidos para ~54%
    do original, contra ~94% suavizando a máscara booleana."""
    valid = ~np.isnan(band)
    if not valid.any():
        return band
    filled = np.where(valid, band, 0.0).astype(np.float32)
    weight = valid.astype(np.float32)
    blurred_vals = gaussian_filter(filled, sigma=sigma)
    blurred_weight = gaussian_filter(weight, sigma=sigma)
    with np.errstate(invalid="ignore", divide="ignore"):
        result = blurred_vals / blurred_weight
    result[blurred_weight < 0.5] = np.nan
    return result.astype(np.float32)

def smooth_mask(mask: np.ndarray, sigma: float) -> np.ndarray:
    """Remove ruído sal-e-pimenta de uma máscara booleana por votação de
    maioria: borra a máscara (como float 0/1) e re-classifica em >=0.5. Ao
    contrário de borrar o valor contínuo antes de comparar com um limiar,
    isto não "empurra" pixels para fora de faixas estreitas — funciona igual
    para o limiar aberto da Lagoa (>=45cm) e para a faixa estreita da Chuva
    (86-253)."""
    blurred = gaussian_filter(mask.astype(np.float32), sigma=sigma)
    return blurred >= 0.5

def downsample_mask(mask: np.ndarray, factor: int) -> np.ndarray:
    """Reduz o mask por `factor`x, por votacao de maioria (>= 50% do bloco molhado), para reduzir
    drasticamente a contagem de vertices antes de vetorizar (pixels nativos ~1m sao overkill para uma
    mancha exibida em mapa web).

    Nao usar max-pool (`any`): um unico pixel molhado em 16 molhava o bloco inteiro e inflava a mancha
    (7,05 km2 contra 5,79 km2 pelo limiar bruto no cenario de 16/05/2024)."""
    h, w = mask.shape
    h2, w2 = h // factor, w // factor
    trimmed = mask[: h2 * factor, : w2 * factor]
    return trimmed.reshape(h2, factor, w2, factor).mean(axis=(1, 3)) >= 0.5

def vectorize_mask(mask: np.ndarray, transform, downsample_factor: int = 4) -> gpd.GeoDataFrame | None:
    pooled = downsample_mask(mask, downsample_factor)
    pooled_transform = transform * rasterio.Affine.scale(downsample_factor)

    geoms = [
        shape(g) for g, v in rio_shapes(pooled.astype(np.uint8), mask=pooled, transform=pooled_transform)
        if v == 1
    ]
    if not geoms:
        return None
    gdf = gpd.GeoDataFrame(geometry=geoms, crs=TARGET_CRS)
    diss = gdf.union_all()
    diss = diss.buffer(0)  # repara topologia
    # Pre-simplifica antes do buffer de suavizacao: sem isso, o round-trip de
    # buffer abaixo fica lento demais na geometria bruta (segue o grid de
    # pixel, com contagem de vertices enorme).
    diss = diss.simplify(0.00002, preserve_topology=True)

    # Suaviza o contorno "escada de pixel" com abertura+fechamento (juntas
    # arredondadas) -- sem isso, poligonos clipados contra essa mancha
    # (Quadras, Terrenos, Cobertura, Agricultura) herdam bordas picotadas
    # seguindo o grid de pixel da mascara, em vez de cantos retos/naturais.
    r = 0.00008  # ~8m
    diss = diss.buffer(r, join_style=1, resolution=6).buffer(-r, join_style=1, resolution=6)  # fecha vaos
    diss = diss.buffer(-r, join_style=1, resolution=6).buffer(r, join_style=1, resolution=6)  # remove espinhos
    diss = diss.simplify(r * 0.5, preserve_topology=True)

    if diss.is_empty:
        return None
    return gpd.GeoDataFrame(geometry=[diss], crs=TARGET_CRS)

def salvar_geojson(gdf: gpd.GeoDataFrame | None, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if gdf is None or len(gdf) == 0:
        print(f"    (vazio) {path.name} nao salvo")
        return
    gdf.to_crs(TARGET_CRS).to_file(path, driver="GeoJSON")
    print(f"    salvo {path.name} ({len(gdf)} feats, {path.stat().st_size // 1024} KB)")

def salvar_fgb(gdf: gpd.GeoDataFrame | None, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if gdf is None or len(gdf) == 0:
        print(f"    (vazio) {path.name} nao salvo")
        return
    gdf.to_crs(TARGET_CRS).to_file(path, driver="FlatGeobuf")
    print(f"    salvo {path.name} ({len(gdf)} feats, {path.stat().st_size // 1024} KB)")

def salvar_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")
    print(f"    salvo {path.name} ({path.stat().st_size // 1024} KB, {img.size[0]}x{img.size[1]} px)")

def intersect_whole(base: gpd.GeoDataFrame, mancha: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Inclui a feicao inteira (geometria original, sem recorte) se ela
    intersecta a mancha. Usado para pontos (nao ha o que recortar) e para
    poligonos discretos como Quadras/Terrenos: essas unidades cadastrais
    devem manter sua forma original (ex.: retangular) -- recorta-las contra
    o contorno da mancha (que segue o grid do raster, mesmo suavizado) as
    deixa com bordas picotadas/triangulos finos que nao existem no dado
    original."""
    res = gpd.sjoin(base, mancha[["geometry"]], how="inner", predicate="intersects")
    return res[base.columns].drop_duplicates()

def intersect_lines_polys(base: gpd.GeoDataFrame, mancha: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    data_cols = [c for c in base.columns if c != "geometry"]
    try:
        res = gpd.overlay(base, mancha[["geometry"]], how="intersection", keep_geom_type=True)
    except Exception:
        res = gpd.overlay(base, mancha[["geometry"]], how="intersection")
    cols = [c for c in data_cols if c in res.columns] + ["geometry"]
    res = res[cols].copy()
    res = reparar_geometrias(res)
    return res



def gerar_atingidos(mancha: gpd.GeoDataFrame, sslug: str) -> None:
    """Cruza a mancha com as camadas base e grava `{camada}_ATINGIDOS_{sslug}` e `agricultura_stats_{sslug}.json`
    em CENARIOS_DIR (empresas, educacao, saude, patrimonio, infraestrutura, cobertura e agricultura)."""
    print("4. Cruzando com camadas base (empresas/educacao/saude/patrimonio)...")
    for setor, fname in [("empresas", "empresas_BASE.geojson"),
                          ("educacao", "educacao_BASE.geojson"),
                          ("saude", "saude_BASE.geojson"),
                          ("patrimonio", "patrimonio_BASE.geojson")]:
        base = gpd.read_file(DASH / fname).to_crs(TARGET_CRS)
        atingidos = intersect_whole(base, mancha)
        salvar_geojson(atingidos, CENARIOS_DIR / f"{setor}_ATINGIDOS_{sslug}.geojson")

    print("5. Cruzando com infraestrutura...")
    # Quadras/Terrenos usam intersect_whole (mantem a forma original, ex.:
    # retangular) em vez de recorte -- sao unidades cadastrais discretas, nao
    # faz sentido cortar contra o contorno irregular da mancha. Logradouros
    # (linhas) continuam recortados: ver qual trecho da rua foi atingido e
    # relevante. Predios Publicos/Seguranca foram removidos do dashboard
    # (INFRA_LAYERS em page.tsx) -- nao gerar mais esses arquivos.
    infra_specs = [
        ("logradouros", "logradouros_BASE.geojson", "line",       "geojson"),
        ("quadras",     "quadras_BASE.fgb",         "poly_whole", "fgb"),
        ("terrenos",    "terrenos_BASE.fgb",        "poly_whole", "fgb"),
    ]
    for slug, fname, geomtype, ext in infra_specs:
        base = gpd.read_file(INFRA_DIR / fname).to_crs(TARGET_CRS)
        atingidos = intersect_whole(base, mancha) if geomtype in ("point", "poly_whole") else intersect_lines_polys(base, mancha)
        out = CENARIOS_DIR / f"infra_{slug}_ATINGIDOS_{sslug}.{ext}"
        (salvar_fgb if ext == "fgb" else salvar_geojson)(atingidos, out)

    print("6. Cruzando com cobertura e agricultura...")
    cobertura_base = gpd.read_file(DASH / "cobertura_BASE.fgb").to_crs(TARGET_CRS)
    cobertura_ating = intersect_lines_polys(cobertura_base, mancha)
    salvar_fgb(cobertura_ating, CENARIOS_DIR / f"cobertura_ATINGIDOS_{sslug}.fgb")

    agricultura_base = gpd.read_file(DASH / "agricultura_BASE.fgb").to_crs(TARGET_CRS)
    agricultura_ating = intersect_lines_polys(agricultura_base, mancha)
    salvar_fgb(agricultura_ating, CENARIOS_DIR / f"agricultura_ATINGIDOS_{sslug}.fgb")

    print("7. Estatisticas de agricultura (area_ha por cultura)...")
    stats: dict[str, float] = {}
    if agricultura_ating is not None and len(agricultura_ating) > 0 and "tipo_cultura" in agricultura_ating.columns:
        metric = agricultura_ating.to_crs(AREA_CRS)
        for cultura, grp in metric.groupby("tipo_cultura"):
            stats[cultura] = round(grp.geometry.area.sum() / 10_000, 4)
    stats_path = CENARIOS_DIR / f"agricultura_stats_{sslug}.json"
    stats_path.write_text(__import__("json").dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"    salvo {stats_path.name}: {stats}")
