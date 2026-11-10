"""
Calcula perdas operacionais (VAB perdido, reposicao educacional, producao SUS,
perdas agricolas) para os cenarios de inundacao de Rio Grande (RS).

Portado do pipeline de origem (07_danos.py), restrito a um unico municipio
(Rio Grande) -- sem o loop original sobre os 4 municipios do projeto de origem.

Metodologia DaLA (CEPAL): perdas = fluxo de producao nao realizado durante
a interrupcao/recuperacao.
  - Empresas:    VAB = (massa_salarial_mensal * 12) / labor_share; perda = VAB * f_interrup
  - Educacao:    perda = matriculas * (FUNDEB_VAAT_MIN / dias_letivos) * dias_agudo,
                 contada em dobro (perda de servico + custo de reposicao obrigatoria)
  - Saude:       perda = producao_SUS_anual * f_interrup (SIA + SIH, anualizado)
  - Agricultura: perda = area_ha_atingida * coeficiente_R$/ha (por cultura e periodo)

Fontes dos dados de entrada (copiadas de uma fonte externa, ver docs/dados-externos-rio-grande.md):
  - public/dados_convertidos/rio_grande/cenarios/{setor}_ATINGIDOS_{cenario}.geojson
  - public/dados_convertidos/rio_grande/cenarios/agricultura_stats_{cenario}.json
  - scripts/data/producao_sus_por_cnes_rio_grande.json (producao SIA+SIH por CNES,
    ja anualizada e filtrada aos estabelecimentos de Rio Grande)

No modo `--dias N` a interrupcao e tratada como N dias efetivos (f = N/365) e `dias_agudo = N/2`; so a
educacao usa `dias_agudo`. Sem `--dias`, valem os periodos DaLA de cada cenario (INTERRUPCAO_DALA).

Uso:  python scripts/calcular_perdas_rio_grande.py [--dias 30]
"""

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

# Permite importar modulos irmaos mesmo quando este arquivo e carregado por importlib (testes).
sys.path.insert(0, str(Path(__file__).resolve().parent))
from cenarios_intervencao import EVENTOS, nome_cenario, slug_cenario, todos  # noqa: E402

# ---------------------------------------------------------------------------
# Configuracao -- restrita a Rio Grande
# ---------------------------------------------------------------------------

ROOT = Path(__file__).parent.parent
DASH_DATA = ROOT / "public" / "dados_convertidos"
SLUG = "rio_grande"

CENARIOS = [
    "Cenário Setembro 2023", "Cenário Maio 2024", "Simulação de Maio de 2024 + 50%",
    "Nível da Lagoa + Chuva Acumulada – 16/05/2024",
]

# periodo do evento por cenario (define dias_agudo/dias_recuperacao e coef. agricola)
CENARIO_PERIODO = {
    "cenario_maio_2024":    "maio_2024",
    "simulacao_de_maio_de_2024_50": "maio_2024",
    "cenario_setembro_2023": "setembro_2023",
    # Simulacao hidrologica combinada de 16/05/2024 (plataforma Economia Azul) --
    # mesmo periodo/parametros DaLA do evento de Maio 2024 (ver converter_manchas_altura.py)
    "nivel_da_lagoa_chuva_acumulada_16_05_2024": "maio_2024",
}
# Simulacoes de intervencao (12 cenarios): o periodo DaLA vem do evento. Setembro de 2023 e Maio de 2024 usam os
# parametros adotados da origem; Novembro de 2023 e Junho de 2025 nao tem parametros proprios e usam dias INTERPOLADOS
# pela area atingida (ver DALA_REF e dias_dala_interpolados abaixo), uma estimativa, nao dado da CEPAL.
CENARIO_PERIODO.update({slug_cenario(e, v): EVENTOS[e]["periodo_dala"] for e, v in todos()})
CENARIOS_INTERVENCAO = [nome_cenario(e, v) for e, v in todos()]

# Referencias da interpolacao: (area atingida sem intervencao em ha, dias efetivos DaLA) de Setembro de 2023 (15 + 30/2 = 30)
# e de Maio de 2024 (30 + 60/2 = 60); as areas sao as das simulacoes sem intervencao (scripts/data/intervencoes_mancha_meta.json).
DALA_REF = ((333.0842, 30), (654.8956, 60))


def dias_dala_interpolados(area_ha: float) -> dict:
    """Dias DaLA de um evento sem parametros proprios: reta entre as duas referencias (DALA_REF) pela area atingida,
    arredondada a dias inteiros. `dias_agudo` e metade dos efetivos (a proporcao 1:2 das referencias) e a recuperacao
    fecha a conta: dias_agudo + dias_recuperacao / 2 = dias efetivos. Pode extrapolar abaixo de 30 dias (evento menor
    que Setembro de 2023); a incerteza e a de uma reta com dois pontos."""
    (a0, d0), (a1, d1) = DALA_REF
    efetivos = round(d0 + (area_ha - a0) / (a1 - a0) * (d1 - d0))
    agudo = round(efetivos / 2)
    return {"dias_agudo": agudo, "dias_recuperacao": 2 * (efetivos - agudo)}


INTERRUPCAO_DALA = {
    "maio_2024":     {"dias_agudo": 30, "dias_recuperacao": 60},
    "setembro_2023": {"dias_agudo": 15, "dias_recuperacao": 30},
    # Interpolados pela area (352,2 ha -> 32 dias efetivos; 253,6 ha -> 23); um teste confere com a meta das simulacoes
    "novembro_2023": {"dias_agudo": 16, "dias_recuperacao": 32},
    "junho_2025":    {"dias_agudo": 12, "dias_recuperacao": 22},
}

IMPACTO_AGRICOLA = {
    "maio_2024": {
        "Soja": 1100, "Arroz": 1100, "Outras Lavouras Temporárias": 1400,
    },
    # Sem efeito nas simulacoes (nenhuma lavoura passa do filtro de 0,5 ha); mesmos coeficientes de maio_2024
    "novembro_2023": {
        "Soja": 1100, "Arroz": 1100, "Outras Lavouras Temporárias": 1400,
    },
    "junho_2025": {
        "Soja": 1100, "Arroz": 1100, "Outras Lavouras Temporárias": 1400,
    },
    "setembro_2023": {
        "Soja": 250, "Arroz": 250, "Outras Lavouras Temporárias": 2800,
    },
}

# Labor share setorial (LS = Remuneracoes / VAB). Fonte: IBGE SCN 2021, Tabela 17.
LABOR_SHARE = {
    "agro": 0.176,
    "industria": 0.338,
    "servicos": 0.433,
    "adm_pub": 0.883,
}

# FUNDEB VAAT-MIN 2024 (Portaria Interministerial MEC/MF no 9, 28/08/2024)
FUNDEB_VAAT_MIN = 8481.21
DIAS_LETIVOS = 200

SUS_INDEX_PATH = ROOT / "scripts" / "data" / "producao_sus_por_cnes_rio_grande.json"
OUT_PATH = DASH_DATA / "perdas_operacionais.json"


# ---------------------------------------------------------------------------
# Helpers (portados de pipeline/common.py)
# ---------------------------------------------------------------------------

def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"^_+|_+$", "", s)
    return s


def get_prop(props, *keys, default=0):
    for k in keys:
        v = props.get(k)
        if v is not None:
            return v
    return default


def cnae_to_setor(cnae_str) -> str:
    """Mapeia CNAE (classe, 5 digitos) para macrossetor (agro/industria/servicos/adm_pub)."""
    # O CNAE chega como inteiro em parte das bases (ex.: 1113 em vez de "01113"), o que
    # perde o zero a esquerda e desloca a divisao (01 -> "11" = industria). Normaliza para
    # 5 digitos, como no pipeline de origem.
    try:
        cnae2 = int(str(cnae_str).strip().split(".")[0].zfill(5)[:2])
    except (ValueError, TypeError):
        return "servicos"
    if 1 <= cnae2 <= 3: return "agro"
    if 5 <= cnae2 <= 39: return "industria"
    if cnae2 == 84: return "adm_pub"
    return "servicos"


def load_geojson(path):
    path = Path(path)
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def fmt_brl(valor):
    if abs(valor) >= 1e9: return f"R$ {valor/1e9:,.2f} bi"
    if abs(valor) >= 1e6: return f"R$ {valor/1e6:,.1f} mi"
    if abs(valor) >= 1e3: return f"R$ {valor/1e3:,.1f} mil"
    return f"R$ {valor:,.2f}"


# ---------------------------------------------------------------------------
# Calculo por componente
# ---------------------------------------------------------------------------

def calcular_dano_empresas(gj, f_interrup):
    total = 0
    for feat in gj["features"]:
        props = feat["properties"]
        massa = float(get_prop(props, "massa_salarial", "Massa_Salarial", default=0) or 0)
        cnae = get_prop(props, "cnae_classe", "cnae", "cnae20_classe", "CNAE", default="")
        ls = LABOR_SHARE[cnae_to_setor(cnae)]
        total += (massa * 12 / ls) * f_interrup
    return total


def calcular_dano_educacao(gj, dias):
    """Perda FUNDEB: matriculas * (VAAT_MIN / dias_letivos) * dias_interrupcao."""
    total_mat = 0
    for feat in gj["features"]:
        props = feat["properties"]
        for col in ["qtd_matri_inf", "qtd_matri_fund", "qtd_matri_med",
                    "qtd_matri_prof", "qtd_matri_eja", "qtd_matri_esp"]:
            val = props.get(col, 0)
            if val and str(val) not in ("None", "nan", ""):
                total_mat += float(val)
    return total_mat * (FUNDEB_VAAT_MIN / DIAS_LETIVOS) * dias


def calcular_dano_saude(gj, f_interrup, sus_index):
    """sus_index: dict {cnes (7 digitos, zero-padded): producao_anual_total}."""
    if not sus_index:
        return 0.0
    total = 0.0
    for feat in gj["features"]:
        cnes = str(feat["properties"].get("co_cnes", "")).strip().split(".")[0].zfill(7)
        if not cnes or cnes == "0000000":
            continue
        total += float(sus_index.get(cnes, 0)) * f_interrup
    return total


def calcular_dano_agricultura(cen_slug):
    """Perdas agricolas: area_ha_atingida * coef_R$/ha por cultura e periodo."""
    periodo = CENARIO_PERIODO.get(cen_slug)
    if not periodo:
        return 0.0
    coefs = IMPACTO_AGRICOLA.get(periodo, {})
    stats_path = DASH_DATA / SLUG / "cenarios" / f"agricultura_stats_{SLUG}___{cen_slug}.json"
    if not stats_path.exists():
        return 0.0
    with open(stats_path, encoding="utf-8") as f:
        stats = json.load(f)
    # Casa a cultura ignorando acentos/caixa: parte dos stats traz "Outras Lavouras Temporarias".
    coefs_norm = {slugify(k): v for k, v in coefs.items()}
    return sum(float(area) * coefs_norm.get(slugify(cult), 0) for cult, area in stats.items())


def _dala_params(periodo, dias_override):
    """Retorna (f_interrup, dias_agudo, dias_efetivos, label) para o periodo dado."""
    if dias_override is not None:
        return dias_override / 365, dias_override / 2, dias_override, f"{dias_override}d (plano)"
    params = INTERRUPCAO_DALA.get(periodo, {"dias_agudo": 30, "dias_recuperacao": 60})
    da, dr = params["dias_agudo"], params["dias_recuperacao"]
    dias_ef = da + dr * 0.5
    return dias_ef / 365, da, round(dias_ef), f"DaLA {da}d+{dr}d×0,5={dias_ef:.0f}d ef."


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def calcular_perdas(dias=None, cenarios=None, arquivo=None):
    """Calcula as perdas dos `cenarios` (padrao: CENARIOS) e grava `arquivo` (padrao: perdas_operacionais.json)."""
    modo = f"--dias {dias} (plano)" if dias is not None else "DaLA (curva linear por periodo)"
    print(f"\n{'='*70}\n  Perdas Operacionais — Rio Grande — {modo}\n{'='*70}")

    sus_index = {}
    if SUS_INDEX_PATH.exists():
        with open(SUS_INDEX_PATH, encoding="utf-8") as f:
            sus_index = json.load(f)
    else:
        print(f"  AVISO: {SUS_INDEX_PATH} nao encontrado — saude sera R$ 0")

    resultados = {}

    for cen in (cenarios or CENARIOS):
        cen_slug = slugify(cen)
        periodo = CENARIO_PERIODO.get(cen_slug)
        f_interrup, da, dias_ef_int, label_modo = _dala_params(periodo, dias)

        dano_emp = dano_edu = dano_sau = 0.0
        for setor, calc_fn in [
            ("empresas", lambda gj: calcular_dano_empresas(gj, f_interrup)),
            ("educacao", lambda gj: calcular_dano_educacao(gj, da)),
            ("saude",    lambda gj: calcular_dano_saude(gj, f_interrup, sus_index)),
        ]:
            at_path = DASH_DATA / SLUG / "cenarios" / f"{setor}_ATINGIDOS_{SLUG}___{cen_slug}.geojson"
            at_gj = load_geojson(at_path)
            if at_gj:
                val = calc_fn(at_gj)
                if setor == "empresas": dano_emp = val
                elif setor == "educacao": dano_edu = val
                elif setor == "saude": dano_sau = val
            else:
                print(f"    AVISO: {at_path.name} nao encontrado")

        # Custo adicional de educacao: reposicao obrigatoria das aulas perdidas (LDB art.24, I)
        custo_adicional_edu = dano_edu
        dano_agr = calcular_dano_agricultura(cen_slug)
        total = dano_emp + dano_edu + custo_adicional_edu + dano_sau + dano_agr

        print(
            f"  {cen} [{label_modo}]: emp {fmt_brl(dano_emp)} + edu {fmt_brl(dano_edu)}"
            f" + edu_adic {fmt_brl(custo_adicional_edu)} + sau {fmt_brl(dano_sau)}"
            f" + agr {fmt_brl(dano_agr)} = {fmt_brl(total)}"
        )

        resultados.setdefault("Rio Grande", {})[cen] = {
            "dias_agudo":               da,
            "dias_efetivos":            dias_ef_int,
            "f_interrup":               round(f_interrup, 6),
            "empresas_vab":             round(dano_emp, 2),
            "educacao_perdas":          round(dano_edu, 2),
            "educacao_custo_adicional": round(custo_adicional_edu, 2),
            "saude_producao":           round(dano_sau, 2),
            "agricultura_perdas":       round(dano_agr, 2),
            "total":                    round(total, 2),
        }

    base_arq = Path(arquivo or "perdas_operacionais.json").stem
    nome_arq = f"{base_arq}.json" if dias is None else f"{base_arq}_sens_{dias}d.json"
    out_path = DASH_DATA / nome_arq
    DASH_DATA.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)
    print(f"\n  Perdas salvas: {out_path}")
    return resultados


def main():
    parser = argparse.ArgumentParser(description="Calcula perdas operacionais — Rio Grande")
    parser.add_argument(
        "--dias", type=int, default=None,
        help="Dias de interrupcao plana (sensibilidade). Omitir para usar curva DaLA por cenario.",
    )
    parser.add_argument(
        "--intervencoes", action="store_true",
        help="Calcula os 12 cenarios de intervencao e grava perdas_intervencoes.json (perdas_operacionais.json nao muda).",
    )
    args = parser.parse_args()
    if args.intervencoes:
        calcular_perdas(dias=args.dias, cenarios=CENARIOS_INTERVENCAO, arquivo="perdas_intervencoes.json")
    else:
        calcular_perdas(dias=args.dias)


if __name__ == "__main__":
    main()
