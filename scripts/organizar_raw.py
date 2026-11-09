"""
Move e renomeia os arquivos originais (brutos) para RAW/, na raiz do projeto, fora do repositorio do dashboard.

Sem argumentos: SIMULACAO (lista o que seria movido e nao altera nada).
Com --apply: calcula o sha256 de cada origem, move (renomeacao atomica no mesmo volume; copia + confere + apaga
em outro volume), confere o sha256 no destino e grava RAW/MANIFESTO.csv. Nunca sobrescreve; rodar de novo depois de
aplicado informa 0 arquivos a mover, e uma execucao interrompida e retomada do ponto em que parou.

Uso:  python scripts/organizar_raw.py [--apply]
"""

import argparse
import csv
import hashlib
import os
import re
import shutil
import sys
from pathlib import Path
from typing import NamedTuple

from raw_paths import RAW_DIR, ROOT

EVENTOS_DIR = {
    "29setembro2023": "2023-09-29",
    "29novembro2023": "2023-11-29",
    "21maio2024": "2024-05-21",
    "28junho2025": "2025-06-28",
}
MAPBIOMAS_ARQUIVOS = [
    "agricultura_30m_mapbiomas.tif",
    "cobertura_30m_mapbiomas.tif",
    "cobertura_10m_mapbiomas.tif",
    "agricultura_riogrande_col10_2024.geojson",
]
IGNORADOS = {".DS_Store"}
# Pastas que nunca sao removidas ao subir pela arvore de origem depois de esvaziada.
PROTEGIDAS = {"Downloads", "data", "scripts", "CIEX", "dashboard-ciex"}

LEIAME = """# RAW: arquivos originais (brutos)

Arquivos originais usados pelos scripts de `dashboard-ciex/scripts/`. Foram **movidos** (nao copiados) e renomeados
por `scripts/organizar_raw.py`; `MANIFESTO.csv` guarda, para cada arquivo, o caminho novo, o caminho original, o
`sha256` e o tamanho, de modo que a movimentacao pode ser conferida e revertida.

| Pasta | O que e | Quem usa |
|---|---|---|
| `simulacoes-intervencoes/AAAA-MM-DD/{sem-intervencao,diques,diques-barragens}/bacia{N}.*` | Rasters de profundidade (cm) por bacia, modelo TELEMAC: 4 eventos x 3 variantes x 6 bacias (1, 2, 3, 4, 5, 7), com os `.qml` e `.aux.xml` originais. `sem-intervencao` = `cenario1`; `diques` e `diques-barragens` = `cenario6`. | `converter_intervencoes.py` |
| `simulacoes-2024-05-16/` | Simulacao hidrologica do 16/05/2024 (plataforma Economia Azul): nivel da lagoa e chuva acumulada. | `converter_manchas_altura.py` |
| `cotas-pico-2024-05-21/` | Mascaras molhado/seco por cota do pico de 21/05/2024 (6 bacias x 6 cotas). | `gerar_cota_mapa.py` |
| `mapbiomas/` | MapBiomas Colecao 10 (2024), cobertura e lavouras, recortados em Rio Grande. | `converter_cobertura_rio_grande.py`, `converter_agricultura_rio_grande.py` |

## Nao localizados nesta maquina

Informados por variavel de ambiente; ficam fora de RAW/ ate serem obtidos:

| Arquivo | Variavel | Script |
|---|---|---|
| `PMRG_231215_layer_*.shp` (Prefeitura) | `INFRA_DADOS_DIR` | `converter_infra_rio_grande.py` |
| `patrimHistRG_verificados.shp` | `PATRIMONIO_SHP` | `converter_patrimonio_rio_grande.py` |
| `bra_pd_2020_1km.tif` | `POP_RASTER` | `gerar_populacao_atingida.py` |

Ficam versionados em `dashboard-ciex/scripts/data/`: `rio_grande_limite.geojson` e `producao_sus_por_cnes_rio_grande.json`.
"""


class Movimento(NamedTuple):
    origem: Path
    destino: Path


def destino_intervencao(rel: Path) -> Path:
    """Caminho relativo original (cenario1/... ou cenario6/...) -> relativo dentro de simulacoes-intervencoes/."""
    partes = rel.parts
    grupo, pasta_evento = partes[0], partes[1]
    if grupo == "cenario1":
        evento, variante = pasta_evento.split("_", 1)[1], "sem-intervencao"
    elif grupo == "cenario6":
        evento = pasta_evento
        variante = "diques-barragens" if partes[2].lower().endswith("diquesbarragens") else "diques"
    else:
        raise ValueError(f"Grupo desconhecido: {rel}")
    if evento not in EVENTOS_DIR:
        raise ValueError(f"Evento desconhecido: {rel}")
    nome = rel.name
    bacia = re.match(r"(?i)^bacia(\d+)", nome)
    if not bacia:
        raise ValueError(f"Nome sem numero de bacia: {rel}")
    baixo = nome.lower()
    sufixo = ".tif.aux.xml" if baixo.endswith(".tif.aux.xml") else ".qml" if baixo.endswith(".qml") else ".tif"
    return Path(EVENTOS_DIR[evento]) / variante / f"bacia{bacia.group(1)}{sufixo}"


def _arquivos(raiz: Path):
    if not raiz.is_dir():
        return
    for p in sorted(raiz.rglob("*")):
        if p.is_file() and p.name not in IGNORADOS:
            yield p


def planejar(raiz_downloads: Path, raiz_projeto: Path, raw: Path) -> list[Movimento]:
    """Lista o que ainda precisa ser movido (so origens que existem). Nao altera nada."""
    mov: list[Movimento] = []
    base = raiz_downloads / "imagensGeoTIFF_Alisson"
    for p in _arquivos(base):
        mov.append(Movimento(p, raw / "simulacoes-intervencoes" / destino_intervencao(p.relative_to(base))))
    brutos = raiz_projeto.parent / "dados-brutos" / "plataforma-economia-azul"
    for p in _arquivos(brutos):
        mov.append(Movimento(p, raw / "simulacoes-2024-05-16" / p.relative_to(brutos)))
    cotas = raiz_downloads / "pico210524_evolucaoPorCota"
    for p in _arquivos(cotas):
        mov.append(Movimento(p, raw / "cotas-pico-2024-05-21" / p.relative_to(cotas)))
    dados = raiz_projeto / "scripts" / "data"
    for nome in MAPBIOMAS_ARQUIVOS:
        if (dados / nome).is_file():
            mov.append(Movimento(dados / nome, raw / "mapbiomas" / nome))
    return mov


def _sha256(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()


def _mover(origem: Path, destino: Path) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.rename(origem, destino)  # atomica no mesmo volume
    except OSError:
        shutil.copy2(origem, destino)  # outro volume: copia, (o chamador confere o sha256) e so entao apaga
        origem.unlink()


def _limpar_vazias(origem: Path) -> None:
    pasta = origem.parent
    while pasta.name not in PROTEGIDAS and pasta.is_dir():
        restos = [p for p in pasta.iterdir() if p.name not in IGNORADOS]
        if restos:
            return
        for p in pasta.iterdir():
            p.unlink()
        pasta.rmdir()
        pasta = pasta.parent


def aplicar(mov: list[Movimento], manifesto: Path) -> None:
    """Move conferindo o sha256; acrescenta ao manifesto. Para antes de mexer em qualquer coisa se algum destino existe."""
    existentes = [m.destino for m in mov if m.destino.exists()]
    if existentes:
        raise SystemExit(f"Destino ja existe (nada foi movido): {existentes[0]}")
    manifesto.parent.mkdir(parents=True, exist_ok=True)
    novo = not manifesto.exists()
    with manifesto.open("a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if novo:
            w.writerow(["caminho_novo", "caminho_original", "sha256", "bytes"])
        for m in mov:
            antes = _sha256(m.origem)
            tamanho = m.origem.stat().st_size
            _mover(m.origem, m.destino)
            if _sha256(m.destino) != antes:
                raise SystemExit(f"sha256 difere depois de mover: {m.destino}")
            w.writerow([str(m.destino.relative_to(manifesto.parent)), str(m.origem), antes, tamanho])
            f.flush()
            _limpar_vazias(m.origem)
    (manifesto.parent / "LEIAME.md").write_text(LEIAME, encoding="utf-8")


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Move e renomeia os originais para RAW/ (simulacao por padrao).")
    ap.add_argument("--apply", action="store_true", help="executa a movimentacao (sem isto, so lista)")
    args = ap.parse_args(argv)
    mov = planejar(Path.home() / "Downloads", ROOT, RAW_DIR)
    print(f"{len(mov)} arquivo(s) a mover para {RAW_DIR}")
    por_pasta: dict[str, int] = {}
    for m in mov:
        k = m.destino.relative_to(RAW_DIR).parts[0]
        por_pasta[k] = por_pasta.get(k, 0) + 1
    for k, n in sorted(por_pasta.items()):
        print(f"  {k}: {n}")
    for m in mov[:5]:
        print(f"  ex.: {m.origem}  ->  {m.destino.relative_to(RAW_DIR)}")
    if not args.apply:
        print("SIMULACAO: nada foi alterado. Use --apply para mover.")
        return
    if mov:
        aplicar(mov, RAW_DIR / "MANIFESTO.csv")
    print("Concluido." if mov else "Nada a mover.")


if __name__ == "__main__":
    main(sys.argv[1:])
