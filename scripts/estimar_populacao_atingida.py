"""
Estima a populacao atingida pela mancha combinada (Nivel da Lagoa + Chuva
Acumulada) a partir do raster JA RENDERIZADO `populacao.png` -- nao ha, neste
repositorio, o GeoTIFF WorldPop original nem o script que gerou os valores
precisos em `populacao_atingida.json` para os demais cenarios (fonte externa).

METODOLOGIA (APROXIMADA -- ver README.md):
  O canal alfa de `populacao.png` correlaciona quase perfeitamente (r=0.998,
  testado empiricamente) com a posicao de cada pixel na rampa de cor viridis/
  plasma usada para colorir o heatmap -- ou seja, e uma proxy continua e
  monotonica da densidade populacional subjacente, mesmo sem acesso ao raster
  original. Usamos o alfa como peso de densidade por pixel, calibrado
  proporcionalmente contra `pop_total` (que e um valor real, ja conhecido):

    pop_atingida = pop_total * (soma_alfa_dentro_da_mancha / soma_alfa_total)

  Isso e uma ESTIMATIVA, nao o mesmo metodo exato dos demais cenarios (que
  usam o raster WorldPop original com resolucao muito maior). Fica sujeita a
  erro de quantizacao do PNG (256 niveis de alfa) e a qualquer diferenca
  entre o alfa exibido e a densidade real subjacente.

Atualiza public/dados_convertidos/populacao_atingida.json, adicionando (ou
sobrescrevendo) a entrada do cenario combinado em Rio Grande.cenarios.

Uso: python scripts/estimar_populacao_atingida.py
"""

import json
import unicodedata
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image
from rasterio.features import rasterize
from rasterio.transform import from_bounds

ROOT = Path(__file__).parent.parent
DASH = ROOT / "public" / "dados_convertidos"
POP_PNG = DASH / "rio_grande" / "populacao.png"
POP_JSON = DASH / "populacao_atingida.json"
MANCHA = DASH / "rio_grande" / "cenarios" / "rio_grande___nivel_da_lagoa_chuva_acumulada_16_05_2024.geojson"

NOME_CENARIO = "Nível da Lagoa + Chuva Acumulada – 16/05/2024"

# Cenarios com populacao exata no JSON (chave do JSON -> slug do arquivo da mancha), usados para calibrar.
REFERENCIAS = {
    "Cenario Setembro 2023": "rio_grande___cenario_setembro_2023",
    "Cenario Maio 2024": "rio_grande___cenario_maio_2024",
    "Cenario Maio 2024 + 50%": "rio_grande___cenario_maio_2024_50",
}


def strip_accents(s: str) -> str:
    """Replica a normalizacao usada no frontend (cenario.normalize('NFD').
    replace(/[\\u0300-\\u036f]/g, '')) -- so remove acentos, mantem o resto."""
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def fator_calibracao(pares) -> float:
    """Fator proxy/exato ajustado por minimos quadrados pela origem sobre os cenarios de referencia.

    `pares` = [(populacao_pelo_proxy, populacao_exata), ...]. E a razao das somas, para que cenarios
    grandes (menos sujeitos a erro de quantizacao do PNG) pesem mais que os pequenos. Referencias com
    valor exato <= 0 sao ignoradas."""
    validos = [(p, e) for p, e in pares if e > 0]
    if not validos:
        raise ValueError("sem cenarios de referencia com populacao exata > 0")
    return sum(p for p, _ in validos) / sum(e for _, e in validos)


def faixa_razoes(pares):
    """(menor, maior) razao proxy/exato entre as referencias: a incerteza do fator de calibracao."""
    razoes = [p / e for p, e in pares if e > 0]
    if not razoes:
        raise ValueError("sem cenarios de referencia com populacao exata > 0")
    return min(razoes), max(razoes)


def soma_alfa_na_mancha(alpha, transform, mancha_path) -> float:
    """Soma do alfa (proxy de densidade) dos pixels do PNG cobertos pela mancha."""
    h, w = alpha.shape
    mancha = gpd.read_file(mancha_path).to_crs("EPSG:4326")
    mask = rasterize(
        [(geom, 1) for geom in mancha.geometry],
        out_shape=(h, w),
        transform=transform,
        fill=0,
        dtype="uint8",
    ).astype(bool)
    return float(alpha[mask].sum())


def main() -> None:
    with open(POP_JSON, encoding="utf-8") as f:
        pop_data = json.load(f)

    rg = pop_data["Rio Grande"]
    pop_total = rg["pop_total"]
    coords = rg["coordinates"]  # [NW, NE, SE, SW]
    left, top = coords[0]
    right, bottom = coords[2]

    img = Image.open(POP_PNG).convert("RGBA")
    w, h = img.size
    alpha = np.array(img)[:, :, 3].astype(np.float64)
    transform = from_bounds(left, bottom, right, top, w, h)
    total_alpha = alpha.sum()

    # Calibracao: o proxy subestima a populacao por um fator quase constante. Mede-se esse fator nos
    # cenarios que tem valor exato (fonte externa, raster de 100 m) e divide-se o proxy do 16/05 por ele.
    pares = []
    print("Calibracao (proxy x valor exato da fonte externa):")
    for nome_ref, slug_ref in REFERENCIAS.items():
        exato = rg.get("cenarios", {}).get(nome_ref, {}).get("pop_atingida")
        if not exato:
            continue
        proxy_ref = pop_total * soma_alfa_na_mancha(alpha, transform, MANCHA.with_name(f"{slug_ref}.geojson")) / total_alpha
        pares.append((proxy_ref, exato))
        print(f"  {nome_ref}: proxy={proxy_ref:.0f} exato={exato} razao={proxy_ref / exato:.2f}")
    fator = fator_calibracao(pares)
    r_min, r_max = faixa_razoes(pares)
    print(f"  fator (razao das somas)={fator:.3f}  faixa das razoes=[{r_min:.2f}, {r_max:.2f}]")

    frac_bruta = soma_alfa_na_mancha(alpha, transform, MANCHA) / total_alpha
    proxy_pop = pop_total * frac_bruta
    pop_atingida = round(proxy_pop / fator, -2)  # arredonda a centenas: a incerteza e de ~+-10%
    pct_atingida = round(pop_atingida / pop_total * 100, 1)
    pop_min, pop_max = round(proxy_pop / r_max, -2), round(proxy_pop / r_min, -2)

    print(f"{NOME_CENARIO}")
    print(f"  pop_total: {pop_total}")
    print(f"  proxy bruto: {proxy_pop:.0f} (fracao {frac_bruta:.4f})")
    print(f"  pop_atingida (calibrado): {pop_atingida:.0f} ({pct_atingida}%), faixa {pop_min:.0f} a {pop_max:.0f}")
    pop_atingida = int(pop_atingida)

    cen_key = strip_accents(NOME_CENARIO)
    rg.setdefault("cenarios", {})[cen_key] = {
        "pop_atingida": pop_atingida,
        "pct_atingida": pct_atingida,
        "_metodologia": (
            "estimado: proxy do alfa de populacao.png dividido pelo fator de calibracao "
            f"{fator:.2f} (medido nos 3 cenarios com valor exato; faixa {int(pop_min)} a {int(pop_max)}) "
            "-- ver scripts/estimar_populacao_atingida.py"
        ),
    }

    POP_JSON.write_text(json.dumps(pop_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  salvo em {POP_JSON}")


if __name__ == "__main__":
    main()
