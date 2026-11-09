"""
Regenera `cota_mapa.webp` (raster de cota de alagamento de Rio Grande) a partir das mascaras brutas por cota.

Por que existe: o `cota_mapa.webp` que veio da fonte externa (reduzido por max-pooling em climada_cota_mapa.py) desenhava ~34% mais agua que a declarada em
`cota_mapa.json` (9,19 km2 no pico contra 6,86 km2) e concordava com o indice de cota de apenas 85% das
empresas e 53% das unidades de saude. As mascaras brutas (6 bacias x 6 cotas, binarias, 1 m, EPSG:31982)
conferem com o JSON (6,91 km2 no pico). Este script reduz a resolucao por FRACAO molhada de cada celula
(media, nao max-pool) e so alaga a celula quando >= 50% dela esta molhada.

Formato (o que `hooks/useCotaRaster.ts` le): RGBA lossless; canal R = indice (1..N) da primeira cota em que a
celula alaga (maximo acumulado entre cotas), alfa = 255 onde alaga. A grade (bounds, largura e altura) e a de
`cota_mapa.json`, que nao muda.

Uso:
  RASTER_DIR=/caminho/pico210524_evolucaoPorCota python3 scripts/gerar_cota_mapa.py
  (padrao: RAW/cotas-pico-2024-05-21, ver scripts/raw_paths.py; requer numpy, rasterio, Pillow)
"""

import glob
import json
import os
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_bounds
from rasterio.warp import Resampling, reproject

from raw_paths import COTAS_PICO

ROOT = Path(__file__).resolve().parent.parent
RIO_GRANDE = ROOT / "public" / "dados_convertidos" / "rio_grande"
RASTER_DIR = Path(os.environ.get("RASTER_DIR", COTAS_PICO))
LIMIAR = 0.5  # fracao minima molhada da celula para ela alagar


def pasta_da_cota(cota: float) -> str:
    """1.0 -> '100cm'; 2.6215 -> '262_15cm' (nome das pastas das mascaras brutas)."""
    return f"{cota * 100:g}".replace(".", "_") + "cm"


def indice_primeira_cota(fracoes, limiar: float = LIMIAR) -> np.ndarray:
    """Indice (1..N) da primeira cota em que cada celula alaga; 0 = nunca alaga.

    `fracoes` = uma matriz 2D por cota, em ordem crescente, com a fracao molhada (0..1) de cada celula. Uma
    celula alaga numa cota quando a fracao >= limiar; vale a PRIMEIRA cota (maximo acumulado), mesmo que a
    mascara de uma cota maior a mostre seca."""
    if not len(fracoes):
        raise ValueError("sem cotas")
    idx = np.zeros(np.shape(fracoes[0]), dtype=np.uint8)
    for k, fr in enumerate(fracoes, start=1):
        idx[(idx == 0) & (np.asarray(fr) >= limiar)] = k
    return idx


def fracao_molhada(arquivos, bounds, largura: int, altura: int) -> np.ndarray:
    """Fracao molhada (0..1) de cada celula da grade de saida (EPSG:4326), unindo as bacias (maximo)."""
    destino = from_bounds(*bounds, largura, altura)
    saida = np.zeros((altura, largura), dtype=np.float32)
    for arq in arquivos:
        with rasterio.open(arq) as src:
            parcial = np.zeros((altura, largura), dtype=np.float32)
            reproject(
                source=rasterio.band(src, 1),
                destination=parcial,
                # Os .tif declaram nodata=0. Com src_nodata=None o rasterio herda esse 0 e IGNORA os pixels secos na
                # media (toda celula com 1 pixel molhado viraria 100% molhada, +40% de area). 255 nao existe nos
                # dados, entao o 0 entra na media como "seco".
                src_nodata=255,
                dst_nodata=0,  # fora das bacias = seco (sem isso o destino herda o 255 e vira "agua")
                dst_transform=destino,
                dst_crs="EPSG:4326",
                resampling=Resampling.average,
            )
            saida = np.maximum(saida, parcial)
    return saida


def main() -> None:
    meta = json.loads((RIO_GRANDE / "cota_mapa.json").read_text(encoding="utf-8"))
    west, south, east, north = meta["bounds"]
    largura, altura = meta["width"], meta["height"]

    fracoes = []
    for cota in meta["cotas"]:
        pasta = RASTER_DIR / pasta_da_cota(cota)
        arquivos = sorted(glob.glob(str(pasta / "*.tif")))
        if not arquivos:
            raise SystemExit(f"Sem mascaras em {pasta} (defina RASTER_DIR)")
        fracoes.append(fracao_molhada(arquivos, (west, south, east, north), largura, altura))
        print(f"cota {cota}: {len(arquivos)} bacias lidas")

    idx = indice_primeira_cota(fracoes)
    rgba = np.zeros((altura, largura, 4), dtype=np.uint8)
    rgba[..., 0] = idx
    rgba[..., 3] = np.where(idx > 0, 255, 0)
    destino = RIO_GRANDE / "cota_mapa.webp"
    Image.fromarray(rgba, "RGBA").save(destino, format="WEBP", lossless=True, exact=True)
    print(f"Gravado: {destino} ({destino.stat().st_size / 1024:.0f} KB)")

    # Conferencia: area por cota (km2) pela imagem, com o tamanho medio da celula, contra o JSON.
    lat = (south + north) / 2
    celula_km2 = ((east - west) / largura * 111320 * np.cos(np.radians(lat))) * ((north - south) / altura * 110574) / 1e6
    for k, cota in enumerate(meta["cotas"], start=1):
        area = float(((idx >= 1) & (idx <= k)).sum() * celula_km2)
        decl = meta.get("area_por_cota_km2", [None] * len(meta["cotas"]))[k - 1]
        print(f"  cota {cota}: imagem {area:.3f} km2 | declarado no JSON {decl}")


if __name__ == "__main__":
    main()
