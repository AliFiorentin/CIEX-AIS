"""
Populacao atingida nas 12 simulacoes de intervencao e no cenario de 16/05/2024, calculada no raster de populacao de 100 m.

Fonte: WorldPop 2024 Constrained, bra_pop_2024_CN_100m_R2025A_v1.tif (RAW/populacao/, pessoas por pixel, EPSG:4326),
a mesma da origem dos dados de Rio Grande (BID/pipeline/09_populacao.py). Metodo identico ao da origem:

    pop_atingida = soma dos pixels (> 0) cujo centro cai dentro de (mancha ∩ limite municipal)

`pct_atingida` usa o `pop_total` que ja esta em populacao_atingida.json (198.418, o mesmo de toda a interface); o
raster dentro do limite do IBGE soma 198.220 (0,1% a menos, so a borda do limite).

Validacao (feita ao criar o script): o mesmo calculo sobre as manchas dos cenarios antigos com valor exato da origem
da 7.987 contra 7.844 (Setembro 2023), 23.150 contra 23.058 (Maio 2024) e 80.046 contra 80.124 (Maio 2024 + 50%),
diferencas de 0,1% a 1,8% (geometria da mancha atualizada depois). Por isso estes valores sao rotulados como
"calculada", nao "estimada". Substitui o proxy do alfa de populacao.png para as simulacoes.

O cenario do 16/05/2024 (Nivel da Lagoa + Chuva Acumulada) tinha uma estimativa por proxy do alfa de populacao.png
(18.000 hab.); com o raster passa a ter o valor calculado, igual ao das demais.

Grava em public/dados_convertidos/populacao_atingida.json, em Rio Grande.cenarios[nome sem acento], e o comparativo
(gerar_comparativo_intervencoes.py) as le dali.

Uso:  python scripts/calcular_populacao_intervencoes.py
"""

from __future__ import annotations

import json
import sys
import unicodedata
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.mask import mask

sys.path.insert(0, str(Path(__file__).resolve().parent))

from cenarios_intervencao import nome_cenario, scenario_slug, todos  # noqa: E402
from raw_paths import POP_100M  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DASH = ROOT / "public" / "dados_convertidos"
POP_JSON = DASH / "populacao_atingida.json"
CENARIOS_DIR = DASH / "rio_grande" / "cenarios"
LIMITE = ROOT / "scripts" / "data" / "rio_grande_limite.geojson"
# Cenarios fora das 12 simulacoes que tambem sao calculados aqui: nome -> slug do arquivo da mancha
EXTRAS = {
    "Nível da Lagoa + Chuva Acumulada – 16/05/2024": "rio_grande___nivel_da_lagoa_chuva_acumulada_16_05_2024",
}


def sem_acento(s: str) -> str:
    """Mesma normalizacao da interface (remove acentos, mantem o resto)."""
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def soma_no_raster(src: rasterio.DatasetReader, gdf: gpd.GeoDataFrame) -> float:
    """Soma dos pixels positivos cujo centro esta dentro das geometrias (all_touched=False, como na origem)."""
    nodata = src.nodata if src.nodata is not None else -9999
    shapes = [g.__geo_interface__ for g in gdf.geometry]
    arr, _ = mask(src, shapes, crop=True, nodata=nodata, all_touched=False)
    a = arr[0].astype("float64")
    return float(a[np.isfinite(a) & (a != nodata) & (a > 0)].sum())


def pop_na_mancha(src: rasterio.DatasetReader, mancha_path: Path, limite: gpd.GeoDataFrame) -> float:
    """Populacao dentro de mancha ∩ limite municipal (a mancha e saneada com buffer(0) antes do recorte)."""
    mancha = gpd.read_file(mancha_path).to_crs(limite.crs)
    mancha["geometry"] = mancha.geometry.buffer(0)
    mancha = gpd.clip(mancha, limite)
    if mancha.empty:
        return 0.0
    return soma_no_raster(src, mancha)


def main() -> None:
    if not POP_100M.exists():
        raise SystemExit(f"Falta o raster de populacao: {POP_100M} (ver RAW/LEIAME.md)")
    dados = json.loads(POP_JSON.read_text(encoding="utf-8"))
    rg = dados["Rio Grande"]
    pop_total = rg["pop_total"]
    limite = gpd.read_file(LIMITE).to_crs("EPSG:4326")

    with rasterio.open(POP_100M) as src:
        print(f"pop_total no JSON: {pop_total}; raster dentro do limite: {soma_no_raster(src, limite):.0f}")
        for evento, variante in todos():
            nome = nome_cenario(evento, variante)
            pop = round(pop_na_mancha(src, CENARIOS_DIR / f"{scenario_slug(nome)}.geojson", limite))
            rg.setdefault("cenarios", {})[sem_acento(nome)] = {
                "pop_atingida": pop,
                "pct_atingida": round(100 * pop / pop_total, 1),
                "_metodologia": (
                    "calculado: soma do raster WorldPop 2024 de 100 m dentro da mancha e do limite municipal "
                    "-- ver scripts/calcular_populacao_intervencoes.py"
                ),
            }
            print(f"  {nome}: {pop} hab. ({100 * pop / pop_total:.1f}%)")

        for nome, slug in EXTRAS.items():
            antes = rg.get("cenarios", {}).get(sem_acento(nome), {}).get("pop_atingida")
            pop = round(pop_na_mancha(src, CENARIOS_DIR / f"{slug}.geojson", limite))
            rg["cenarios"][sem_acento(nome)] = {
                "pop_atingida": pop,
                "pct_atingida": round(100 * pop / pop_total, 1),
                "_metodologia": (
                    "calculado: soma do raster WorldPop 2024 de 100 m dentro da mancha e do limite municipal "
                    "-- ver scripts/calcular_populacao_intervencoes.py"
                ),
            }
            print(f"  {nome}: {pop} hab. ({100 * pop / pop_total:.1f}%); antes (estimado): {antes}")

    POP_JSON.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Salvo em {POP_JSON}")


if __name__ == "__main__":
    main()
