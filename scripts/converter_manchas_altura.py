"""
Mancha de altura da lamina d'agua -- Nivel da Lagoa + Chuva Acumulada (16/05/2024).

Fonte: simulacao hidrologica por bacias (plataforma Economia Azul), entregue como
TIFFs de profundidade por bacia + estilo QGIS (.qml) definindo a rampa de cores.
Nao faz parte do pipeline original do dashboard -- e um dado novo, tratado
como mais 1 "cenario" do dashboard (ver README.md, secao "Manchas de altura").

As duas simulacoes (nivel da lagoa e chuva acumulada) sao combinadas em um unico
cenario -- a area atingida e a UNIAO das duas manchas, e o raster visual mostra
a classificacao de profundidade da Lagoa (mais informativa) onde ela tem dado,
preenchendo com o lilas da Chuva Acumulada apenas onde a Lagoa nao cobre.

Metodologia (ver README.md para detalhes):
  - Nivel da Lagoa: pixel = profundidade em cm. Area atingida = >=45cm (primeira
    classe visivel do QML: <45 e transparente).
  - Chuva Acumulada: pixel = valor19 (unidade do modelo, nao e cm direto). Area
    atingida = valor entre 86 e 253 (faixa visivel/lilas do QML; valores >=254
    sao tratados como agua pre-existente e ficam fora, igual ao QML).
  - Area atingida final = uniao das duas (usada no cruzamento espacial e no
    calculo de perdas).

Gera, para o cenario combinado:
  public/dados_convertidos/rio_grande/cenarios/{sSlug}.geojson              (mancha)
  public/dados_convertidos/rio_grande/cenarios/altura_raster_{sSlug}.png    (raster colorido)
  public/dados_convertidos/rio_grande/cenarios/empresas_ATINGIDOS_{sSlug}.geojson
  public/dados_convertidos/rio_grande/cenarios/educacao_ATINGIDOS_{sSlug}.geojson
  public/dados_convertidos/rio_grande/cenarios/saude_ATINGIDOS_{sSlug}.geojson
  public/dados_convertidos/rio_grande/cenarios/patrimonio_ATINGIDOS_{sSlug}.geojson
  public/dados_convertidos/rio_grande/cenarios/infra_{logradouros,quadras,terrenos}_ATINGIDOS_{sSlug}.{geojson,fgb}
  public/dados_convertidos/rio_grande/cenarios/cobertura_ATINGIDOS_{sSlug}.fgb
  public/dados_convertidos/rio_grande/cenarios/agricultura_ATINGIDOS_{sSlug}.fgb
  public/dados_convertidos/rio_grande/cenarios/agricultura_stats_{sSlug}.json

Uso: python scripts/converter_manchas_altura.py
"""

from __future__ import annotations  # `X | None` nas anotacoes tambem no Python 3.9

import warnings

import numpy as np
from PIL import Image
from rasterio.transform import array_bounds

from cenarios_intervencao import scenario_slug, slugify  # noqa: F401  (slugify: reexportado)
from raster_comum import (  # noqa: F401  (reexporta as funcoes que viviam aqui)
    AREA_CRS,
    CENARIOS_DIR,
    DASH,
    INFRA_DIR,
    ROOT,
    TARGET_CRS,
    compute_shared_grid,
    downsample_mask,
    gerar_atingidos,
    intersect_lines_polys,
    intersect_whole,
    reproject_group,
    salvar_fgb,
    salvar_geojson,
    salvar_png,
    smooth_band,
    smooth_mask,
    vectorize_mask,
)
from raw_paths import SIM_16_05

warnings.filterwarnings("ignore")

SIM_DIR = SIM_16_05  # RAW/simulacoes-2024-05-16 (ver scripts/raw_paths.py)


# ─── Configuracao do cenario combinado ─────────────────────────────────────────

NOME_CENARIO = "Nível da Lagoa + Chuva Acumulada – 16/05/2024"

LAGOA_TIFS = [
    SIM_DIR / "2024-05-16_nivel-lagoa-20h" / f"bacia{n}" / "profundidade_Valor_21_cm_pontosNaMao.tif"
    for n in [1, 2, 3, 4, 5, 7]
]
# Rampa discreta do .qml (classificationMode DISCRETE): [min, max_exclusive, RGB]
LAGOA_RAMP = [
    (45,  65,  (75, 0, 130)),
    (65,  85,  (0, 255, 255)),
    (85,  105, (0, 255, 0)),
    (105, 125, (255, 255, 0)),
    (125, 145, (255, 127, 0)),
    (145, None, (255, 0, 0)),
]
LAGOA_VMIN = 45.0

CHUVA_TIFS = [
    SIM_DIR / "2024-05-16_chuva-acumulada-60-8mm" / f"bacia{n}_valor19.tif"
    for n in [1, 2, 3, 4, 5]
]
CHUVA_COR = (186, 130, 230)  # lilas mais escuro (#ba82e6)
CHUVA_VMIN, CHUVA_VMAX = 86.0, 254.0


# ─── Grade compartilhada + reprojecao ───────────────────────────────────────────









# ─── Rampa de cor + mascara de "atingido" (combinadas) ─────────────────────────

def build_combined_rgba(lagoa_band_smooth: np.ndarray, lagoa_mask: np.ndarray, chuva_mask: np.ndarray) -> Image.Image:
    h, w = lagoa_mask.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    # Usa a validade do proprio valor suavizado (nao `lagoa_mask`, que vem de um
    # blur separado sobre o booleano) para nao deixar buracos onde os dois blurs
    # discordarem na borda -- as classes ja comecam em 45 (== LAGOA_VMIN), entao
    # nao ha diferenca de cobertura, so evita a inconsistencia entre as mascaras.
    lagoa_valid = ~np.isnan(lagoa_band_smooth)
    for lo, hi, (r, g, b) in LAGOA_RAMP:
        m = lagoa_valid & (lagoa_band_smooth >= lo) if hi is None else lagoa_valid & (lagoa_band_smooth >= lo) & (lagoa_band_smooth < hi)
        rgba[m, 0] = r
        rgba[m, 1] = g
        rgba[m, 2] = b
        rgba[m, 3] = 255

    preenche_chuva = chuva_mask & ~lagoa_mask  # Lagoa tem prioridade onde ambas cobrem
    r, g, b = CHUVA_COR
    rgba[preenche_chuva, 0] = r
    rgba[preenche_chuva, 1] = g
    rgba[preenche_chuva, 2] = b
    rgba[preenche_chuva, 3] = 255

    return Image.fromarray(rgba, "RGBA")


def build_combined_mask(lagoa_mask: np.ndarray, chuva_mask: np.ndarray) -> np.ndarray:
    return lagoa_mask | chuva_mask






# ─── Salvar ─────────────────────────────────────────────────────────────────────







# ─── Interseccao espacial ──────────────────────────────────────────────────────





# ─── Main ────────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"\n{'=' * 70}\n  {NOME_CENARIO}\n{'=' * 70}")
    sslug = scenario_slug(NOME_CENARIO)

    print("1. Grade compartilhada + reprojecao (Lagoa e Chuva)...")
    src_crs, dst_transform, w, h = compute_shared_grid(LAGOA_TIFS + CHUVA_TIFS)
    lagoa_band_raw = reproject_group(LAGOA_TIFS, src_crs, dst_transform, w, h)
    chuva_band_raw = reproject_group(CHUVA_TIFS, src_crs, dst_transform, w, h)
    bounds = array_bounds(h, w, dst_transform)
    print(f"   {w}x{h} px, bounds EPSG:4326: {bounds}")

    print("1b. Suavizando...")
    # Lagoa: borra o VALOR continuo (sigma maior, para o gradiente de 6 cores
    # ficar liso) -- seu limiar e aberto (>=45cm), entao isso nao "esconde"
    # area por empurrar valores para fora de uma faixa estreita.
    lagoa_band_smooth = smooth_band(lagoa_band_raw, sigma=2.5)
    # Mascaras de "atingido": borra o BOOLEANO (limiar aplicado primeiro,
    # depois vota por maioria) para as duas -- borrar o valor continuo da
    # Chuva faria a maior parte da faixa estreita (86-253, entre "seco" e
    # "agua pre-existente") sumir (testado: sigma 2.5 no valor derruba a
    # contagem de pixels para ~54% do original; borrando a mascara, ~94%).
    lagoa_mask_raw = ~np.isnan(lagoa_band_raw) & (lagoa_band_raw >= LAGOA_VMIN)
    chuva_mask_raw = ~np.isnan(chuva_band_raw) & (chuva_band_raw >= CHUVA_VMIN) & (chuva_band_raw < CHUVA_VMAX)
    lagoa_mask = smooth_mask(lagoa_mask_raw, sigma=2.0)
    chuva_mask = smooth_mask(chuva_mask_raw, sigma=2.0)

    print("2. Gerando PNG colorido combinado (Lagoa tem prioridade sobre Chuva)...")
    salvar_png(build_combined_rgba(lagoa_band_smooth, lagoa_mask, chuva_mask), CENARIOS_DIR / f"altura_raster_{sslug}.png")

    print("3. Vetorizando area atingida (uniao Lagoa >=45cm OR Chuva 86-253)...")
    mask = build_combined_mask(lagoa_mask, chuva_mask)
    mancha = vectorize_mask(mask, dst_transform)
    salvar_geojson(mancha, CENARIOS_DIR / f"{sslug}.geojson")
    if mancha is None:
        print("   AVISO: mancha vazia -- abortando cruzamentos")
        return

    print("4. Cruzando com camadas base, infraestrutura, cobertura e agricultura...")
    gerar_atingidos(mancha, sslug)

    print(f"\nBounds para page.tsx ({NOME_CENARIO}):")
    left, bottom, right, top = bounds
    print(f"  [{left:.6f}, {top:.6f}],   // NW")
    print(f"  [{right:.6f}, {top:.6f}],  // NE")
    print(f"  [{right:.6f}, {bottom:.6f}], // SE")
    print(f"  [{left:.6f}, {bottom:.6f}],  // SW")
    print("\nConcluido.")


if __name__ == "__main__":
    main()
