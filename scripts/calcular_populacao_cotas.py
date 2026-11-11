"""
Populacao atingida em cada cota da "Simulacao por Cotas" (pico de 21/05/2024), calculada no raster de populacao de 100 m.

Fonte: WorldPop 2024 Constrained, bra_pop_2024_CN_100m_R2025A_v1.tif (RAW/populacao/, pessoas por pixel, EPSG:4326) e as
mascaras molhado/seco por cota (RAW/cotas-pico-2024-05-21/, 6 bacias x cotas, binarias, 1 m, EPSG:31982). Metodo identico ao
de calcular_populacao_intervencoes.py:

    pop_atingida(cota) = soma dos pixels (> 0) da populacao cujo centro cai em (mancha da cota ∩ limite municipal)

A mancha de cada cota e a uniao das bacias. O valor e ACUMULADO: um pixel molhado numa cota menor continua contando nas maiores
(mesmo criterio de `gerar_cota_mapa.py`, "primeira cota em que alaga"), entao a serie e monotonica. As cotas sao as de
`cota_mapa.json` (o painel e o slider seguem essa lista).

Grava em public/dados_convertidos/populacao_atingida.json, em Rio Grande.cotas:
    {"_metodologia": "...", "por_cota": [{"cota": 1.0, "pop_atingida": N, "pct_atingida": P}, ...]}
na mesma ordem de `cota_mapa.json`. `pct_atingida` usa o `pop_total` do proprio JSON (o mesmo de toda a interface).
O painel (app/page.tsx, lib/cotas.ts `popAtingidaNaCota`) le dali.

Uso:  python scripts/calcular_populacao_cotas.py   (requer numpy, rasterio, geopandas, pyproj)
"""

from __future__ import annotations

import glob
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from raw_paths import COTAS_PICO, POP_100M  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DASH = ROOT / "public" / "dados_convertidos"
POP_JSON = DASH / "populacao_atingida.json"
COTA_MAPA = DASH / "rio_grande" / "cota_mapa.json"
LIMITE = ROOT / "scripts" / "data" / "rio_grande_limite.geojson"

METODOLOGIA = (
    "calculado: soma do raster WorldPop 2024 de 100 m dentro da mancha de cada cota (uniao das bacias, acumulada) e do "
    "limite municipal -- ver scripts/calcular_populacao_cotas.py"
)


def pasta_da_cota(cota: float) -> str:
    """1.0 -> '100cm'; 2.6215 -> '262_15cm' (nome das pastas das mascaras brutas; igual a gerar_cota_mapa.py)."""
    return f"{cota * 100:g}".replace(".", "_") + "cm"


def somar_acumulado(pop: np.ndarray, dentro: np.ndarray, molhados: list[np.ndarray]) -> list[float]:
    """Populacao atingida acumulada por cota.

    `pop` = pessoas por pixel (valores <= 0 ou nao finitos sao ignorados); `dentro` = pixels cujo centro esta no limite
    municipal; `molhados` = uma mascara booleana por cota, em ordem crescente, na mesma grade de `pop`. Um pixel molhado
    numa cota continua contando nas seguintes, mesmo que a mascara de uma cota maior o mostre seco.
    """
    valido = np.isfinite(pop) & (pop > 0) & dentro
    acumulado = np.zeros(pop.shape, dtype=bool)
    saida: list[float] = []
    for molhado in molhados:
        acumulado |= molhado
        saida.append(float(pop[valido & acumulado].sum()))
    return saida


def molhado_na_grade(arquivos: list[str], xs: np.ndarray, ys: np.ndarray, transformer) -> np.ndarray:
    """Mascara booleana (grade de `xs`/`ys`, centros dos pixels de populacao em EPSG:4326) dos pontos molhados em alguma bacia."""
    import rasterio

    x, y = transformer.transform(xs.ravel(), ys.ravel())
    x, y = np.asarray(x), np.asarray(y)
    molhado = np.zeros(xs.size, dtype=bool)
    for arq in arquivos:
        with rasterio.open(arq) as src:
            # linha/coluna do ponto na mascara (grade norte-acima, sem rotacao)
            coluna_f, linha_f = ~src.transform * (x, y)
            linha, coluna = np.floor(linha_f).astype(np.int64), np.floor(coluna_f).astype(np.int64)
            ok = (linha >= 0) & (linha < src.height) & (coluna >= 0) & (coluna < src.width)
            if not ok.any():
                continue
            arr = src.read(1)
            molhado[ok] |= arr[linha[ok], coluna[ok]] > 0
    return molhado.reshape(xs.shape)


def main() -> None:
    import geopandas as gpd
    import rasterio
    from pyproj import Transformer
    from rasterio.features import geometry_mask
    from rasterio.warp import transform_bounds
    from rasterio.windows import Window, from_bounds

    if not POP_100M.exists():
        raise SystemExit(f"Falta o raster de populacao: {POP_100M} (ver RAW/LEIAME.md)")
    meta = json.loads(COTA_MAPA.read_text(encoding="utf-8"))
    cotas: list[float] = meta["cotas"]
    dados = json.loads(POP_JSON.read_text(encoding="utf-8"))
    rg = dados["Rio Grande"]
    pop_total = rg["pop_total"]
    limite = gpd.read_file(LIMITE).to_crs("EPSG:4326")

    arquivos_por_cota: list[list[str]] = []
    for cota in cotas:
        pasta = COTAS_PICO / pasta_da_cota(cota)
        arquivos = sorted(glob.glob(str(pasta / "*.tif")))
        if not arquivos:
            raise SystemExit(f"Sem mascaras em {pasta}")
        arquivos_por_cota.append(arquivos)

    # janela do raster de populacao que cobre todas as mascaras (em EPSG:4326)
    caixas = []
    for arquivos in arquivos_por_cota:
        for arq in arquivos:
            with rasterio.open(arq) as src:
                caixas.append(transform_bounds(src.crs, "EPSG:4326", *src.bounds))
    oeste, sul = min(c[0] for c in caixas), min(c[1] for c in caixas)
    leste, norte = max(c[2] for c in caixas), max(c[3] for c in caixas)

    with rasterio.open(POP_100M) as src:
        janela = from_bounds(oeste, sul, leste, norte, src.transform).round_offsets().round_lengths()
        janela = Window(janela.col_off - 1, janela.row_off - 1, janela.width + 2, janela.height + 2)
        nodata = src.nodata
        pop = src.read(1, window=janela).astype("float64")
        transform = src.window_transform(janela)
    if nodata is not None:
        pop[pop == nodata] = np.nan

    linhas, colunas = np.indices(pop.shape)
    xs, ys = rasterio.transform.xy(transform, linhas, colunas, offset="center")
    xs, ys = np.asarray(xs).reshape(pop.shape), np.asarray(ys).reshape(pop.shape)
    dentro = geometry_mask(
        [g.__geo_interface__ for g in limite.geometry],
        out_shape=pop.shape,
        transform=transform,
        invert=True,
        all_touched=False,
    )

    # cada mascara tem o seu CRS (EPSG:31982 em todas, conferido abaixo)
    crs = set()
    for arquivos in arquivos_por_cota:
        for arq in arquivos:
            with rasterio.open(arq) as src:
                crs.add(src.crs.to_string())
    if len(crs) != 1:
        raise SystemExit(f"Mascaras com CRS diferentes: {crs}")
    transformer = Transformer.from_crs("EPSG:4326", crs.pop(), always_xy=True)

    molhados = [molhado_na_grade(arquivos, xs, ys, transformer) for arquivos in arquivos_por_cota]
    soma = somar_acumulado(pop, dentro, molhados)

    valido = np.isfinite(pop) & (pop > 0) & dentro
    print(f"pop_total no JSON: {pop_total}; raster dentro do limite (janela): {pop[valido].sum():.0f}")
    por_cota = []
    for cota, s in zip(cotas, soma):
        n = round(s)
        por_cota.append({"cota": cota, "pop_atingida": n, "pct_atingida": round(100 * n / pop_total, 1)})
        print(f"  cota {cota} m: {n} hab. ({100 * n / pop_total:.1f}%)")

    rg["cotas"] = {"_metodologia": METODOLOGIA, "por_cota": por_cota}
    POP_JSON.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Salvo em {POP_JSON}")


if __name__ == "__main__":
    main()
