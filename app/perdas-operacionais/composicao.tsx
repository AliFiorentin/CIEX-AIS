// Barra de composição das perdas operacionais (empresas, educação, saúde, agricultura), compartilhada pela análise por
// cenário e pelo bloco de intervenções.

/** Os campos de CenarioPerdas que compõem o total (também aceita o resultado de perdasEmDias convertido). */
export interface ComposicaoPerdas {
  empresas_vab: number
  educacao_perdas: number
  educacao_custo_adicional: number
  saude_producao: number
  agricultura_perdas: number
}

export const COMP_COLORS = {
  empresas: "#2563eb",
  educacao: "#16a34a",
  saude: "#dc2626",
  agricultura: "#6B8E23",
}

/** Barra de composição: segmentos proporcionais ocupando toda a largura disponível. */
export function CompositionBar({ v }: { v: ComposicaoPerdas }) {
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
  return (
    <div
      className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100"
      role="img"
      aria-label="Composição das perdas por componente"
    >
      {comps.map((c, i) => (
        <div
          key={i}
          style={{
            width: `${(c.value / total) * 100}%`,
            minWidth: 2,
            backgroundColor: c.color,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Legenda da barra de composição: quatro colunas, cada uma com ponto e nome, o valor em destaque e a parcela do total,
 * alinhadas à esquerda sob a barra (em duas colunas em telas estreitas).
 */
export function LegendaComposicao({
  itens,
  total,
  fmt,
}: {
  itens: { rotulo: string; valor: number; cor: string }[]
  total: number
  fmt: (v: number) => string
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
      {itens.map(({ rotulo, valor, cor }) => (
        <div key={rotulo} className="min-w-0">
          <dt className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: cor }}
            />
            {rotulo}
          </dt>
          <dd className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-sm font-black text-slate-800 tabular-nums">
              {fmt(valor)}
            </span>
            <span className="text-[10px] text-slate-400 tabular-nums">
              {total > 0
                ? `${((valor / total) * 100).toFixed(1).replace(".", ",")}%`
                : "0%"}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  )
}
