"""
Pre-calcula estatisticas de Infraestrutura (Logradouros/Quadras/Terrenos) por
cenario, para o Painel poder mostrar todas as camadas -- mesmo as nao
selecionadas no mapa -- sem precisar baixar a geometria completa de cada uma
(Terrenos sozinho tem ~28MB).

Replica em Python a mesma logica dos helpers em app/page.tsx (countFlag,
countEquals, countRuasUnicas) para os numeros baterem exatamente com o que
o painel mostraria se tivesse a geometria completa carregada.

Gera, para cada cenario em CENARIOS:
  public/dados_convertidos/rio_grande/cenarios/infra_stats_{sSlug}.json

Uso: python scripts/gerar_infra_stats.py
"""

import json
import re
import unicodedata
from pathlib import Path

import geopandas as gpd
import pandas as pd

from cenarios_intervencao import nome_cenario, todos

ROOT = Path(__file__).parent.parent
DASH = ROOT / "public" / "dados_convertidos" / "rio_grande"
CENARIOS_DIR = DASH / "cenarios"
INFRA_DIR = DASH / "infraestrutura"

# Mesma lista de CENARIOS do app/page.tsx
CENARIOS = [
    "Cenário Setembro 2023",
    "Cenário Maio 2024",
    "Simulação de Maio de 2024 + 50%",
    "Nível da Lagoa + Chuva Acumulada – 16/05/2024",
]
# Os 12 cenarios de intervencao (nomes efetivos). Rode converter_intervencoes.py antes: sem os ATINGIDOS,
# as estatisticas desses cenarios saem zeradas.
CENARIOS += [nome_cenario(e, v) for e, v in todos()]

INFRA_FILES = {
    "Logradouros": ("logradouros_BASE.geojson", "geojson"),
    "Quadras":     ("quadras_BASE.fgb",         "fgb"),
    "Terrenos":    ("terrenos_BASE.fgb",        "fgb"),
}


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def scenario_slug(cen: str) -> str:
    return f"rio_grande___{slugify(cen)}"


def read_any(path: Path):
    if not path.exists():
        return None
    return gpd.read_file(path)


# ─── Replicas dos helpers de app/page.tsx ──────────────────────────────────

def count_flag(gdf, prop: str) -> int:
    if gdf is None or prop not in gdf.columns:
        return 0
    def is_true(v):
        if pd.isna(v):
            return False
        try:
            return float(v) == 1
        except (TypeError, ValueError):
            return str(v).strip().lower() in ("1", "sim", "true", "yes")
    return int(gdf[prop].map(is_true).sum())


def count_equals(gdf, prop: str, values: list[str]) -> int:
    if gdf is None or prop not in gdf.columns:
        return 0
    valset = {v.lower() for v in values}
    return int(gdf[prop].astype(str).str.strip().str.lower().isin(valset).sum())


def count_ruas_unicas(gdf) -> int:
    if gdf is None or len(gdf) == 0:
        return 0
    if "tipo" not in gdf.columns and "nome" not in gdf.columns:
        return len(gdf)
    tipo = gdf["tipo"].fillna("").astype(str).str.strip() if "tipo" in gdf.columns else pd.Series([""] * len(gdf), index=gdf.index)
    nome = gdf["nome"].fillna("").astype(str).str.strip() if "nome" in gdf.columns else pd.Series([""] * len(gdf), index=gdf.index)
    combo = (tipo + " " + nome).str.strip()
    ids = {c for c in combo if c}
    return len(ids) or len(gdf)


def ruas_atingidas_lista(gdf) -> list[str]:
    if gdf is None or len(gdf) == 0:
        return []
    seen = set()
    out = []
    for _, row in gdf.iterrows():
        tipo_v = row.get("tipo")
        nome_v = row.get("nome")
        tipo = "" if pd.isna(tipo_v) else str(tipo_v).strip().upper()
        nome = "" if pd.isna(nome_v) else str(nome_v).strip().upper()
        label = " ".join(x for x in [tipo, nome] if x)
        if label and label not in seen:
            seen.add(label)
            out.append(label)
    return sorted(out)


# ─── Main ────────────────────────────────────────────────────────────────────

def main() -> None:
    print("Carregando bases de infraestrutura...")
    bases = {nome: read_any(INFRA_DIR / fname) for nome, (fname, _) in INFRA_FILES.items()}
    for nome, gdf in bases.items():
        print(f"  {nome}: {0 if gdf is None else len(gdf)} feicoes")

    for nome_cenario in CENARIOS:
        sslug = scenario_slug(nome_cenario)
        print(f"\n{nome_cenario} ({sslug})")
        stats: dict = {}

        for nome, (fname, ext) in INFRA_FILES.items():
            base = bases[nome]
            islug = slugify(nome)
            atg_path = CENARIOS_DIR / f"infra_{islug}_ATINGIDOS_{sslug}.{ext}"
            atg = read_any(atg_path)

            if nome == "Logradouros":
                stats[nome] = {
                    "segmentos_total": 0 if base is None else len(base),
                    "segmentos_atingidos": 0 if atg is None else len(atg),
                    "ruas_total": count_ruas_unicas(base),
                    "ruas_atingidas": count_ruas_unicas(atg),
                    "drenagem_total": count_flag(base, "drenagem"),
                    "drenagem_atingidos": count_flag(atg, "drenagem"),
                    "iluminacao_total": count_flag(base, "iluminacao"),
                    "iluminacao_atingidos": count_flag(atg, "iluminacao"),
                    "ruas_atingidas_lista": ruas_atingidas_lista(atg),
                }
            elif nome == "Quadras":
                stats[nome] = {
                    "total": 0 if base is None else len(base),
                    "atingidas": 0 if atg is None else len(atg),
                }
            elif nome == "Terrenos":
                stats[nome] = {
                    "total": 0 if base is None else len(base),
                    "atingidos": 0 if atg is None else len(atg),
                    "agua":           {"total": count_flag(base, "agua"),       "atingidos": count_flag(atg, "agua")},
                    "lixo":           {"total": count_flag(base, "coleta_lix"), "atingidos": count_flag(atg, "coleta_lix")},
                    "esgoto_pluvial": {"total": count_flag(base, "esgoto_plu"), "atingidos": count_flag(atg, "esgoto_plu")},
                    "esgoto_cloacal": {"total": count_equals(base, "esgoto_clo", ["esgoto_cloacal", "cloacal", "1"]),
                                       "atingidos": count_equals(atg, "esgoto_clo", ["esgoto_cloacal", "cloacal", "1"])},
                    "fossa":          {"total": count_equals(base, "esgoto_clo", ["fossa_septica", "fossa"]),
                                       "atingidos": count_equals(atg, "esgoto_clo", ["fossa_septica", "fossa"])},
                    "condominio":     {"total": count_flag(base, "condominio"), "atingidos": count_flag(atg, "condominio")},
                }
            print(f"  {nome}: {json.dumps({k: v for k, v in stats[nome].items() if k != 'ruas_atingidas_lista'}, ensure_ascii=False)}")

        out_path = CENARIOS_DIR / f"infra_stats_{sslug}.json"
        out_path.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  salvo {out_path.name}")

    print("\nConcluido.")


if __name__ == "__main__":
    main()
