"""
Conversor das simulacoes de intervencao (diques e barragens): 4 eventos x 3 variantes x 6 bacias.

Entrada: RAW/simulacoes-intervencoes/AAAA-MM-DD/{sem-intervencao,diques,diques-barragens}/bacia{N}.tif
(profundidade em cm, float32, EPSG:31982, ~1 m, NaN = seco; ver scripts/organizar_raw.py). Os .qml NAO sao lidos:
a rampa de cores e unica e esta aqui.

Para cada um dos 12 conjuntos:
  1. mosaico das 6 bacias (1, 2, 3, 4, 5, 7) na grade compartilhada; nas sobreposicoes vale a MAIOR profundidade;
  2. mascara de atingido: profundidade >= 10 cm (NaN = seco);
  3. mancha: mesma suavizacao/vetorizacao do 16/05 (raster_comum), dissolvida e simplificada;
  4. PNG de profundidade colorido e, via raster_comum.gerar_atingidos, os ATINGIDOS de todas as camadas;
  5. area atingida, profundidade maxima e area por faixa de profundidade, gravadas em
     scripts/data/intervencoes_mancha_meta.json (lido pelo comparativo e pela interface).

Saidas (public/dados_convertidos/rio_grande/cenarios/): {sslug}.geojson, altura_raster_{sslug}.png,
{camada}_ATINGIDOS_{sslug}.* e agricultura_stats_{sslug}.json; sslug = rio_grande___{slugify(nome do cenario)}.

Uso:  python scripts/converter_intervencoes.py [--evento 2024-05-21] [--variante diques]
"""

from __future__ import annotations  # `X | None` nas anotacoes tambem no Python 3.9

import argparse
import json
import re
import warnings
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import array_bounds

from cenarios_intervencao import nome_cenario, scenario_slug, todos
from raster_comum import (
    CENARIOS_DIR,
    ROOT,
    compute_shared_grid,
    gerar_atingidos,
    reproject_group,
    salvar_geojson,
    salvar_png,
    smooth_band,
    smooth_mask,
    vectorize_mask,
)
from raw_paths import SIM_INTERVENCOES

warnings.filterwarnings("ignore")

LIMIAR_CM = 10.0
BACIAS = (1, 2, 3, 4, 5, 7)
# (minimo inclusivo, maximo exclusivo, RGB); ultimo sem maximo. Rampa unica das simulacoes (#b8a1d9 ... #ff0000).
RAMPA = [
    (10, 45, (184, 161, 217)),
    (45, 65, (75, 0, 130)),
    (65, 85, (0, 255, 255)),
    (85, 105, (0, 255, 0)),
    (105, 125, (255, 255, 0)),
    (125, 145, (255, 127, 0)),
    (145, None, (255, 0, 0)),
]
FAIXAS_CM = [(lo, hi) for lo, hi, _ in RAMPA]
SIGMA_VALOR = 2.5  # suaviza o valor so para o gradiente do PNG (como o 16/05)
SIGMA_MASCARA = 2.0  # voto por maioria sobre a mascara booleana (como o 16/05)
META_PATH = ROOT / "scripts" / "data" / "intervencoes_mancha_meta.json"


def _rotulo_faixa(lo: int, hi: int | None) -> str:
    return f"{lo}+" if hi is None else f"{lo}-{hi - 1}"


def localizar_bacias(pasta: Path) -> dict[int, Path]:
    """Mapa numero da bacia -> TIFF, ignorando a caixa do nome. Exige as bacias 1, 2, 3, 4, 5 e 7."""
    achadas: dict[int, Path] = {}
    if pasta.is_dir():
        for p in sorted(pasta.iterdir()):
            m = re.fullmatch(r"(?i)bacia(\d+)\.tif", p.name)
            if m:
                achadas[int(m.group(1))] = p
    faltam = [n for n in BACIAS if n not in achadas]
    if faltam:
        raise FileNotFoundError(f"Faltam as bacias {faltam} em {pasta}")
    return {n: achadas[n] for n in BACIAS}


def validar_bacias(bacias: dict[int, Path]) -> None:
    """Falha se alguma bacia nao tem nenhum pixel com dado (exportacao vazia/corrompida).

    Precisa ser por bacia: depois do mosaico (np.fmax ignora NaN), uma bacia toda NaN some sem aviso quando as outras
    tem agua e o dano evitado sai inflado."""
    for n, caminho in bacias.items():
        with rasterio.open(caminho) as ds:
            banda = ds.read(1)
        if not np.isfinite(banda).any():
            raise ValueError(f"bacia {n} ({caminho}) nao tem nenhum pixel com dado (toda NaN)")


def mascara_atingido(prof_cm: np.ndarray) -> np.ndarray:
    """True onde a profundidade e >= 10 cm (NaN = seco)."""
    return np.isfinite(prof_cm) & (prof_cm >= LIMIAR_CM)


def exigir_agua(prof_cm: np.ndarray, rotulo: str) -> np.ndarray:
    """Devolve a mascara de atingido ou falha: um conjunto sem nenhum pixel molhado indica bacia ausente/vazia."""
    mascara = mascara_atingido(prof_cm)
    if not mascara.any():
        raise ValueError(
            f"{rotulo}: nenhum pixel com profundidade >= {LIMIAR_CM:g} cm (bacia ausente, vazia ou toda NaN?)"
        )
    return mascara


def area_pixel_m2_por_linha(transform, altura: int) -> np.ndarray:
    """Area de um pixel (m2) por linha de uma grade em graus (EPSG:4326), formato (altura, 1)."""
    lat = transform.f + transform.e * (np.arange(altura) + 0.5)
    rad = np.radians(lat)
    m_lat = 111132.92 - 559.82 * np.cos(2 * rad) + 1.175 * np.cos(4 * rad)  # metros por grau de latitude
    m_lon = 111412.84 * np.cos(rad) - 93.5 * np.cos(3 * rad)  # metros por grau de longitude
    return (abs(transform.a) * m_lon * abs(transform.e) * m_lat).reshape(-1, 1)


def area_por_faixa_ha(prof_cm: np.ndarray, area_pixel_m2) -> dict[str, float]:
    """Area (ha) em cada faixa de profundidade; `area_pixel_m2` e escalar ou array com broadcast para `prof_cm`."""
    areas = np.broadcast_to(np.asarray(area_pixel_m2, dtype="float64"), prof_cm.shape)
    valido = np.isfinite(prof_cm)
    saida: dict[str, float] = {}
    for lo, hi in FAIXAS_CM:
        m = valido & (prof_cm >= lo)
        if hi is not None:
            m &= prof_cm < hi
        saida[_rotulo_faixa(lo, hi)] = round(float(areas[m].sum()) / 1e4, 4)
    return saida


def rgba_profundidade(prof_cm: np.ndarray) -> Image.Image:
    """PNG RGBA colorido pela rampa; < 10 cm e NaN ficam transparentes."""
    h, w = prof_cm.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    valido = np.isfinite(prof_cm)
    for lo, hi, (r, g, b) in RAMPA:
        m = valido & (prof_cm >= lo)
        if hi is not None:
            m &= prof_cm < hi
        rgba[m] = (r, g, b, 255)
    return Image.fromarray(rgba, "RGBA")


def converter_conjunto(evento: str, variante: str) -> dict:
    """Converte um conjunto e devolve {slug, area_ha, prof_max_cm, area_por_faixa_ha, bounds}."""
    nome = nome_cenario(evento, variante)
    sslug = scenario_slug(nome)
    print(f"\n{'=' * 70}\n  {nome}\n{'=' * 70}")
    bacias = localizar_bacias(SIM_INTERVENCOES / evento / variante)
    validar_bacias(bacias)  # antes de qualquer escrita; ver a docstring
    paths = [bacias[n] for n in BACIAS]

    print("1. Mosaico das 6 bacias (maior profundidade nas sobreposicoes)...")
    src_crs, transform, w, h = compute_shared_grid(paths)
    banda = reproject_group(paths, src_crs, transform, w, h, combinar="max")
    bruta = exigir_agua(banda, nome)  # falha antes de gravar qualquer coisa

    area_linha = area_pixel_m2_por_linha(transform, h)
    area_ha = round(float(np.broadcast_to(area_linha, banda.shape)[bruta].sum()) / 1e4, 4)
    prof_max = round(float(np.nanmax(banda)), 1)
    faixas = area_por_faixa_ha(banda, area_linha)
    bounds = array_bounds(h, w, transform)  # (esquerda, baixo, direita, cima) em graus
    print(f"   {w}x{h} px; area >= {LIMIAR_CM:g} cm: {area_ha:.1f} ha; profundidade maxima: {prof_max} cm")

    print("2. Vetorizando a area atingida...")
    mancha = vectorize_mask(smooth_mask(bruta, sigma=SIGMA_MASCARA), transform)
    if mancha is None:
        raise ValueError(f"{nome}: a mancha ficou vazia depois da vetorizacao")

    print("3. Gravando mancha e PNG de profundidade...")
    salvar_geojson(mancha, CENARIOS_DIR / f"{sslug}.geojson")
    salvar_png(rgba_profundidade(smooth_band(banda, sigma=SIGMA_VALOR)), CENARIOS_DIR / f"altura_raster_{sslug}.png")

    print("4. Cruzando com as camadas base...")
    gerar_atingidos(mancha, sslug)
    return {
        "slug": sslug,
        "area_ha": area_ha,
        "prof_max_cm": prof_max,
        "area_por_faixa_ha": faixas,
        "bounds": [round(x, 6) for x in bounds],
    }


def salvar_meta(resultado: dict) -> None:
    """Acrescenta/atualiza o conjunto em scripts/data/intervencoes_mancha_meta.json (chave = slug)."""
    meta = json.loads(META_PATH.read_text(encoding="utf-8")) if META_PATH.exists() else {}
    meta[resultado["slug"]] = {k: v for k, v in resultado.items() if k != "slug"}
    META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description="Converte as simulacoes de intervencao (12 conjuntos).")
    ap.add_argument("--evento", help="ex.: 2024-05-21 (padrao: todos)")
    ap.add_argument("--variante", help="sem-intervencao, diques ou diques-barragens (padrao: todas)")
    args = ap.parse_args(argv)
    pares = [(e, v) for e, v in todos() if args.evento in (None, e) and args.variante in (None, v)]
    if not pares:
        raise SystemExit("Nenhum conjunto corresponde a --evento/--variante")
    for evento, variante in pares:
        salvar_meta(converter_conjunto(evento, variante))
    print(f"\nConcluido: {len(pares)} conjunto(s). Meta em {META_PATH}")


if __name__ == "__main__":
    main()
