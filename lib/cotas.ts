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
