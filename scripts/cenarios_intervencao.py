"""
Os 12 cenarios de intervencao (4 eventos x sem intervencao / diques / diques + barragens): nomes efetivos, slugs
e periodo DaLA. Fonte unica para os scripts de conversao, perdas, infra-stats e comparativo.

O nome efetivo e "Simulacao DD/MM/AAAA - Variante"; o slug de arquivo e `rio_grande___{slugify(nome)}`
(ver scenario_slug), a mesma convencao dos demais cenarios.
"""

import re
import unicodedata

EVENTOS: dict[str, dict] = {
    "2023-09-29": {"rotulo": "29/09/2023", "periodo_dala": "setembro_2023"},
    "2023-11-29": {"rotulo": "29/11/2023", "periodo_dala": "maio_2024"},
    "2024-05-21": {"rotulo": "21/05/2024", "periodo_dala": "maio_2024"},
    "2025-06-28": {"rotulo": "28/06/2025", "periodo_dala": "maio_2024"},
}

VARIANTES: dict[str, str] = {
    "sem-intervencao": "Sem intervenção",
    "diques": "Diques",
    "diques-barragens": "Diques + barragens",
}


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def nome_cenario(evento: str, variante: str) -> str:
    return f"Simulação {EVENTOS[evento]['rotulo']} – {VARIANTES[variante]}"


def slug_cenario(evento: str, variante: str) -> str:
    """Slug sem o prefixo `rio_grande___` (a chave de CENARIO_PERIODO)."""
    return slugify(nome_cenario(evento, variante))


def scenario_slug(nome: str) -> str:
    return f"rio_grande___{slugify(nome)}"


def todos() -> list[tuple[str, str]]:
    """Os 12 pares (evento, variante), em ordem cronologica e com o baseline primeiro."""
    return [(e, v) for e in EVENTOS for v in VARIANTES]
