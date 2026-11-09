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
