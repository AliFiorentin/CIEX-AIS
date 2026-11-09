"use client"

import { Section, DataTable, Note } from "@/components/doc-kit"
import { INTERVENCOES, type IntervencaoId } from "@/lib/cenarios"
import {
  formatarEvitado,
  perdasEmDias,
  perdasEvitadasEmDias,
  type Comparativo,
  type Indicadores,
} from "@/lib/comparativo"
import { AVISO_BASES } from "@/lib/avisos"
import { fmtBRL } from "@/lib/formatos"
import { CompositionBar } from "./composicao"

const COR_VARIANTE: Record<IntervencaoId, string> = {
  "sem-intervencao": "#64748b",
  diques: "#0891b2",
  "diques-barragens": "#0f766e",
}
const COR_TOM = { evitado: "#15803d", piora: "#b91c1c", neutro: "#64748b" } as const
// Eventos sem período DaLA próprio: usam os parâmetros de maio/2024 (premissa declarada na Metodologia).
const PREMISSA_DALA = new Set(["2023-11-29", "2025-06-28"])

const composicao = (ind: Indicadores, dias: number) => {
  const p = perdasEmDias(ind, dias)
  return {
    empresas_vab: p.empresas,
    educacao_perdas: p.educacao,
    educacao_custo_adicional: 0,
    saude_producao: p.saude,
    agricultura_perdas: p.agricultura,
  }
}

/**
 * Seção "Intervenções e dano evitado" de Perdas Operacionais: por evento, as perdas (R$) sem intervenção, com diques e
 * com diques + barragens, e quanto cada intervenção evita. Usa a duração selecionada na página (30/45/60 dias).
 */
export function IntervencoesPerdas({
  comparativo,
  dias,
}: {
  comparativo: Comparativo | null
  dias: number
}) {
  const eventos = comparativo ? Object.entries(comparativo.eventos) : []
  const maximo = Math.max(
    1,
    ...eventos.flatMap(([, ev]) => INTERVENCOES.map((i) => perdasEmDias(ev.variantes[i.id], dias).total))
  )

  return (
    <Section id="intervencoes" num="4" title="Intervenções e dano evitado">
      <Note type="info">
        <strong>Como ler.</strong> Para cada evento, compara a simulação <strong>sem intervenção</strong> (base) com{" "}
        <strong>diques</strong> e <strong>diques + barragens</strong>, na duração de {dias} dias efetivos selecionada
        acima. <em>Evitado = perdas sem intervenção − perdas com a intervenção</em>; verde evita, vermelho piora. São
        simulações do mesmo modelo, não previsão nem dado observado, e <strong>não são comparáveis</strong> aos
        cenários anteriores desta página (outro modelo). Perdas operacionais medem produção e serviços interrompidos e{" "}
        <strong>não se somam</strong> à exposição física dos Danos Físicos. Diferenças de poucos % entre diques e diques
        + barragens podem estar dentro da incerteza do modelo (não há estimativa de incerteza).
      </Note>

      {!comparativo ? (
        <Note type="warning">
          <strong>Dado ausente:</strong> não foi possível carregar o comparativo de dano evitado
          (intervencoes_comparativo.json).
        </Note>
      ) : (
        eventos.map(([id, ev]) => {
          const base = ev.variantes["sem-intervencao"]
          return (
            <div key={id} className="my-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-base font-black text-[#1E404A]">Simulação {ev.rotulo}</h3>
                {PREMISSA_DALA.has(id) && (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    parâmetros DaLA de maio/2024 (premissa)
                  </span>
                )}
              </div>

              <p className="mb-2 text-[10px] text-slate-500">{AVISO_BASES(Number(id.slice(0, 4)))}</p>
              <div className="mb-3 flex flex-col gap-2">
                {INTERVENCOES.map(({ id: vid, rotulo }) => {
                  const ind = ev.variantes[vid]
                  const total = perdasEmDias(ind, dias).total
                  return (
                    <div key={vid}>
                      <div className="flex items-baseline justify-between text-[11px]">
                        <span className="font-bold" style={{ color: COR_VARIANTE[vid] }}>
                          {rotulo}
                        </span>
                        <span className="font-black tabular-nums">{fmtBRL(total)}</span>
                      </div>
                      <div className="mt-0.5 h-2.5 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max((total / maximo) * 100, 0.5)}%`, backgroundColor: COR_VARIANTE[vid] }}
                        />
                      </div>
                      <div className="mt-1">
                        <CompositionBar v={composicao(ind, dias)} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <DataTable
                rows={[
                  ["Variante", "Perdas", "Evitado (R$)", "Evitado (%)", "Empresas", "Educação", "Saúde", "Agricultura"],
                  ...INTERVENCOES.map(({ id: vid, rotulo }) => {
                    const ind = ev.variantes[vid]
                    const p = perdasEmDias(ind, dias)
                    const e = vid === "sem-intervencao" ? null : perdasEvitadasEmDias(base, ind, dias)
                    const f = e ? formatarEvitado(e.valor, e.pct) : null
                    return [
                      <span key="v" className="font-bold" style={{ color: COR_VARIANTE[vid] }}>
                        {rotulo}
                      </span>,
                      fmtBRL(p.total),
                      e && f ? (
                        <span key="e" className="font-black" style={{ color: COR_TOM[f.tom] }}>
                          {e.valor < 0 ? "+" : e.valor > 0 ? "−" : ""}
                          {fmtBRL(Math.abs(e.valor))}
                        </span>
                      ) : (
                        "—"
                      ),
                      f ? (
                        <span key="p" style={{ color: COR_TOM[f.tom] }}>
                          {f.texto}
                        </span>
                      ) : (
                        "—"
                      ),
                      fmtBRL(p.empresas),
                      fmtBRL(p.educacao),
                      fmtBRL(p.saude),
                      fmtBRL(p.agricultura),
                    ]
                  }),
                ]}
              />
            </div>
          )
        })
      )}
    </Section>
  )
}
