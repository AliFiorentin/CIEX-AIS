"use client"

import Link from "next/link"
import {
  EVENTOS_SIMULACAO,
  INTERVENCOES,
  type IntervencaoId,
} from "@/lib/cenarios"
import {
  formatarEvitado,
  perdasEmDias,
  perdasEvitadasEmDias,
  type EvitadoValor,
  type Indicadores,
  type IntervencaoAtiva,
  type TomEvitado,
} from "@/lib/comparativo"
import { AVISO_BASES } from "@/lib/avisos"
import { fmtBRL, formatoBr } from "@/lib/formatos"
import { useComparativo } from "@/hooks/useComparativo"

const DIAS_PERDAS = 30 // dias efetivos de interrupção mostrados no Painel (a página de Perdas permite 30/45/60)

type Tipo = "ha" | "n" | "brl"
interface Cartao {
  rotulo: string
  tipo: Tipo
  /** Chave de `evitado` no JSON; null = calculado aqui (perdas em 30 dias). */
  chave: string | null
  valor: (i: Indicadores) => number | undefined
  ajuda?: string
}

const CARTOES: Cartao[] = [
  {
    rotulo: "Área atingida",
    tipo: "ha",
    chave: "area_ha",
    valor: (i) => i.area_ha,
  },
  {
    rotulo: "Empresas",
    tipo: "n",
    chave: "empresas",
    valor: (i) => i.empresas,
  },
  {
    rotulo: "Vínculos (RAIS)",
    tipo: "n",
    chave: "vinculos",
    valor: (i) => i.vinculos,
  },
  {
    rotulo: "Massa salarial mensal",
    tipo: "brl",
    chave: "massa_salarial",
    valor: (i) => i.massa_salarial,
  },
  { rotulo: "Escolas", tipo: "n", chave: "escolas", valor: (i) => i.escolas },
  {
    rotulo: "Alunos",
    tipo: "n",
    chave: "matriculas",
    valor: (i) => i.matriculas,
  },
  {
    rotulo: "Unidades de saúde",
    tipo: "n",
    chave: "unidades_saude",
    valor: (i) => i.unidades_saude,
  },
  {
    rotulo: "Patrimônio histórico",
    tipo: "n",
    chave: "patrimonio",
    valor: (i) => i.patrimonio,
  },
  {
    rotulo: "Ruas atingidas",
    tipo: "n",
    chave: "logradouros",
    valor: (i) => i.logradouros,
  },
  {
    rotulo: "Quadras atingidas",
    tipo: "n",
    chave: "quadras",
    valor: (i) => i.quadras,
  },
  {
    rotulo: `Perdas operacionais (${DIAS_PERDAS} dias)`,
    tipo: "brl",
    chave: null,
    valor: (i) => perdasEmDias(i, DIAS_PERDAS).total,
    ajuda:
      "DaLA: produção e serviços interrompidos. Não se soma à exposição física.",
  },
  {
    rotulo: "Exposição física (teto)",
    tipo: "brl",
    chave: "exposicao_total",
    valor: (i) => i.exposicao_total,
    ajuda:
      "Valor de reposição de tudo o que molha, 100% de cada ponto. Exposição evitada não é dano evitado.",
  },
]

const COR: Record<TomEvitado, string> = {
  evitado: "#15803d",
  piora: "#b91c1c",
  neutro: "#64748b",
}

function fmt(tipo: Tipo, v: number): string {
  return tipo === "ha"
    ? `${formatoBr(v, 1)} ha`
    : tipo === "brl"
      ? fmtBRL(v)
      : formatoBr(v, 0)
}

function Esqueleto() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      {[0, 1, 2, 3].map((k) => (
        <div
          key={k}
          className="h-14 animate-pulse rounded-lg bg-slate-200/70"
        />
      ))}
    </div>
  )
}

export function DanoEvitadoPainel({
  evento,
  intervencao,
}: {
  evento: string
  intervencao: IntervencaoId
}) {
  const { dados, carregando, erro } = useComparativo()
  const ev = EVENTOS_SIMULACAO.find((e) => e.nome === evento)
  const rotuloInterv =
    INTERVENCOES.find((i) => i.id === intervencao)?.rotulo ?? ""
  const dadosEv = ev && dados ? dados.eventos[ev.id] : undefined
  const ativa =
    intervencao === "sem-intervencao" ? null : (intervencao as IntervencaoAtiva)

  return (
    <div className="flex flex-col gap-2.5 text-slate-800">
      <div>
        <h3 className="text-sm font-black text-[#1E404A]">
          Dano evitado com {rotuloInterv}
        </h3>
        <p className="text-[10px] text-slate-500">
          em relação a <strong>Sem intervenção</strong> · {evento}
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2 text-[10px] leading-snug text-amber-900">
        <strong>Como ler.</strong> Compara duas simulações do mesmo modelo, não
        previsão nem dado observado (lâmina d&rsquo;água ≥{" "}
        {dados?.limiar_cm ?? 10} cm).{" "}
        <span style={{ color: COR.evitado }}>Verde</span> = evitado;{" "}
        <span style={{ color: COR.piora }}>vermelho</span> = a intervenção
        piora. Diferenças de poucos % entre diques e diques + barragens podem
        estar dentro da incerteza do modelo (não há estimativa de incerteza).
      </div>

      {erro ? (
        <p className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2 text-[11px] text-slate-600">
          Dado ausente: não foi possível carregar o comparativo de dano evitado.
        </p>
      ) : carregando ? (
        <Esqueleto />
      ) : !dadosEv || !ativa ? (
        <p className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2 text-[11px] text-slate-600">
          Dado ausente: sem comparativo para este cenário.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {CARTOES.filter(
            (c) => c.chave !== "exposicao_total" || dados?.exposicao_disponivel
          ).map((c) => {
            const base = c.valor(dadosEv.variantes["sem-intervencao"])
            const com = c.valor(dadosEv.variantes[ativa])
            if (base === undefined || com === undefined) return null
            const ev2: EvitadoValor =
              c.chave === null
                ? perdasEvitadasEmDias(
                    dadosEv.variantes["sem-intervencao"],
                    dadosEv.variantes[ativa],
                    DIAS_PERDAS
                  )
                : dadosEv.evitado[ativa][c.chave]
            const { texto, tom } = formatarEvitado(ev2.valor, ev2.pct)
            return (
              <div
                key={c.rotulo}
                className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-1.5"
                title={c.ajuda}
              >
                <div className="text-[9px] font-bold tracking-wide text-slate-500 uppercase">
                  {c.rotulo}
                </div>
                <div className="mt-0.5 grid grid-cols-[1fr_1fr_auto] items-baseline gap-2 text-[11px] tabular-nums">
                  <span>
                    <span className="text-[8px] text-slate-400">sem </span>
                    {fmt(c.tipo, base)}
                  </span>
                  <span>
                    <span className="text-[8px] text-slate-400">com </span>
                    {fmt(c.tipo, com)}
                  </span>
                  <span className="font-black" style={{ color: COR[tom] }}>
                    {tom === "piora" ? "+" : tom === "evitado" ? "−" : ""}
                    {fmt(c.tipo, Math.abs(ev2.valor))}{" "}
                    <span className="text-[9px]">({texto})</span>
                  </span>
                </div>
              </div>
            )
          })}
          <div className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-1.5 text-[10px] text-slate-500">
            <strong className="text-[9px] tracking-wide uppercase">
              População atingida
            </strong>
            <br />
            {dados?.populacao_disponivel
              ? "—"
              : "Não calculada para as simulações de intervenção."}
          </div>
        </div>
      )}

      {ev && (
        <p className="text-[9px] leading-snug text-slate-500">
          {AVISO_BASES(Number(ev.id.slice(0, 4)))}
        </p>
      )}
      <p className="text-[9px] leading-snug text-slate-500">
        Perdas com os parâmetros DaLA do evento
        {ev && ev.id !== "2023-09-29"
          ? " (maio/2024, premissa para este evento)"
          : ""}
        . Detalhes por evento em{" "}
        <Link href="/perdas-operacionais" className="font-bold underline">
          Perdas Operacionais
        </Link>
        ,{" "}
        <Link href="/danos-fisicos" className="font-bold underline">
          Danos Físicos
        </Link>{" "}
        e na{" "}
        <Link href="/metodologia#dano-evitado" className="font-bold underline">
          Metodologia
        </Link>
        .
      </p>
    </div>
  )
}
