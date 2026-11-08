"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { TrendingDown, Waves } from "lucide-react"
import {
  KpiRow,
  Section,
  SubTitle,
  DataTable,
  Note,
} from "@/components/doc-kit"
import { HeaderLogos } from "@/components/HeaderLogos"
import { FisicosView } from "./FisicosView"
import { fmtCompacto, escalaAgradavel } from "./helpers"
import type { CotasData, ExposicaoMun } from "./types"

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface CenarioPerdas {
  dias_agudo: number
  dias_efetivos: number
  f_interrup: number
  empresas_vab: number
  educacao_perdas: number
  educacao_custo_adicional: number
  saude_producao: number
  agricultura_perdas: number
  total: number
}
// Mantém o formato {município: {cenário: valores}} gerado pelo script (hoje só
// "Rio Grande"), mas a UI abaixo já assume um único município.
export type PerdasData = Record<string, Record<string, CenarioPerdas>>

// ─── Constantes visuais (paleta CIEX) ─────────────────────────────────────────
const PRIMARY = "#1E404A"
const CEN_COLORS: Record<string, string> = {
  "Cenário Maio 2024": "#2563eb",
  "Cenário Maio 2024 + 50%": "#dc2626",
  "Cenário Setembro 2023": "#16a34a",
  "Nível da Lagoa + Chuva Acumulada – 16/05/2024": "#7c3aed",
}
const CEN_FALLBACK = "#3d7a94"
const COMP_COLORS = {
  empresas: "#2563eb",
  educacao: "#16a34a",
  saude: "#dc2626",
  agricultura: "#6B8E23",
}
const DIAS_OPCOES = [30, 45, 60] as const
type DiasOpcao = (typeof DIAS_OPCOES)[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBRL(v: number): string {
  // Arredonda antes de escolher a unidade (999.600 não pode virar "R$ 1000 mil").
  if (v >= 1e9 || Number((v / 1e6).toFixed(1)) >= 1000)
    return `R$ ${(v / 1e9).toFixed(2).replace(".", ",")} bi`
  if (v >= 1e6 || Number((v / 1e3).toFixed(0)) >= 1000)
    return `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi`
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
}

function pct(part: number, total: number): string {
  if (!total) return "0%"
  return `${((part / total) * 100).toFixed(1).replace(".", ",")}%`
}

function scaleTo(v: CenarioPerdas, dias: number): CenarioPerdas {
  const s = dias / v.dias_efetivos
  const emp = v.empresas_vab * s
  const edu = v.educacao_perdas * s
  const eduAdic = v.educacao_custo_adicional * s
  const sau = v.saude_producao * s
  const agr = v.agricultura_perdas // custo fixo, independe da duração
  return {
    dias_agudo: v.dias_agudo,
    dias_efetivos: dias,
    f_interrup: dias / 365,
    empresas_vab: emp,
    educacao_perdas: edu,
    educacao_custo_adicional: eduAdic,
    saude_producao: sau,
    agricultura_perdas: agr,
    total: emp + edu + eduAdic + sau + agr,
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
function OperacionaisView({ dados }: { dados: PerdasData }) {
  const [dias, setDias] = useState<DiasOpcao>(30)

  const cenariosOriginais = dados["Rio Grande"] ?? {}
  const cenariosEscalados: Record<string, CenarioPerdas> = Object.fromEntries(
    Object.entries(cenariosOriginais).map(([cen, v]) => [cen, scaleTo(v, dias)])
  )
  // Total (60 dias efetivos) do cenário "+50%", derivado dos dados em vez de fixo no texto.
  const entradas = Object.entries(cenariosEscalados)
  const maxTotal = Math.max(...entradas.map(([, v]) => v.total), 1)

  // Cenário de maior impacto, usado como destaque no Resumo Geral
  const destaque = entradas.length
    ? entradas.reduce((acc, cur) => (cur[1].total > acc[1].total ? cur : acc))
    : null

  return (
    <div className="min-h-screen bg-[#eef3f4] font-sans text-slate-800">
      {/* ── Seletor de duração (sticky) ──────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 border-b border-[#c7d6d9] bg-white/90 shadow-sm"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-4 px-6 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-black tracking-wider uppercase"
              style={{ color: PRIMARY }}
            >
              Duração da interrupção
            </span>
            <span className="text-[9px] text-slate-400">(dias efetivos)</span>
          </div>
          <div className="flex gap-1.5">
            {DIAS_OPCOES.map((d) => (
              <button
                key={d}
                onClick={() => setDias(d)}
                className="rounded-full border px-3 py-1 text-[11px] font-black transition-all duration-150"
                style={
                  dias === d
                    ? {
                        backgroundColor: PRIMARY,
                        color: "#fff",
                        borderColor: PRIMARY,
                      }
                    : {
                        backgroundColor: "#fff",
                        color: "#64748b",
                        borderColor: "#e2e8f0",
                      }
                }
              >
                {d} dias
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#16a34a]" />
            <span className="text-[10px] font-medium text-slate-500">
              f = {(dias / 365).toFixed(4)} · Todos os resultados atualizados
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1440px] items-start gap-8 px-6 py-10">
        {/* ── Sidebar (Índice fixo) ────────────────────────────────────────────── */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-[56px] flex flex-col gap-3">
            <nav className="rounded-xl border border-[#c7d6d9] bg-white p-4 shadow-sm">
              <p
                className="mb-2 text-[10px] font-black tracking-wider uppercase"
                style={{ color: PRIMARY }}
              >
                Índice
              </p>
              <ol className="flex flex-col gap-1">
                {(
                  [
                    ["#resumo", "1. Resumo Geral"],
                    ["#cenarios", "2. Análise por Cenário"],
                    ["#sensib", "3. Sensibilidade por Duração"],
                    ["#notas", "4. Limitações"],
                  ] as [string, string][]
                ).map(([href, label]) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="block py-0.5 text-[11px] leading-snug font-medium underline-offset-4 transition-colors duration-150 hover:underline"
                      style={{ color: PRIMARY }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 1 — RESUMO GERAL
        ══════════════════════════════════════════════════════════════════════ */}
          <Section id="resumo" num="1" title="Resumo Geral">
            <DiasBadge dias={dias} />

            {destaque && (
              <div className="my-5 overflow-hidden rounded-xl border border-[#c7d6d9] bg-white shadow-sm">
                <div
                  className="px-5 py-4"
                  style={{
                    backgroundColor: CEN_COLORS[destaque[0]] ?? CEN_FALLBACK,
                  }}
                >
                  <p className="mb-0.5 text-[10px] font-black tracking-wider text-white/70 uppercase">
                    Cenário de maior impacto
                  </p>
                  <p className="text-3xl leading-none font-black text-white">
                    {fmtBRL(destaque[1].total)}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-white/60">
                    {destaque[0]} · {dias} dias ef.
                  </p>
                </div>
                <div className="px-5 pt-4 pb-1">
                  <CompositionBar v={destaque[1]} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-5 pt-3 pb-5 md:grid-cols-4">
                  <KpiRow
                    label="Empresas (VAB)"
                    value={fmtBRL(destaque[1].empresas_vab)}
                    sub={pct(destaque[1].empresas_vab, destaque[1].total)}
                    color={COMP_COLORS.empresas}
                  />
                  <KpiRow
                    label="Educação"
                    value={fmtBRL(
                      destaque[1].educacao_perdas +
                        destaque[1].educacao_custo_adicional
                    )}
                    sub={pct(
                      destaque[1].educacao_perdas +
                        destaque[1].educacao_custo_adicional,
                      destaque[1].total
                    )}
                    color={COMP_COLORS.educacao}
                  />
                  <KpiRow
                    label="Saúde (SUS)"
                    value={fmtBRL(destaque[1].saude_producao)}
                    sub={pct(destaque[1].saude_producao, destaque[1].total)}
                    color={COMP_COLORS.saude}
                  />
                  <KpiRow
                    label="Agricultura"
                    value={fmtBRL(destaque[1].agricultura_perdas)}
                    sub={pct(destaque[1].agricultura_perdas, destaque[1].total)}
                    color={COMP_COLORS.agricultura}
                  />
                </div>
              </div>
            )}

            {/* Gráfico de barras total por cenário */}
            <SubTitle>Total de Perdas por Cenário: {dias} dias ef.</SubTitle>
            <p>
              Comparação dos {entradas.length} cenários avaliados para Rio
              Grande (em R$ milhões).
            </p>
            <div className="mt-3 rounded-xl border border-[#c7d6d9] bg-white p-5 shadow-sm">
              <TotaisBarChart entradas={entradas} maxTotal={maxTotal} />
              <div className="mt-4 flex flex-wrap justify-center gap-4">
                {entradas.map(([cen]) => (
                  <div key={cen} className="flex items-center gap-1.5">
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{
                        backgroundColor: CEN_COLORS[cen] ?? CEN_FALLBACK,
                      }}
                    />
                    <span className="text-[10px] font-medium text-slate-500">
                      {cen}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Note type="warning">
              Os cenários representam eventos independentes (extensões de mancha
              de inundação distintas), os valores não devem ser somados entre
              si.
            </Note>
          </Section>

          {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 2 — ANÁLISE POR CENÁRIO
        ══════════════════════════════════════════════════════════════════════ */}
          <Section id="cenarios" num="2" title="Análise por Cenário">
            <DiasBadge dias={dias} />

            <div
              className="mt-3 grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${entradas.length === 4 ? 2 : Math.min(entradas.length, 3)}, 1fr)`,
              }}
            >
              {entradas.map(([cen, v]) => (
                <div
                  key={cen}
                  className="overflow-hidden rounded-xl border border-[#c7d6d9] bg-white shadow-sm"
                >
                  <div className="flex items-baseline justify-between border-b border-[#c7d6d9] bg-[#eef3f4] px-4 py-2.5">
                    <p
                      className="text-[11px] font-black tracking-wide uppercase"
                      style={{ color: PRIMARY }}
                    >
                      {cen}
                    </p>
                    <p className="font-mono text-[9px] text-slate-400">
                      {dias}d ef. · f={v.f_interrup.toFixed(4)}
                    </p>
                  </div>
                  <div className="px-4 pt-3 pb-4">
                    <p className="mb-3 text-xl font-black text-slate-800">
                      {fmtBRL(v.total)}
                    </p>
                    <CompositionBar v={v} />
                    <div className="mt-3 space-y-2">
                      {(
                        [
                          {
                            label: "Empresas (VAB)",
                            value: v.empresas_vab,
                            color: COMP_COLORS.empresas,
                          },
                          {
                            label: "Educação",
                            value:
                              v.educacao_perdas + v.educacao_custo_adicional,
                            color: COMP_COLORS.educacao,
                          },
                          {
                            label: "Saúde (SUS)",
                            value: v.saude_producao,
                            color: COMP_COLORS.saude,
                          },
                          {
                            label: "Agricultura",
                            value: v.agricultura_perdas,
                            color: COMP_COLORS.agricultura,
                          },
                        ] as const
                      ).map(({ label, value, color }) => (
                        <div key={label}>
                          <div className="mb-0.5 flex justify-between text-[10px]">
                            <div className="flex items-center gap-1">
                              <div
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-slate-500">{label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">
                                {fmtBRL(value)}
                              </span>
                              <span className="w-8 text-right text-slate-400">
                                {pct(value, v.total)}
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#e2edf0]">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: pct(value, v.total),
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 3 — SENSIBILIDADE
        ══════════════════════════════════════════════════════════════════════ */}
          <Section
            id="sensib"
            num="3"
            title="Sensibilidade por Duração da Interrupção"
          >
            <p>
              Comparação do total estimado para{" "}
              <strong>30, 45 e 60 dias efetivos</strong> em cada cenário. Perdas
              agrícolas refletem custo de produção no estágio da cultura no
              momento do evento, independem da duração.
            </p>

            <div className="mt-3 rounded-xl border border-[#c7d6d9] bg-white p-5 shadow-sm">
              <p
                className="mb-4 text-[11px] font-black tracking-wider uppercase"
                style={{ color: PRIMARY }}
              >
                Total por duração: todos os cenários
              </p>
              <SensibChart
                cenariosOriginais={cenariosOriginais}
                diasSelecionado={dias}
              />
            </div>

            {Object.entries(cenariosOriginais).map(([cen, v]) => (
              <div key={cen} className="mt-6">
                <SubTitle>{cen}</SubTitle>
                <DataTable
                  rows={[
                    [
                      "Duração",
                      "Empresas (VAB)",
                      "Educação",
                      "Saúde (SUS)",
                      "Agricultura",
                      "Total",
                    ],
                    ...DIAS_OPCOES.map((d) => {
                      const sc = scaleTo(v, d)
                      const isSelected = d === dias
                      return [
                        <span
                          key="d"
                          className="font-mono font-black"
                          style={{ color: isSelected ? PRIMARY : "#64748b" }}
                        >
                          {d} dias{isSelected ? " ◀" : ""}
                        </span>,
                        fmtBRL(sc.empresas_vab),
                        fmtBRL(
                          sc.educacao_perdas + sc.educacao_custo_adicional
                        ),
                        fmtBRL(sc.saude_producao),
                        fmtBRL(sc.agricultura_perdas),
                        <span
                          key="t"
                          className="font-black"
                          style={{ color: isSelected ? PRIMARY : "#334155" }}
                        >
                          {fmtBRL(sc.total)}
                        </span>,
                      ]
                    }),
                  ]}
                />
              </div>
            ))}

            <Note type="info">
              Empresas, educação e saúde escalam linearmente com a duração. O
              marcador ◀ indica a duração atualmente selecionada no painel.
            </Note>
          </Section>

          {/* ══════════════════════════════════════════════════════════════════════
            SEÇÃO 4 — NOTAS E RESSALVAS
        ══════════════════════════════════════════════════════════════════════ */}
          <Section id="notas" num="4" title="Limitações">
            <Note type="info">
              As limitações e ressalvas dos números desta página, por cenário,
              metodologia e município, estão reunidas na{" "}
              <Link
                href="/metodologia#limitacoes"
                className="font-semibold underline-offset-4 hover:underline"
              >
                Seção 12 da Metodologia ↗
              </Link>
              . A metodologia completa (curva de recuperação DaLA, fórmulas por
              componente, parâmetros e fontes) está na{" "}
              <Link
                href="/metodologia#danos"
                className="font-semibold underline-offset-4 hover:underline"
              >
                Seção 10 ↗
              </Link>
              .
            </Note>
          </Section>

          <footer className="mt-12 border-t border-[#c7d6d9] pt-6 text-center">
            <p className="text-[11px]" style={{ color: PRIMARY }}>
              Painel desenvolvido por GPEA/FURG: Centro de Inteligência em
              Eventos Extremos (CIEX).
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}

// ─── Gráficos SVG ─────────────────────────────────────────────────────────────

function CompositionBar({ v }: { v: CenarioPerdas }) {
  const comps = [
    { value: v.empresas_vab, color: COMP_COLORS.empresas },
    {
      value: v.educacao_perdas + v.educacao_custo_adicional,
      color: COMP_COLORS.educacao,
    },
    { value: v.saude_producao, color: COMP_COLORS.saude },
    { value: v.agricultura_perdas, color: COMP_COLORS.agricultura },
  ].filter((c) => c.value > 0)
  const total = comps.reduce((s, c) => s + c.value, 0)
  let offset = 0
  return (
    <svg viewBox="0 0 400 14" className="w-full" style={{ height: 14 }}>
      {comps.map((c, i) => {
        const w = Math.max((c.value / total) * 400, 1)
        const x = offset
        offset += w
        return (
          <rect
            key={i}
            x={x}
            y={0}
            width={w}
            height={14}
            fill={c.color}
            rx={i === 0 || i === comps.length - 1 ? 3 : 0}
            ry={3}
          />
        )
      })}
    </svg>
  )
}

// Quebra o rótulo por palavra (sem limite de linhas, nomes de cenário longos,
// ex. "Nível da Lagoa + Chuva Acumulada – 16/05/2024", precisam de 3+ linhas
// para não colidir com a coluna vizinha nem cortar a data/valor no final).
// Quebra também no travessão " – ", isolando a data/valor na última linha.
function wordWrap(text: string, maxLen: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxLen && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function wrapLabel(text: string, maxLen: number): string[] {
  const idx = text.indexOf(" – ")
  if (idx === -1) return wordWrap(text, maxLen)
  return [...wordWrap(text.slice(0, idx), maxLen), text.slice(idx + 3)]
}

function TotaisBarChart({
  entradas,
  maxTotal,
}: {
  entradas: [string, CenarioPerdas][]
  maxTotal: number
}) {
  const barW = 76
  const gap = 32
  const chartH = 140
  const pL = 60
  const pB = 64
  const W = pL + entradas.length * (barW + gap) - gap + 10
  const esc = escalaAgradavel(maxTotal)

  return (
    <svg
      viewBox={`0 0 ${W} ${chartH + pB}`}
      className="w-full overflow-visible"
    >
      {esc.ticks.map((val, i) => {
        const y = chartH - (val / esc.max) * chartH + 4
        return (
          <g key={i}>
            <line
              x1={pL - 4}
              y1={y}
              x2={W}
              y2={y}
              stroke="#e2eef3"
              strokeWidth={i === 0 ? 1.5 : 0.75}
            />
            <text
              x={pL - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="8"
              fill="#9ca3af"
            >
              {fmtCompacto(val)}
            </text>
          </g>
        )
      })}
      {entradas.map(([cen, v], i) => {
        const barH = Math.max((v.total / esc.max) * chartH, 2)
        const x = pL + i * (barW + gap)
        const y = chartH - barH + 4
        const color = CEN_COLORS[cen] ?? CEN_FALLBACK
        return (
          <g key={cen}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill={color}
              rx="3"
              opacity="0.9"
            />
            <text
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="9"
              fill={color}
              fontWeight="bold"
            >
              {fmtCompacto(v.total)}
            </text>
            <text
              x={x + barW / 2}
              y={chartH + 18}
              textAnchor="middle"
              fontSize="8.5"
              fill="#374151"
              fontWeight="bold"
            >
              {wrapLabel(cen.replace("Cenário ", ""), 17).map((line, li) => (
                <tspan key={li} x={x + barW / 2} dy={li === 0 ? 0 : 10}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function SensibChart({
  cenariosOriginais,
  diasSelecionado,
}: {
  cenariosOriginais: Record<string, CenarioPerdas>
  diasSelecionado: DiasOpcao
}) {
  const cenarios = Object.entries(cenariosOriginais)

  const allVals = cenarios.flatMap(([, v]) =>
    DIAS_OPCOES.map((d) => scaleTo(v, d).total)
  )
  const maxVal = Math.max(...allVals, 1)
  const esc = escalaAgradavel(maxVal)

  const bW = 20
  const bGap = 4
  const gGap = 26
  const gW = DIAS_OPCOES.length * bW + (DIAS_OPCOES.length - 1) * bGap
  const chartH = 120
  const pL = 55
  const pB = 58
  const W = pL + cenarios.length * (gW + gGap) - gGap + 10

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${chartH + pB}`}
        className="w-full overflow-visible"
      >
        {esc.ticks.map((val, i) => {
          const y = chartH - (val / esc.max) * chartH + 4
          return (
            <g key={i}>
              <line
                x1={pL - 4}
                y1={y}
                x2={W}
                y2={y}
                stroke="#e2eef3"
                strokeWidth={i === 0 ? 1.5 : 0.75}
              />
              <text
                x={pL - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="7.5"
                fill="#9ca3af"
              >
                {fmtCompacto(val)}
              </text>
            </g>
          )
        })}
        {cenarios.map(([cen, v], gi) => {
          const gx = pL + gi * (gW + gGap)
          const color = CEN_COLORS[cen] ?? CEN_FALLBACK
          return (
            <g key={cen}>
              {DIAS_OPCOES.map((d, di) => {
                const sc = scaleTo(v, d)
                const barH = Math.max((sc.total / esc.max) * chartH, 1)
                const bx = gx + di * (bW + bGap)
                const by = chartH - barH + 4
                const isSel = d === diasSelecionado
                return (
                  <g key={d}>
                    <rect
                      x={bx}
                      y={by}
                      width={bW}
                      height={barH}
                      fill={color}
                      opacity={isSel ? 1 : 0.3}
                      rx="2"
                      style={{ transition: "opacity 0.2s" }}
                    />
                    {isSel && (
                      <text
                        x={bx + bW / 2}
                        y={by - 4}
                        textAnchor="middle"
                        fontSize="6.5"
                        fill={color}
                        fontWeight="bold"
                      >
                        {fmtCompacto(sc.total)}
                      </text>
                    )}
                  </g>
                )
              })}
              <text
                x={gx + gW / 2}
                y={chartH + 16}
                textAnchor="middle"
                fontSize="7.5"
                fill="#374151"
                fontWeight="bold"
              >
                {wrapLabel(cen.replace("Cenário ", ""), 17).map((line, li) => (
                  <tspan key={li} x={gx + gW / 2} dy={li === 0 ? 0 : 9}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="mt-2 flex flex-wrap justify-center gap-5">
        {DIAS_OPCOES.map((d) => (
          <div key={d} className="flex items-center gap-1.5">
            <div
              className="h-3 w-4 rounded-sm"
              style={{
                backgroundColor: PRIMARY,
                opacity: d === diasSelecionado ? 1 : 0.3,
              }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: d === diasSelecionado ? PRIMARY : "#94a3b8" }}
            >
              {d} dias{d === diasSelecionado ? " ◀" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Componentes UI ───────────────────────────────────────────────────────────

function DiasBadge({ dias }: { dias: number }) {
  return (
    <div
      className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        backgroundColor: `${PRIMARY}1a`,
        border: `1px solid ${PRIMARY}33`,
      }}
    >
      <div
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: PRIMARY }}
      />
      <span
        className="text-[10px] font-black tracking-wider uppercase"
        style={{ color: PRIMARY }}
      >
        {dias} dias efetivos selecionados · f = {(dias / 365).toFixed(4)}
      </span>
    </div>
  )
}

// ─── Página Danos: abas Operacionais / Físicos ────────────────────────────────

/** Tudo que a página lê no servidor (ver get-data.ts). Os campos de cota podem faltar. */
export interface DanosData {
  perdas: PerdasData
  /** Exposição por cota (com o detalhe por categoria em `expo.detalhe`); null se o arquivo faltar. */
  expo: ExposicaoMun | null
  cotas: CotasData | null
}

type Aba = "operacionais" | "fisicos"
const ABAS: [Aba, string][] = [
  ["operacionais", "Danos Operacionais"],
  ["fisicos", "Danos Físicos"],
]

const BANNER: Record<
  Aba,
  {
    titulo: string
    subtitulo: string
    nota: string
    icone: typeof TrendingDown
  }
> = {
  operacionais: {
    titulo: "Danos Operacionais",
    subtitulo:
      "Estimativa de Perdas Econômicas: Cenários de Inundação em Rio Grande (RS)",
    nota: "Metodologia DaLA (CEPAL/BID) · Setembro 2023, Maio 2024, Maio 2024 + 50% e 16/05/2024",
    icone: TrendingDown,
  },
  fisicos: {
    titulo: "Danos Físicos",
    subtitulo: "Exposição por cota do pico de 21/05/2024 em Rio Grande (RS)",
    nota: "Máscaras molhado/seco · sem profundidade, sem R$ de dano",
    icone: Waves,
  },
}

/** Banner de título da página, com os botões que alternam entre Danos Operacionais e Físicos. */
function DanosBanner({
  aba,
  trocarAba,
}: {
  aba: Aba
  trocarAba: (a: Aba) => void
}) {
  const { titulo, subtitulo, nota, icone: Icone } = BANNER[aba]
  const linkNav =
    "flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold text-white/70 transition-colors hover:border-white/40 hover:text-white"
  return (
    <header
      className="px-6 py-10 text-white"
      style={{ backgroundColor: PRIMARY }}
    >
      <div className="mx-auto flex max-w-[1440px] items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-2">
            <Link href="/" className={linkNav}>
              ← Dashboard
            </Link>
            <Link href="/metodologia" className={linkNav}>
              Metodologia →
            </Link>
          </div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] uppercase opacity-60">
            CIEX · GPEA · FURG
          </p>
          <h1 className="mb-2 flex items-center gap-3 text-4xl leading-none font-black tracking-tight">
            <Icone
              size={36}
              strokeWidth={2.5}
              className="shrink-0 opacity-80"
            />
            {titulo}
          </h1>
          <p className="text-base font-medium opacity-75">{subtitulo}</p>
          <p className="mt-3 font-mono text-[11px] opacity-50">{nota}</p>
          <div
            className="mt-5 flex flex-wrap gap-2"
            role="tablist"
            aria-label="Tipo de dano"
          >
            {ABAS.map(([id, rotulo]) => (
              <button
                key={id}
                role="tab"
                aria-selected={aba === id}
                onClick={() => trocarAba(id)}
                className="rounded-full border px-4 py-1.5 text-[11px] font-black transition-all duration-150"
                style={
                  aba === id
                    ? {
                        backgroundColor: "#fff",
                        color: PRIMARY,
                        borderColor: "#fff",
                      }
                    : {
                        backgroundColor: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.85)",
                        borderColor: "rgba(255,255,255,0.3)",
                      }
                }
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
        <HeaderLogos />
      </div>
    </header>
  )
}

export function DanosClient({ dados }: { dados: DanosData }) {
  const [aba, setAba] = useState<Aba>("operacionais")

  // Permalink ?aba=fisico (lido depois do primeiro render, sem useSearchParams/Suspense).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("aba") === "fisico")
      setAba("fisicos")
  }, [])

  const trocarAba = (nova: Aba) => {
    setAba(nova)
    const params = new URLSearchParams(window.location.search)
    if (nova === "fisicos") params.set("aba", "fisico")
    else params.delete("aba")
    const qs = params.toString()
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname
    )
  }

  return (
    <div className="min-h-screen bg-[#eef3f4] font-sans text-slate-800">
      <DanosBanner aba={aba} trocarAba={trocarAba} />
      {aba === "operacionais" ? (
        <OperacionaisView dados={dados.perdas} />
      ) : (
        <FisicosView
          expo={dados.expo}
          irOperacionais={() => trocarAba("operacionais")}
        />
      )}
    </div>
  )
}
