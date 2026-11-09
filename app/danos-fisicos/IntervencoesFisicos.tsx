"use client"

import { Section, DataTable, Note } from "@/components/doc-kit"
import { INTERVENCOES, type IntervencaoId } from "@/lib/cenarios"
import {
  formatarEvitado,
  type Comparativo,
  type ComparativoEvento,
  type Indicadores,
  type IntervencaoAtiva,
} from "@/lib/comparativo"
import { AVISO_BASES } from "@/lib/avisos"
import { fmtBRL, formatoBr } from "@/lib/formatos"

// Faixas de profundidade (cm) do raster das simulações; as cores são as do mapa.
const FAIXAS: { chave: string; rotulo: string; cor: string }[] = [
  { chave: "10-44", rotulo: "10–44 cm", cor: "#b8a1d9" },
  { chave: "45-64", rotulo: "45–64 cm", cor: "#4b0082" },
  { chave: "65-84", rotulo: "65–84 cm", cor: "#00ffff" },
  { chave: "85-104", rotulo: "85–104 cm", cor: "#00ff00" },
  { chave: "105-124", rotulo: "105–124 cm", cor: "#ffff00" },
  { chave: "125-144", rotulo: "125–144 cm", cor: "#ff7f00" },
  { chave: "145+", rotulo: "≥ 145 cm", cor: "#ff0000" },
]
const COR_VARIANTE: Record<IntervencaoId, string> = {
  "sem-intervencao": "#64748b",
  diques: "#0891b2",
  "diques-barragens": "#0f766e",
}
const COR_TOM = {
  evitado: "#15803d",
  piora: "#b91c1c",
  neutro: "#64748b",
} as const

/** Valor atingido e, abaixo, o evitado pela intervenção (valor e %). */
function Celula({
  valor,
  evitado,
  brl,
}: {
  valor: number
  evitado?: { valor: number; pct: number | null }
  brl?: boolean
}) {
  const f = evitado ? formatarEvitado(evitado.valor, evitado.pct) : null
  const fmt = (v: number) => (brl ? fmtBRL(v) : formatoBr(v, 0))
  return (
    <span className="tabular-nums">
      {fmt(valor)}
      {evitado && f && (
        <span
          className="block text-[10px] font-bold"
          style={{ color: COR_TOM[f.tom] }}
        >
          {evitado.valor < 0 ? "+" : evitado.valor > 0 ? "−" : ""}
          {fmt(Math.abs(evitado.valor))} ({f.texto})
        </span>
      )}
    </span>
  )
}

function BarraFaixas({ ind, maximo }: { ind: Indicadores; maximo: number }) {
  return (
    <div
      className="flex h-3 overflow-hidden rounded-full bg-slate-100"
      role="img"
      aria-label="Área por faixa de profundidade"
    >
      {FAIXAS.map(({ chave, rotulo, cor }) => {
        const ha = ind.area_por_faixa_ha[chave] ?? 0
        return ha > 0 ? (
          <div
            key={chave}
            title={`${rotulo}: ${formatoBr(ha, 1)} ha`}
            style={{ width: `${(ha / maximo) * 100}%`, backgroundColor: cor }}
          />
        ) : null
      })}
    </div>
  )
}

/**
 * Seção "Intervenções e exposição evitada" de Danos Físicos: por evento, a exposição física (valor de reposição, um
 * teto) e os ativos atingidos sem intervenção, com diques e com diques + barragens, e a área por faixa de profundidade.
 */
export function IntervencoesFisicos({
  comparativo,
  num,
}: {
  comparativo: Comparativo | null
  num: number
}) {
  const exposicao = !!comparativo?.exposicao_disponivel
  return (
    <Section
      id="c-intervencoes"
      num={String(num)}
      title="Intervenções e exposição evitada"
    >
      <Note type="warning">
        <strong>Exposição evitada não é dano evitado.</strong> O valor é o de
        reposição de tudo o que fica sob a água, com 100% de cada ponto: um{" "}
        <strong>teto</strong> do dano, não uma estimativa. Sem a curva de dano
        em função da profundidade não há R$ de dano físico. Compara simulações
        do mesmo modelo (sem intervenção × diques × diques + barragens), não
        previsão nem dado observado; <strong>não se soma</strong> às Perdas
        Operacionais. Diferenças de poucos % entre diques e diques + barragens
        podem estar dentro da incerteza do modelo (não há estimativa de
        incerteza). Verde = evitado; vermelho = a intervenção piora.
      </Note>

      {!comparativo ? (
        <Note type="warning">
          <strong>Dado ausente:</strong> não foi possível carregar o comparativo
          (intervencoes_comparativo.json).
        </Note>
      ) : (
        <>
          {!exposicao && (
            <Note type="info">
              A exposição em R$ das simulações não está disponível; a tabela
              mostra só os ativos atingidos e a área.
            </Note>
          )}
          {Object.entries(comparativo.eventos).map(
            ([id, ev]: [string, ComparativoEvento]) => {
              const base = ev.variantes["sem-intervencao"]
              const maxHa = Math.max(
                1,
                ...INTERVENCOES.map((i) => ev.variantes[i.id].area_ha)
              )
              return (
                <div key={id} className="my-6">
                  <h3 className="mb-1 text-base font-black text-[#1E404A]">
                    Simulação {ev.rotulo}
                  </h3>
                  <p className="mb-2 text-[10px] text-slate-500">
                    {AVISO_BASES(Number(id.slice(0, 4)))}
                  </p>

                  <div className="mb-3 flex flex-col gap-2">
                    {INTERVENCOES.map(({ id: vid, rotulo }) => (
                      <div key={vid}>
                        <div className="flex items-baseline justify-between text-[11px]">
                          <span
                            className="font-bold"
                            style={{ color: COR_VARIANTE[vid] }}
                          >
                            {rotulo}
                          </span>
                          <span className="font-black tabular-nums">
                            {formatoBr(ev.variantes[vid].area_ha, 1)} ha
                          </span>
                        </div>
                        <BarraFaixas ind={ev.variantes[vid]} maximo={maxHa} />
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-600">
                      <span className="font-bold">Profundidade:</span>
                      {FAIXAS.map((f) => (
                        <span key={f.chave} className="flex items-center gap-1">
                          <span
                            className="inline-block h-2 w-2 rounded-sm"
                            style={{ backgroundColor: f.cor }}
                          />
                          {f.rotulo}
                        </span>
                      ))}
                    </div>
                  </div>

                  <DataTable
                    rows={[
                      [
                        "Variante",
                        ...(exposicao ? ["Exposição (teto)"] : []),
                        "Empresas",
                        "Escolas",
                        "Unid. de saúde",
                        "Patrimônio",
                        "Quadras",
                        "Ruas",
                      ],
                      ...INTERVENCOES.map(({ id: vid, rotulo }) => {
                        const ind = ev.variantes[vid]
                        const ativa =
                          vid === "sem-intervencao"
                            ? null
                            : (vid as IntervencaoAtiva)
                        const ed = (chave: string) =>
                          ativa ? ev.evitado[ativa][chave] : undefined
                        return [
                          <span
                            key="v"
                            className="font-bold"
                            style={{ color: COR_VARIANTE[vid] }}
                          >
                            {rotulo}
                          </span>,
                          ...(exposicao
                            ? [
                                <Celula
                                  key="x"
                                  valor={ind.exposicao_total ?? 0}
                                  evitado={ed("exposicao_total")}
                                  brl
                                />,
                              ]
                            : []),
                          <Celula
                            key="e"
                            valor={ind.empresas}
                            evitado={ed("empresas")}
                          />,
                          <Celula
                            key="s"
                            valor={ind.escolas}
                            evitado={ed("escolas")}
                          />,
                          <Celula
                            key="u"
                            valor={ind.unidades_saude}
                            evitado={ed("unidades_saude")}
                          />,
                          <Celula
                            key="p"
                            valor={ind.patrimonio}
                            evitado={ed("patrimonio")}
                          />,
                          <Celula
                            key="q"
                            valor={ind.quadras}
                            evitado={ed("quadras")}
                          />,
                          <Celula
                            key="r"
                            valor={ind.logradouros}
                            evitado={ed("logradouros")}
                          />,
                        ]
                      }),
                    ]}
                  />
                  {exposicao && (
                    <p className="text-[10px] text-slate-500">
                      Exposição sem intervenção: empresas{" "}
                      {fmtBRL(base.exposicao_empresas ?? 0)}, educação{" "}
                      {fmtBRL(base.exposicao_educacao ?? 0)}, saúde{" "}
                      {fmtBRL(base.exposicao_saude ?? 0)}.
                    </p>
                  )}
                </div>
              )
            }
          )}
        </>
      )}
    </Section>
  )
}
