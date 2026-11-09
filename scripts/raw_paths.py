"""
Caminhos dos arquivos originais (brutos) usados pelos scripts, todos dentro de RAW/.

RAW/ fica na raiz do projeto (~/Documents/CIEX/RAW), fora do repositorio do dashboard. Para usar outro lugar,
defina a variavel de ambiente RAW_DIR. Ver RAW/LEIAME.md e scripts/organizar_raw.py.
"""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

RAW_DIR = Path(os.environ.get("RAW_DIR", ROOT.parent / "RAW"))
SIM_INTERVENCOES = RAW_DIR / "simulacoes-intervencoes"
SIM_16_05 = RAW_DIR / "simulacoes-2024-05-16"
COTAS_PICO = RAW_DIR / "cotas-pico-2024-05-21"
MAPBIOMAS = RAW_DIR / "mapbiomas"
