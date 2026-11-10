"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { TrendingDown, Waves } from "lucide-react"
import { EVENTOS_SIMULACAO } from "@/lib/cenarios"
import { perdasEmDias } from "@/lib/comparativo"
import { fmtBRL } from "@/lib/formatos"
import { useComparativo } from "@/hooks/useComparativo"
import { NotasSimulacao } from "@/components/DanoEvitadoPainel"

const DIAS_PERDAS = 30 // mesmos 30 dias efetivos do Dano Evitado
const PRIMARY = "#1E404A"
const BRAND_GRADIENT = "linear-gradient(135deg, #1E404A 0%, #255362 100%)"
const CARD_BG = "rgba(255,255,255,0.55)"

function Cartao({
  titulo,
  icone,
  rotuloValor,
  valor,
  linhas,
  ajuda,
}: {
  titulo: string
  icone: React.ReactNode
  rotuloValor: string
  valor: string
  linhas: { rotulo: string; valor: string }[]
  ajuda: string
}) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg shadow-sm"
      title={ajuda}
      role="group"
      aria-label={`${titulo}: ${rotuloValor} ${valor}`}
    >
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
            ajuda="DaLA: produção e serviços interrompidos. Não se soma à exposição física."
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
              ajuda="Valor de reposição de tudo o que molha, 100% de cada ponto. Não é dano nem se soma às perdas."
            />
          ) : (
            <Cartao
              titulo="Danos Físicos"
              icone={<Waves size={12} strokeWidth={2.5} />}
              rotuloValor="Exposição (teto)"
              valor="—"
              linhas={[{ rotulo: "Indisponível", valor: "—" }]}
              ajuda="A exposição em R$ não passou na validação contra os totais do CLIMADA."
            />
          )}
        </div>
      )}
      <NotasSimulacao evento={evento} />
    </div>
  )
}
