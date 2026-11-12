"use client"

import { Users } from "lucide-react"
import { formatoBr } from "@/lib/formatos"
import { rotuloPopulacao, type PopulacaoCenario } from "@/lib/avisos"
import { MetricInfoPopover } from "@/components/MetricInfoPopover"

/**
 * Card de população (total e atingida) do Painel. Usado no Resumo e, no cenário "Simulação por Cotas", na aba "Por cota"
 * (como o KPI de população do dashboard do BID). `popCen` é a população atingida do cenário ou da cota em exibição;
 * `rotular` liga o texto de metodologia (estimada, calculada ou não calculada) do `rotuloPopulacao`.
 */
export function PopulacaoKpi({
  popTotal,
  popCen,
  rotular,
  className = "mt-2 mb-4",
}: {
  popTotal: number
  popCen:
    | PopulacaoCenario
    | { pop_atingida: number; pct_atingida: number }
    | null
    | undefined
  rotular: boolean
  className?: string
}) {
  // F1/F2: valor estimado é rotulado como estimativa; sem dado, "não calculada" (nunca omitir em silêncio)
  const popRotulo = rotular
    ? rotuloPopulacao(popCen as PopulacaoCenario | null | undefined)
    : null
  return (
    <div
      className={`${className} shrink-0 overflow-hidden rounded-xl border shadow-xs`}
      style={{
        borderColor: "#e9d5ff",
        background: "linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)",
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Users
          size={13}
          strokeWidth={2.5}
          className="shrink-0 text-purple-600"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-end justify-between gap-1">
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-1 text-[9px] leading-none font-bold tracking-wider text-purple-500 uppercase">
                <span>Pop. Total</span>
                <MetricInfoPopover
                  metricKey="populacao"
                  corIcone="#9333ea"
                  iconSize={10}
                />
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[13px] font-black text-purple-800 tabular-nums">
                  {formatoBr(popTotal)}
                </span>
                <span className="text-[9px] text-purple-400">hab.</span>
              </div>
            </div>
            {!popCen && popRotulo && (
              <div
                className="min-w-0 shrink-0 text-right text-[9px] font-bold text-slate-500"
                title={popRotulo.texto}
              >
                Atingida: {popRotulo.texto.split(" para ")[0]}
              </div>
            )}
            {popCen && (
              <div
                className="min-w-0 shrink-0 text-right"
                title={popRotulo?.texto}
              >
                <div className="mb-0.5 text-[9px] leading-none font-bold tracking-wider text-red-500 uppercase">
                  Atingida
                  {popRotulo?.estimado ? " (estimada)" : ""}
                </div>
                <div className="flex items-baseline justify-end gap-0.5">
                  <span className="text-[13px] font-black text-red-700 tabular-nums">
                    {popRotulo?.estimado ? "~" : ""}
                    {formatoBr(popCen.pop_atingida)}
                  </span>
                  <span className="text-[9px] text-red-400">
                    ({formatoBr(popCen.pct_atingida, 1)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
          {popCen && (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-purple-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(popCen.pct_atingida, 100)}%`,
                  background: "linear-gradient(to right, #9333ea, #dc2626)",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
