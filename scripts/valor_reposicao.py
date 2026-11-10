"""
Valor de reposicao (exposicao fisica em R$, "teto do dano") por ponto e por setor: empresas, educacao e saude.

Reproduz a regra documentada na Metodologia (Secao 11) e usada pelo pipeline de origem: area estimada x CUB/RS
(Sinduscon-RS, dez/2024) x multiplicador de conteudo. Todos os parametros vem de
`climada_exposicao_rio_grande.json` -> premissas.valor_reposicao (nada e duplicado aqui).

  Empresas : 9 m2 por vinculo x CUB comercial x 2,0  (industria CNAE 05-39: CUB industrial x 2,5)
  Educacao : salas equivalentes x 142,2 m2 x CUB institucional x 1,5; salas = alunos / (lotacao x 2 turnos) por
             nivel (infantil 20; fundamental 32,2, com a educacao especial somada; medio/profissional/EJA 50),
             com piso de 1 sala
  Saude    : (profissionais + leitos) x 9 m2 x CUB institucional x 2,25, com piso de 1 pessoa

Validacao (scripts/tests/test_valor_reposicao.py): aplicada as camadas BASE, reproduz os totais
`exposicao_total_brl` do mesmo JSON. Conta so pontos dentro do municipio; a Secretaria Municipal de Saude
(CNES 6303609, realocada por corrigir_coordenadas.py) fica de fora, como no total do CLIMADA.
"""

import json
from functools import lru_cache
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.ops import unary_union
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parent.parent
EXPOSICAO_JSON = ROOT / "public" / "dados_convertidos" / "climada_exposicao_rio_grande.json"
LIMITE_JSON = ROOT / "scripts" / "data" / "rio_grande_limite.geojson"

# Setores (campo `setor` da RAIS) da industria: CNAE 05-39.
SETORES_INDUSTRIA = {
    "INDUSTRIAS EXTRATIVAS",
    "INDUSTRIAS DE TRANSFORMACAO",
    "ELETRICIDADE E GAS",
    "AGUA, ESGOTO, GESTAO DE RESIDUOS E DESCONTAMINACAO",
}
# O total do CLIMADA exclui esta unidade (geocodificada fora do municipio na origem); ver docs/dados-externos-rio-grande.md.
EXCLUIDOS = {"saude": {"6303609"}}


@lru_cache(maxsize=1)
def carregar_premissas() -> dict:
    """Parametros de valor de reposicao (CUB, areas, lotacoes, multiplicadores)."""
    dados = json.loads(EXPOSICAO_JSON.read_text(encoding="utf-8"))
    return dados["premissas"]["valor_reposicao"]


@lru_cache(maxsize=1)
def _limite():
    dados = json.loads(LIMITE_JSON.read_text(encoding="utf-8"))
    if dados.get("type") == "FeatureCollection":
        geoms = [shape(f["geometry"]) for f in dados["features"]]
    elif dados.get("type") == "Feature":
        geoms = [shape(dados["geometry"])]
    else:
        geoms = [shape(dados)]
    return prep(unary_union(geoms))


def _n(props: dict, chave: str) -> float:
    return props.get(chave) or 0


def valor_empresa(props: dict, p: dict) -> float:
    area = _n(props, "qtd_vinculos") * p["area_m2_por_pessoa"]
    if props.get("setor") in SETORES_INDUSTRIA:
        return area * p["cub_industrial_rs"] * p["multiplicador_empresas_industria"]
    return area * p["cub_comercial_rs"] * p["multiplicador_empresas"]


def valor_escola(props: dict, p: dict) -> float:
    t = p["turnos_padrao"]
    salas = (
        _n(props, "qtd_mat_infantil") / (p["lotacao_infantil"] * t)
        + (_n(props, "qtd_mat_fundamental") + _n(props, "qtd_mat_especial")) / (p["lotacao_fundamental"] * t)
        + (_n(props, "qtd_mat_medio") + _n(props, "qtd_mat_profissional") + _n(props, "qtd_mat_eja"))
        / (p["lotacao_medio"] * t)
    )
    salas = max(salas, 1.0)
    return salas * p["area_por_sala_m2"] * p["cub_institucional_rs"] * p["multiplicador_educacao"]


def valor_saude(props: dict, p: dict) -> float:
    pessoas = max(_n(props, "qtd_profissionais") + _n(props, "leitos_total"), 1)
    return pessoas * p["area_m2_por_pessoa"] * p["cub_institucional_rs"] * p["multiplicador_saude"]


_VALOR = {"empresas": valor_empresa, "educacao": valor_escola, "saude": valor_saude}


def _considerados(gj: dict, setor: str):
    """Pontos dentro do municipio e fora da lista de excluidos do setor."""
    excluidos = EXCLUIDOS.get(setor, set())
    limite = _limite()
    for f in gj.get("features", []):
        props = f.get("properties") or {}
        if str(props.get("co_cnes")) in excluidos:
            continue
        x, y = f["geometry"]["coordinates"][:2]
        if limite.contains(Point(x, y)):
            yield props


def contar(gj: dict, setor: str) -> int:
    """Quantos pontos entram na exposicao do setor."""
    return sum(1 for _ in _considerados(gj, setor))


def exposicao(gj: dict, setor: str) -> float:
    """Soma do valor de reposicao (R$) dos pontos do setor, 100% de cada ponto."""
    p = carregar_premissas()
    fn = _VALOR[setor]
    return sum(fn(props, p) for props in _considerados(gj, setor))
