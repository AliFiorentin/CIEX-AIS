"""
Proposta de realocacao das "pilhas" de geocodificacao nas bases externas (empresas, educacao, saude).

O geocodificador de origem colocou centenas de estabelecimentos de ruas e CEPs diferentes no mesmo ponto (777 das
3.220 empresas, 40 escolas, 164 unidades de saude). Este script NAO altera o dashboard: gera um CSV com a posicao
proposta de cada membro da pilha, para a fonte aplicar no pipeline de geocodificacao e regenerar, de forma
consistente, os ATINGIDOS, cota_pontos.json e os climada_*_rio_grande.json. Aplicar so aqui deixaria o mapa
"Todas as cotas" com pontos secos/molhados errados (o indice de cota por ponto nao pode ser recalculado sem os
rasters de cota) e os totais de Danos Fisicos inconsistentes.

Proposta: mediana das coordenadas dos demais estabelecimentos do mesmo CEP; se o CEP nao tem referencia, mediana
dos da mesma rua+bairro; senao, sem proposta. Membros da pilha nunca servem de referencia.

Uso: python3 scripts/propor_realocacao_pilhas.py   (grava docs/realocacao-pilhas-geocodificacao.csv)
"""

import csv
import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RIO_GRANDE = ROOT / "public" / "dados_convertidos" / "rio_grande"
SAIDA = ROOT / "docs" / "realocacao-pilhas-geocodificacao.csv"

# camada -> (arquivo, coluna de id, coluna de cep, coluna de rua, coluna de bairro)
CAMADAS = {
    "empresas": ("empresas_BASE.geojson", "id", "cep", "rua", "bairro"),
    "educacao": ("educacao_BASE.geojson", "co_entidade", "co_cep", "ds_endereco", "no_bairro"),
    "saude": ("saude_BASE.geojson", "co_cnes", "cep", "rua", "bairro"),
}

CASAS = 5  # ~1 m: agrupa o mesmo ponto apesar de ruido de ponto flutuante


def _xy(r):
    return (round(r["lon"], CASAS), round(r["lat"], CASAS))


def _norm(v) -> str:
    return " ".join(str(v or "").upper().split())


def detectar_pilha(regs, min_pontos=20, min_ceps=10):
    """Coordenada mais repetida, se tiver >= min_pontos estabelecimentos de >= min_ceps CEPs distintos.

    Varios CEPs distintos no mesmo ponto e o sinal de falha do geocodificador; muitos no mesmo CEP
    (um predio com varias empresas) e legitimo."""
    por_ponto = defaultdict(list)
    for r in regs:
        por_ponto[_xy(r)].append(r)
    if not por_ponto:
        return None
    ponto, membros = max(por_ponto.items(), key=lambda kv: len(kv[1]))
    ceps = {_norm(m["cep"]) for m in membros}
    if len(membros) >= min_pontos and len(ceps) >= min_ceps:
        return ponto
    return None


def _mediana(refs):
    return (statistics.median(r["lon"] for r in refs), statistics.median(r["lat"] for r in refs))


def propor(regs, pilha):
    """Para cada registro na `pilha` (lon, lat arredondados), a posicao proposta e como foi obtida."""
    refs_cep, refs_rua = defaultdict(list), defaultdict(list)
    membros = []
    for r in regs:
        if _xy(r) == pilha:
            membros.append(r)
            continue
        refs_cep[_norm(r["cep"])].append(r)
        refs_rua[(_norm(r["rua"]), _norm(r["bairro"]))].append(r)

    out = []
    for m in membros:
        cep, rua = _norm(m["cep"]), (_norm(m["rua"]), _norm(m["bairro"]))
        if cep and refs_cep.get(cep):
            refs, metodo = refs_cep[cep], "cep"
        elif rua[0] and refs_rua.get(rua):
            refs, metodo = refs_rua[rua], "rua_bairro"
        else:
            refs, metodo = [], "sem_referencia"
        lon, lat = _mediana(refs) if refs else (None, None)
        out.append(
            {
                "id": m["id"],
                "cep": m["cep"],
                "rua": m["rua"],
                "bairro": m["bairro"],
                "lon_atual": m["lon"],
                "lat_atual": m["lat"],
                "lon_proposta": lon,
                "lat_proposta": lat,
                "metodo": metodo,
                "n_referencias": len(refs),
            }
        )
    return out


def _ler_camada(camada):
    arquivo, c_id, c_cep, c_rua, c_bairro = CAMADAS[camada]
    gj = json.loads((RIO_GRANDE / arquivo).read_text(encoding="utf-8"))
    regs = []
    for f in gj["features"]:
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"][:2]
        regs.append({"id": p.get(c_id), "cep": p.get(c_cep), "rua": p.get(c_rua), "bairro": p.get(c_bairro), "lon": lon, "lat": lat})
    return regs


def main() -> None:
    linhas = []
    for camada in CAMADAS:
        regs = _ler_camada(camada)
        pilha = detectar_pilha(regs)
        if pilha is None:
            print(f"{camada}: sem pilha detectada")
            continue
        propostas = propor(regs, pilha)
        cont = Counter(p["metodo"] for p in propostas)
        print(f"{camada}: pilha em {pilha} com {len(propostas)} de {len(regs)}; {dict(cont)}")
        linhas += [{"camada": camada, **p} for p in propostas]

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    campos = ["camada", "id", "cep", "rua", "bairro", "lon_atual", "lat_atual", "lon_proposta", "lat_proposta", "metodo", "n_referencias"]
    with SAIDA.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=campos)
        w.writeheader()
        w.writerows(linhas)
    print(f"Gravado: {SAIDA} ({len(linhas)} linhas)")


if __name__ == "__main__":
    main()
