import { useState, useEffect, useMemo } from "react"
/** GeoJSON solto: o projeto não tem @types/geojson e tipa propriedades como any (ver CLAUDE.md). */
export type FeatureCollection = { features: any[]; [k: string]: any }
import { useCotaRaster, type CotaRaster } from "@/hooks/useCotaRaster"
import type { CotaPontos, DetalheCotaMun } from "@/lib/cotas-types"
import {
  COTAS_CENARIO,
  nCotasAtingidas,
  indiceAlinhado,
  filtrarPorIndice,
  primeiraCotaExposta,
} from "@/lib/cotas"

const SLUG = "rio_grande"

export interface UseCotas {
  cotasAtivo: boolean
  cotaRaster: CotaRaster
  cotaDetalhe: DetalheCotaMun | null
  cotaPontos: CotaPontos | null
  /** Há uma cota em exibição (tocando ou pausada): as abas acompanham a cota do slider. */
  cotaPausada: boolean
  /** Nº de cotas da série já atingidas pela cota atual. */
  nCotas: number
}

async function buscarJson<T>(
  url: string,
  signal: AbortSignal
): Promise<T | null> {
  try {
    const r = await fetch(url, { signal })
    return r.ok ? ((await r.json()) as T) : null
  } catch (e) {
    if ((e as Error).name !== "AbortError") console.error(e)
    return null
  }
}

/**
 * Cenário "Simulação por Cotas": água avançando por cota (raster) + painel com os valores da cota atual.
 * Nada é baixado enquanto o cenário não está ativo.
 */
export function useCotas(cenario: string): UseCotas {
  const cotasAtivo = cenario === COTAS_CENARIO
  const [cotaDetalhe, setCotaDetalhe] = useState<DetalheCotaMun | null>(null)
  const [cotaPontos, setCotaPontos] = useState<CotaPontos | null>(null)
  // Os dois arquivos já foram buscados (com ou sem sucesso): a água só começa a avançar depois.
  const [dadosOk, setDadosOk] = useState({ pontos: false, detalhe: false })

  // 1ª cota com algo exposto: o play começa aí, não na cota mínima (mapa vazio).
  const primeiraCota = useMemo(
    () =>
      cotaDetalhe?.por_cota ? primeiraCotaExposta(cotaDetalhe.por_cota) : null,
    [cotaDetalhe]
  )
  const cotaRaster = useCotaRaster(cotasAtivo ? SLUG : null, {
    inicio: primeiraCota,
    autoplay: true,
    prontoExterno: dadosOk.pontos && dadosOk.detalhe,
  })

  useEffect(() => {
    setCotaPontos(null)
    setCotaDetalhe(null)
    setDadosOk({ pontos: false, detalhe: false })
    if (!cotasAtivo) return
    const ctrl = new AbortController()
    buscarJson<CotaPontos>(
      `/dados_convertidos/${SLUG}/cota_pontos.json`,
      ctrl.signal
    ).then((d) => {
      if (ctrl.signal.aborted) return
      setCotaPontos(d)
      setDadosOk((o) => ({ ...o, pontos: true }))
    })
    buscarJson<DetalheCotaMun>(
      `/dados_convertidos/climada_cota_detalhe_${SLUG}.json`,
      ctrl.signal
    ).then((d) => {
      if (ctrl.signal.aborted) return
      setCotaDetalhe(d)
      setDadosOk((o) => ({ ...o, detalhe: true }))
    })
    return () => ctrl.abort()
  }, [cotasAtivo])

  const cotaPausada =
    cotasAtivo && cotaRaster.cota !== null && cotaRaster.meta !== null
  const nCotas = nCotasAtingidas(cotaRaster.meta?.cotas ?? [], cotaRaster.cota)
  return {
    cotasAtivo,
    cotaRaster,
    cotaDetalhe,
    cotaPontos,
    cotaPausada,
    nCotas,
  }
}

// Patrimônio histórico não tem índice por ponto em cota_pontos.json (é camada só do CIEX): é amostrado direto
// no raster de cotas (reduzido, ~5 m), o mesmo recurso que o índice usa quando não está alinhado com a base.
type Setor = "empresas" | "educacao" | "saude" | "patrimonio"
type Bases = Record<Setor, FeatureCollection | null>

export type CotaAtingidos = Bases

/**
 * Pontos de cada base que estão sob a água na cota atual. Usa o índice por ponto (cota_pontos.json,
 * igual à aba "Danos Físicos") quando alinhado com a base; senão amostra o raster de cotas.
 * Tudo `null` enquanto não há cota em exibição.
 */
export function useCotaAtingidos(cotas: UseCotas, bases: Bases): CotaAtingidos {
  const { cotaPausada, nCotas, cotaPontos, cotaRaster } = cotas
  const { amostrar } = cotaRaster
  const { empresas, educacao, saude, patrimonio } = bases

  // Só depende de `nCotas` (muda no máximo 5 vezes por loop), não da cota contínua do slider: assim os
  // atingidos não são refeitos a cada quadro da animação.
  return useMemo(() => {
    const vazio: CotaAtingidos = {
      empresas: null,
      educacao: null,
      saude: null,
      patrimonio: null,
    }
    if (!cotaPausada) return vazio
    const filtra = (
      fc: FeatureCollection | null,
      setor: Setor
    ): FeatureCollection | null => {
      if (!fc || !Array.isArray(fc.features)) return null
      const idx = indiceAlinhado(cotaPontos?.idx[setor], fc.features.length)
      const features = filtrarPorIndice(fc.features, idx, nCotas, (f) => {
        const g = f.geometry as { type: string; coordinates: number[] } | null
        return g && g.type === "Point"
          ? amostrar(g.coordinates[0], g.coordinates[1])
          : 0
      })
      return { ...fc, features }
    }
    return {
      empresas: filtra(empresas, "empresas"),
      educacao: filtra(educacao, "educacao"),
      saude: filtra(saude, "saude"),
      patrimonio: filtra(patrimonio, "patrimonio"),
    }
  }, [
    cotaPausada,
    nCotas,
    cotaPontos,
    amostrar,
    empresas,
    educacao,
    saude,
    patrimonio,
  ])
}
