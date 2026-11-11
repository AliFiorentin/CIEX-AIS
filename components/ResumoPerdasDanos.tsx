"use client"

import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingDown, Waves } from "lucide-react"
import { EVENTOS_SIMULACAO } from "@/lib/cenarios"
import { perdasEmDias } from "@/lib/comparativo"
import { fmtBRL } from "@/lib/formatos"
import { useComparativo } from "@/hooks/useComparativo"
import { usePerdasCotas } from "@/hooks/usePerdasCotas"
import { perdasCotaEmDias } from "@/lib/cotas"
import type { DetalheCotaValores } from "@/lib/cotas-types"
import { NotasSimulacao } from "@/components/DanoEvitadoPainel"

const DIAS_PERDAS = 30 // mesmos 30 dias efetivos do Dano Evitado
const PRIMARY = "#1E404A"
const BRAND_GRADIENT = "linear-gradient(135deg, #1E404A 0%, #255362 100%)"
const CARD_BG = "rgba(255,255,255,0.55)"

export function Cartao({
  titulo,
  icone,
  rotuloValor,
  valor,
  linhas,
  ajuda,
  href,
}: {
  titulo: string
  icone: React.ReactNode
  rotuloValor: string
  valor: string
  linhas: { rotulo: string; valor: string }[]
  ajuda: string
  href?: string
}) {
  const corpo = (
    <>
      <div
        className="flex items-center gap-1.5 px-3 py-1.5"
        style={{ background: BRAND_GRADIENT }}
      >
        <span className="text-white">{icone}</span>
        <span className="text-[9px] font-black tracking-wide whitespace-nowrap text-white uppercase">
          {titulo}
        </span>
      </div>
      <div className="flex-1 px-3 py-2" style={{ backgroundColor: CARD_BG }}>
        <div className="text-[9px] font-bold tracking-wide text-slate-500 uppercase">
          {rotuloValor}
        </div>
        <div
          className="text-lg leading-tight font-black whitespace-nowrap tabular-nums"
          style={{ color: PRIMARY }}
        >
          {valor}
        </div>
        <dl className="mt-1.5 flex flex-col gap-0.5 border-t border-slate-200/80 pt-1.5">
          {linhas.map((l) => (
            <div
              key={l.rotulo}
              className="flex items-baseline justify-between gap-2 text-[9px] whitespace-nowrap tabular-nums"
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
        className="hover-lift flex h-full flex-col overflow-hidden rounded-lg shadow-sm transition-shadow"
        title={ajuda}
        aria-label={`${titulo}: ${rotuloValor} ${valor}`}
      >
        {corpo}
      </Link>
    )
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg shadow-sm"
      title={ajuda}
      role="group"
      aria-label={`${titulo}: ${rotuloValor} ${valor}`}
    >
      {corpo}
    </div>
  )
}

/**
 * Resumo de uma simulação sem intervenção: dois cartões, Perdas Operacionais (DaLA, 30 dias) e Danos Físicos (exposição,
 * um teto), com os valores do mesmo comparativo que alimenta Dano Evitado, e as mesmas notas do fim daquela aba.
 * Sem dado (carregando ou ausente), mostra só o esqueleto e depois nada além das notas.
 */
export function ResumoPerdasDanos({ evento }: { evento: string }) {
  const { dados, carregando } = useComparativo()
  const ev = EVENTOS_SIMULACAO.find((e) => e.nome === evento)
  const ind =
    ev && dados ? dados.eventos[ev.id]?.variantes["sem-intervencao"] : undefined

  if (carregando) {
    return (
      <div className="mb-2 grid grid-cols-2 gap-2" aria-busy="true">
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
      </div>
    )
  }

  const perdas = ind ? perdasEmDias(ind, DIAS_PERDAS) : undefined
  const temExposicao =
    !!dados?.exposicao_disponivel && ind?.exposicao_total !== undefined

  return (
    <div className="mb-2 flex flex-col gap-2">
      {ind && perdas && (
        <div className="grid grid-cols-2 gap-2">
          <Cartao
            titulo="Perdas Operacionais"
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
              icone={<Waves size={12} strokeWidth={2.5} />}
              rotuloValor="Exposição (teto)"
              valor={fmtBRL(ind.exposicao_total ?? 0)}
              linhas={[
                {
                  rotulo: "Empresas",
                  valor: fmtBRL(ind.exposicao_empresas ?? 0),
                },
                {
                  rotulo: "Educação",
                  valor: fmtBRL(ind.exposicao_educacao ?? 0),
                },
                { rotulo: "Saúde", valor: fmtBRL(ind.exposicao_saude ?? 0) },
              ]}
              ajuda="Valor de reposição de tudo o que molha, 100% de cada ponto. Não é dano nem se soma às perdas. Clique para ver detalhes."
              href="/danos-fisicos"
            />
          ) : (
            <Cartao
              titulo="Danos Físicos"
              icone={<Waves size={12} strokeWidth={2.5} />}
              rotuloValor="Exposição (teto)"
              valor="—"
              linhas={[{ rotulo: "Indisponível", valor: "—" }]}
              ajuda="A exposição em R$ não passou na validação contra os totais do CLIMADA."
              href="/danos-fisicos"
            />
          )}
        </div>
      )}
      <NotasSimulacao evento={evento} />
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
      <div className="grid grid-cols-2 gap-2" aria-busy="true">
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
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
    <div className="grid grid-cols-2 gap-2">
      {perdas ? (
        <Cartao
          titulo="Perdas Operacionais"
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
