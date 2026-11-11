"use client"
import React, { useEffect, useRef } from "react"
import Map, { NavigationControl } from "react-map-gl/maplibre"
import { setWorkerUrl } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useCotaRaster, COR_FRENTE, COR_ALAGADO } from "@/hooks/useCotaRaster"
import { CotaControle } from "@/components/CotaControle"
import { CotaCanvasLayer } from "@/components/CotaCanvasLayer"

// maplibre-gl 6 é só ESM: o worker é copiado para public/ por `pnpm copy:maplibre` (o dashboard principal faz o mesmo).
// Sem isto, abrir /danos-fisicos direto (sem passar pelo dashboard) falhava com "Worker failed to load".
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")

// Mapa com slider de cota do rio na página de Danos por cota. A animação começa sozinha
// quando o mapa entra na tela (loop); pausar ou arrastar o slider assume o controle.

export function CotaMapa({
  slug,
  cotaInicial,
}: {
  slug: string
  cotaInicial?: string
}) {
  const raster = useCotaRaster(slug, { cotaInicial })
  const { meta, erro, cota, setTocando, pronta } = raster
  const raiz = useRef<HTMLDivElement>(null)
  const iniciouAuto = useRef(false)

  useEffect(() => {
    iniciouAuto.current = false
  }, [slug])

  // Checagem periódica de visibilidade (em vez de IntersectionObserver, que alguns
  // ambientes embutidos não entregam).
  useEffect(() => {
    const el = raiz.current
    if (!meta || !pronta || !el || iniciouAuto.current) return
    const id = setInterval(() => {
      const r = el.getBoundingClientRect()
      const visivel = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)
      if (visivel >= r.height * 0.5 && !iniciouAuto.current) {
        iniciouAuto.current = true
        setTocando(true)
        clearInterval(id)
      }
    }, 400)
    return () => clearInterval(id)
  }, [meta, pronta, setTocando])

  if (erro)
    return (
      <p className="text-sm text-slate-500">
        Mapa por cota indisponível para este município.
      </p>
    )
  if (!meta || cota === null)
    return <div className="h-[520px] animate-pulse rounded-xl bg-slate-100" />

  const [w, s, e, n] = meta.bounds
  return (
    <div
      ref={raiz}
      className="overflow-hidden rounded-xl border border-[#b3cdd8] bg-white"
    >
      <div className="mapa-fixo relative h-[520px]">
        <Map
          key={slug}
          initialViewState={{
            bounds: [w, s, e, n],
            fitBoundsOptions: { padding: 24 },
          }}
          mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
          attributionControl={false}
          // Mapa fixo: não arrasta, não gira e não dá zoom por roda, duplo clique, gesto ou teclado; só os botões de
          // zoom (+/−) mexem na vista. Sem o zoom por roda, a página rola normalmente por cima do mapa.
          dragPan={false}
          dragRotate={false}
          scrollZoom={false}
          boxZoom={false}
          doubleClickZoom={false}
          touchZoomRotate={false}
          touchPitch={false}
          keyboard={false}
          cursor="default"
        >
          <NavigationControl position="top-right" showCompass={false} />
          <CotaCanvasLayer raster={raster} />
        </Map>
        <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-[11px] text-slate-600 shadow">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: `rgb(${COR_ALAGADO})` }}
            />
            Área alagada
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: `rgb(${COR_FRENTE})` }}
            />
            Frente de avanço
          </div>
        </div>
      </div>
      <CotaControle
        raster={raster}
        className="border-t border-[#b3cdd8] px-4 py-3"
      />
    </div>
  )
}
