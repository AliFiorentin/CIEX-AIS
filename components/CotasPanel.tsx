"use client"

import React from "react"
import Link from "next/link"
import {
  Building2,
  GraduationCap,
  HeartPulse,
  Sprout,
  Coins,
} from "lucide-react"
import { FitHeight } from "@/components/FitHeight"
import { ResumoPerdasDanosCota } from "@/components/ResumoPerdasDanos"
import type { CotaRaster } from "@/hooks/useCotaRaster"
import type { DetalheCotaMun, DetalheCotaValores } from "@/lib/cotas-types"
import { chaveCotaAtingida } from "@/lib/cotas"
import { fmtBRL, formatoBr } from "@/lib/formatos"

// Aba "Por cota" do Painel no cenário "Simulação por Cotas" (porte do CotasPanel do dashboard do BID): valores do que fica
// sob a água na cota atual do slider. Os valores vêm de climada_cota_detalhe_rio_grande.json, que tem uma entrada por
// cota-raster; entre duas cotas vale a última já atingida (o valor exposto é cumulativo, não diminui com a cota).

const fmtN = (v: number) => formatoBr(Math.round(v))
const fmtCota = (v: number) => formatoBr(v, 2)
const totalExposto = (v: DetalheCotaValores) =>
  v.empresas.valor_exposto_brl +
  v.saude.valor_exposto_brl +
  v.educacao.valor_exposto_brl

// Cores de marca CIEX e as mesmas cores por setor das abas do Painel (COLORS em app/page.tsx).
const BRAND_GRADIENT = "linear-gradient(135deg, #1E404A 0%, #255362 100%)"
const COR_EMPRESAS = "#2563eb"
const COR_EDUCACAO = "#16a34a"
const COR_SAUDE = "#dc2626"
const COR_AGRICULTURA = "#6B8E23"

interface Props {
  raster: CotaRaster
  detalhe: DetalheCotaMun | null
  /** KPI de população (já na cota atual), mostrado no topo da aba. */
  populacao?: React.ReactNode
}

function Card({
  titulo,
  icone,
  cor,
  linhas,
  valor,
  colunas = 2,
}: {
  titulo: string
  icone: React.ReactNode
  cor: string
  linhas: [string, string][]
  valor: number
  colunas?: 1 | 2
}) {
  return (
    <div
      className="flex min-w-0 flex-col justify-center rounded-lg border px-2.5 py-2"
      style={{
        borderColor: cor + "55",
        backgroundColor: "rgba(255,255,255,0.55)",
      }}
    >
      <div
        className={
          colunas === 2
            ? "flex items-center justify-between gap-2"
            : "flex flex-col items-start gap-0.5"
        }
      >
        <div
          className="flex shrink-0 items-center gap-1 text-xs font-black"
          style={{ color: cor }}
        >
          {icone}
          {titulo}
        </div>
        <div className="text-xs font-black whitespace-nowrap text-slate-800 tabular-nums">
          {fmtBRL(valor)}
        </div>
      </div>
      <div
        className={`mt-0.5 grid gap-x-2.5 gap-y-0.5 ${colunas === 2 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {linhas.map(([k, val]) => (
          <div
            key={k}
            className="flex justify-between gap-1 text-[10.5px] leading-snug text-slate-600"
          >
            <span className="min-w-0 break-words">{k}</span>
            <span className="shrink-0 font-bold text-slate-800 tabular-nums">
              {val}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CotasPanel({ raster, detalhe, populacao }: Props) {
  const { cota, meta } = raster
  if (!detalhe || !meta || cota === null) {
    return (
      <div className="py-6 text-center text-[11px] text-slate-500">
        Carregando valores por cota…
      </div>
    )
  }
  const chaves = Object.keys(detalhe.por_cota).sort(
    (a, b) => parseFloat(a) - parseFloat(b)
  )
  const chave = chaveCotaAtingida(chaves, cota)
  const v = chave ? detalhe.por_cota[chave] : null
  const total = v ? totalExposto(v) : 0
  const serie = chaves.map((c) => totalExposto(detalhe.por_cota[c]))
  const maxSerie = Math.max(...serie, 1)
  const cotas = chaves.map(parseFloat)
  const x0 = cotas[0]
  const x1 = cotas[cotas.length - 1]
  // Sem nenhuma lavoura em nenhuma cota (Rio Grande: só aparece no pico, se aparecer), o card de agricultura só poluiria.
  const haAgricultura = chaves.some(
    (c) => (detalhe.por_cota[c].agricultura?.area_ha ?? 0) > 0
  )
  const px = (c: number) => 6 + ((c - x0) / (x1 - x0 || 1)) * 228
  const py = (val: number) => 56 - (val / maxSerie) * 48
  const linha = cotas
    .map((c, i) => `${px(c).toFixed(1)},${py(serie[i]).toFixed(1)}`)
    .join(" ")
  const xAtual = px(Math.min(Math.max(cota, x0), x1))
  const yAtual = py(total)
  const areaPontos = [
    `${px(x0).toFixed(1)},56`,
    ...cotas.map((c, i) => `${px(c).toFixed(1)},${py(serie[i]).toFixed(1)}`),
    `${px(x1).toFixed(1)},56`,
  ].join(" ")

  return (
    <FitHeight min={0.6} max={1} className="pb-2">
      <div className="flex flex-col gap-1.5">
        {populacao}

        {/* Cartões de Perdas Operacionais e Danos Físicos na cota atual */}
        <ResumoPerdasDanosCota chave={chave} exposicao={v} />

        {/* Valor exposto atingido, com a curva do valor exposto por cota */}
        <div
          className="flex shrink-0 flex-col rounded-xl px-3 py-2 text-white shadow-sm"
          style={{ background: BRAND_GRADIENT }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[9.5px] font-extrabold tracking-wider text-white/90 uppercase">
              Valor exposto atingido · cota {fmtCota(cota)} m
            </span>
            <span className="text-lg leading-none font-black tabular-nums">
              {fmtBRL(total)}
            </span>
          </div>
          <svg
            viewBox="0 0 240 64"
            preserveAspectRatio="none"
            className="mt-1.5 h-16 w-full sm:h-[72px]"
            role="img"
            aria-label="Evolução do valor exposto por cota"
          >
            <defs>
              <linearGradient id="cotaAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <line
              x1="6"
              y1="56"
              x2="234"
              y2="56"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
            />
            <line
              x1="6"
              y1="32"
              x2="234"
              y2="32"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <line
              x1="6"
              y1="8"
              x2="234"
              y2="8"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <polygon points={areaPontos} fill="url(#cotaAreaGrad)" />
            <polyline
              points={linha}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={xAtual}
              x2={xAtual}
              y1="4"
              y2="58"
              stroke="#fbbf24"
              strokeWidth="1.75"
              strokeDasharray="3,2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={xAtual}
              cy={yAtual}
              r="3.5"
              fill="#fbbf24"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>
          <div className="mt-1 flex items-center justify-between text-[8px] font-semibold text-white/80">
            <span>
              Mín: <strong>{fmtCota(x0)} m</strong>
            </span>
            <span className="rounded border border-white/10 bg-black/20 px-1.5 py-0.5 text-[8px] font-bold text-amber-300">
              Cota {fmtCota(cota)} m · {fmtBRL(total)}
            </span>
            <span>
              Pico: <strong>{fmtCota(x1)} m</strong>
            </span>
          </div>
        </div>

        {!v ? (
          <p className="px-1 text-[11px] text-slate-500">
            Abaixo da menor cota ({fmtCota(x0)} m) ainda não há ponto sob água
            em Rio Grande.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Card
              titulo="Empresas"
              icone={<Building2 size={12} strokeWidth={2.5} />}
              cor={COR_EMPRESAS}
              linhas={[
                [
                  "Atingidas",
                  `${fmtN(v.empresas.n)}/${fmtN(detalhe.totais.empresas?.n ?? 0)}`,
                ],
                ["Empregados", fmtN(v.empresas.empregados)],
                ["Massa salarial", fmtBRL(v.empresas.massa_salarial_brl)],
                ["Salário médio", `R$ ${fmtN(v.empresas.salario_medio_brl)}`],
              ]}
              valor={v.empresas.valor_exposto_brl}
            />
            <div className="grid grid-cols-2 gap-1.5">
              <Card
                titulo="Educação"
                icone={<GraduationCap size={12} strokeWidth={2.5} />}
                cor={COR_EDUCACAO}
                linhas={[
                  [
                    "Escolas",
                    `${fmtN(v.educacao.n)}/${fmtN(detalhe.totais.educacao?.n ?? 0)}`,
                  ],
                  ["Matrículas", fmtN(v.educacao.matriculas)],
                  ["Docentes", fmtN(v.educacao.docentes)],
                ]}
                valor={v.educacao.valor_exposto_brl}
                colunas={1}
              />
              <Card
                titulo="Saúde"
                icone={<HeartPulse size={12} strokeWidth={2.5} />}
                cor={COR_SAUDE}
                linhas={[
                  [
                    "Unidades",
                    `${fmtN(v.saude.n)}/${fmtN(detalhe.totais.saude?.n ?? 0)}`,
                  ],
                  ["Leitos", fmtN(v.saude.leitos)],
                  ["Profissionais", fmtN(v.saude.profissionais)],
                ]}
                valor={v.saude.valor_exposto_brl}
                colunas={1}
              />
            </div>
            {haAgricultura && v.agricultura && (
              <div
                className="flex shrink-0 items-center justify-between rounded-lg border px-2.5 py-1.5"
                style={{
                  borderColor: COR_AGRICULTURA + "55",
                  backgroundColor: "rgba(255,255,255,0.55)",
                }}
              >
                <div
                  className="flex items-center gap-1 text-xs font-black"
                  style={{ color: COR_AGRICULTURA }}
                >
                  <Sprout size={12} strokeWidth={2.5} />
                  Agricultura
                </div>
                <div className="text-[11px] text-slate-600">
                  Área atingida{" "}
                  <span className="font-black text-slate-800 tabular-nums">
                    {fmtN(v.agricultura.area_ha)} ha
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-0.5 border-t border-slate-200/60 px-0.5 pt-1 text-[8.5px] leading-tight text-slate-500">
              <div className="flex items-start gap-1">
                <Coins size={9} className="mt-px shrink-0 text-slate-400" />
                <span>
                  Exposição física na cota {fmtCota(parseFloat(chave!))} m
                  (valor de reposição sob água, sem profundidade nem dano em
                  R$).
                </span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-500">
                <span>
                  Fonte das cotas:{" "}
                  <strong className="font-black text-[#1E404A]">CIEX</strong>
                </span>
                <Link
                  href="/danos-fisicos"
                  className="text-[8px] text-slate-400 underline-offset-2 hover:underline"
                >
                  Ver Danos
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </FitHeight>
  )
}
