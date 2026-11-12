"use client"

import React from "react"
import { HelpCircle } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { METRIC_METADATA, type MetricMetadata } from "@/lib/metric-metadata"

const PRIMARY = "#1E404A"

interface MetricInfoPopoverProps {
  metricKey?: keyof typeof METRIC_METADATA | string
  customMeta?: Partial<MetricMetadata>
  title?: string
  className?: string
  iconSize?: number
  corIcone?: string
}

export function MetricInfoPopover({
  metricKey,
  customMeta,
  title,
  className = "",
  iconSize = 11,
  corIcone,
}: MetricInfoPopoverProps) {
  const meta: MetricMetadata | undefined = metricKey
    ? METRIC_METADATA[metricKey]
    : undefined

  const finalTitle = customMeta?.titulo || meta?.titulo || title || "Metodologia & Fonte"
  const finalMetodologia = customMeta?.metodologia || meta?.metodologia
  const finalFormula = customMeta?.formula || meta?.formula
  const finalParametros = customMeta?.parametros || meta?.parametros
  const finalFonte = customMeta?.fonte || meta?.fonte
  const finalObs = customMeta?.observacao || meta?.observacao

  if (!finalMetodologia && !finalFormula && !finalFonte) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Informações metodológicas sobre ${finalTitle}`}
          className={`group/info active-press inline-flex shrink-0 items-center justify-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 ${className}`}
          style={{
            color: corIcone || "inherit",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle
            size={iconSize}
            strokeWidth={2.4}
            className="transition-transform group-hover/info:scale-110 opacity-75 hover:opacity-100"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="z-50 w-80 max-w-[90vw] rounded-2xl border border-black/10 bg-white/95 p-3.5 shadow-2xl backdrop-blur-2xl text-slate-800 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2">
          {/* Cabeçalho */}
          <div className="border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: PRIMARY }}
              />
              <span
                className="text-xs font-black tracking-tight"
                style={{ color: PRIMARY }}
              >
                {finalTitle}
              </span>
            </div>
            {finalMetodologia && (
              <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
                {finalMetodologia}
              </span>
            )}
          </div>

          {/* Fórmula */}
          {finalFormula && (
            <div className="flex flex-col gap-1 rounded-xl bg-slate-50/80 p-2 border border-slate-200/60">
              <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                Fórmula de Cálculo
              </span>
              <code className="text-[10px] leading-relaxed font-mono font-semibold text-slate-900 break-words">
                {finalFormula}
              </code>
            </div>
          )}

          {/* Parâmetros */}
          {finalParametros && finalParametros.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                Parâmetros Oficiais
              </span>
              <div className="flex flex-col gap-1 text-[9.5px]">
                {finalParametros.map((p) => (
                  <div
                    key={p.nome}
                    className="flex justify-between items-baseline gap-1.5 border-b border-slate-100/60 pb-0.5"
                  >
                    <span className="font-semibold text-slate-600">{p.nome}:</span>
                    <span className="font-mono text-slate-900 text-right font-medium">
                      {p.valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fonte Oficial */}
          {finalFonte && (
            <div className="flex flex-col gap-0.5 pt-0.5">
              <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                Base de Dados & Fonte Oficial
              </span>
              <p className="text-[10px] leading-snug font-medium text-slate-700">
                {finalFonte}
              </p>
            </div>
          )}

          {/* Observação */}
          {finalObs && (
            <p className="text-[9.5px] italic text-slate-500 border-t border-slate-100 pt-1 leading-tight">
              {finalObs}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
