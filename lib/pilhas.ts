// Pilhas de geocodificação: muitos estabelecimentos de CEPs diferentes no mesmo ponto. É o geocodificador caindo
// num ponto padrão (centro da cidade) quando não acha o endereço. Vários no mesmo CEP (um prédio comercial) não
// contam. Usado só para avisar no painel; a correção dos dados é feita na origem (ver Metodologia, Seção 12).

export interface FeicaoPonto {
  geometry?: { coordinates?: unknown }
  properties?: Record<string, unknown> | null
}

export interface Pilha {
  lon: number
  lat: number
  /** Estabelecimentos no ponto. */
  n: number
  /** CEPs distintos entre eles. */
  ceps: number
}

export interface OpcoesPilha {
  minPontos?: number
  minCeps?: number
  /** Casas decimais usadas para agrupar pontos (5 ≈ 1 m). */
  casas?: number
  /** Propriedade com o CEP. */
  campoCep?: string
}

const chave = (lon: number, lat: number, casas: number) =>
  `${lon.toFixed(casas)},${lat.toFixed(casas)}`

function coordenadas(f: FeicaoPonto): [number, number] | null {
  const c = f.geometry?.coordinates
  if (!Array.isArray(c) || c.length < 2) return null
  const [lon, lat] = c
  return typeof lon === "number" && typeof lat === "number" ? [lon, lat] : null
}

/** Maior pilha (ponto com >= minPontos estabelecimentos de >= minCeps CEPs distintos), ou null. */
export function detectarPilha(
  feicoes: FeicaoPonto[],
  { minPontos = 20, minCeps = 10, casas = 5, campoCep = "cep" }: OpcoesPilha = {}
): Pilha | null {
  const grupos = new Map<string, { lon: number; lat: number; n: number; ceps: Set<string> }>()
  for (const f of feicoes) {
    const xy = coordenadas(f)
    if (!xy) continue
    const k = chave(xy[0], xy[1], casas)
    let g = grupos.get(k)
    if (!g) {
      g = { lon: Number(xy[0].toFixed(casas)), lat: Number(xy[1].toFixed(casas)), n: 0, ceps: new Set() }
      grupos.set(k, g)
    }
    g.n += 1
    const cep = f.properties?.[campoCep]
    if (cep !== null && cep !== undefined && String(cep).trim() !== "") g.ceps.add(String(cep).trim())
  }
  let melhor: Pilha | null = null
  for (const g of grupos.values()) {
    if (g.n >= minPontos && g.ceps.size >= minCeps && (!melhor || g.n > melhor.n)) {
      melhor = { lon: g.lon, lat: g.lat, n: g.n, ceps: g.ceps.size }
    }
  }
  return melhor
}

/** Quantas das feições estão no ponto da pilha (por exemplo, entre os pontos atingidos de um cenário). */
export function pontosNaPilha(feicoes: FeicaoPonto[], pilha: Pilha, casas = 5): number {
  const alvo = chave(pilha.lon, pilha.lat, casas)
  let n = 0
  for (const f of feicoes) {
    const xy = coordenadas(f)
    if (xy && chave(xy[0], xy[1], casas) === alvo) n += 1
  }
  return n
}
