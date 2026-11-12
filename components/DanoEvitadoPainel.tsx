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
  type Comparativo,
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
// "aba" = só aparece no bloco de diferença das outras abas do Painel (DiferencaAba), não no Dano Evitado.
type Grupo =
  "destaque" | "territorio" | "economia" | "servicos" | "exposicao" | "aba"
interface Cartao {
  id: string
  rotulo: string
  grupo: Grupo
  tipo: Tipo
  /** Chave de `evitado` no JSON; null = calculado aqui (perdas em dias efetivos). */
  chave: string | null
  valor: (i: Indicadores) => number | undefined
  ajuda?: string
}

const perdas = (i: Indicadores) => perdasEmDias(i, DIAS_PERDAS)

const CARTOES: Cartao[] = [
  {
    id: "area_ha",
    rotulo: "Área atingida",
    grupo: "destaque",
    tipo: "ha",
    chave: "area_ha",
    valor: (i) => i.area_ha,
  },
  {
    id: "populacao",
    rotulo: "População atingida",
    grupo: "destaque",
    tipo: "n",
    chave: "populacao",
    valor: (i) => i.populacao,
    ajuda:
      "Soma do raster de população WorldPop 2024 (100 m) dentro da mancha e do limite municipal. É população residente modelada, não contagem.",
  },
  {
    id: "perdas_total",
    rotulo: `Perdas (${DIAS_PERDAS} dias)`,
    grupo: "destaque",
    tipo: "brl",
    chave: null,
    valor: (i) => perdas(i).total,
    ajuda:
      "DaLA: produção e serviços interrompidos. Não se soma à exposição física.",
  },
  {
    id: "logradouros",
    rotulo: "Ruas atingidas",
    grupo: "territorio",
    tipo: "n",
    chave: "logradouros",
    valor: (i) => i.logradouros,
  },
  {
    id: "quadras",
    rotulo: "Quadras atingidas",
    grupo: "territorio",
    tipo: "n",
    chave: "quadras",
    valor: (i) => i.quadras,
  },
  {
    id: "terrenos",
    rotulo: "Terrenos atingidos",
    grupo: "territorio",
    tipo: "n",
    chave: "terrenos",
    valor: (i) => i.terrenos,
  },
  {
    id: "cobertura_ha",
    rotulo: "Cobertura da terra atingida",
    grupo: "territorio",
    tipo: "ha",
    chave: "cobertura_ha",
    valor: (i) => i.cobertura_ha,
    ajuda:
      "Área das classes de uso e cobertura da terra (MapBiomas) sob a água.",
  },
  {
    id: "empresas",
    rotulo: "Empresas",
    grupo: "economia",
    tipo: "n",
    chave: "empresas",
    valor: (i) => i.empresas,
  },
  {
    id: "vinculos",
    rotulo: "Vínculos (RAIS)",
    grupo: "economia",
    tipo: "n",
    chave: "vinculos",
    valor: (i) => i.vinculos,
  },
  {
    id: "massa_salarial",
    rotulo: "Massa salarial mensal",
    grupo: "economia",
    tipo: "brl",
    chave: "massa_salarial",
    valor: (i) => i.massa_salarial,
  },
  {
    id: "escolas",
    rotulo: "Escolas",
    grupo: "servicos",
    tipo: "n",
    chave: "escolas",
    valor: (i) => i.escolas,
  },
  {
    id: "matriculas",
    rotulo: "Alunos",
    grupo: "servicos",
    tipo: "n",
    chave: "matriculas",
    valor: (i) => i.matriculas,
  },
  {
    id: "unidades_saude",
    rotulo: "Unidades de saúde",
    grupo: "servicos",
    tipo: "n",
    chave: "unidades_saude",
    valor: (i) => i.unidades_saude,
  },
  {
    id: "patrimonio",
    rotulo: "Patrimônio histórico",
    grupo: "servicos",
    tipo: "n",
    chave: "patrimonio",
    valor: (i) => i.patrimonio,
  },
  {
    id: "exposicao_total",
    rotulo: "Exposição física (teto)",
    grupo: "exposicao",
    tipo: "brl",
    chave: "exposicao_total",
    valor: (i) => i.exposicao_total,
    ajuda:
      "Valor de reposição de tudo o que molha, 100% de cada ponto. Exposição evitada não é dano evitado.",
  },
  // Só nas outras abas do Painel
  {
    id: "agricultura_ha",
    rotulo: "Área agrícola atingida",
    grupo: "aba",
    tipo: "ha",
    chave: "agricultura_ha",
    valor: (i) => i.agricultura_ha,
    ajuda:
      "Lavouras sob a água, depois do filtro de ruído de 0,5 ha. Nas simulações nenhum fragmento passa do filtro.",
  },
  {
    id: "perdas_empresas",
    rotulo: `Perdas das empresas (${DIAS_PERDAS} dias)`,
    grupo: "aba",
    tipo: "brl",
    chave: null,
    valor: (i) => perdas(i).empresas,
  },
  {
    id: "perdas_educacao",
    rotulo: `Perdas da educação (${DIAS_PERDAS} dias)`,
    grupo: "aba",
    tipo: "brl",
    chave: null,
    valor: (i) => perdas(i).educacao,
  },
  {
    id: "perdas_saude",
    rotulo: `Perdas da saúde (${DIAS_PERDAS} dias)`,
    grupo: "aba",
    tipo: "brl",
    chave: null,
    valor: (i) => perdas(i).saude,
  },
  {
    id: "perdas_agricultura",
    rotulo: `Perdas agrícolas (${DIAS_PERDAS} dias)`,
    grupo: "aba",
    tipo: "brl",
    chave: null,
    valor: (i) => perdas(i).agricultura,
  },
  {
    id: "exposicao_empresas",
    rotulo: "Exposição das empresas (teto)",
    grupo: "aba",
    tipo: "brl",
    chave: "exposicao_empresas",
    valor: (i) => i.exposicao_empresas,
  },
  {
    id: "exposicao_educacao",
    rotulo: "Exposição da educação (teto)",
    grupo: "aba",
    tipo: "brl",
    chave: "exposicao_educacao",
    valor: (i) => i.exposicao_educacao,
  },
  {
    id: "exposicao_saude",
    rotulo: "Exposição da saúde (teto)",
    grupo: "aba",
    tipo: "brl",
    chave: "exposicao_saude",
    valor: (i) => i.exposicao_saude,
  },
]

const GRUPOS: { id: Grupo; titulo: string }[] = [
  { id: "destaque", titulo: "" },
  { id: "territorio", titulo: "Território" },
  { id: "economia", titulo: "Economia" },
  { id: "servicos", titulo: "Serviços e patrimônio" },
  { id: "exposicao", titulo: "Valor de reposição" },
]

/** Abas do Painel (valor de `tabAtiva`) -> indicadores mostrados no bloco de diferença. */
export type AbaComDiferenca =
  | "empresas"
  | "saude"
  | "educacao"
  | "patrimonio"
  | "infra"
  | "agricultura"
  | "cobertura"

const IDS_POR_ABA: Record<AbaComDiferenca, string[]> = {
  empresas: [
    "empresas",
    "vinculos",
    "massa_salarial",
    "perdas_empresas",
    "exposicao_empresas",
  ],
  saude: ["unidades_saude", "perdas_saude", "exposicao_saude"],
  educacao: ["escolas", "matriculas", "perdas_educacao", "exposicao_educacao"],
  patrimonio: ["patrimonio"],
  infra: ["logradouros", "quadras", "terrenos"],
  agricultura: ["agricultura_ha", "perdas_agricultura"],
  cobertura: ["cobertura_ha"],
}

const COR: Record<TomEvitado, string> = {
  evitado: "#15803d",
  piora: "#b91c1c",
  neutro: "#64748b",
}
const FUNDO: Record<TomEvitado, string> = {
  evitado: "#dcfce7",
  piora: "#fee2e2",
  neutro: "#f1f5f9",
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
    <div className="grid grid-cols-2 gap-2" aria-busy="true">
      {[0, 1, 2, 3].map((k) => (
        <div
          key={k}
          className="h-20 animate-pulse rounded-xl bg-slate-200/70"
        />
      ))}
    </div>
  )
}

interface Linha {
  c: Cartao
  base: number
  com: number
  evitado: EvitadoValor
}

/** Linhas (indicador, sem, com, evitado) de um evento e uma intervenção; pula o que não existe nos dados. */
function montarLinhas(
  dados: Comparativo,
  eventoId: string,
  ativa: IntervencaoAtiva,
  cartoes: Cartao[]
): Linha[] {
  const ev = dados.eventos[eventoId]
  if (!ev) return []
  const sem = ev.variantes["sem-intervencao"]
  const com = ev.variantes[ativa]
  return cartoes.flatMap((c) => {
    if (c.chave === "exposicao_total" && !dados.exposicao_disponivel) return []
    const b = c.valor(sem)
    const v = c.valor(com)
    if (b === undefined || v === undefined) return []
    const evitado: EvitadoValor =
      c.id === "perdas_total"
        ? perdasEvitadasEmDias(sem, com, DIAS_PERDAS)
        : c.chave === null
          ? {
              valor: b - v,
              pct: b === 0 ? null : (b - v) / b,
            }
          : ev.evitado[ativa][c.chave]
    if (!evitado) return []
    return [{ c, base: b, com: v, evitado }]
  })
}

/** Um indicador: valor evitado em destaque, percentual em selo e barra "o que sobra com a intervenção". */
function Indicador({
  c: cartao,
  base,
  com,
  evitado,
  destaque,
  larguraTotal,
}: Linha & { destaque: boolean; larguraTotal?: boolean }) {
  const { texto, tom } = formatarEvitado(evitado.valor, evitado.pct)
  const sinal = tom === "piora" ? "+" : tom === "evitado" ? "−" : ""
  // Barra: trilho = situação sem intervenção; preenchimento = a parcela evitada (o mesmo % do selo), verde se evita e
  // vermelho se a intervenção piora (limitada a 100%).
  const fracao =
    evitado.pct === null || !Number.isFinite(evitado.pct)
      ? 0
      : Math.min(Math.abs(evitado.pct), 1)
  const resumo = `${cartao.rotulo}: sem intervenção ${fmt(cartao.tipo, base)}, com intervenção ${fmt(cartao.tipo, com)}; ${tom === "neutro" ? "sem diferença" : `${tom === "evitado" ? "evitado" : "piora de"} ${fmt(cartao.tipo, Math.abs(evitado.valor))}`}${texto === "—" ? "" : ` (${texto})`}`

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white/85 shadow-xs hover-lift transition-all ${larguraTotal ? "col-span-2" : "[&:last-child:nth-child(odd)]:col-span-2"} ${destaque ? "px-3 py-2.5" : "px-2.5 py-2"}`}
      title={cartao.ajuda}
      aria-label={resumo}
      role="group"
    >
      <div className="text-[9px] leading-tight font-bold tracking-wide text-slate-500 uppercase">
        {cartao.rotulo}
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className={`leading-none font-black tabular-nums ${destaque ? "text-xl" : "text-[15px]"}`}
          style={{ color: COR[tom] }}
        >
          {sinal}
          {fmt(cartao.tipo, Math.abs(evitado.valor))}
        </span>
        {texto !== "—" && (
          <span
            className="rounded-full px-1.5 py-px text-[9px] leading-tight font-black tabular-nums"
            style={{ color: COR[tom], backgroundColor: FUNDO[tom] }}
          >
            {texto}
          </span>
        )}
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${fracao * 100}%`,
            backgroundColor: COR[tom],
          }}
        />
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-2 text-[9px] whitespace-nowrap text-slate-500 tabular-nums">
        <span>
          sem{" "}
          <strong className="text-slate-700">{fmt(cartao.tipo, base)}</strong>
        </span>
        <span>
          com{" "}
          <strong className="text-slate-700">{fmt(cartao.tipo, com)}</strong>
        </span>
      </div>
    </div>
  )
}

/**
 * Bloco de diferença no topo das outras abas do Painel (Empresas, Saúde, Educação, Patrimônio, Infraestrutura,
 * Agricultura, Cobertura) quando há uma intervenção escolhida: o que a intervenção evita nos indicadores da aba,
 * em relação a "Sem intervenção" do mesmo evento. Sem dado, não mostra nada (a aba continua como estava).
 */
export function DiferencaAba({
  aba,
  evento,
  intervencao,
}: {
  aba: AbaComDiferenca
  evento: string
  intervencao: IntervencaoId
}) {
  const { dados, carregando } = useComparativo()
  const ev = EVENTOS_SIMULACAO.find((e) => e.nome === evento)
  if (!ev || intervencao === "sem-intervencao") return null
  const ativa = intervencao as IntervencaoAtiva
  const rotulo = INTERVENCOES.find((i) => i.id === intervencao)?.rotulo ?? ""
  const ids = IDS_POR_ABA[aba]
  const linhas = dados
    ? montarLinhas(
        dados,
        ev.id,
        ativa,
        ids.flatMap((id) => CARTOES.filter((c) => c.id === id))
      )
    : []
  if (!carregando && linhas.length === 0) return null

  return (
    <section
      className="mb-3 flex flex-col gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2"
      aria-label={`Diferença com ${rotulo}`}
    >
      <h4 className="flex items-baseline justify-between gap-2 text-[10px] font-black text-[#1E404A]">
        <span>Diferença com {rotulo}</span>
        <span className="text-[9px] font-medium text-slate-500">
          vs Sem intervenção
        </span>
      </h4>
      {carregando ? (
        <div
          className="h-16 animate-pulse rounded-lg bg-slate-200/70"
          aria-busy="true"
        />
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {linhas.map((l) => (
            <Indicador key={l.c.id} {...l} destaque={false} />
          ))}
        </div>
      )}
      <p className="text-[9px] leading-snug text-slate-500">
        Simulação do modelo, não dado observado. O restante da aba mostra a
        simulação com a intervenção; o resumo completo está em Dano Evitado.
      </p>
    </section>
  )
}

/**
 * Notas do fim do Painel nas simulações: defasagem das bases, parâmetros DaLA do evento e links para Perdas Operacionais,
 * Danos Físicos e Metodologia. Usada no fim de Dano Evitado e do Resumo (sem intervenção).
 */
export function NotasSimulacao({ evento }: { evento: string }) {
  const ev = EVENTOS_SIMULACAO.find((e) => e.nome === evento)
  if (!ev) return null
  return (
    <>
      <p className="text-[9px] leading-snug text-slate-500">
        {AVISO_BASES(Number(ev.id.slice(0, 4)))}
      </p>
      <p className="text-[9px] leading-snug text-slate-500">
        Perdas com os parâmetros DaLA do evento
        {ev.id === "2023-11-29" || ev.id === "2025-06-28"
          ? " (dias de interrupção interpolados pela área atingida: estimativa, sem parâmetros próprios para este evento)"
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
    </>
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
  const ativa =
    intervencao === "sem-intervencao" ? null : (intervencao as IntervencaoAtiva)
  const dadosEv = ev && dados ? dados.eventos[ev.id] : undefined

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
        piora. O selo e a barra mostram a parcela evitada em relação ao cenário
        sem intervenção. Diferenças de poucos % entre diques e diques +
        barragens podem estar dentro da incerteza do modelo (não há estimativa
        de incerteza).
      </div>

      {erro ? (
        <p className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2 text-[11px] text-slate-600">
          Dado ausente: não foi possível carregar o comparativo de dano evitado.
        </p>
      ) : carregando ? (
        <Esqueleto />
      ) : !dados || !dadosEv || !ev || !ativa ? (
        <p className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2 text-[11px] text-slate-600">
          Dado ausente: sem comparativo para este cenário.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {GRUPOS.map((g) => {
            const linhas = montarLinhas(
              dados,
              ev.id,
              ativa,
              CARTOES.filter((c) => c.grupo === g.id)
            )
            if (linhas.length === 0) return null
            return (
              <section key={g.id} className="flex flex-col gap-1.5">
                {g.titulo && (
                  <h4 className="flex items-center gap-2 text-[9px] font-black tracking-wider text-slate-500 uppercase after:h-px after:flex-1 after:bg-slate-300/70">
                    {g.titulo}
                  </h4>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  {linhas.map((l) => (
                    <Indicador
                      key={l.c.id}
                      {...l}
                      destaque={g.id === "destaque"}
                      larguraTotal={l.c.id === "perdas_total"}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <NotasSimulacao evento={evento} />
    </div>
  )
}
