// Tipos e funções puras do comparativo de dano evitado (public/dados_convertidos/intervencoes_comparativo.json,
// gerado por scripts/gerar_comparativo_intervencoes.py). Testado em lib/comparativo.test.ts.
//
// evitado = baseline (sem intervenção) - intervenção; evitado % = evitado / baseline (null se baseline = 0).
// Valor negativo (a intervenção piora o indicador) é mantido, sem truncar.

import type { IntervencaoId } from "./cenarios.ts"
import { formatoBr } from "./formatos.ts"

export interface Indicadores {
  area_ha: number
  prof_max_cm: number
  area_por_faixa_ha: Record<string, number>
  empresas: number
  vinculos: number
  massa_salarial: number
  escolas: number
  matriculas: number
  unidades_saude: number
  patrimonio: number
  logradouros: number
  quadras: number
  perdas_total: number
  perdas_empresas: number
  perdas_educacao: number // perdas + custo adicional de reposição das aulas
  perdas_saude: number
  perdas_agricultura: number
  perdas_dias_efetivos: number
  // só quando `exposicao_disponivel` (valor de reposição de tudo o que molha, um teto)
  exposicao_empresas?: number
  exposicao_educacao?: number
  exposicao_saude?: number
  exposicao_total?: number
}

export interface EvitadoValor {
  valor: number
  pct: number | null
}

export type IntervencaoAtiva = Exclude<IntervencaoId, "sem-intervencao">

export interface ComparativoEvento {
  rotulo: string
  variantes: Record<IntervencaoId, Indicadores>
  evitado: Record<IntervencaoAtiva, Record<string, EvitadoValor>>
}

export interface Comparativo {
  limiar_cm: number
  exposicao_disponivel: boolean
  populacao_disponivel: boolean
  eventos: Record<string, ComparativoEvento>
}

export type TomEvitado = "evitado" | "piora" | "neutro"

/** Texto do percentual evitado (módulo, em pt-BR; "—" sem baseline) e o tom: positivo evita, negativo piora. */
export function formatarEvitado(
  valor: number,
  pct: number | null
): { texto: string; tom: TomEvitado } {
  const tom: TomEvitado = valor > 0 ? "evitado" : valor < 0 ? "piora" : "neutro"
  if (pct === null || !Number.isFinite(pct)) return { texto: "—", tom }
  return { texto: `${formatoBr(Math.abs(pct) * 100, Math.abs(pct) * 100 % 1 === 0 ? 0 : 1)}%`, tom }
}

export interface PerdasPorComponente {
  empresas: number
  educacao: number
  saude: number
  agricultura: number
  total: number
}

/** Reescala as perdas (DaLA do evento) para `dias` efetivos, como scaleTo da página de Perdas: a agricultura é custo fixo. */
export function perdasEmDias(ind: Indicadores, dias: number): PerdasPorComponente {
  const s = dias / ind.perdas_dias_efetivos
  const empresas = ind.perdas_empresas * s
  const educacao = ind.perdas_educacao * s
  const saude = ind.perdas_saude * s
  const agricultura = ind.perdas_agricultura
  return { empresas, educacao, saude, agricultura, total: empresas + educacao + saude + agricultura }
}

/** Perdas evitadas (R$) por uma intervenção, em `dias` efetivos. */
export function perdasEvitadasEmDias(base: Indicadores, interv: Indicadores, dias: number): EvitadoValor {
  const b = perdasEmDias(base, dias).total
  const i = perdasEmDias(interv, dias).total
  const valor = b - i
  return { valor, pct: b === 0 ? null : valor / b }
}
