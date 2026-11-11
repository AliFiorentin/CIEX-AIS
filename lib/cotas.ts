// Lógica pura do cenário "Simulação por Cotas" (sem React nem DOM), testada em lib/cotas.test.ts.

export const COTAS_CENARIO = "Simulação por Cotas"

const EPS = 1e-6

/** Quantas cotas da série já foram atingidas pela cota atual (0 se não há cota). */
export function nCotasAtingidas(cotas: number[], cota: number | null): number {
  if (cota === null) return 0
  return cotas.filter((c) => c <= cota + EPS).length
}

/** Devolve o índice por ponto só se tem o mesmo tamanho da base carregada (senão está desalinhado). */
export function indiceAlinhado(
  idx: number[] | undefined | null,
  nFeatures: number
): number[] | null {
  return idx && idx.length === nFeatures ? idx : null
}

/**
 * Mantém os itens que já estão sob a água. `idx[i]` é o índice (1..N) da 1ª cota que molha o ponto i
 * (0 = nunca). Sem índice, amostra o raster de cotas (`amostrar` devolve o mesmo tipo de índice).
 */
export function filtrarPorIndice<T>(
  features: T[],
  idx: number[] | null,
  n: number,
  amostrar: (f: T) => number
): T[] {
  if (n <= 0) return []
  return features.filter((f, i) => {
    const k = idx ? idx[i] : amostrar(f)
    return k > 0 && k <= n
  })
}

/**
 * Duração do fade de cada pixel, indexada pela 1ª cota que o molha (k = 1..N): o intervalo até a cota
 * anterior (a 1ª usa o passo da série). Em séries irregulares evita que a água de uma cota apareça
 * antes da anterior estar completa.
 */
export function passosPorIndice(cotas: number[]): Float32Array {
  const p = new Float32Array(cotas.length + 1)
  const passoInicial = cotas.length > 1 ? cotas[1] - cotas[0] : 1
  cotas.forEach((c, i) => {
    p[i + 1] = i === 0 ? passoInicial : c - cotas[i - 1]
  })
  return p
}

type Valor = { valor_exposto_brl: number }
type PorCota = Record<
  string,
  {
    empresas?: Valor
    educacao?: Valor
    saude?: Valor
    agricultura?: { area_ha: number }
  }
>

/** Menor cota com algo exposto (pontos com valor ou área agrícola); `null` se nenhuma. */
export function primeiraCotaExposta(porCota: PorCota): number | null {
  const achada = Object.keys(porCota)
    .sort((a, b) => parseFloat(a) - parseFloat(b))
    .find((k) => {
      const v = porCota[k]
      return (
        (v.empresas?.valor_exposto_brl ?? 0) > 0 ||
        (v.educacao?.valor_exposto_brl ?? 0) > 0 ||
        (v.saude?.valor_exposto_brl ?? 0) > 0 ||
        (v.agricultura?.area_ha ?? 0) > 0
      )
    })
  return achada === undefined ? null : parseFloat(achada)
}

/** `Rio Grande.cotas` de populacao_atingida.json: população atingida acumulada em cada cota (ordem de cota_mapa.json). */
export interface PopulacaoPorCota {
  _metodologia?: string
  por_cota: { cota: number; pop_atingida: number; pct_atingida: number }[]
}

/**
 * População atingida na cota atual (a última cota da série já alcançada, como em `filtrarPorIndice`).
 * `{ pop_atingida: 0, pct_atingida: 0 }` quando nenhuma cota foi atingida; `null` se o dado falta ou não bate com a
 * série de cotas do raster (desalinhado: melhor não mostrar do que mostrar o valor de outra cota).
 */
export function popAtingidaNaCota(
  pop: PopulacaoPorCota | undefined | null,
  cotas: number[],
  nCotas: number
): {
  pop_atingida: number
  pct_atingida: number
  _metodologia?: string
} | null {
  const lista = pop?.por_cota
  if (!lista || lista.length !== cotas.length) return null
  if (lista.some((p, i) => Math.abs(p.cota - cotas[i]) > EPS)) return null
  if (nCotas <= 0)
    return { pop_atingida: 0, pct_atingida: 0, _metodologia: pop._metodologia }
  const p = lista[Math.min(nCotas, lista.length) - 1]
  return {
    pop_atingida: p.pop_atingida,
    pct_atingida: p.pct_atingida,
    _metodologia: pop._metodologia,
  }
}

/**
 * Chave de `por_cota` (climada_cota_detalhe) da cota atual: a última já atingida, pois o valor exposto é cumulativo
 * e entre duas cotas vale a anterior. `chaves` em ordem crescente; `null` se nenhuma foi atingida.
 */
export function chaveCotaAtingida(
  chaves: string[],
  cota: number | null
): string | null {
  if (cota === null) return null
  const alcancadas = chaves.filter((c) => parseFloat(c) <= cota + EPS)
  return alcancadas[alcancadas.length - 1] ?? null
}

/**
 * Perdas operacionais da cota reescaladas para `dias` efetivos de interrupção (como Perdas Operacionais e Dano Evitado,
 * 30 dias): empresas, educação (perda + custo adicional) e saúde são proporcionais aos dias; a agricultura é custo fixo.
 */
export function perdasCotaEmDias(
  p: {
    dias_efetivos: number
    empresas_vab: number
    educacao_perdas: number
    educacao_custo_adicional: number
    saude_producao: number
    agricultura_perdas: number
  },
  dias: number
): {
  empresas: number
  educacao: number
  saude: number
  agricultura: number
  total: number
} {
  const s = p.dias_efetivos > 0 ? dias / p.dias_efetivos : 0
  const empresas = p.empresas_vab * s
  const educacao = (p.educacao_perdas + p.educacao_custo_adicional) * s
  const saude = p.saude_producao * s
  const agricultura = p.agricultura_perdas
  return {
    empresas,
    educacao,
    saude,
    agricultura,
    total: empresas + educacao + saude + agricultura,
  }
}
