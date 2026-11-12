"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Map, { Source, Layer, type MapRef, type ViewStateChangeEvent } from "react-map-gl/maplibre"
import { CompareReveal } from "@/components/ui/compare-reveal"
import { scenarioSlug } from "@/lib/cenarios"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Layers, Info, Ruler, LocateFixed } from "lucide-react"

export interface ScenarioOption {
  valor: string
  rotuloCurto: string
  descricao?: string
}

export interface ScenarioGroup {
  grupo: string
  subtitulo?: string
  cenarios: ScenarioOption[]
}

export const GRUPOS_CENARIOS: ScenarioGroup[] = [
  {
    grupo: "Maio de 2024 (Pico Histórico)",
    subtitulo: "Simulação Hidrodinâmica FURG/IPH",
    cenarios: [
      {
        valor: "Simulação de Maio de 2024 – Sem intervenção",
        rotuloCurto: "Maio 2024 — Sem intervenção",
        descricao: "Cenário base da cheia de maio/24 sem contenção",
      },
      {
        valor: "Simulação de Maio de 2024 – Diques",
        rotuloCurto: "Maio 2024 — Diques",
        descricao: "Com implantação do sistema de diques",
      },
      {
        valor: "Simulação de Maio de 2024 – Diques + barragens",
        rotuloCurto: "Maio 2024 — Diques + Barragens",
        descricao: "Com sistema integrado de diques e barragens",
      },
    ],
  },
  {
    grupo: "Novembro de 2023",
    subtitulo: "Cheia sazonal de primavera",
    cenarios: [
      {
        valor: "Simulação de Novembro de 2023 – Sem intervenção",
        rotuloCurto: "Nov 2023 — Sem intervenção",
        descricao: "Cenário base da cheia de nov/2023",
      },
      {
        valor: "Simulação de Novembro de 2023 – Diques",
        rotuloCurto: "Nov 2023 — Diques",
        descricao: "Com sistema de diques",
      },
      {
        valor: "Simulação de Novembro de 2023 – Diques + barragens",
        rotuloCurto: "Nov 2023 — Diques + Barragens",
        descricao: "Com diques e barragens",
      },
    ],
  },
  {
    grupo: "Setembro de 2023",
    subtitulo: "Evento do ciclone extratropical",
    cenarios: [
      {
        valor: "Simulação de Setembro de 2023 – Sem intervenção",
        rotuloCurto: "Set 2023 — Sem intervenção",
        descricao: "Cenário base da cheia de set/2023",
      },
      {
        valor: "Simulação de Setembro de 2023 – Diques",
        rotuloCurto: "Set 2023 — Diques",
        descricao: "Com sistema de diques",
      },
      {
        valor: "Simulação de Setembro de 2023 – Diques + barragens",
        rotuloCurto: "Set 2023 — Diques + Barragens",
        descricao: "Com diques e barragens",
      },
    ],
  },
  {
    grupo: "Junho de 2025 (Projeção Futura)",
    subtitulo: "Simulação prospectiva de inverno",
    cenarios: [
      {
        valor: "Simulação de Junho de 2025 – Sem intervenção",
        rotuloCurto: "Jun 2025 — Sem intervenção",
        descricao: "Projeção futura sem intervenções adicionais",
      },
      {
        valor: "Simulação de Junho de 2025 – Diques",
        rotuloCurto: "Jun 2025 — Diques",
        descricao: "Projeção futura com diques implementados",
      },
      {
        valor: "Simulação de Junho de 2025 – Diques + barragens",
        rotuloCurto: "Jun 2025 — Diques + Barragens",
        descricao: "Projeção futura com diques e barragens",
      },
    ],
  },
  {
    grupo: "Cenários Históricos & Extremos",
    subtitulo: "Estresse hídrico e manchas de pico",
    cenarios: [
      {
        valor: "Simulação de Maio de 2024 + 50%",
        rotuloCurto: "Maio 2024 + 50% (Água +60cm)",
        descricao: "Lâmina d'água 60 cm acima de maio/24 (~7x maior)",
      },
      {
        valor: "Nível da Lagoa + Chuva Acumulada – 16/05/2024",
        rotuloCurto: "Lagoa + Chuva (16/05/2024)",
        descricao: "Mancha combinada do pico do evento de maio/24",
      },
    ],
  },
]

export const CENARIOS_COMPARACAO: string[] = GRUPOS_CENARIOS.flatMap((g) =>
  g.cenarios.map((c) => c.valor)
)

export function cenarioShortLabel(cenario: string): string {
  for (const g of GRUPOS_CENARIOS) {
    for (const c of g.cenarios) {
      if (c.valor === cenario) return c.rotuloCurto
    }
  }
  return cenario
}

export interface CotaMetaInfo {
  bounds: [number, number, number, number]
  coordinates: [[number, number], [number, number], [number, number], [number, number]]
  width: number
  height: number
  cotas: number[]
}

// Cache em memória do raster decodificado por município
const cotaRasterCache = new globalThis.Map<
  string,
  { meta: CotaMetaInfo; ix: Uint8Array }
>()

async function getCotaRasterData(municipio: string = "rio_grande") {
  const slug = "rio_grande"
  if (cotaRasterCache.has(slug)) return cotaRasterCache.get(slug)!
  try {
    const meta: CotaMetaInfo = await (await fetch(`/dados_convertidos/${slug}/cota_mapa.json`)).json()
    const blob = await (await fetch(`/dados_convertidos/${slug}/cota_mapa.webp`)).blob()
    const bmp = await createImageBitmap(blob, { premultiplyAlpha: "none" })
    const canvas = document.createElement("canvas")
    canvas.width = meta.width
    canvas.height = meta.height
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!
    ctx.drawImage(bmp, 0, 0)
    const px = ctx.getImageData(0, 0, meta.width, meta.height).data
    const ix = new Uint8Array(meta.width * meta.height)
    for (let i = 0; i < ix.length; i++) ix[i] = px[i * 4 + 3] ? px[i * 4] : 0
    const res = { meta, ix }
    cotaRasterCache.set(slug, res)
    return res
  } catch {
    return null
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "")
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ]
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 5,
    parseInt(clean.slice(2, 4), 16) || 80,
    parseInt(clean.slice(4, 6), 16) || 113,
  ]
}

function renderCotaDataUrl(
  meta: CotaMetaInfo,
  ix: Uint8Array,
  cota: number,
  colorHex: string
): string {
  const canvas = document.createElement("canvas")
  canvas.width = meta.width
  canvas.height = meta.height
  const ctx = canvas.getContext("2d")!
  const img = ctx.createImageData(meta.width, meta.height)
  const px32 = new Uint32Array(img.data.buffer)
  const [r, g, b] = hexToRgb(colorHex)
  const color32 = ((235 << 24) | (b << 16) | (g << 8) | r) >>> 0

  const cotasArr = meta.cotas
  for (let i = 0; i < ix.length; i++) {
    const k = ix[i]
    if (k > 0 && cotasArr[k - 1] <= cota + 1e-4) {
      px32[i] = color32
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}

export function formatCotaDisplay(c?: number | null): string {
  if (c == null) return ""
  const formatted = c.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  return `Cota ${formatted} m`
}

export interface ScenarioCompareMapProps {
  cenarioA?: string
  cenarioB?: string
  cenarioAInicial?: string
  cenarioBInicial?: string
  cotaA?: number | null
  cotaB?: number | null
  modo?: "cenarios" | "cotas"
  cotasList?: number[]
  onCenarioAChange?: (c: string) => void
  onCenarioBChange?: (c: string) => void
  onCotaAChange?: (c: number) => void
  onCotaBChange?: (c: number) => void
  onClose?: () => void
  isFullScreen?: boolean
  showPoints?: boolean
  initialViewState?: {
    longitude: number
    latitude: number
    zoom: number
    pitch?: number
    bearing?: number
  }
}

interface MapSideProps {
  mapRef: React.RefObject<MapRef | null>
  cenario?: string
  cota?: number | null
  color: string
  initialViewState: {
    longitude: number
    latitude: number
    zoom: number
    pitch: number
    bearing: number
  }
  onMove: (evt: ViewStateChangeEvent) => void
  showPoints?: boolean
}

// Cache em memória para GeoJSONs dos cenários e pontos
const geojsonCache = new globalThis.Map<string, GeoJSON.FeatureCollection>()

async function fetchGeoJsonCached(url: string): Promise<GeoJSON.FeatureCollection | null> {
  if (geojsonCache.has(url)) {
    return geojsonCache.get(url)!
  }
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    geojsonCache.set(url, data)
    return data
  } catch {
    return null
  }
}

/**
 * Lado individual do mapa no comparador.
 * Memoizado com React.memo para garantir máxima fluidez durante arraste ou swipe.
 */
const MapSide = React.memo(function MapSide({
  mapRef,
  cenario,
  cota,
  color,
  initialViewState,
  onMove,
  showPoints = true,
}: MapSideProps) {
  const [mancha, setMancha] = useState<GeoJSON.FeatureCollection | null>(() => {
    if (cota != null || !cenario || cenario === "(nenhum)") return null
    const url = `/dados_convertidos/rio_grande/cenarios/${scenarioSlug(cenario)}.geojson`
    return geojsonCache.get(url) ?? null
  })
  const [eduPoints, setEduPoints] = useState<GeoJSON.FeatureCollection | null>(() => {
    if (cota != null || !cenario || cenario === "(nenhum)" || !showPoints) return null
    const url = `/dados_convertidos/rio_grande/cenarios/educacao_ATINGIDOS_${scenarioSlug(cenario)}.geojson`
    return geojsonCache.get(url) ?? null
  })
  const [sauPoints, setSauPoints] = useState<GeoJSON.FeatureCollection | null>(() => {
    if (cota != null || !cenario || cenario === "(nenhum)" || !showPoints) return null
    const url = `/dados_convertidos/rio_grande/cenarios/saude_ATINGIDOS_${scenarioSlug(cenario)}.geojson`
    return geojsonCache.get(url) ?? null
  })

  // Raster de Cota
  const [cotaDataUrl, setCotaDataUrl] = useState<string | null>(null)
  const [cotaCoordinates, setCotaCoordinates] = useState<[[number, number], [number, number], [number, number], [number, number]] | null>(null)

  useEffect(() => {
    let isCancelled = false
    const munSlug = "rio_grande"

    // Modo 1: Renderização por Cota Hidrométrica
    if (cota != null) {
      setMancha(null)
      getCotaRasterData(munSlug).then((data) => {
        if (isCancelled || !data) return
        const url = renderCotaDataUrl(data.meta, data.ix, cota, color)
        setCotaDataUrl(url)
        setCotaCoordinates(data.meta.coordinates)
      })

      // Pontos atingidos na cota
      if (showPoints) {
        Promise.all([
          fetchGeoJsonCached(`/dados_convertidos/${munSlug}/cota_pontos.json`),
          fetchGeoJsonCached(`/dados_convertidos/${munSlug}/educacao_BASE.geojson`),
          fetchGeoJsonCached(`/dados_convertidos/${munSlug}/saude_BASE.geojson`),
        ]).then(([cpJson, eduBase, sauBase]) => {
          if (isCancelled) return
          const cp = cpJson as unknown as { cotas: number[]; idx: { educacao?: number[]; saude?: number[] } } | null
          if (!cp?.cotas) return

          if (eduBase?.features && cp.idx.educacao) {
            const atgEdu = eduBase.features.filter((_, i) => {
              const k = cp.idx.educacao?.[i] ?? 0
              return k > 0 && cp.cotas[k - 1] <= cota + 1e-4
            })
            setEduPoints({ type: "FeatureCollection", features: atgEdu })
          }

          if (sauBase?.features && cp.idx.saude) {
            const atgSau = sauBase.features.filter((_, i) => {
              const k = cp.idx.saude?.[i] ?? 0
              return k > 0 && cp.cotas[k - 1] <= cota + 1e-4
            })
            setSauPoints({ type: "FeatureCollection", features: atgSau })
          }
        })
      } else {
        setEduPoints(null)
        setSauPoints(null)
      }

      return () => {
        isCancelled = true
      }
    }

    // Modo 2: Renderização por Cenário Hidrodinâmico
    setCotaDataUrl(null)
    setCotaCoordinates(null)

    if (!cenario || cenario === "(nenhum)") {
      setMancha(null)
      setEduPoints(null)
      setSauPoints(null)
      return
    }

    const sSlug = scenarioSlug(cenario)

    const manchaUrl = `/dados_convertidos/${munSlug}/cenarios/${sSlug}.geojson`
    fetchGeoJsonCached(manchaUrl).then((data) => {
      if (!isCancelled) setMancha(data)
    })

    if (showPoints) {
      const eduUrl = `/dados_convertidos/${munSlug}/cenarios/educacao_ATINGIDOS_${sSlug}.geojson`
      fetchGeoJsonCached(eduUrl).then((data) => {
        if (!isCancelled) setEduPoints(data)
      })

      const sauUrl = `/dados_convertidos/${munSlug}/cenarios/saude_ATINGIDOS_${sSlug}.geojson`
      fetchGeoJsonCached(sauUrl).then((data) => {
        if (!isCancelled) setSauPoints(data)
      })
    } else {
      setEduPoints(null)
      setSauPoints(null)
    }

    return () => {
      isCancelled = true
    }
  }, [cenario, cota, color, showPoints])

  return (
    <div className="relative h-full w-full select-none">
      <Map
        ref={mapRef}
        reuseMaps={true}
        initialViewState={initialViewState}
        onMove={onMove}
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
        maxPitch={0}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        attributionControl={false}
      >
        {mancha && (
          <Source id={`source-mancha-${color}`} type="geojson" data={mancha}>
            <Layer
              id={`layer-mancha-fill-${color}`}
              type="fill"
              paint={{
                "fill-color": color,
                "fill-opacity": 0.45,
              }}
            />
            <Layer
              id={`layer-mancha-line-${color}`}
              type="line"
              paint={{
                "line-color": color,
                "line-width": 2,
                "line-opacity": 0.9,
              }}
            />
          </Source>
        )}

        {/* Mancha por Cota Hidrométrica (Imagem Raster) */}
        {cotaDataUrl && cotaCoordinates && (
          <Source
            id={`source-cota-${color.replace(/[^a-zA-Z0-9]/g, "")}`}
            type="image"
            url={cotaDataUrl}
            coordinates={cotaCoordinates}
          >
            <Layer
              id={`layer-cota-${color.replace(/[^a-zA-Z0-9]/g, "")}`}
              type="raster"
              paint={{
                "raster-opacity": 0.55,
                "raster-fade-duration": 0,
              }}
            />
          </Source>
        )}

        {/* Escolas atingidas */}
        {showPoints && eduPoints && (
          <Source id={`source-edu-${color}`} type="geojson" data={eduPoints}>
            <Layer
              id={`layer-edu-${color}`}
              type="circle"
              paint={{
                "circle-color": "#2da8cc",
                "circle-radius": 4.5,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1.5,
              }}
            />
          </Source>
        )}

        {/* Unidades de saúde atingidas */}
        {showPoints && sauPoints && (
          <Source id={`source-sau-${color}`} type="geojson" data={sauPoints}>
            <Layer
              id={`layer-sau-${color}`}
              type="circle"
              paint={{
                "circle-color": "#e35d4b",
                "circle-radius": 4.5,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1.5,
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  )
})

export function ScenarioCompareMap({
  cenarioA,
  cenarioB,
  cenarioAInicial = "Simulação de Maio de 2024 – Sem intervenção",
  cenarioBInicial = "Simulação de Maio de 2024 – Diques",
  cotaA,
  cotaB,
  modo = "cenarios",
  cotasList = [],
  onCenarioAChange,
  onCenarioBChange,
  onCotaAChange,
  onCotaBChange,
  onClose,
  isFullScreen = false,
  showPoints: externalShowPoints,
  initialViewState: customInitialViewState,
}: ScenarioCompareMapProps) {
  const [internalA, setInternalA] = useState<string>(
    cenarioAInicial && CENARIOS_COMPARACAO.includes(cenarioAInicial)
      ? cenarioAInicial
      : CENARIOS_COMPARACAO[0]
  )
  const [internalB, setInternalB] = useState<string>(
    cenarioBInicial && CENARIOS_COMPARACAO.includes(cenarioBInicial)
      ? cenarioBInicial
      : CENARIOS_COMPARACAO[1]
  )

  const effectiveCenarioA = cenarioA ?? internalA
  const effectiveCenarioB = cenarioB ?? internalB

  const handleSelectA = (val: string) => {
    setInternalA(val)
    onCenarioAChange?.(val)
  }

  const handleSelectB = (val: string) => {
    setInternalB(val)
    onCenarioBChange?.(val)
  }

  const [internalShowPoints, setInternalShowPoints] = useState(true)
  const showPoints = externalShowPoints !== undefined ? externalShowPoints : internalShowPoints

  const mapRefA = useRef<MapRef | null>(null)
  const mapRefB = useRef<MapRef | null>(null)
  const isSyncingRef = useRef(false)

  // Enquadramento equilibrado de Rio Grande, RS:
  // Abrange o sistema de contenção/diques a oeste (-52.16) e a mancha urbana/porto a leste (-52.08),
  // posicionando o divisor central sobre a entrada de água natural entre as duas áreas.
  const defaultViewState = useMemo(() => {
    return {
      longitude: -52.115,
      latitude: -32.045,
      zoom: 12.15,
      pitch: 0,
      bearing: 0,
    }
  }, [])

  const initialViewState = useMemo(() => {
    return {
      ...defaultViewState,
      ...customInitialViewState,
    }
  }, [defaultViewState, customInitialViewState])

  const onMoveA = useCallback((evt: ViewStateChangeEvent) => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    const mb = mapRefB.current
    if (mb) {
      mb.jumpTo({
        center: [evt.viewState.longitude, evt.viewState.latitude],
        zoom: evt.viewState.zoom,
        bearing: evt.viewState.bearing,
        pitch: evt.viewState.pitch,
      })
    }
    isSyncingRef.current = false
  }, [])

  const onMoveB = useCallback((evt: ViewStateChangeEvent) => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    const ma = mapRefA.current
    if (ma) {
      ma.jumpTo({
        center: [evt.viewState.longitude, evt.viewState.latitude],
        zoom: evt.viewState.zoom,
        bearing: evt.viewState.bearing,
        pitch: evt.viewState.pitch,
      })
    }
    isSyncingRef.current = false
  }, [])

  // Garante enquadramento, foco e redimensionamento corretos (inclusive com reuseMaps do MapLibre)
  useEffect(() => {
    const mover = () => {
      mapRefA.current?.resize()
      mapRefB.current?.resize()
      mapRefA.current?.jumpTo({
        center: [initialViewState.longitude, initialViewState.latitude],
        zoom: initialViewState.zoom,
        bearing: initialViewState.bearing ?? 0,
        pitch: initialViewState.pitch ?? 0,
      })
      mapRefB.current?.jumpTo({
        center: [initialViewState.longitude, initialViewState.latitude],
        zoom: initialViewState.zoom,
        bearing: initialViewState.bearing ?? 0,
        pitch: initialViewState.pitch ?? 0,
      })
    }
    mover()
    const t1 = setTimeout(mover, 80)
    const t2 = setTimeout(mover, 200)
    const t3 = setTimeout(mover, 450)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [
    isFullScreen,
    initialViewState.longitude,
    initialViewState.latitude,
    initialViewState.zoom,
    initialViewState.bearing,
    initialViewState.pitch,
  ])

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${
        isFullScreen ? "fixed inset-0 z-50 bg-slate-900" : "rounded-xl border border-slate-200"
      }`}
    >
      {/* ── BARRA FLUTUANTE SUPERIOR (Modo Tela Cheia) ── */}
      {isFullScreen && (
        <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900/85 px-3 py-2 text-white shadow-2xl backdrop-blur-md border border-white/15">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 border-r border-white/20 pr-3">
              <Layers size={15} className="text-cyan-400" />
              <span className="text-xs font-black tracking-wide uppercase">
                Swipe de {modo === "cotas" ? "Cotas" : "Cenários"} · Rio Grande
              </span>
            </div>

            {/* Lado A */}
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#055071] border border-white/50 shrink-0" />
              <span className="text-[10px] font-bold text-white/70 uppercase">Lado A:</span>
              {modo === "cotas" ? (
                <Select
                  value={cotaA != null ? String(cotaA) : ""}
                  onValueChange={(v) => onCotaAChange?.(parseFloat(v))}
                >
                  <SelectTrigger className="h-7.5 min-w-[150px] max-w-[200px] bg-white/10 border-white/20 text-white text-xs font-semibold">
                    <SelectValue placeholder="Selecione cota...">
                      {formatCotaDisplay(cotaA)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    align="start"
                    sideOffset={4}
                    className="z-[9999] max-h-[300px] w-[200px] p-1 shadow-2xl bg-white border border-slate-200"
                  >
                    {cotasList.map((c) => (
                      <SelectItem
                        key={c}
                        value={String(c)}
                        className="text-xs font-semibold py-1.5 px-2.5 rounded-md cursor-pointer hover:bg-slate-100 focus:bg-slate-100"
                      >
                        {formatCotaDisplay(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={effectiveCenarioA} onValueChange={handleSelectA}>
                  <SelectTrigger className="h-7.5 min-w-[200px] max-w-[270px] bg-white/10 border-white/20 text-white text-xs font-semibold">
                    <SelectValue placeholder="Selecione um cenário">
                      {cenarioShortLabel(effectiveCenarioA)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    align="start"
                    sideOffset={4}
                    className="z-[9999] max-h-[380px] w-[340px] p-1 shadow-2xl bg-white border border-slate-200"
                  >
                    {GRUPOS_CENARIOS.map((g, idx) => (
                      <React.Fragment key={g.grupo}>
                        {idx > 0 && <SelectSeparator className="my-1 border-slate-200" />}
                        <SelectGroup>
                          <SelectLabel className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100/80 rounded flex items-center justify-between">
                            <span>{g.grupo}</span>
                            {g.subtitulo && (
                              <span className="text-[9px] font-medium normal-case text-slate-400">
                                {g.subtitulo}
                              </span>
                            )}
                          </SelectLabel>
                          {g.cenarios.map((item) => (
                            <SelectItem
                              key={item.valor}
                              value={item.valor}
                              className="text-xs font-semibold py-1.5 px-2.5 rounded-md cursor-pointer hover:bg-slate-100 focus:bg-slate-100"
                            >
                              {item.rotuloCurto}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Lado B */}
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c9402e] border border-white/50 shrink-0" />
              <span className="text-[10px] font-bold text-white/70 uppercase">Lado B:</span>
              {modo === "cotas" ? (
                <Select
                  value={cotaB != null ? String(cotaB) : ""}
                  onValueChange={(v) => onCotaBChange?.(parseFloat(v))}
                >
                  <SelectTrigger className="h-7.5 min-w-[150px] max-w-[200px] bg-white/10 border-white/20 text-white text-xs font-semibold">
                    <SelectValue placeholder="Selecione cota...">
                      {formatCotaDisplay(cotaB)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    align="start"
                    sideOffset={4}
                    className="z-[9999] max-h-[300px] w-[200px] p-1 shadow-2xl bg-white border border-slate-200"
                  >
                    {cotasList.map((c) => (
                      <SelectItem
                        key={c}
                        value={String(c)}
                        className="text-xs font-semibold py-1.5 px-2.5 rounded-md cursor-pointer hover:bg-slate-100 focus:bg-slate-100"
                      >
                        {formatCotaDisplay(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={effectiveCenarioB} onValueChange={handleSelectB}>
                  <SelectTrigger className="h-7.5 min-w-[200px] max-w-[270px] bg-white/10 border-white/20 text-white text-xs font-semibold">
                    <SelectValue placeholder="Selecione um cenário">
                      {cenarioShortLabel(effectiveCenarioB)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    align="start"
                    sideOffset={4}
                    className="z-[9999] max-h-[380px] w-[340px] p-1 shadow-2xl bg-white border border-slate-200"
                  >
                    {GRUPOS_CENARIOS.map((g, idx) => (
                      <React.Fragment key={g.grupo}>
                        {idx > 0 && <SelectSeparator className="my-1 border-slate-200" />}
                        <SelectGroup>
                          <SelectLabel className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100/80 rounded flex items-center justify-between">
                            <span>{g.grupo}</span>
                            {g.subtitulo && (
                              <span className="text-[9px] font-medium normal-case text-slate-400">
                                {g.subtitulo}
                              </span>
                            )}
                          </SelectLabel>
                          {g.cenarios.map((item) => (
                            <SelectItem
                              key={item.valor}
                              value={item.valor}
                              className="text-xs font-semibold py-1.5 px-2.5 rounded-md cursor-pointer hover:bg-slate-100 focus:bg-slate-100"
                            >
                              {item.rotuloCurto}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Toggle Pontos */}
            <button
              type="button"
              onClick={() => setInternalShowPoints(!showPoints)}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                showPoints
                  ? "bg-white/20 border-white/30 text-white"
                  : "bg-white/5 border-white/10 text-white/60"
              }`}
            >
              {showPoints ? "Ocultar Pontos" : "Exibir Pontos"}
            </button>
          </div>

          {/* Fechar */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar comparador de mapa"
              className="flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2 py-1 text-xs font-bold text-white transition-colors border border-white/15"
            >
              <X size={14} />
              <span>Fechar Tela Cheia</span>
            </button>
          )}
        </div>
      )}

      {/* ── CompareReveal envolvendo os dois mapas ── */}
      <CompareReveal
        before={
          <MapSide
            mapRef={mapRefA}
            cenario={effectiveCenarioA}
            cota={modo === "cotas" ? cotaA : undefined}
            color="#055071"
            initialViewState={initialViewState}
            onMove={onMoveA}
            showPoints={showPoints}
          />
        }
        after={
          <MapSide
            mapRef={mapRefB}
            cenario={effectiveCenarioB}
            cota={modo === "cotas" ? cotaB : undefined}
            color="#c9402e"
            initialViewState={initialViewState}
            onMove={onMoveB}
            showPoints={showPoints}
          />
        }
        labels={[
          modo === "cotas" && cotaA != null
            ? formatCotaDisplay(cotaA).toUpperCase()
            : cenarioShortLabel(effectiveCenarioA).toUpperCase(),
          modo === "cotas" && cotaB != null
            ? formatCotaDisplay(cotaB).toUpperCase()
            : cenarioShortLabel(effectiveCenarioB).toUpperCase(),
        ]}
        dragHandleOnly={true}
        defaultPosition={50}
        introSweep={true}
        className="h-full w-full rounded-none border-0 aspect-auto"
      />

      {/* ── Dica de navegação inferior ── */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none rounded-full bg-slate-900/80 px-4 py-1.5 text-xs font-medium text-white/95 shadow-xl backdrop-blur-xl border border-white/20 flex items-center gap-2 whitespace-nowrap">
        <Info size={13} className="text-cyan-400" />
        <span>Arraste o divisor central para revelar a diferença · Navegue no mapa com clique e arrasto</span>
      </div>

      {/* ── Botão Recentralizar Foco ── */}
      <button
        type="button"
        onClick={() => {
          mapRefA.current?.flyTo({
            center: [initialViewState.longitude, initialViewState.latitude],
            zoom: initialViewState.zoom,
            bearing: initialViewState.bearing ?? 0,
            pitch: initialViewState.pitch ?? 0,
            duration: 800,
          })
          mapRefB.current?.flyTo({
            center: [initialViewState.longitude, initialViewState.latitude],
            zoom: initialViewState.zoom,
            bearing: initialViewState.bearing ?? 0,
            pitch: initialViewState.pitch ?? 0,
            duration: 800,
          })
        }}
        title="Recentralizar visualização em Rio Grande"
        aria-label="Recentralizar visualização"
        className="apple-button absolute bottom-3.5 right-3.5 z-30 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white/90 hover:text-white px-3.5 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-xl border border-white/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
      >
        <LocateFixed size={13} className="text-cyan-400" />
        <span className="hidden sm:inline">Recentralizar</span>
      </button>
    </div>
  )
}
