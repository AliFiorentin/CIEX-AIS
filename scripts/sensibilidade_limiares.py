"""
Sensibilidade dos limiares da mancha do cenario Nivel da Lagoa + Chuva Acumulada (16/05/2024).

A mancha e a uniao de duas simulacoes: Lagoa (pixel = profundidade em cm, entra com >= 45 cm) e Chuva Acumulada
(valor do modelo, entra na faixa 86-253; >= 254 e tratado como agua pre-existente e fica de fora). Os cortes 45,
86 e 254 vem do estilo QGIS (.qml) e nao tem outra fonte; este script mede quanto a area atingida muda se eles
forem outros. Usa os rasters brutos (sem suavizacao, sem reducao de resolucao), entao mede so o efeito do limiar.

Uso:  python3 scripts/sensibilidade_limiares.py   (grava docs/sensibilidade-limiares-mancha-16-05.md)
Requer: numpy, rasterio, geopandas (as mesmas dependencias de converter_manchas_altura.py)
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

import converter_manchas_altura as cm

ROOT = Path(__file__).resolve().parent.parent
SAIDA = ROOT / "docs" / "sensibilidade-limiares-mancha-16-05.md"

LIMIARES_LAGOA = [30, 45, 60, 75, 100]  # cm; o do projeto e 45
LIMITES_INFERIORES_CHUVA = [70, 86, 100, 120]  # o do projeto e 86
LIMITES_SUPERIORES_CHUVA = [254, 255, None]  # o do projeto e 254 (excluido); None = sem limite superior


def area_por_limiar(banda: np.ndarray, limiares, px_km2: float) -> dict:
    """Area (km2) dos pixels validos com valor >= cada limiar. NaN nunca conta."""
    valido = ~np.isnan(banda)
    return {l: float(((banda >= l) & valido).sum() * px_km2) for l in limiares}


def area_por_faixa(banda: np.ndarray, inferior: float, superior, px_km2: float) -> float:
    """Area (km2) dos pixels validos com inferior <= valor < superior (superior None = sem limite)."""
    valido = ~np.isnan(banda)
    dentro = valido & (banda >= inferior)
    if superior is not None:
        dentro &= banda < superior
    return float(dentro.sum() * px_km2)


def main() -> None:
    src_crs, tr, w, h = cm.compute_shared_grid(cm.LAGOA_TIFS + cm.CHUVA_TIFS)
    lagoa = cm.reproject_group(cm.LAGOA_TIFS, src_crs, tr, w, h)
    chuva = cm.reproject_group(cm.CHUVA_TIFS, src_crs, tr, w, h)
    # Area do pixel na grade EPSG:4326 (graus): aproximada pela latitude central.
    west, south, east, north = cm.array_bounds(h, w, tr)
    lat = (south + north) / 2
    px_km2 = (abs(tr.a) * 111.32 * np.cos(np.radians(lat))) * (abs(tr.e) * 110.574)

    lag = area_por_limiar(lagoa, LIMIARES_LAGOA, px_km2)
    mascara_lagoa_projeto = ~np.isnan(lagoa) & (lagoa >= cm.LAGOA_VMIN)
    chuva_proj = ~np.isnan(chuva) & (chuva >= cm.CHUVA_VMIN) & (chuva < cm.CHUVA_VMAX)
    base_uniao = float((mascara_lagoa_projeto | chuva_proj).sum() * px_km2)

    linhas = [
        "# Sensibilidade dos limiares da mancha do 16/05/2024",
        "",
        "Gerado por `scripts/sensibilidade_limiares.py` sobre os rasters brutos (sem suavizacao nem reducao de",
        "resolucao; a mancha publicada e ~10% maior por causa do fechamento de vaos). Area em km2.",
        "",
        f"Uniao com os limiares do projeto (Lagoa >= {cm.LAGOA_VMIN:g} cm OU Chuva {cm.CHUVA_VMIN:g}-{cm.CHUVA_VMAX - 1:g}): **{base_uniao:.2f} km2**.",
        "",
        "## Lagoa (profundidade em cm)",
        "",
        "| Limiar | Area da Lagoa | Uniao com a Chuva do projeto | Variacao da uniao |",
        "|---|---|---|---|",
    ]
    for l in LIMIARES_LAGOA:
        uniao = float(((~np.isnan(lagoa) & (lagoa >= l)) | chuva_proj).sum() * px_km2)
        marca = " (projeto)" if l == cm.LAGOA_VMIN else ""
        linhas.append(f"| >= {l} cm{marca} | {lag[l]:.2f} | {uniao:.2f} | {uniao / base_uniao - 1:+.1%} |")

    linhas += ["", "## Chuva Acumulada (valor do modelo)", "", "| Faixa | Area da Chuva | Uniao com a Lagoa do projeto | Variacao da uniao |", "|---|---|---|---|"]
    for inf in LIMITES_INFERIORES_CHUVA:
        for sup in LIMITES_SUPERIORES_CHUVA:
            a = area_por_faixa(chuva, inf, sup, px_km2)
            m = ~np.isnan(chuva) & (chuva >= inf) & ((chuva < sup) if sup is not None else True)
            uniao = float((mascara_lagoa_projeto | m).sum() * px_km2)
            nome = f"{inf}-{(sup - 1) if sup else 'sem limite'}"
            marca = " (projeto)" if (inf, sup) == (cm.CHUVA_VMIN, cm.CHUVA_VMAX) else ""
            linhas.append(f"| {nome}{marca} | {a:.2f} | {uniao:.2f} | {uniao / base_uniao - 1:+.1%} |")

    linhas += [
        "",
        "Leitura:",
        "- **Lagoa:** o limiar importa. Subir de 45 para 60 cm reduz a uniao em ~9% e para 100 cm em ~34%; baixar para 30 cm",
        "  aumenta a uniao em ~6,5%.",
        "- **Chuva, limite inferior:** quase nao importa (70 a 120 muda a uniao em menos de 0,3%).",
        "- **Chuva, limite superior:** pesa muito. Incluir os valores >= 254 (que o estilo QGIS trata como agua",
        "  pre-existente) multiplica a area da Chuva por ~5,7 (2,6 para 14,7 km2) e a uniao em ~3 vezes. A exclusao dos 254+",
        "  e, portanto, uma decisao de modelagem com grande efeito; ela so esta certa se esses pixels forem mesmo agua",
        "  ja existente (lagoa, canais) e nao alagamento novo, o que a fonte nao confirma.",
    ]
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print("\n".join(linhas))
    print(f"\nGravado: {SAIDA}")


if __name__ == "__main__":
    main()
