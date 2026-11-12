"use client"
import React from "react"
import type { CotaRaster } from "@/hooks/useCotaRaster"

const fmt = (v: number) => v.toFixed(2).replace(".", ",")

/** Cota atual + play/pause + slider. Usado na página de Danos e no cenário "Simulação por Cotas". */
export function CotaControle({
  raster,
  className = "",
  vertical = false,
}: {
  raster: CotaRaster
  className?: string
  vertical?: boolean
}) {
  const { cota, minimo, maximo, passo, tocando, setTocando, setCota, pronta } =
    raster
  if (cota === null) return null
  // Passo fino (passo/20), ajustado para que `maximo` (ex.: 2,6215 m, pico) seja
  // um valor selecionável: sem isso a grade min + k·passo/20 para em 2,60.
  const faixa = maximo - minimo
  const nPassos = Math.max(1, Math.round(faixa / (passo / 20)))
  const passoSlider = faixa / nPassos
  if (vertical) {
    // Slider vertical (cota alta em cima), usado ao lado do Painel do dashboard.
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <div className="text-center">
          <div className="text-[9px] font-bold tracking-wide text-slate-500 uppercase">
            Cota
          </div>
          <div className="text-base leading-tight font-black text-[#1E404A] tabular-nums">
            {fmt(cota)}
          </div>
          <div className="text-[9px] font-bold text-slate-500">
            {pronta ? "metros" : "carregando…"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTocando((t) => !t)}
          disabled={!pronta}
          className="apple-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E404A] text-sm text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
          aria-label={tocando ? "Pausar" : "Reproduzir"}
          aria-pressed={tocando}
          aria-busy={!pronta}
        >
          {!pronta ? (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
          ) : tocando ? (
            "❚❚"
          ) : (
            "▶"
          )}
        </button>
        <input
          type="range"
          min={minimo}
          max={maximo}
          step={passoSlider}
          value={cota}
          onChange={(ev) => setCota(parseFloat(ev.target.value))}
          className="min-h-0 flex-1 accent-[#1E404A]"
          aria-label="Cota do rio"
          aria-valuetext={`cota ${fmt(cota)} metros`}
          style={{ writingMode: "vertical-lr", direction: "rtl", width: 20 }}
        />
        <div className="text-[9px] font-bold text-slate-500 tabular-nums">
          {fmt(minimo)}
        </div>
      </div>
    )
  }
  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className}`}>
      <div className="w-20 shrink-0 text-center">
        <div className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
          Cota
        </div>
        <div className="text-xl font-black text-[#055071] tabular-nums">
          {fmt(cota)} m
        </div>
      </div>
      <button
        type="button"
        onClick={() => setTocando((t) => !t)}
        disabled={!pronta}
        className="apple-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#055071] text-sm text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
        aria-label={tocando ? "Pausar" : "Reproduzir"}
        aria-pressed={tocando}
        aria-busy={!pronta}
      >
        {!pronta ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
        ) : tocando ? (
          "❚❚"
        ) : (
          "▶"
        )}
      </button>
      <input
        type="range"
        min={minimo}
        max={maximo}
        step={passoSlider}
        value={cota}
        onChange={(ev) => setCota(parseFloat(ev.target.value))}
        className="min-w-0 flex-1 accent-[#055071]"
        aria-label="Cota do rio"
        aria-valuetext={`cota ${fmt(cota)} metros`}
      />
    </div>
  )
}
