"""
Corrige coordenadas de estabelecimentos de saude geocodificadas fora do lugar nas bases externas.

Uma correcao e aplicada em: saude_BASE.geojson, em cada cenarios/saude_ATINGIDOS_*.geojson (a unidade
sai ou entra do cenario conforme a posicao nova esteja na mancha) e em cota_pontos.json (o indice por
ponto deixa de ser -1 = "fora do municipio"). A funcao e idempotente.

`sincronizar_dados_bid.py --apply` chama `aplicar_correcoes` ao final, para que a correcao sobreviva a uma
nova copia dos arquivos externos.

Uso:  python3 scripts/corrigir_coordenadas.py
"""

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RIO_GRANDE = ROOT / "public" / "dados_convertidos" / "rio_grande"

# co_cnes -> posicao correta. `idx_cota` = indice da 1a cota que molha o ponto (0 = nunca molha), igual ao de
# outros pontos na mesma coordenada em cota_pontos.json.
CORRECOES_SAUDE = {
    "6303609": {
        "nome": "SECRETARIA MUNICIPAL DE SAUDE DE RIO GRANDE",
        # Endereco oficial: Rua Marechal Floriano, 05, Centro, CEP 96200-380. A base trazia o ponto ~1 km a
        # nordeste, fora do municipio (indice de cota -1). Posicao = centroide do CEP 96200-380 (OSM/Nominatim),
        # a mesma coordenada de 3 empresas do mesmo CEP, todas com indice de cota 0.
        "lon": -52.0985343,
        "lat": -32.031745,
        "idx_cota": 0,
    },
}


def _cnes(props) -> str:
    return str(props.get("co_cnes", "")).strip().split(".")[0]


def _ler(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def _gravar(p: Path, gj) -> None:
    # Escrita atomica: arquivo temporario + os.replace, para nunca deixar JSON pela metade.
    temp = p.with_name(p.name + ".tmp")
    temp.write_text(json.dumps(gj, ensure_ascii=False), encoding="utf-8")
    os.replace(temp, p)


def _no_anel(x, y, anel) -> bool:
    dentro = False
    n = len(anel)
    for i in range(n):
        x1, y1 = anel[i][:2]
        x2, y2 = anel[(i + 1) % n][:2]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            dentro = not dentro
    return dentro


def _no_poligono(x, y, poly) -> bool:
    return _no_anel(x, y, poly[0]) and not any(_no_anel(x, y, h) for h in poly[1:])


def _na_mancha(x, y, mancha) -> bool:
    for f in mancha["features"]:
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"] if g["type"] == "MultiPolygon" else []
        if any(_no_poligono(x, y, p) for p in polys):
            return True
    return False


def corrigir_saude(rio_grande: Path, cnes: str, lon: float, lat: float, idx_cota: int = 0) -> dict:
    """Move a unidade `cnes` para (lon, lat) e reconcilia os cenarios e o indice de cota. Devolve um resumo."""
    rio_grande = Path(rio_grande)
    base_p = rio_grande / "saude_BASE.geojson"
    base = _ler(base_p)
    pos = [i for i, f in enumerate(base["features"]) if _cnes(f["properties"]) == str(cnes)]
    if not pos:
        raise ValueError(f"CNES {cnes} nao encontrado em {base_p.name}")
    feicao = base["features"][pos[0]]
    for i in pos:
        base["features"][i]["geometry"]["coordinates"] = [lon, lat]
    _gravar(base_p, base)

    resumo = {"cenarios": {}}
    for at_p in sorted((rio_grande / "cenarios").glob("saude_ATINGIDOS_*.geojson")):
        slug = at_p.name[len("saude_ATINGIDOS_"):-len(".geojson")]
        mancha_p = rio_grande / "cenarios" / f"{slug}.geojson"
        if not mancha_p.exists():
            continue
        dentro = _na_mancha(lon, lat, _ler(mancha_p))
        at = _ler(at_p)
        feats = at["features"]
        presentes = [f for f in feats if _cnes(f["properties"]) == str(cnes)]
        if dentro and presentes:
            for f in presentes:
                f["geometry"]["coordinates"] = [lon, lat]
            acao = "atualizada"
        elif dentro:
            feats.append({**feicao, "geometry": {**feicao["geometry"], "coordinates": [lon, lat]}})
            acao = "incluida"
        elif presentes:
            at["features"] = [f for f in feats if _cnes(f["properties"]) != str(cnes)]
            acao = "removida"
        else:
            acao = "inalterada"
        # Cenario inalterado nao e reescrito (ex.: 16/05, CIEX-only, onde a SMS fica fora da mancha).
        if acao != "inalterada":
            _gravar(at_p, at)
        resumo["cenarios"][slug] = acao

    pontos_p = rio_grande / "cota_pontos.json"
    if pontos_p.exists():
        pontos = _ler(pontos_p)
        idx = pontos["idx"]["saude"]
        for i in pos:
            idx[i] = idx_cota
        _gravar(pontos_p, pontos)
    return resumo


def aplicar_correcoes(rio_grande: Path = RIO_GRANDE) -> dict:
    return {
        cnes: corrigir_saude(rio_grande, cnes, c["lon"], c["lat"], c.get("idx_cota", 0))
        for cnes, c in CORRECOES_SAUDE.items()
    }


if __name__ == "__main__":
    for cnes, r in aplicar_correcoes().items():
        print(cnes, CORRECOES_SAUDE[cnes]["nome"], r)
