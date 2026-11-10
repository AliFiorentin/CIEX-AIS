"""
Comparativo do dano evitado pelas intervencoes (diques e diques + barragens) contra a situacao sem intervencao.

Para cada um dos 4 eventos junta, por variante, os indicadores de cada simulacao (area, empresas, escolas, saude,
infraestrutura, perdas operacionais DaLA e exposicao fisica em R$) e calcula o evitado:

    evitado = baseline (sem intervencao) - intervencao        evitado % = evitado / baseline (None se baseline = 0)

Valor negativo (a intervencao piora o indicador) e mantido, sem truncar. Entradas: ATINGIDOS e infra_stats de cada
cenario, perdas_intervencoes.json (calcular_perdas_rio_grande.py --intervencoes) e
scripts/data/intervencoes_mancha_meta.json (converter_intervencoes.py). Saida:
public/dados_convertidos/intervencoes_comparativo.json (lido pelo Painel, por Perdas Operacionais e Danos Fisicos).

A exposicao em R$ so entra se a validacao de valor_reposicao.py passou (sem o arquivo-sinal
scripts/EXPOSICAO_INDISPONIVEL). A populacao atingida vem de populacao_atingida.json, gravada por
calcular_populacao_intervencoes.py (raster WorldPop 100 m, em RAW/populacao/). Sem as 12 entradas,
populacao_disponivel = false e o indicador nao entra.

Uso:  python scripts/gerar_comparativo_intervencoes.py
"""

from __future__ import annotations

import json
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # irmaos, mesmo quando carregado por importlib

import valor_reposicao as vr  # noqa: E402
from cenarios_intervencao import EVENTOS, VARIANTES, nome_cenario, scenario_slug  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DADOS = ROOT / "public" / "dados_convertidos"
CENARIOS_DIR = DADOS / "rio_grande" / "cenarios"
PERDAS_PATH = DADOS / "perdas_intervencoes.json"
META_PATH = ROOT / "scripts" / "data" / "intervencoes_mancha_meta.json"
OUT_PATH = DADOS / "intervencoes_comparativo.json"
SINAL_EXPOSICAO_INDISPONIVEL = ROOT / "scripts" / "EXPOSICAO_INDISPONIVEL"
POP_PATH = DADOS / "populacao_atingida.json"

LIMIAR_CM = 10
INTERVENCOES = ("diques", "diques-barragens")
SEM_EVITADO = {"area_por_faixa_ha", "perdas_dias_efetivos"}  # nao sao grandezas a subtrair


def comparar(base: float, interv: float) -> dict:
    """{"valor": base - interv, "pct": (base - interv) / base, ou None se base = 0}."""
    valor = base - interv
    return {"valor": round(valor, 4), "pct": None if base == 0 else round(valor / base, 6)}


def _ler(caminho: Path):
    if not caminho.exists():
        raise FileNotFoundError(f"Falta {caminho.name} em {caminho.parent} (rode os scripts anteriores)")
    return json.loads(caminho.read_text(encoding="utf-8"))


def _soma(gj: dict, campo: str) -> float:
    return sum((f.get("properties") or {}).get(campo) or 0 for f in gj["features"])


def _area_ha(caminho: Path) -> float:
    """Area (ha, EPSG:31982) dos poligonos de um ATINGIDOS (.fgb); 0 se a camada nao tem nada atingido (arquivo ausente)."""
    if not caminho.exists():
        return 0.0
    import geopandas as gpd  # so aqui: o resto do script nao precisa de GIS

    g = gpd.read_file(caminho)
    if g.empty:
        return 0.0
    return round(float(g.to_crs("EPSG:31982").area.sum()) / 1e4, 4)


def _populacao(nome: str) -> float | None:
    """Populacao atingida estimada da simulacao (chave = nome sem acento), ou None se nao houver."""
    if not POP_PATH.exists():
        return None
    chave = "".join(c for c in unicodedata.normalize("NFD", nome) if unicodedata.category(c) != "Mn")
    return _ler(POP_PATH)["Rio Grande"].get("cenarios", {}).get(chave, {}).get("pop_atingida")


def indicadores(evento: str, variante: str, com_exposicao: bool = True) -> dict:
    """Todos os indicadores de uma simulacao (evento x variante)."""
    nome = nome_cenario(evento, variante)
    sslug = scenario_slug(nome)
    meta = _ler(META_PATH).get(sslug)
    if meta is None:
        raise FileNotFoundError(f"{META_PATH.name} nao tem {sslug} (rode converter_intervencoes.py)")
    perdas = _ler(PERDAS_PATH)["Rio Grande"].get(nome)
    if perdas is None:
        raise FileNotFoundError(f"{PERDAS_PATH.name} nao tem '{nome}' (rode calcular_perdas_rio_grande.py --intervencoes)")
    emp = _ler(CENARIOS_DIR / f"empresas_ATINGIDOS_{sslug}.geojson")
    edu = _ler(CENARIOS_DIR / f"educacao_ATINGIDOS_{sslug}.geojson")
    sau = _ler(CENARIOS_DIR / f"saude_ATINGIDOS_{sslug}.geojson")
    pat = _ler(CENARIOS_DIR / f"patrimonio_ATINGIDOS_{sslug}.geojson")
    infra = _ler(CENARIOS_DIR / f"infra_stats_{sslug}.json")

    out = {
        "area_ha": meta["area_ha"],
        "prof_max_cm": meta["prof_max_cm"],
        "area_por_faixa_ha": meta["area_por_faixa_ha"],
        "empresas": len(emp["features"]),
        "vinculos": _soma(emp, "qtd_vinculos"),
        "massa_salarial": round(_soma(emp, "massa_salarial"), 2),
        "escolas": len(edu["features"]),
        "matriculas": _soma(edu, "qtd_mat_total"),
        "unidades_saude": len(sau["features"]),
        "patrimonio": len(pat["features"]),
        "logradouros": infra["Logradouros"]["ruas_atingidas"],
        "quadras": infra["Quadras"]["atingidas"],
        "terrenos": infra["Terrenos"]["atingidos"],
        "agricultura_ha": _area_ha(CENARIOS_DIR / f"agricultura_ATINGIDOS_{sslug}.fgb"),
        "cobertura_ha": _area_ha(CENARIOS_DIR / f"cobertura_ATINGIDOS_{sslug}.fgb"),
        "perdas_total": perdas["total"],
        "perdas_empresas": perdas["empresas_vab"],
        "perdas_educacao": round(perdas["educacao_perdas"] + perdas["educacao_custo_adicional"], 2),
        "perdas_saude": perdas["saude_producao"],
        "perdas_agricultura": perdas["agricultura_perdas"],
        "perdas_dias_efetivos": perdas["dias_efetivos"],
    }
    pop = _populacao(nome)
    if pop is not None:
        out["populacao"] = pop
    if com_exposicao:
        out["exposicao_empresas"] = round(vr.exposicao(emp, "empresas"), 2)
        out["exposicao_educacao"] = round(vr.exposicao(edu, "educacao"), 2)
        out["exposicao_saude"] = round(vr.exposicao(sau, "saude"), 2)
        out["exposicao_total"] = round(out["exposicao_empresas"] + out["exposicao_educacao"] + out["exposicao_saude"], 2)
    return out


def montar() -> dict:
    com_exposicao = not SINAL_EXPOSICAO_INDISPONIVEL.exists()
    eventos = {}
    for evento in EVENTOS:
        variantes = {v: indicadores(evento, v, com_exposicao) for v in VARIANTES}
        base = variantes["sem-intervencao"]
        evitado = {
            k: {ind: comparar(base[ind], variantes[k][ind]) for ind in base if ind not in SEM_EVITADO}
            for k in INTERVENCOES
        }
        eventos[evento] = {"rotulo": EVENTOS[evento]["rotulo"], "variantes": variantes, "evitado": evitado}
    populacao_ok = all("populacao" in v for e in eventos.values() for v in e["variantes"].values())
    return {
        "limiar_cm": LIMIAR_CM,
        "exposicao_disponivel": com_exposicao,
        "populacao_disponivel": populacao_ok,
        "eventos": eventos,
    }


def main() -> None:
    resultado = montar()
    OUT_PATH.write_text(json.dumps(resultado, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Comparativo salvo: {OUT_PATH} ({len(resultado['eventos'])} eventos; exposicao: {resultado['exposicao_disponivel']})")


if __name__ == "__main__":
    main()
