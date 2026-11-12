"use client"

import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingDown, Waves } from "lucide-react"
import { EVENTOS_SIMULACAO, temIntervencao } from "@/lib/cenarios"
import { perdasEmDias } from "@/lib/comparativo"
import { fmtBRL } from "@/lib/formatos"
import { AVISO_MAIO_2024_MAIS_50 } from "@/lib/avisos"
import { useComparativo } from "@/hooks/useComparativo"
import { usePerdasOperacionais } from "@/hooks/usePerdasOperacionais"
import { usePerdasCotas } from "@/hooks/usePerdasCotas"
import { perdasCotaEmDias } from "@/lib/cotas"
import type { DetalheCotaValores } from "@/lib/cotas-types"
import { NotasSimulacao } from "@/components/DanoEvitadoPainel"
import { MetricInfoPopover } from "@/components/MetricInfoPopover"

const DIAS_PERDAS = 30 // mesmos 30 dias efetivos do Dano Evitado
const PRIMARY = "#1E404A"
const BRAND_GRADIENT = "linear-gradient(135deg, #1E404A 0%, #255362 100%)"
const CARD_BG = "rgba(255,255,255,0.72)"

export interface ExposicaoCenario {
  total: number
  empresas: number
  educacao: number
  saude: number
}

/**
 * Exposição física em R$ (valor de reposição de tudo o que molha, teto do dano físico) calculada com as mesmas
 * regras do CLIMADA (scripts/valor_reposicao.py) para os cenários fora das 12 simulações de intervenção.
 */
export const EXPOSICAO_CENARIOS_EXTRAS: Record<string, ExposicaoCenario> = {
  "Simulação de Maio de 2024 + 50%": {
    total: 1992973483.17,
    empresas: 1341411063.84,
    educacao: 284331138.21,
    saude: 367231281.12,
  },
  "Nível da Lagoa + Chuva Acumulada – 16/05/2024": {
    total: 1297577037.15,
    empresas: 1034766592.02,
    educacao: 217012688.73,
    saude: 45797756.40,
  },
}

export function Cartao({
  titulo,
  icone,
  rotuloValor,
  valor,
  linhas,
  ajuda,
  href,
  metricKey,
}: {
  titulo: string
  icone: React.ReactNode
  rotuloValor: string
  valor: string
  linhas: { rotulo: string; valor: string }[]
  ajuda: string
  href?: string
  metricKey?: string
}) {
  const corpo = (
    <>
      <div
        className="flex items-center justify-between px-2.5 py-1"
        style={{ background: BRAND_GRADIENT }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-white">{icone}</span>
          <span className="text-[9px] font-black tracking-wide whitespace-nowrap text-white uppercase">
            {titulo}
          </span>
        </div>
        {metricKey && (
          <MetricInfoPopover
            metricKey={metricKey}
            corIcone="#ffffff"
            iconSize={11}
          />
        )}
      </div>
      <div className="flex-1 px-2.5 py-1.5" style={{ backgroundColor: CARD_BG }}>
        <div className="text-[8.5px] font-bold tracking-wide text-slate-500 uppercase">
          {rotuloValor}
        </div>
        <div
          className="text-base leading-tight font-black whitespace-nowrap tabular-nums"
          style={{ color: PRIMARY }}
        >
          {valor}
        </div>
        <dl className="mt-1 flex flex-col gap-0.5 border-t border-slate-200/80 pt-1">
          {linhas.map((l) => (
            <div
              key={l.rotulo}
              className="flex items-baseline justify-between gap-2 text-[8.5px] whitespace-nowrap tabular-nums"
            >
              <dt className="text-slate-500">{l.rotulo}</dt>
              <dd className="font-bold text-slate-700">{l.valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="hover-lift flex h-full flex-col overflow-hidden rounded-xl border border-white/60 shadow-xs transition-all active:scale-[0.98]"
        title={ajuda}
        aria-label={`${titulo}: ${rotuloValor} ${valor}`}
      >
        {corpo}
      </Link>
    )
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl border border-white/60 shadow-xs"
      title={ajuda}
      role="group"
      aria-label={`${titulo}: ${rotuloValor} ${valor}`}
    >
      {corpo}
    </div>
  )
}

/**
 * Notas e avisos metodológicos do cenário (ex: DaLA, aviso de +50%, ou bases/parâmetros em intervenção).
 * Posicionado no final do painel para manter os dados principais acima da dobra sem rolagem.
 */
export function NotasResumoCenario({ evento }: { evento: string }) {
  const ehIntervencao = temIntervencao(evento)
  if (ehIntervencao) {
    return (
      <div className="mt-1 flex flex-col gap-1 text-[8.5px] leading-snug text-slate-500">
        <NotasSimulacao evento={evento} />
      </div>
    )
  }
  return (
    <div className="mt-1 flex flex-col gap-1 text-[8.5px] leading-snug text-slate-500">
      {evento === "Simulação de Maio de 2024 + 50%" && (
        <p>{AVISO_MAIO_2024_MAIS_50}</p>
      )}
      <p>
        Perdas com os parâmetros DaLA do cenário ({DIAS_PERDAS} dias
        efetivos). Detalhes em{" "}
        <Link href="/perdas-operacionais" className="font-bold underline">
          Perdas Operacionais
        </Link>{" "}
        e na{" "}
        <Link href="/metodologia#danos" className="font-bold underline">
          Metodologia
        </Link>
        .
      </p>
    </div>
  )
}

/**
 * Resumo de uma simulação sem intervenção: dois cartões, Perdas Operacionais (DaLA, 30 dias) e Danos Físicos (exposição,
 * um teto), com os valores do mesmo comparativo que alimenta Dano Evitado.
 * Sem dado (carregando ou ausente), mostra só o esqueleto.
 */
export function ResumoPerdasDanos({
  evento,
  mostrarAvisos = false,
}: {
  evento: string
  mostrarAvisos?: boolean
}) {
  const { dados, carregando: carregandoComp } = useComparativo()
  const { perdas: perdasOp, carregando: carregandoOp } = usePerdasOperacionais()
  const ehIntervencao = temIntervencao(evento)

  if (ehIntervencao ? carregandoComp : carregandoOp) {
    return (
      <div className="mb-1.5 grid grid-cols-2 gap-1.5" aria-busy="true">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    )
  }

  const ev = ehIntervencao
    ? EVENTOS_SIMULACAO.find((e) => e.nome === evento)
    : undefined
  const ind =
    ev && dados ? dados.eventos[ev.id]?.variantes["sem-intervencao"] : undefined

  const cenarioPerdas =
    !ehIntervencao && perdasOp ? perdasOp[evento] : undefined

  const perdas = ind
    ? perdasEmDias(ind, DIAS_PERDAS)
    : cenarioPerdas
      ? (() => {
          const s = DIAS_PERDAS / cenarioPerdas.dias_efetivos
          const emp = cenarioPerdas.empresas_vab * s
          const edu =
            (cenarioPerdas.educacao_perdas +
              cenarioPerdas.educacao_custo_adicional) *
            s
          const sau = cenarioPerdas.saude_producao * s
          const agr = cenarioPerdas.agricultura_perdas
          return {
            empresas: emp,
            educacao: edu,
            saude: sau,
            agricultura: agr,
            total: emp + edu + sau + agr,
          }
        })()
      : undefined

  const expoExtra = EXPOSICAO_CENARIOS_EXTRAS[evento]
  const temExposicao =
    (ehIntervencao &&
      !!dados?.exposicao_disponivel &&
      ind?.exposicao_total !== undefined) ||
    !!expoExtra

  const exposicaoTotal = ind?.exposicao_total ?? expoExtra?.total ?? 0
  const exposicaoEmpresas = ind?.exposicao_empresas ?? expoExtra?.empresas ?? 0
  const exposicaoEducacao = ind?.exposicao_educacao ?? expoExtra?.educacao ?? 0
  const exposicaoSaude = ind?.exposicao_saude ?? expoExtra?.saude ?? 0

  const ajudaExposicaoIndisponivel = ehIntervencao
    ? "A exposição em R$ não passou na validação contra os totais do CLIMADA."
    : "Exposição física em R$ não modelada para este cenário no CLIMADA. Clique para ver as cotas."

  return (
    <div className="mb-1.5 flex flex-col gap-1.5">
      {perdas && (
        <div className="grid grid-cols-2 gap-1.5">
          <Cartao
            titulo="Perdas Operacionais"
            metricKey="perdas_operacionais"
            icone={<TrendingDown size={12} strokeWidth={2.5} />}
            rotuloValor={`Total (${DIAS_PERDAS} dias)`}
            valor={fmtBRL(perdas.total)}
            linhas={[
              { rotulo: "Empresas", valor: fmtBRL(perdas.empresas) },
              { rotulo: "Educação", valor: fmtBRL(perdas.educacao) },
              { rotulo: "Saúde", valor: fmtBRL(perdas.saude) },
              { rotulo: "Agricultura", valor: fmtBRL(perdas.agricultura) },
            ]}
            ajuda="DaLA: produção e serviços interrompidos. Não se soma à exposição física. Clique para ver detalhes."
            href="/perdas-operacionais"
          />
          {temExposicao ? (
            <Cartao
              titulo="Danos Físicos"
              metricKey="danos_fisicos"
              icone={<Waves size={12} strokeWidth={2.5} />}
              rotuloValor="Exposição (teto)"
              valor={fmtBRL(exposicaoTotal)}
              linhas={[
                {
                  rotulo: "Empresas",
                  valor: fmtBRL(exposicaoEmpresas),
                },
                {
                  rotulo: "Educação",
                  valor: fmtBRL(exposicaoEducacao),
                },
                { rotulo: "Saúde", valor: fmtBRL(exposicaoSaude) },
              ]}
              ajuda="Valor de reposição de tudo o que molha, 100% de cada ponto. Não é dano nem se soma às perdas. Clique para ver detalhes."
              href="/danos-fisicos"
            />
          ) : (
            <Cartao
              titulo="Danos Físicos"
              metricKey="danos_fisicos"
              icone={<Waves size={12} strokeWidth={2.5} />}
              rotuloValor="Exposição (teto)"
              valor="—"
              linhas={[{ rotulo: "Indisponível", valor: "—" }]}
              ajuda={ajudaExposicaoIndisponivel}
              href="/danos-fisicos"
            />
          )}
        </div>
      )}
      {mostrarAvisos && <NotasResumoCenario evento={evento} />}
    </div>
  )
}

/**
 * Os mesmos dois cartões na aba "Por cota" (Simulação por Cotas), na cota em exibição: Perdas Operacionais (DaLA, 30 dias
 * efetivos, de perdas_cotas.json) e Danos Físicos (exposição sob água na cota, de climada_cota_detalhe). `chave` é a
 * cota atingida no formato de `por_cota` (null = abaixo da menor cota: nada molhado, tudo zero) e `exposicao` os valores
 * dessa cota. Sem profundidade nas cotas, Danos Físicos é só exposição, nunca dano em R$.
 */
export function ResumoPerdasDanosCota({
  chave,
  exposicao,
}: {
  chave: string | null
  exposicao: DetalheCotaValores | null
}) {
  const { perdas: porCota, erro } = usePerdasCotas()
  if (!porCota && !erro) {
    return (
      <div className="grid grid-cols-2 gap-1.5" aria-busy="true">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    )
  }
  const p = porCota && chave ? porCota[chave] : null
  const perdas = p
    ? perdasCotaEmDias(p, DIAS_PERDAS)
    : porCota
      ? { empresas: 0, educacao: 0, saude: 0, agricultura: 0, total: 0 }
      : null
  const expEmp = exposicao?.empresas.valor_exposto_brl ?? 0
  const expEdu = exposicao?.educacao.valor_exposto_brl ?? 0
  const expSau = exposicao?.saude.valor_exposto_brl ?? 0

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {perdas ? (
        <Cartao
          titulo="Perdas Operacionais"
          metricKey="perdas_operacionais"
          icone={<TrendingDown size={12} strokeWidth={2.5} />}
          rotuloValor={`Total (${DIAS_PERDAS} dias)`}
          valor={fmtBRL(perdas.total)}
          linhas={[
            { rotulo: "Empresas", valor: fmtBRL(perdas.empresas) },
            { rotulo: "Educação", valor: fmtBRL(perdas.educacao) },
            { rotulo: "Saúde", valor: fmtBRL(perdas.saude) },
            { rotulo: "Agricultura", valor: fmtBRL(perdas.agricultura) },
          ]}
          ajuda="DaLA: produção e serviços interrompidos nos pontos sob a água nesta cota (período de Maio de 2024, 30 dias efetivos). Não se soma à exposição física. Clique para ver detalhes."
          href="/perdas-operacionais"
        />
      ) : (
        <Cartao
          titulo="Perdas Operacionais"
          metricKey="perdas_operacionais"
          icone={<TrendingDown size={12} strokeWidth={2.5} />}
          rotuloValor={`Total (${DIAS_PERDAS} dias)`}
          valor="—"
          linhas={[{ rotulo: "Indisponível", valor: "—" }]}
          ajuda="Não foi possível carregar as perdas por cota (perdas_cotas.json)."
          href="/perdas-operacionais"
        />
      )}
      <Cartao
        titulo="Danos Físicos"
        metricKey="danos_fisicos"
        icone={<Waves size={12} strokeWidth={2.5} />}
        rotuloValor="Exposição (cota)"
        valor={fmtBRL(expEmp + expEdu + expSau)}
        linhas={[
          { rotulo: "Empresas", valor: fmtBRL(expEmp) },
          { rotulo: "Educação", valor: fmtBRL(expEdu) },
          { rotulo: "Saúde", valor: fmtBRL(expSau) },
        ]}
        ajuda="Valor de reposição de tudo o que está sob a água nesta cota, 100% de cada ponto. Não é dano (sem profundidade) nem se soma às perdas. Clique para ver detalhes."
        href="/danos-fisicos"
      />
    </div>
  )
}
