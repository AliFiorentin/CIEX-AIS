"""
Perdas operacionais (DaLA) em cada cota da "Simulacao por Cotas" (pico de 21/05/2024), para o card "Perdas Operacionais"
da aba "Por cota" do Painel.

Mesma conta de `calcular_perdas_rio_grande.py` (importada daqui: empresas = VAB perdido, educacao = FUNDEB contada em
dobro, saude = producao SUS, agricultura = area x coeficiente), aplicada aos pontos que estao sob a agua em cada cota:
o indice por ponto de `cota_pontos.json` (k = 1a cota que molha o ponto) diz quais pontos de `{setor}_BASE.geojson`
entram. O valor e ACUMULADO (ponto molhado numa cota continua contando nas maiores), como a exposicao.

Periodo DaLA: o de Maio de 2024 (30 dias agudos + 60 de recuperacao = 60 dias efetivos) em todas as cotas, o mesmo que o
dashboard do BID usa na visao por cota. A interface reescala para 30 dias efetivos, como Perdas Operacionais e Dano
Evitado (agricultura e custo fixo). Nao ha profundidade nas cotas: so exposicao, nunca dano fisico em R$.

Agricultura vem de `climada_cota_detalhe_rio_grande.json` (area por cultura em cada cota) x `IMPACTO_AGRICOLA["maio_2024"]`.

Grava public/dados_convertidos/perdas_cotas.json:
  {"Rio Grande": {"_metodologia": "...", "por_cota": {"1.0": {<campos de perdas_operacionais.json>, "empresas_n": ..}}}}
com as chaves de cota no formato de `climada_cota_detalhe_rio_grande.json`.

Uso:  python scripts/calcular_perdas_cotas.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import calcular_perdas_rio_grande as perdas  # noqa: E402

DASH = perdas.DASH_DATA
RG = DASH / perdas.SLUG
PERIODO = "maio_2024"
OUT = DASH / "perdas_cotas.json"

METODOLOGIA = (
    "calculado: mesma conta de scripts/calcular_perdas_rio_grande.py nos pontos sob a agua em cada cota (indice de "
    "cota_pontos.json, acumulado), com o periodo DaLA de Maio de 2024 (30 + 60 dias) -- ver scripts/calcular_perdas_cotas.py"
)


def _carregar(caminho: Path) -> dict:
    return json.loads(caminho.read_text(encoding="utf-8"))


def selecionar(gj: dict, idx: list[int], n: int) -> dict:
    """FeatureCollection so com os pontos molhados ate a cota de ordem `n` (idx: 1..N = 1a cota que molha, 0/-1 = nunca)."""
    if len(idx) != len(gj["features"]):
        raise ValueError(f"indice por ponto desalinhado: {len(idx)} contra {len(gj['features'])} pontos")
    return {"features": [f for f, k in zip(gj["features"], idx) if 0 < k <= n]}


def perdas_agricolas(culturas: dict | None) -> float:
    coefs = {perdas.slugify(k): v for k, v in perdas.IMPACTO_AGRICOLA[PERIODO].items()}
    return sum(float(ha) * coefs.get(perdas.slugify(c), 0) for c, ha in (culturas or {}).items())


def main() -> None:
    pontos = _carregar(RG / "cota_pontos.json")
    detalhe = _carregar(DASH / f"climada_cota_detalhe_{perdas.SLUG}.json")["por_cota"]
    sus_index = _carregar(perdas.SUS_INDEX_PATH)
    bases = {s: _carregar(RG / f"{s}_BASE.geojson") for s in ("empresas", "educacao", "saude")}

    f_interrup, dias_agudo, dias_ef, label = perdas._dala_params(PERIODO, None)
    print(f"Periodo {PERIODO}: {label}")

    por_cota = {}
    for n, cota in enumerate(pontos["cotas"], start=1):
        chave = next(k for k in detalhe if abs(float(k) - cota) < 1e-6)
        sel = {s: selecionar(bases[s], pontos["idx"][s], n) for s in bases}
        emp = perdas.calcular_dano_empresas(sel["empresas"], f_interrup)
        edu = perdas.calcular_dano_educacao(sel["educacao"], dias_agudo)
        sau = perdas.calcular_dano_saude(sel["saude"], f_interrup, sus_index)
        agr = perdas_agricolas(detalhe[chave].get("agricultura", {}).get("culturas"))
        total = emp + edu + edu + sau + agr
        por_cota[chave] = {
            "dias_agudo": dias_agudo,
            "dias_efetivos": dias_ef,
            "f_interrup": round(f_interrup, 6),
            "empresas_vab": round(emp, 2),
            "educacao_perdas": round(edu, 2),
            "educacao_custo_adicional": round(edu, 2),
            "saude_producao": round(sau, 2),
            "agricultura_perdas": round(agr, 2),
            "total": round(total, 2),
            "empresas_n": len(sel["empresas"]["features"]),
            "educacao_n": len(sel["educacao"]["features"]),
            "saude_n": len(sel["saude"]["features"]),
        }
        print(f"  cota {cota} m: emp {perdas.fmt_brl(emp)} + edu 2x {perdas.fmt_brl(edu)} + sau {perdas.fmt_brl(sau)} "
              f"+ agr {perdas.fmt_brl(agr)} = {perdas.fmt_brl(total)} ({por_cota[chave]['empresas_n']} emp.)")

    OUT.write_text(
        json.dumps({"Rio Grande": {"_metodologia": METODOLOGIA, "por_cota": por_cota}}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Salvo em {OUT}")


if __name__ == "__main__":
    main()
