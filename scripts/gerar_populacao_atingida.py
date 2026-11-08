"""
Populacao atingida por cenario -- Rio Grande/RS, a partir do raster real de
populacao do Brasil (WorldPop-style, ~1km, EPSG:4326), fornecido pelo usuario
(nao fazia parte do repositorio -- so o PNG ja renderizado do heatmap estava
disponivel, sem o GeoTIFF original).

Substitui a abordagem aproximada de scripts/estimar_populacao_atingida.py
(que usava o canal alfa do PNG como proxy de densidade) por um calculo direto:
soma de populacao por pixel dentro do limite municipal e dentro de cada mancha
de cenario.

Metodologia:
  pop_total (raster)     = soma dos pixels do raster dentro do limite municipal
  pop_atingida (raster)  = soma dos pixels do raster dentro da mancha ∩ limite
  pct_atingida           = pop_atingida_raster / pop_total_raster * 100

O `pop_total` JA EXISTENTE em populacao_atingida.json (198.418, usado em toda
a UI) e mantido como referencia -- so a FRACAO atingida vem do raster; assim
`pop_atingida = pop_total_existente * pct_atingida`, preservando consistencia
com o numero ja exibido no painel.

Atualiza public/dados_convertidos/populacao_atingida.json, recalculando TODOS
os cenarios de Rio Grande (nao so o novo) para ter uma metodologia uniforme --
os valores antigos ficam registrados no console para comparacao antes de
sobrescrever.

AVISO (2026-11-08): com o raster de 1 km (bra_pd_2020_1km.tif) este metodo NAO reproduz os valores exatos da fonte externa
(Setembro 2023: 15,5% contra 4,0%) e por isso nao e usado em populacao_atingida.json. Ver docs/dados-externos-rio-grande.md.

Uso: python scripts/gerar_populacao_atingida.py
"""

from __future__ import annotations  # `X | None` nas anotacoes tambem no Python 3.9

import json
import math
import os
import unicodedata
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.mask import mask as rasterio_mask

ROOT = Path(__file__).parent.parent
DASH = ROOT / "public" / "dados_convertidos"
POP_JSON = DASH / "populacao_atingida.json"
LIMITE = ROOT / "scripts" / "data" / "rio_grande_limite.geojson"
CENARIOS_DIR = DASH / "rio_grande" / "cenarios"
# O raster nao faz parte do repositorio. Aponte para ele com POP_RASTER=/caminho/bra_pd_2020_1km.tif
# (o valor padrao abaixo e o caminho da maquina onde foi gerado originalmente).
RASTER_PATH = Path(os.environ.get("POP_RASTER", str(Path.home() / "Downloads" / "bra_pd_2020_1km.tif")))

TARGET_CRS = "EPSG:4326"

# O raster "bra_pd_2020_1km" é DENSIDADE (pessoas/km²), não contagem por pixel
# ("pd" = population density; um WorldPop "ppp" seria contagem direta). Cada
# valor de pixel precisa ser multiplicado pela área real do pixel em km² antes
# de somar. A resolução é ~0.0083333° (~1km no equador); a área real encolhe
# com a latitude (longitude "comprime" por cos(lat)). Rio Grande fica entre
# -31.77° e -32.64° -- variação de área desprezível (~1,5%) nessa faixa, então
# uma área de pixel única (na latitude média) é suficiente.
PIXEL_DEG = 0.0083333
LAT_MEDIA = -32.2
KM_POR_GRAU = 111.32
PIXEL_AREA_KM2 = (KM_POR_GRAU * PIXEL_DEG) * (KM_POR_GRAU * math.cos(math.radians(LAT_MEDIA)) * PIXEL_DEG)

# Nomes exibidos no app (app/page.tsx CENARIOS) -> chave usada em
# populacao_atingida.json (mesma normalizacao do frontend: remove acentos,
# mantem o resto -- ver strip_accents).
CENARIOS = {
    "Cenário Maio 2024":                             "rio_grande___cenario_maio_2024",
    "Cenário Maio 2024 + 50%":                        "rio_grande___cenario_maio_2024_50",
    "Cenário Setembro 2023":                          "rio_grande___cenario_setembro_2023",
    "Nível da Lagoa + Chuva Acumulada – 16/05/2024": "rio_grande___nivel_da_lagoa_chuva_acumulada_16_05_2024",
}


def strip_accents(s: str) -> str:
    """Replica a normalizacao usada no frontend (cenario.normalize('NFD').
    replace(/[\\u0300-\\u036f]/g, '')) -- so remove acentos, mantem o resto."""
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def mesclar_cenarios(existentes: dict | None, novos: dict) -> dict:
    """Devolve existentes + novos (novos prevalecem), sem alterar os dicionarios de entrada."""
    return {**(existentes or {}), **novos}


def pop_sum_within(raster_path: Path, geoms: list, nodata: float) -> float:
    """Soma os valores do raster dentro da(s) geometria(s) dada(s) (em
    TARGET_CRS). Usa crop=True + all_touched=False (padrao) para nao superestimar
    -- so conta pixel cujo centro cai dentro da geometria."""
    if not geoms:
        return 0.0
    with rasterio.open(raster_path) as src:
        out_image, _ = rasterio_mask(src, geoms, crop=True, nodata=nodata)
    band = out_image[0]
    valid = band != nodata
    valid &= ~np.isnan(band)
    valid &= band > 0  # descarta negativos residuais de reamostragem, se houver
    return float(band[valid].sum()) * PIXEL_AREA_KM2


def main() -> None:
    if not RASTER_PATH.exists():
        raise SystemExit(f"Raster nao encontrado: {RASTER_PATH}")

    with open(POP_JSON, encoding="utf-8") as f:
        pop_data = json.load(f)

    rg = pop_data["Rio Grande"]
    pop_total_existente = rg["pop_total"]
    print(f"pop_total (ja existente, usado na UI): {pop_total_existente}")

    limite = gpd.read_file(LIMITE).to_crs(TARGET_CRS)
    limite_geoms = [g.__geo_interface__ for g in limite.geometry]

    with rasterio.open(RASTER_PATH) as src:
        nodata = src.nodata if src.nodata is not None else -99999.0

    pop_total_raster = pop_sum_within(RASTER_PATH, limite_geoms, nodata)
    print(f"pop_total (raster, dentro do limite municipal): {pop_total_raster:.1f}")

    print("\nComparando com os valores existentes (validação):")
    novos_cenarios: dict = {}
    for nome_cenario, sslug in CENARIOS.items():
        mancha_path = CENARIOS_DIR / f"{sslug}.geojson"
        if not mancha_path.exists():
            print(f"  AVISO: mancha nao encontrada para '{nome_cenario}' ({mancha_path.name}) -- pulando")
            continue

        mancha = gpd.read_file(mancha_path).to_crs(TARGET_CRS)
        # Restringe ao limite municipal (algumas manchas podem extrapolar levemente)
        mancha_clip = gpd.clip(mancha, limite)
        if mancha_clip.empty:
            print(f"  AVISO: mancha de '{nome_cenario}' nao intersecta o limite -- pulando")
            continue
        mancha_geoms = [g.__geo_interface__ for g in mancha_clip.geometry]

        pop_atingida_raster = pop_sum_within(RASTER_PATH, mancha_geoms, nodata)
        pct_atingida = (pop_atingida_raster / pop_total_raster * 100) if pop_total_raster > 0 else 0.0
        pop_atingida = round(pop_total_existente * pct_atingida / 100)

        cen_key = strip_accents(nome_cenario)
        existente = rg.get("cenarios", {}).get(cen_key)
        print(f"\n  {nome_cenario}")
        print(f"    pop_atingida (raster, bruto): {pop_atingida_raster:.1f}")
        print(f"    pct_atingida: {pct_atingida:.1f}%  ->  pop_atingida (escalado p/ pop_total existente): {pop_atingida}")
        if existente:
            print(f"    valor anterior no JSON: pop_atingida={existente.get('pop_atingida')}, pct={existente.get('pct_atingida')}")

        novos_cenarios[cen_key] = {
            "pop_atingida": pop_atingida,
            "pct_atingida": round(pct_atingida, 1),
        }

    # Mescla (nao substitui): cenario que nao foi recalculado nesta rodada continua no JSON.
    rg["cenarios"] = mesclar_cenarios(rg.get("cenarios"), novos_cenarios)
    POP_JSON.write_text(json.dumps(pop_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSalvo em {POP_JSON}")


if __name__ == "__main__":
    main()
