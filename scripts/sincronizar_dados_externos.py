"""
Sincroniza os dados de Rio Grande do projeto de origem para este projeto, com politica explicita.

Politica (ver docs/superpowers/specs/2026-11-07-cotas-perdas-rio-grande-design.md, secao 3):
  - copiar : a origem prevalece (arquivos de cota, ATINGIDOS/BASE de mesmo nome dos 3 cenarios
             comuns, agricultura_stats_* dos cenarios comuns, mancha dos cenarios comuns).
  - manter : o CIEX prevalece (4o cenario, agricultura/cobertura/patrimonio, *.fgb, rasters PNG,
             infra quadras/terrenos -- o app le .fgb).
  - ignorar: nao e consumido pelo CIEX (edificacoes, limite, paineis de infra, .webp fora da cota)
             ou so existe na origem.

Uso:  python3 scripts/sincronizar_dados_externos.py --origem PATH [--apply]   (ou DADOS_EXTERNOS_DIR=PATH)
      Sem --apply so imprime o relatorio (nada e modificado).
"""

import argparse
import json
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CIEX_DADOS = ROOT / "public" / "dados_convertidos"
ORIGEM_DADOS_PADRAO = Path(os.environ["DADOS_EXTERNOS_DIR"]) if os.environ.get("DADOS_EXTERNOS_DIR") else None

ARQUIVOS_COTA = {
    "rio_grande/cota_mapa.json",
    "rio_grande/cota_mapa.webp",
    "rio_grande/cota_pontos.json",
    "climada_cota_rio_grande.json",
    "climada_cota_detalhe_rio_grande.json",
    "climada_exposicao_rio_grande.json",
}
RAIZ_CLIMADA = sorted(a for a in ARQUIVOS_COTA if "/" not in a)


def classificar(rel: str, existe_bid: bool, existe_ciex: bool) -> str:
    """Devolve 'copiar' | 'manter' | 'ignorar' para um arquivo (rel a dados_convertidos/)."""
    nome = rel.rsplit("/", 1)[-1]
    # A imagem de cota e regenerada aqui a partir das mascaras brutas (scripts/gerar_cota_mapa.py): a da origem
    # desenhava ~34% mais agua que a declarada. So e copiada se ainda nao existir no CIEX.
    if rel == "rio_grande/cota_mapa.webp" and existe_ciex:
        return "manter"
    if rel in ARQUIVOS_COTA:
        return "copiar"
    # 16/05 e CIEX-only: qualquer grafia do slug (nivel_da_lagoa..., cenario_16_05_2024) fica protegida.
    if "nivel_da_lagoa" in rel or "altura_raster" in rel or "16_05_2024" in rel:
        return "manter"
    # infra_stats_* e gerado aqui por gerar_infra_stats.py a partir dos ATINGIDOS: nunca vem da origem.
    if nome.startswith("infra_stats_"):
        return "manter" if existe_ciex else "ignorar"
    if nome.startswith("agricultura_stats_") and existe_bid and existe_ciex:
        return "copiar"
    if nome.startswith(("agricultura_", "cobertura_", "patrimonio_")) or nome.endswith((".fgb", ".png")):
        return "manter" if existe_ciex else "ignorar"
    if "quadras" in nome or "terrenos" in nome:
        return "manter" if existe_ciex else "ignorar"
    if any(t in nome for t in ("edificacoes", "limite_BASE", "infraestrutura_painel", "infraestrutura_stats")) \
            or nome.endswith(".webp"):
        return "ignorar"
    if existe_bid and existe_ciex:
        return "copiar"
    if existe_bid:
        return "ignorar"
    return "manter"


def _arquivos(raiz: Path) -> dict:
    """rel -> Path para rio_grande/** e os climada_*_rio_grande.json da raiz."""
    out = {}
    base = raiz / "rio_grande"
    if base.exists():
        for p in base.rglob("*"):
            if p.is_file():
                out[p.relative_to(raiz).as_posix()] = p
    for rel in RAIZ_CLIMADA:
        if (raiz / rel).is_file():
            out[rel] = raiz / rel
    return out


def _canon(p: Path) -> str:
    if p.suffix in (".json", ".geojson"):
        try:
            return json.dumps(json.loads(p.read_text(encoding="utf-8")), sort_keys=True)
        except (ValueError, UnicodeDecodeError):
            pass
    return p.read_bytes().hex()


def _n_feicoes(p: Path):
    if p.suffix != ".geojson":
        return None
    try:
        return len(json.loads(p.read_text(encoding="utf-8")).get("features", []))
    except ValueError:
        return None


def _chaves_props(p: Path) -> set:
    """Uniao das chaves de `properties` das feicoes de um .geojson."""
    try:
        feicoes = json.loads(p.read_text(encoding="utf-8")).get("features", [])
    except ValueError:
        return set()
    return {k for f in feicoes for k in (f.get("properties") or {})}


def _perde_atributos(b: Path, c: Path) -> bool:
    """True se o arquivo da origem tem menos colunas que o do CIEX (ex.: properties = {}), o que indica regressao."""
    if b.suffix != ".geojson" or c.suffix != ".geojson":
        return False
    ciex_chaves = _chaves_props(c)
    return bool(ciex_chaves) and not ciex_chaves <= _chaves_props(b)


def relatorio(origem_root: Path, ciex_root: Path) -> list:
    origem, ciex = _arquivos(origem_root), _arquivos(ciex_root)
    itens = []
    for rel in sorted(set(origem) | set(ciex)):
        b, c = origem.get(rel), ciex.get(rel)
        acao = classificar(rel, b is not None, c is not None)
        igual = bool(b and c and _canon(b) == _canon(c))
        itens.append({
            "rel": rel,
            "acao": acao,
            "igual": igual,
            "bloqueado": bool(acao == "copiar" and not igual and b and c and _perde_atributos(b, c)),
            "n_feicoes_bid": _n_feicoes(b) if b else None,
            "n_feicoes_ciex": _n_feicoes(c) if c else None,
            "bytes_bid": b.stat().st_size if b else None,
            "bytes_ciex": c.stat().st_size if c else None,
        })
    return itens


def aplicar(origem_root: Path, ciex_root: Path, itens: list, backup_dir: Path = None) -> list:
    """Copia os itens 'copiar' que diferem; devolve os rel copiados.

    - Itens `bloqueado` (a origem perderia colunas) nao sao copiados.
    - A copia e atomica (arquivo temporario + os.replace), para nao deixar arquivo pela metade.
    - Com `backup_dir`, o original do CIEX e guardado em backup_dir/<rel> antes de ser substituido.
    """
    copiados = []
    for it in itens:
        if it["acao"] != "copiar" or it["igual"] or it["bytes_bid"] is None or it.get("bloqueado"):
            continue
        destino = ciex_root / it["rel"]
        destino.parent.mkdir(parents=True, exist_ok=True)
        if backup_dir is not None and destino.exists():
            salvo = Path(backup_dir) / it["rel"]
            salvo.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(destino, salvo)
        temp = destino.with_name(destino.name + ".sync-tmp")
        shutil.copy2(origem_root / it["rel"], temp)
        os.replace(temp, destino)
        copiados.append(it["rel"])
    return copiados


def _imprimir(itens: list) -> None:
    for acao in ("copiar", "manter", "ignorar"):
        grupo = [i for i in itens if i["acao"] == acao]
        print(f"\n== {acao.upper()} ({len(grupo)})")
        for i in grupo:
            marca = "=" if i["igual"] else "*"
            feic = f"{i['n_feicoes_bid']}->{i['n_feicoes_ciex']}" if i["n_feicoes_bid"] is not None or i["n_feicoes_ciex"] is not None else "-"
            print(f"  {marca} feicoes {feic:>12}  bytes {i['bytes_bid']}->{i['bytes_ciex']}  {i['rel']}")
    bloqueados = [i for i in itens if i.get("bloqueado")]
    a_copiar = [i for i in itens if i["acao"] == "copiar" and not i["igual"] and not i.get("bloqueado")]
    print(f"\nArquivos que serao copiados: {len(a_copiar)}  (* = difere, = = igual)")
    if bloqueados:
        print(f"\nBLOQUEADOS (o arquivo da origem perderia colunas do CIEX; NAO serao copiados): {len(bloqueados)}")
        for i in bloqueados:
            print(f"  ! {i['rel']}")


def main():
    ap = argparse.ArgumentParser(description="Sincroniza dados de Rio Grande da origem")
    ap.add_argument("--origem", type=Path, default=ORIGEM_DADOS_PADRAO)
    ap.add_argument("--apply", action="store_true", help="copia os arquivos classificados como 'copiar'")
    args = ap.parse_args()
    if args.origem is None:
        ap.error("informe a pasta dos dados externos com --origem ou com a variavel DADOS_EXTERNOS_DIR")

    itens = relatorio(args.origem, CIEX_DADOS)
    _imprimir(itens)
    if args.apply:
        backup = Path(tempfile.gettempdir()) / f"ciex-sync-backup-{time.strftime('%Y%m%d-%H%M%S')}"
        copiados = aplicar(args.origem, CIEX_DADOS, itens, backup_dir=backup)
        print(f"\nCopiados: {len(copiados)}  (originais salvos em {backup})")
        # Reaplica as correcoes de coordenada que o CIEX mantem sobre os dados da origem (a copia as desfaz).
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from corrigir_coordenadas import aplicar_correcoes

        for cnes, resumo in aplicar_correcoes(CIEX_DADOS / "rio_grande").items():
            print(f"Coordenada corrigida (CNES {cnes}): {resumo['cenarios']}")


if __name__ == "__main__":
    main()
