"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
import {
  ScenarioCompareMap,
  CENARIOS_COMPARACAO,
  GRUPOS_CENARIOS,
  cenarioShortLabel,
  formatCotaDisplay,
} from "@/components/map/ScenarioCompareMap"
import { EXPOSICAO_CENARIOS_EXTRAS } from "@/components/ResumoPerdasDanos"
import { MetricInfoPopover } from "@/components/MetricInfoPopover"
import { desmontarEfetivo, EVENTOS_SIMULACAO } from "@/lib/cenarios"
import { perdasEmDias } from "@/lib/comparativo"
import { compactoBr, formatoBr } from "@/lib/formatos"
import {
  GitCompare,
  TrendingDown,
  Waves,
  Ruler,
  Users,
  MapPin,
  Building2,
  GraduationCap,
  HeartPulse,
  LandPlot,
  Sprout,
  Table as TableIcon,
  Maximize2,
  Layers,
  BarChart3,
  Scale,
} from "lucide-react"

type CotaMapaJson = {
  cotas: number[]
  bounds: [number, number, number, number]
  coordinates: [[number, number], [number, number], [number, number], [number, number]]
  width: number
  height: number
  pop_por_cota?: number[]
  pop_grade?: number
  area_por_cota_km2?: number[]
}

type ClimadaCotaJson = {
  municipio?: string
  resultados_por_cota?: Record<string, {
    empresas?: { n_total?: number; n_atingidos?: number; dano_fisico_brl_poa?: number; dano_fisico_brl?: number; exposicao_total_brl?: number }
    educacao?: { n_total?: number; n_atingidos?: number; dano_fisico_brl_poa?: number; dano_fisico_brl?: number; exposicao_total_brl?: number }
    saude?: { n_total?: number; n_atingidos?: number; dano_fisico_brl_poa?: number; dano_fisico_brl?: number; exposicao_total_brl?: number }
  }>
}

type DetalheCotaJson = {
  por_cota?: Record<string, {
    empresas?: { n: number; empregados: number; massa_salarial_brl: number; valor_exposto_brl: number }
    educacao?: { n: number; matriculas: number; docentes: number; valor_exposto_brl: number }
    saude?: { n: number; leitos: number; profissionais: number; valor_exposto_brl: number }
    agricultura?: { area_ha: number }
  }>
}

type CotaOpData = {
  dias_agudo?: number
  dias_efetivos?: number
  f_interrup?: number
  empresas_vab?: number
  educacao_perdas?: number
  educacao_custo_adicional?: number
  saude_producao?: number
  agricultura_perdas?: number
  total?: number
  empresas_n?: number
  educacao_n?: number
  saude_n?: number
}

function matchCotaKey<T>(obj: Record<string, T> | undefined | null, cotaNum: number): T | null {
  if (!obj) return null
  if (obj[String(cotaNum)]) return obj[String(cotaNum)]
  if (obj[cotaNum.toFixed(2)]) return obj[cotaNum.toFixed(2)]
  if (obj[cotaNum.toFixed(1)]) return obj[cotaNum.toFixed(1)]
  const keys = Object.keys(obj)
  const found = keys.find((k) => Math.abs(parseFloat(k) - cotaNum) < 0.001)
  return found ? (obj[found] as T) : null
}

const HEADER_GLASS = {
  backgroundImage:
    "linear-gradient(135deg, rgba(30,64,74,0.92) 0%, rgba(37,83,98,0.92) 100%)",
  backdropFilter: "blur(24px) saturate(190%)",
  WebkitBackdropFilter: "blur(24px) saturate(190%)",
  borderBottom: "1px solid rgba(255,255,255,0.18)",
  boxShadow:
    "0 4px 20px rgba(0,0,0,0.15), inset 0 0.5px 0 0 rgba(255,255,255,0.3)",
} as const

interface Props {
  isOpen: boolean
  onClose: () => void
  cenarioInicialA?: string
  cenarioInicialB?: string
}

export interface ScenarioStats {
  populacao: number
  populacaoPct: number
  areaHa: number
  empresas: number
  escolas: number
  saude: number
  terrenos: number
  perdasTotal: number
  perdasEmpresas: number
  perdasEducacao: number
  perdasSaude: number
  perdasAgricultura: number
  exposicaoTotal: number
  exposicaoEmpresas: number
  exposicaoEducacao: number
  exposicaoSaude: number
  impactoTotal: number
}

function fmtBRL(n: number): string {
  if (!n || n === 0) return "R$ 0"
  if (Math.abs(n) >= 1e9) {
    return `R$ ${(n / 1e9).toFixed(2).replace(".", ",")} bi`
  }
  if (Math.abs(n) >= 1e6) {
    return `R$ ${(n / 1e6).toFixed(1).replace(".", ",")} mi`
  }
  if (Math.abs(n) >= 1e3) {
    return `R$ ${(n / 1e3).toFixed(1).replace(".", ",")} mil`
  }
  return `R$ ${Math.round(n).toLocaleString("pt-BR")}`
}

function fmtDelta(diff: number, isPercent = false): string {
  const sign = diff > 0 ? "+" : ""
  if (isPercent) {
    return `${sign}${diff.toFixed(1).replace(".", ",")}%`
  }
  return `${sign}${fmtBRL(diff)}`
}

function DeltaBadge({ diff, pct }: { diff: number; pct: number }) {
  if (Math.abs(diff) < 1e-4) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-600 whitespace-nowrap shrink-0">
        Igual
      </span>
    )
  }
  const isIncrease = diff > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold tabular-nums whitespace-nowrap shrink-0 ${
        isIncrease
          ? "bg-red-50 text-red-700 border border-red-200/60"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
      }`}
    >
      {isIncrease ? "▲" : "▼"} {fmtDelta(pct, true)} ({diff > 0 ? "+" : ""}{compactoBr(diff, 1)})
    </span>
  )
}

export function CenariosComparatorModal({
  isOpen,
  onClose,
  cenarioInicialA,
  cenarioInicialB,
}: Props) {
  const [showPoints, setShowPoints] = useState(true)
  const [leftTab, setLeftTab] = useState<"graficos" | "tabela">("graficos")
  const [isFullScreenMap, setIsFullScreenMap] = useState(false)
  const [tipoComparador, setTipoComparador] = useState<"cenarios" | "cotas">("cenarios")

  const [chosenA, setChosenA] = useState<string>(
    cenarioInicialA && CENARIOS_COMPARACAO.includes(cenarioInicialA)
      ? cenarioInicialA
      : CENARIOS_COMPARACAO[0]
  )
  const [chosenB, setChosenB] = useState<string>(
    cenarioInicialB && CENARIOS_COMPARACAO.includes(cenarioInicialB)
      ? cenarioInicialB
      : CENARIOS_COMPARACAO[1]
  )

  const [chosenCotaA, setChosenCotaA] = useState<number | null>(null)
  const [chosenCotaB, setChosenCotaB] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (cenarioInicialA && CENARIOS_COMPARACAO.includes(cenarioInicialA)) {
        setChosenA(cenarioInicialA)
      }
      if (cenarioInicialB && CENARIOS_COMPARACAO.includes(cenarioInicialB)) {
        setChosenB(cenarioInicialB)
      }
    }
  }, [isOpen, cenarioInicialA, cenarioInicialB])

  const [comparativoJson, setComparativoJson] = useState<any>(null)
  const [populacaoJson, setPopulacaoJson] = useState<any>(null)
  const [perdasJson, setPerdasJson] = useState<any>(null)
  const [perdasCotasData, setPerdasCotasData] = useState<Record<string, CotaOpData> | null>(null)
  const [cotaMapaData, setCotaMapaData] = useState<CotaMapaJson | null>(null)
  const [climadaCotaData, setClimadaCotaData] = useState<ClimadaCotaJson | null>(null)
  const [detalheCotaData, setDetalheCotaData] = useState<DetalheCotaJson | null>(null)

  useEffect(() => {
    if (!isOpen) return
    Promise.all([
      fetch("/dados_convertidos/intervencoes_comparativo.json").then((r) => r.json()).catch(() => null),
      fetch("/dados_convertidos/populacao_atingida.json").then((r) => r.json()).catch(() => null),
      fetch("/dados_convertidos/perdas_operacionais.json").then((r) => r.json()).catch(() => null),
      fetch("/dados_convertidos/perdas_cotas.json").then((r) => r.json()).catch(() => null),
      fetch("/dados_convertidos/rio_grande/cota_mapa.json").then((r) => r.json()).catch(() => null),
      fetch("/dados_convertidos/climada_cota_rio_grande.json").then((r) => r.json()).catch(() => null),
      fetch("/dados_convertidos/climada_cota_detalhe_rio_grande.json").then((r) => r.json()).catch(() => null),
    ]).then(([comp, pop, perdas, perdasCotas, cotaMapa, climadaCota, detalheCota]) => {
      setComparativoJson(comp)
      setPopulacaoJson(pop?.["Rio Grande"]?.cenarios ?? null)
      setPerdasJson(perdas?.["Rio Grande"] ?? null)
      setPerdasCotasData(perdasCotas?.["Rio Grande"]?.por_cota ?? perdasCotas?.["Rio Grande"] ?? null)
      setCotaMapaData(cotaMapa)
      setClimadaCotaData(climadaCota)
      setDetalheCotaData(detalheCota)
    })
  }, [isOpen])

  const cotasList = useMemo(() => {
    return cotaMapaData?.cotas ?? [1.0, 1.5, 2.0, 2.5, 2.6215]
  }, [cotaMapaData])

  const cotaA = useMemo(() => {
    if (chosenCotaA != null && cotasList.includes(chosenCotaA)) return chosenCotaA
    if (cotasList.length === 0) return 1.5
    const idx = Math.min(1, cotasList.length - 1)
    return cotasList[idx]
  }, [chosenCotaA, cotasList])

  const cotaB = useMemo(() => {
    if (chosenCotaB != null && cotasList.includes(chosenCotaB)) return chosenCotaB
    if (cotasList.length === 0) return 2.5
    const idx = Math.min(3, cotasList.length - 1)
    return cotasList[idx]
  }, [chosenCotaB, cotasList])

  const currentLabelA = tipoComparador === "cotas" ? formatCotaDisplay(cotaA) : cenarioShortLabel(chosenA)
  const currentLabelB = tipoComparador === "cotas" ? formatCotaDisplay(cotaB) : cenarioShortLabel(chosenB)

  // Extrai as métricas estruturadas de qualquer cenário ou cota de Rio Grande
  const getMetrics = useCallback((isSideA: boolean): ScenarioStats => {
    if (tipoComparador === "cotas") {
      const cotaNum = isSideA ? cotaA : cotaB
      const idx = cotasList.findIndex((c) => Math.abs(c - cotaNum) < 0.001)

      const pop = idx >= 0 && cotaMapaData?.pop_por_cota ? cotaMapaData.pop_por_cota[idx] ?? 0 : 0
      const popPct = (pop / 198418) * 100

      const areaKm2 = idx >= 0 && cotaMapaData?.area_por_cota_km2 ? cotaMapaData.area_por_cota_km2[idx] ?? 0 : 0
      const areaHa = areaKm2 * 100

      const op = matchCotaKey<CotaOpData>(perdasCotasData, cotaNum)
      const clim = matchCotaKey(climadaCotaData?.resultados_por_cota, cotaNum)
      const det = matchCotaKey(detalheCotaData?.por_cota, cotaNum)

      const empAtg = det?.empresas?.n ?? clim?.empresas?.n_atingidos ?? op?.empresas_n ?? 0
      const eduAtg = det?.educacao?.n ?? clim?.educacao?.n_atingidos ?? op?.educacao_n ?? 0
      const sauAtg = det?.saude?.n ?? clim?.saude?.n_atingidos ?? op?.saude_n ?? 0

      const vabEmp = op?.empresas_vab ?? 0
      const eduPerdas = (op?.educacao_perdas ?? 0) + (op?.educacao_custo_adicional ?? 0)
      const sauProd = op?.saude_producao ?? 0
      const agrPerdas = op?.agricultura_perdas ?? 0
      const totalOp = op?.total ?? (vabEmp + eduPerdas + sauProd + agrPerdas)

      const expEmp = clim?.empresas?.exposicao_total_brl ?? det?.empresas?.valor_exposto_brl ?? 0
      const expEdu = clim?.educacao?.exposicao_total_brl ?? det?.educacao?.valor_exposto_brl ?? 0
      const expSau = clim?.saude?.exposicao_total_brl ?? det?.saude?.valor_exposto_brl ?? 0
      const totalFis = expEmp + expEdu + expSau

      const terrCount = Math.round(pop * 1.28)

      return {
        populacao: pop,
        populacaoPct: popPct,
        areaHa,
        empresas: empAtg,
        escolas: eduAtg,
        saude: sauAtg,
        terrenos: terrCount,
        perdasTotal: totalOp,
        perdasEmpresas: vabEmp,
        perdasEducacao: eduPerdas,
        perdasSaude: sauProd,
        perdasAgricultura: agrPerdas,
        exposicaoTotal: totalFis,
        exposicaoEmpresas: expEmp,
        exposicaoEducacao: expEdu,
        exposicaoSaude: expSau,
        impactoTotal: totalOp + totalFis,
      }
    }

    const cenario = isSideA ? chosenA : chosenB
    const { evento, intervencao } = desmontarEfetivo(cenario)
    const ev = EVENTOS_SIMULACAO.find((e) => e.nome === evento)

    // Caso 1: Uma das 12 simulações com dados em intervencoes_comparativo.json
    if (ev && comparativoJson?.eventos?.[ev.id]?.variantes?.[intervencao]) {
      const v = comparativoJson.eventos[ev.id].variantes[intervencao]
      const p30 = perdasEmDias(v, 30)
      const popAtingida = v.populacao ?? 0
      const popPct = popAtingida > 0 ? (popAtingida / 198418) * 100 : 0
      const expTotal = v.exposicao_total ?? 0

      return {
        populacao: popAtingida,
        populacaoPct: popPct,
        areaHa: v.area_ha ?? 0,
        empresas: v.empresas ?? 0,
        escolas: v.escolas ?? 0,
        saude: v.unidades_saude ?? 0,
        terrenos: v.terrenos ?? 0,
        perdasTotal: p30.total,
        perdasEmpresas: p30.empresas,
        perdasEducacao: p30.educacao,
        perdasSaude: p30.saude,
        perdasAgricultura: p30.agricultura,
        exposicaoTotal: expTotal,
        exposicaoEmpresas: v.exposicao_empresas ?? 0,
        exposicaoEducacao: v.exposicao_educacao ?? 0,
        exposicaoSaude: v.exposicao_saude ?? 0,
        impactoTotal: p30.total + expTotal,
      }
    }

    // Caso 2: Cenários históricos ou sem intervenção (+50% ou 16/05/2024)
    const popItem = populacaoJson?.[cenario] ?? populacaoJson?.[cenario.replace("–", "-")]
    const perdasItem = perdasJson?.[cenario]
    const expoExtra = EXPOSICAO_CENARIOS_EXTRAS[cenario]

    const popAtg = popItem?.pop_atingida ?? 0
    const popPct = popItem?.pct_atingida ?? (popAtg > 0 ? (popAtg / 198418) * 100 : 0)

    let pEmp = 0
    let pEdu = 0
    let pSau = 0
    let pAgr = 0
    let pTotal = 0

    if (perdasItem) {
      const s = 30 / perdasItem.dias_efetivos
      pEmp = perdasItem.empresas_vab * s
      pEdu = (perdasItem.educacao_perdas + perdasItem.educacao_custo_adicional) * s
      pSau = perdasItem.saude_producao * s
      pAgr = perdasItem.agricultura_perdas
      pTotal = pEmp + pEdu + pSau + pAgr
    }

    // Contagens aproximadas conhecidas dos cenários históricos
    const is50 = cenario.includes("+ 50%")
    const is1605 = cenario.includes("16/05/2024")

    const empCount = is50 ? 2399 : is1605 ? 1848 : 0
    const escCount = is50 ? 96 : is1605 ? 74 : 0
    const sauCount = is50 ? 394 : is1605 ? 172 : 0
    const terrCount = is50 ? 29317 : is1605 ? 17654 : 0
    const areaHa = is50 ? 4500 : is1605 ? 640 : 0

    const expTot = expoExtra?.total ?? 0

    return {
      populacao: popAtg,
      populacaoPct: popPct,
      areaHa,
      empresas: empCount,
      escolas: escCount,
      saude: sauCount,
      terrenos: terrCount,
      perdasTotal: pTotal,
      perdasEmpresas: pEmp,
      perdasEducacao: pEdu,
      perdasSaude: pSau,
      perdasAgricultura: pAgr,
      exposicaoTotal: expTot,
      exposicaoEmpresas: expoExtra?.empresas ?? 0,
      exposicaoEducacao: expoExtra?.educacao ?? 0,
      exposicaoSaude: expoExtra?.saude ?? 0,
      impactoTotal: pTotal + expTot,
    }
  }, [
    tipoComparador,
    cotaA,
    cotaB,
    cotasList,
    perdasCotasData,
    climadaCotaData,
    detalheCotaData,
    cotaMapaData,
    chosenA,
    chosenB,
    comparativoJson,
    populacaoJson,
    perdasJson,
  ])

  const metricsA = useMemo(() => getMetrics(true), [getMetrics])
  const metricsB = useMemo(() => getMetrics(false), [getMetrics])

  const renderVisualBar = (
    titulo: string,
    icone: React.ReactNode,
    valA: number,
    valB: number,
    metricKey?: string,
    isCurrency = false,
    sufixo = ""
  ) => {
    const diff = valB - valA
    const pctDiff = valA > 0 ? (diff / valA) * 100 : valB > 0 ? 100 : 0
    const maxVal = Math.max(valA, valB, 1)
    const pctBarA = Math.max(Math.round((valA / maxVal) * 100), 4)
    const pctBarB = Math.max(Math.round((valB / maxVal) * 100), 4)

    const formatValue = (v: number) => {
      if (isCurrency) return fmtBRL(v)
      if (sufixo) return `${compactoBr(v, 1)}${sufixo}`
      return v.toLocaleString("pt-BR")
    }

    return (
      <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="p-1 rounded-md bg-slate-100 text-[#1E404A] shrink-0">
              {icone}
            </span>
            <span className="text-xs font-bold text-slate-800 truncate">
              {titulo}
            </span>
            {metricKey && (
              <MetricInfoPopover
                metricKey={metricKey}
                corIcone="#1E404A"
                iconSize={11}
              />
            )}
          </div>
          <DeltaBadge diff={diff} pct={pctDiff} />
        </div>

        <div className="space-y-1">
          {/* Lado A */}
          <div className="flex items-center gap-2">
            <span className="w-12 text-[10px] font-bold text-sky-800 truncate text-right shrink-0">
              Lado A
            </span>
            <div className="flex-1 h-3.5 bg-slate-100 rounded-md overflow-hidden">
              <div
                className="h-full bg-[#055071] rounded-md transition-all duration-300"
                style={{ width: `${pctBarA}%` }}
              />
            </div>
            <span className="w-24 text-right text-[10.5px] font-black text-slate-800 tabular-nums shrink-0">
              {formatValue(valA)}
            </span>
          </div>

          {/* Lado B */}
          <div className="flex items-center gap-2">
            <span className="w-12 text-[10px] font-bold text-rose-800 truncate text-right shrink-0">
              Lado B
            </span>
            <div className="flex-1 h-3.5 bg-slate-100 rounded-md overflow-hidden">
              <div
                className="h-full bg-[#c9402e] rounded-md transition-all duration-300"
                style={{ width: `${pctBarB}%` }}
              />
            </div>
            <span className="w-24 text-right text-[10.5px] font-black text-slate-800 tabular-nums shrink-0">
              {formatValue(valB)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderTableRow = (
    titulo: string,
    icone: React.ReactNode,
    valA: number,
    valB: number,
    metricKey?: string,
    isCurrency = false,
    sufixo = ""
  ) => {
    const diff = valB - valA
    const pctDiff = valA > 0 ? (diff / valA) * 100 : valB > 0 ? 100 : 0
    const formatValue = (v: number) => {
      if (isCurrency) return fmtBRL(v)
      if (sufixo) return `${compactoBr(v, 1)}${sufixo}`
      return v.toLocaleString("pt-BR")
    }

    return (
      <div className="grid grid-cols-[minmax(190px,1.4fr)_minmax(85px,0.85fr)_minmax(85px,0.85fr)_minmax(150px,1.2fr)] items-center gap-2.5 py-2 px-3.5 border-b border-slate-100 hover:bg-slate-50/70 transition-colors text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-500 shrink-0">{icone}</span>
          <span className="font-semibold text-slate-700 truncate whitespace-nowrap">{titulo}</span>
          {metricKey && (
            <MetricInfoPopover
              metricKey={metricKey}
              corIcone="#1E404A"
              iconSize={10}
            />
          )}
        </div>
        <div className="text-right font-medium text-slate-800 tabular-nums whitespace-nowrap">
          {formatValue(valA)}
        </div>
        <div className="text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
          {formatValue(valB)}
        </div>
        <div className="flex justify-end items-center pr-1">
          <DeltaBadge diff={diff} pct={pctDiff} />
        </div>
      </div>
    )
  }

  if (isFullScreenMap) {
    return (
      <ScenarioCompareMap
        cenarioA={chosenA}
        cenarioB={chosenB}
        cotaA={cotaA}
        cotaB={cotaB}
        modo={tipoComparador}
        cotasList={cotasList}
        onCenarioAChange={setChosenA}
        onCenarioBChange={setChosenB}
        onCotaAChange={setChosenCotaA}
        onCotaBChange={setChosenCotaB}
        isFullScreen={true}
        showPoints={showPoints}
        onClose={() => setIsFullScreenMap(false)}
      />
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[98vw] sm:max-w-none max-w-[1720px] h-[92vh] max-h-[960px] overflow-hidden flex flex-col p-0 gap-0 sm:rounded-3xl shadow-2xl [&>button]:text-white/90 [&>button:hover]:text-white [&>button]:bg-white/10 [&>button:hover]:bg-white/20 [&>button]:border [&>button]:border-white/20 [&>button]:shadow-xs [&>button]:top-2 [&>button]:right-3.5 [&>button]:h-7 [&>button]:w-7 [&>button]:backdrop-blur-md">
        {/* Header no Padrão e Tema do Dashboard - Linha Única Sem Logo */}
        <DialogHeader
          className="shrink-0 px-3.5 py-2 text-white"
          style={HEADER_GLASS}
        >
          <div className="flex items-center gap-2.5 w-full min-w-0">
            {/* Título Compacto */}
            <div className="flex items-center gap-1.5 shrink-0">
              <GitCompare size={15} className="text-white/80 shrink-0" />
              <DialogTitle className="leading-none font-black whitespace-nowrap text-white text-xs sm:text-sm">
                Comparador
              </DialogTitle>
              <DialogDescription className="sr-only">
                Comparador lado a lado de cenários e cotas
              </DialogDescription>
            </div>

            <div className="h-5 w-px bg-white/20 shrink-0" />

            {/* Alternador de Modo: Cenários vs Cotas */}
            <div className="inline-flex rounded-full bg-black/20 p-0.5 border border-white/20 h-7 items-center shrink-0">
              <button
                type="button"
                onClick={() => setTipoComparador("cenarios")}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold active:scale-[0.97] transition-all duration-150 ${
                  tipoComparador === "cenarios"
                    ? "bg-white text-[#1E404A] shadow-xs"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Waves size={11} strokeWidth={2.5} />
                <span>Cenários</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoComparador("cotas")}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold active:scale-[0.97] transition-all duration-150 ${
                  tipoComparador === "cotas"
                    ? "bg-white text-[#1E404A] shadow-xs"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Ruler size={11} strokeWidth={2.5} />
                <span>Cotas ({cotasList.length})</span>
              </button>
            </div>

            {/* Seletor Lado A */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="h-2 w-2 rounded-full bg-[#38bdf8] shrink-0 shadow-2xs" />
              <span className="text-[10px] font-bold text-sky-200 uppercase tracking-wide shrink-0">
                Lado A:
              </span>
              {tipoComparador === "cotas" ? (
                <Select
                  value={cotaA != null ? String(cotaA) : ""}
                  onValueChange={(v) => setChosenCotaA(parseFloat(v))}
                >
                  <SelectTrigger
                    aria-label="Cota Lado A"
                    className="h-7 w-[140px] sm:w-[160px] border-sky-400/50 text-white text-xs font-semibold rounded-xl focus:ring-2 focus:ring-sky-300/50 transition-all truncate"
                    style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
                  >
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
                <Select value={chosenA} onValueChange={setChosenA}>
                  <SelectTrigger
                    aria-label="Cenário Lado A"
                    className="h-7 w-[160px] sm:w-[200px] border-sky-400/50 text-white text-xs font-semibold rounded-xl focus:ring-2 focus:ring-sky-300/50 transition-all truncate"
                    style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
                  >
                    <SelectValue placeholder="Selecione um cenário">
                      {cenarioShortLabel(chosenA)}
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

            {/* Badge Central VS */}
            <span className="text-[9px] font-black tracking-wider text-white/60 uppercase shrink-0">
              vs
            </span>

            {/* Seletor Lado B */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="h-2 w-2 rounded-full bg-[#f87171] shrink-0 shadow-2xs" />
              <span className="text-[10px] font-bold text-rose-200 uppercase tracking-wide shrink-0">
                Lado B:
              </span>
              {tipoComparador === "cotas" ? (
                <Select
                  value={cotaB != null ? String(cotaB) : ""}
                  onValueChange={(v) => setChosenCotaB(parseFloat(v))}
                >
                  <SelectTrigger
                    aria-label="Cota Lado B"
                    className="h-7 w-[140px] sm:w-[160px] border-rose-400/50 text-white text-xs font-semibold rounded-xl focus:ring-2 focus:ring-rose-300/50 transition-all truncate"
                    style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
                  >
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
                <Select value={chosenB} onValueChange={setChosenB}>
                  <SelectTrigger
                    aria-label="Cenário Lado B"
                    className="h-7 w-[160px] sm:w-[200px] border-rose-400/50 text-white text-xs font-semibold rounded-xl focus:ring-2 focus:ring-rose-300/50 transition-all truncate"
                    style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
                  >
                    <SelectValue placeholder="Selecione um cenário">
                      {cenarioShortLabel(chosenB)}
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

            {/* Ações à Direita */}
            <div className="flex items-center gap-1.5 pr-11 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setShowPoints((prev) => !prev)}
                className={`active-press hover-lift flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold border active:scale-[0.97] transition-all duration-150 ${
                  showPoints
                    ? "border-white bg-white text-[#1E404A] shadow-xs"
                    : "border-white/20 bg-white/10 text-white/90 hover:bg-white/20 hover:border-white/35"
                }`}
                title={showPoints ? "Ocultar pontos no mapa" : "Exibir pontos de escolas e unidades de saúde"}
              >
                <Layers size={12} strokeWidth={2.5} />
                <span className="hidden md:inline">{showPoints ? "Pontos" : "Ocultos"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullScreenMap(true)}
                className="active-press hover-lift flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 hover:border-white/35 active:scale-[0.97] transition-all duration-150 border border-white/20 shadow-xs"
                title="Abrir mapa de comparação em tela cheia"
              >
                <Maximize2 size={12} strokeWidth={2.5} />
                <span className="hidden md:inline">Tela Cheia</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Content - 2 Colunas: Métricas & Danos (Esquerda) e Mapa com Swipe (Direita) */}
        <div className="min-h-0 flex-1 p-3 flex flex-col lg:flex-row gap-3 overflow-hidden bg-slate-100/60 backdrop-blur-md">
          {/* Coluna Esquerda: Métricas & Danos */}
          <div className="w-full lg:w-[48%] xl:w-[46%] 2xl:w-[44%] flex flex-col min-h-0 bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Topo da Coluna */}
            <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-200/80 bg-slate-50/90 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-[#1E404A]/10 text-[#1E404A]">
                  {leftTab === "graficos" ? <BarChart3 size={15} /> : <TableIcon size={15} />}
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide block">
                    Métricas & Danos
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium truncate block max-w-[320px]">
                    {currentLabelA} vs {currentLabelB}
                  </span>
                </div>
              </div>

              {/* Alternador de visualização: Gráficos & KPIs vs Tabela (Apple Segmented Control) */}
              <div className="inline-flex rounded-full bg-slate-200/80 p-1 border border-slate-300/60 shadow-2xs backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setLeftTab("graficos")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold active:scale-[0.97] transition-all duration-150 ${
                    leftTab === "graficos"
                      ? "bg-white text-[#1E404A] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <BarChart3 size={12} />
                  <span>Gráficos & KPIs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab("tabela")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold active:scale-[0.97] transition-all duration-150 ${
                    leftTab === "tabela"
                      ? "bg-white text-[#1E404A] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <TableIcon size={12} />
                  <span>Tabela Detalhada</span>
                </button>
              </div>
            </div>

            {/* Conteúdo Rolável das Métricas */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
              {leftTab === "graficos" ? (
                <>
                  {/* 1. Card Destaque: Impacto Total Combinado */}
                  <div className="rounded-xl border border-cyan-200/90 bg-gradient-to-br from-cyan-50/70 via-white to-sky-50/50 p-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-cyan-100/80 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#1E404A] text-white shadow-xs">
                          <GitCompare size={14} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 tracking-wide uppercase block">
                              Impacto Total Combinado
                            </span>
                            <MetricInfoPopover
                              metricKey="impacto_total"
                              corIcone="#1E404A"
                              iconSize={11}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Perdas DaLA (30d) + Danos Físicos de Reposição
                          </span>
                        </div>
                      </div>
                      <DeltaBadge
                        diff={metricsB.impactoTotal - metricsA.impactoTotal}
                        pct={
                          metricsA.impactoTotal > 0
                            ? ((metricsB.impactoTotal - metricsA.impactoTotal) /
                                metricsA.impactoTotal) *
                              100
                            : 0
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-2.5">
                      <div className="rounded-lg bg-white/90 p-2.5 border border-sky-100 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-sky-950 uppercase truncate">
                            Lado A · {currentLabelA}
                          </span>
                          <span className="h-2 w-2 rounded-full bg-[#055071] shrink-0" />
                        </div>
                        <span className="text-lg font-black text-slate-900 block mt-0.5">
                          {fmtBRL(metricsA.impactoTotal)}
                        </span>
                        <div className="flex items-center justify-between text-[9.5px] text-slate-500 pt-1 border-t border-slate-100 mt-1">
                          <span>DaLA: {fmtBRL(metricsA.perdasTotal)}</span>
                          <span>Físico: {fmtBRL(metricsA.exposicaoTotal)}</span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-white/90 p-2.5 border border-rose-100 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-rose-950 uppercase truncate">
                            Lado B · {currentLabelB}
                          </span>
                          <span className="h-2 w-2 rounded-full bg-[#c9402e] shrink-0" />
                        </div>
                        <span className="text-lg font-black text-cyan-900 block mt-0.5">
                          {fmtBRL(metricsB.impactoTotal)}
                        </span>
                        <div className="flex items-center justify-between text-[9.5px] text-slate-500 pt-1 border-t border-slate-100 mt-1">
                          <span>DaLA: {fmtBRL(metricsB.perdasTotal)}</span>
                          <span>Físico: {fmtBRL(metricsB.exposicaoTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Grid de 4 KPIs Estratégicos */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* KPI 1: Perdas DaLA (30d) */}
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <TrendingDown size={13} className="text-cyan-700" />
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                            Perdas DaLA (30d)
                          </span>
                          <MetricInfoPopover
                            metricKey="perdas_operacionais"
                            corIcone="#0891b2"
                            iconSize={10}
                          />
                        </div>
                        <DeltaBadge
                          diff={metricsB.perdasTotal - metricsA.perdasTotal}
                          pct={
                            metricsA.perdasTotal > 0
                              ? ((metricsB.perdasTotal - metricsA.perdasTotal) /
                                  metricsA.perdasTotal) *
                                100
                              : 0
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1.5 text-center">
                        <div>
                          <span className="text-[9px] text-slate-400 block truncate font-medium">Lado A</span>
                          <span className="text-sm font-black text-slate-800">
                            {fmtBRL(metricsA.perdasTotal)}
                          </span>
                        </div>
                        <div className="border-l border-slate-100 pl-2">
                          <span className="text-[9px] text-slate-400 block truncate font-medium">Lado B</span>
                          <span className="text-sm font-black text-cyan-800">
                            {fmtBRL(metricsB.perdasTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KPI 2: Danos Físicos (Exposição / CUB) */}
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Waves size={13} className="text-blue-700" />
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                            Danos Físicos (CUB)
                          </span>
                          <MetricInfoPopover
                            metricKey="danos_fisicos"
                            corIcone="#1d4ed8"
                            iconSize={10}
                          />
                        </div>
                        <DeltaBadge
                          diff={metricsB.exposicaoTotal - metricsA.exposicaoTotal}
                          pct={
                            metricsA.exposicaoTotal > 0
                              ? ((metricsB.exposicaoTotal - metricsA.exposicaoTotal) /
                                  metricsA.exposicaoTotal) *
                                100
                              : 0
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1.5 text-center">
                        <div>
                          <span className="text-[9px] text-slate-400 block truncate font-medium">Lado A</span>
                          <span className="text-sm font-black text-slate-800">
                            {fmtBRL(metricsA.exposicaoTotal)}
                          </span>
                        </div>
                        <div className="border-l border-slate-100 pl-2">
                          <span className="text-[9px] text-slate-400 block truncate font-medium">Lado B</span>
                          <span className="text-sm font-black text-blue-800">
                            {fmtBRL(metricsB.exposicaoTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KPI 3: População Atingida */}
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-indigo-700" />
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                            População Atingida
                          </span>
                          <MetricInfoPopover
                            metricKey="populacao"
                            corIcone="#4338ca"
                            iconSize={10}
                          />
                        </div>
                        <DeltaBadge
                          diff={metricsB.populacao - metricsA.populacao}
                          pct={
                            metricsA.populacao > 0
                              ? ((metricsB.populacao - metricsA.populacao) /
                                  metricsA.populacao) *
                                100
                              : 0
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1.5 text-center">
                        <div>
                          <span className="text-[9px] text-slate-400 block truncate font-medium">Lado A</span>
                          <span className="text-sm font-black text-slate-800">
                            {compactoBr(metricsA.populacao, 1)} hab
                          </span>
                          <span className="text-[8.5px] text-slate-400 block">
                            {metricsA.populacaoPct.toFixed(1)}% do total
                          </span>
                        </div>
                        <div className="border-l border-slate-100 pl-2">
                          <span className="text-[9px] text-slate-400 block truncate font-medium">Lado B</span>
                          <span className="text-sm font-black text-indigo-800">
                            {compactoBr(metricsB.populacao, 1)} hab
                          </span>
                          <span className="text-[8.5px] text-slate-400 block">
                            {metricsB.populacaoPct.toFixed(1)}% do total
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KPI 4: Área Inundada */}
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-emerald-700" />
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                            Área Inundada
                          </span>
                          <MetricInfoPopover
                            metricKey="area_atingida"
                            corIcone="#047857"
                            iconSize={10}
                          />
                        </div>
                        <DeltaBadge
                          diff={metricsB.areaHa - metricsA.areaHa}
                          pct={
                            metricsA.areaHa > 0
                              ? ((metricsB.areaHa - metricsA.areaHa) /
                                  metricsA.areaHa) *
                                100
                              : 0
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1.5 text-center">
                        <div>
                          <span className="text-[9px] text-slate-400 block truncate font-medium">Lado A</span>
                          <span className="text-sm font-black text-slate-800">
                            {compactoBr(metricsA.areaHa, 1)} ha
                          </span>
                        </div>
                        <div className="border-l border-slate-100 pl-2">
                          <span className="text-[9px] text-slate-400 block truncate font-medium">Lado B</span>
                          <span className="text-sm font-black text-emerald-800">
                            {compactoBr(metricsB.areaHa, 1)} ha
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção 1: Impacto Territorial & Social */}
                  <div>
                    <h3 className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <Users size={12} className="text-[#1E404A]" />
                      População e Território
                    </h3>
                    <div className="space-y-2">
                      {renderVisualBar(
                        "População Atingida",
                        <Users size={13} />,
                        metricsA.populacao,
                        metricsB.populacao,
                        "populacao",
                        false,
                        " hab"
                      )}
                      {metricsA.areaHa > 0 || metricsB.areaHa > 0
                        ? renderVisualBar(
                            "Área Alagada (ha)",
                            <MapPin size={13} />,
                            metricsA.areaHa,
                            metricsB.areaHa,
                            "area_atingida",
                            false,
                            " ha"
                          )
                        : null}
                    </div>
                  </div>

                  {/* Seção 2: Ativos e Infraestrutura */}
                  <div>
                    <h3 className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <Building2 size={12} className="text-[#1E404A]" />
                      Ativos e Infraestrutura Exposta
                    </h3>
                    <div className="space-y-2">
                      {renderVisualBar(
                        "Empresas Atingidas",
                        <Building2 size={13} />,
                        metricsA.empresas,
                        metricsB.empresas,
                        "massa_salarial"
                      )}
                      {renderVisualBar(
                        "Escolas Atingidas",
                        <GraduationCap size={13} />,
                        metricsA.escolas,
                        metricsB.escolas,
                        "educacao"
                      )}
                      {renderVisualBar(
                        "Unidades de Saúde",
                        <HeartPulse size={13} />,
                        metricsA.saude,
                        metricsB.saude,
                        "saude"
                      )}
                      {renderVisualBar(
                        "Terrenos / Imóveis",
                        <LandPlot size={13} />,
                        metricsA.terrenos,
                        metricsB.terrenos,
                        "edificacoes"
                      )}
                    </div>
                  </div>

                  {/* Seção 3: Perdas Operacionais DaLA (30 dias) */}
                  <div>
                    <h3 className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <TrendingDown size={12} className="text-[#1E404A]" />
                      Perdas Operacionais (DaLA · 30 dias)
                    </h3>
                    <div className="space-y-2">
                      {renderVisualBar(
                        "Perdas Totais DaLA",
                        <TrendingDown size={13} />,
                        metricsA.perdasTotal,
                        metricsB.perdasTotal,
                        "perdas_operacionais",
                        true
                      )}
                      {renderVisualBar(
                        "VAB Empresas",
                        <Building2 size={13} />,
                        metricsA.perdasEmpresas,
                        metricsB.perdasEmpresas,
                        "empresas_vab",
                        true
                      )}
                      {renderVisualBar(
                        "Educação (FUNDEB)",
                        <GraduationCap size={13} />,
                        metricsA.perdasEducacao,
                        metricsB.perdasEducacao,
                        "educacao",
                        true
                      )}
                      {renderVisualBar(
                        "Saúde (SUS)",
                        <HeartPulse size={13} />,
                        metricsA.perdasSaude,
                        metricsB.perdasSaude,
                        "saude",
                        true
                      )}
                    </div>
                  </div>

                  {/* Seção 4: Danos Físicos (Exposição CLIMADA) */}
                  <div>
                    <h3 className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <Waves size={12} className="text-[#1E404A]" />
                      Danos Físicos (Exposição / CLIMADA)
                    </h3>
                    <div className="space-y-2">
                      {renderVisualBar(
                        "Exposição Física Total",
                        <Waves size={13} />,
                        metricsA.exposicaoTotal,
                        metricsB.exposicaoTotal,
                        "danos_fisicos",
                        true
                      )}
                      {renderVisualBar(
                        "Exposição Empresas",
                        <Building2 size={13} />,
                        metricsA.exposicaoEmpresas,
                        metricsB.exposicaoEmpresas,
                        "danos_fisicos",
                        true
                      )}
                      {renderVisualBar(
                        "Exposição Educação",
                        <GraduationCap size={13} />,
                        metricsA.exposicaoEducacao,
                        metricsB.exposicaoEducacao,
                        "danos_fisicos",
                        true
                      )}
                      {renderVisualBar(
                        "Exposição Saúde",
                        <HeartPulse size={13} />,
                        metricsA.exposicaoSaude,
                        metricsB.exposicaoSaude,
                        "danos_fisicos",
                        true
                      )}
                    </div>
                  </div>

                </>
              ) : (
                /* Modo Tabela */
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <div className="min-w-[530px]">
                      <div className="grid grid-cols-[minmax(190px,1.4fr)_minmax(85px,0.85fr)_minmax(85px,0.85fr)_minmax(150px,1.2fr)] items-center gap-2.5 py-2 px-3.5 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <div className="whitespace-nowrap">Indicador</div>
                        <div className="text-right whitespace-nowrap">Lado A</div>
                        <div className="text-right whitespace-nowrap">Lado B</div>
                        <div className="text-right whitespace-nowrap pr-1">Delta</div>
                      </div>
                      {renderTableRow("Impacto Total Combinado", <Scale size={12} />, metricsA.impactoTotal, metricsB.impactoTotal, "impacto_total", true)}
                      {renderTableRow("População Atingida", <Users size={12} />, metricsA.populacao, metricsB.populacao, "populacao", false, " hab")}
                      {renderTableRow("Área Inundada", <MapPin size={12} />, metricsA.areaHa, metricsB.areaHa, "area_atingida", false, " ha")}
                      {renderTableRow("Empresas Atingidas", <Building2 size={12} />, metricsA.empresas, metricsB.empresas, "empresas_vab")}
                      {renderTableRow("Escolas Atingidas", <GraduationCap size={12} />, metricsA.escolas, metricsB.escolas, "educacao")}
                      {renderTableRow("Unidades de Saúde", <HeartPulse size={12} />, metricsA.saude, metricsB.saude, "saude")}
                      {renderTableRow("Terrenos / Imóveis", <LandPlot size={12} />, metricsA.terrenos, metricsB.terrenos, "edificacoes")}
                      {renderTableRow("Perdas Operacionais DaLA", <TrendingDown size={12} />, metricsA.perdasTotal, metricsB.perdasTotal, "perdas_operacionais", true)}
                      {renderTableRow("  • VAB Empresas", <Building2 size={12} />, metricsA.perdasEmpresas, metricsB.perdasEmpresas, "empresas_vab", true)}
                      {renderTableRow("  • Educação", <GraduationCap size={12} />, metricsA.perdasEducacao, metricsB.perdasEducacao, "educacao", true)}
                      {renderTableRow("  • Saúde (SUS)", <HeartPulse size={12} />, metricsA.perdasSaude, metricsB.perdasSaude, "saude", true)}
                      {renderTableRow("  • Agricultura", <Sprout size={12} />, metricsA.perdasAgricultura, metricsB.perdasAgricultura, "agricultura", true)}
                      {renderTableRow("Exposição Física (CUB)", <Waves size={12} />, metricsA.exposicaoTotal, metricsB.exposicaoTotal, "danos_fisicos", true)}
                      {renderTableRow("  • Empresas", <Building2 size={12} />, metricsA.exposicaoEmpresas, metricsB.exposicaoEmpresas, "danos_fisicos", true)}
                      {renderTableRow("  • Educação", <GraduationCap size={12} />, metricsA.exposicaoEducacao, metricsB.exposicaoEducacao, "danos_fisicos", true)}
                      {renderTableRow("  • Saúde", <HeartPulse size={12} />, metricsA.exposicaoSaude, metricsB.exposicaoSaude, "danos_fisicos", true)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Mapa Interativo com Swipe */}
          <div className="flex-1 min-h-[420px] lg:min-h-0 h-full rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-900 shadow-xs relative">
            <ScenarioCompareMap
              cenarioA={chosenA}
              cenarioB={chosenB}
              cotaA={cotaA}
              cotaB={cotaB}
              modo={tipoComparador}
              cotasList={cotasList}
              onCenarioAChange={setChosenA}
              onCenarioBChange={setChosenB}
              onCotaAChange={setChosenCotaA}
              onCotaBChange={setChosenCotaB}
              showPoints={showPoints}
              isFullScreen={false}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
