// Diagramas da visão geral da Metodologia (aprovados em 2026-11-09): do dado ao indicador e do indicador ao dano evitado.
// SVG puro, sem dependências; as caixas e setas seguem a paleta do painel.

type Tom = "entrada" | "etapa" | "resultado"

const TOM: Record<
  Tom,
  { fill: string; stroke: string; titulo: string; sub: string }
> = {
  entrada: {
    fill: "#f1f5f9",
    stroke: "#94a3b8",
    titulo: "#334155",
    sub: "#64748b",
  },
  etapa: {
    fill: "#e6f1f4",
    stroke: "#3d7a94",
    titulo: "#1E404A",
    sub: "#3d6b78",
  },
  resultado: {
    fill: "#1E404A",
    stroke: "#1E404A",
    titulo: "#ffffff",
    sub: "#cfe0e5",
  },
}

function Caixa({
  x,
  y,
  w,
  h = 56,
  titulo,
  sub,
  tom,
}: {
  x: number
  y: number
  w: number
  h?: number
  titulo: string
  sub?: string
  tom: Tom
}) {
  const c = TOM[tom]
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={0.75}
      />
      <text
        x={x + w / 2}
        y={sub ? y + 19 : y + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14}
        fontWeight={600}
        fill={c.titulo}
      >
        {titulo}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + 38}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12}
          fill={c.sub}
        >
          {sub}
        </text>
      )}
    </g>
  )
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX={8}
        refY={5}
        markerWidth={6}
        markerHeight={6}
        orient="auto-start-reverse"
      >
        <path
          d="M2 1L8 5L2 9"
          fill="none"
          stroke="#64748b"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </marker>
    </defs>
  )
}

function Seta({
  id,
  x,
  y1,
  y2,
}: {
  id: string
  x: number
  y1: number
  y2: number
}) {
  return (
    <line
      x1={x}
      y1={y1}
      x2={x}
      y2={y2}
      stroke="#64748b"
      strokeWidth={1.5}
      markerEnd={`url(#${id})`}
    />
  )
}

const COLUNAS = [40, 194, 348, 502] as const
const LARG = 138
const CENTRO = COLUNAS.map((x) => x + LARG / 2)

const TRILHAS: { titulo: string; sub: string }[][] = [
  [
    { titulo: "Rasters", sub: "6 bacias, TELEMAC" },
    { titulo: "Mosaico", sub: "maior profundidade" },
    { titulo: "Mancha", sub: "lâmina ≥ 10 cm" },
  ],
  [
    { titulo: "Cadastros", sub: "RAIS, INEP, CNES" },
    { titulo: "Geocodificar", sub: "endereço em ponto" },
    { titulo: "Pontos", sub: "dentro do município" },
  ],
  [
    { titulo: "Território", sub: "ruas e quadras" },
    { titulo: "Uso do solo", sub: "MapBiomas 2024" },
    { titulo: "Polígonos", sub: "sem ruído < 0,5 ha" },
  ],
  [
    { titulo: "População", sub: "raster de 100 m" },
    { titulo: "Recorte", sub: "limite municipal" },
    { titulo: "Pixels", sub: "habitantes por pixel" },
  ],
]
const LINHAS_Y = [40, 126, 212]
const SETORES = ["Empresas", "Serviços", "Território", "População"]

/** Parte 1: das quatro trilhas de dados ao cruzamento espacial e aos indicadores por setor. */
export function DiagramaDadoAoIndicador() {
  const id = "seta-dado-indicador"
  return (
    <svg
      viewBox="0 0 680 540"
      className="w-full"
      role="img"
      aria-label="Do dado ao indicador: quatro trilhas de dados (simulações, cadastros, território e população) passam por etapas de preparação, convergem no cruzamento espacial e geram indicadores por setor."
    >
      <Defs id={id} />
      {TRILHAS.map((trilha, c) =>
        trilha.map((p, r) => (
          <g key={`${c}-${r}`}>
            <Caixa
              x={COLUNAS[c]}
              y={LINHAS_Y[r]}
              w={LARG}
              titulo={p.titulo}
              sub={p.sub}
              tom={r === 0 ? "entrada" : "etapa"}
            />
            <Seta
              id={id}
              x={CENTRO[c]}
              y1={LINHAS_Y[r] + 56}
              y2={r < 2 ? LINHAS_Y[r + 1] - 2 : 296}
            />
          </g>
        ))
      )}
      <Caixa
        x={40}
        y={298}
        w={600}
        titulo="Cruzamento espacial"
        sub="o que está dentro ou toca a mancha"
        tom="resultado"
      />
      <Seta id={id} x={340} y1={354} y2={382} />
      <Caixa
        x={40}
        y={384}
        w={600}
        titulo="Indicadores por setor e por cenário"
        sub="contagens, áreas, população e valores"
        tom="resultado"
      />
      {SETORES.map((s, i) => (
        <g key={s}>
          <Seta id={id} x={CENTRO[i]} y1={440} y2={468} />
          <Caixa
            x={COLUNAS[i]}
            y={470}
            w={LARG}
            h={44}
            titulo={s}
            tom="entrada"
          />
        </g>
      ))}
    </svg>
  )
}

/** Parte 2: dos indicadores às duas medidas em R$ (que não se somam) e ao dano evitado. */
export function DiagramaIndicadorAoDanoEvitado() {
  const id = "seta-indicador-dano"
  return (
    <svg
      viewBox="0 0 680 590"
      className="w-full"
      role="img"
      aria-label="Do indicador ao dano evitado: os indicadores de cada variante geram perdas operacionais pelo método DaLA e exposição física pelo valor de reposição, duas medidas em reais que não se somam; a diferença entre a base do evento e cada intervenção é o dano evitado, mostrado no painel e nas páginas de Perdas e Danos."
    >
      <Defs id={id} />
      <Caixa
        x={40}
        y={40}
        w={600}
        titulo="Indicadores de cada variante"
        sub="sem intervenção, diques, diques + barragens"
        tom="resultado"
      />
      {[165, 515].map((x) => (
        <g key={x}>
          <Seta id={id} x={x} y1={96} y2={126} />
          <Seta id={id} x={x} y1={184} y2={212} />
          <Seta id={id} x={x} y1={270} y2={298} />
          <Seta id={id} x={x} y1={356} y2={388} />
        </g>
      ))}
      <Caixa
        x={40}
        y={128}
        w={250}
        titulo="Dias de interrupção"
        sub="aguda + recuperação ÷ 2"
        tom="etapa"
      />
      <Caixa
        x={390}
        y={128}
        w={250}
        titulo="Ativos atingidos"
        sub="empresas, escolas, saúde"
        tom="etapa"
      />
      <Caixa
        x={40}
        y={214}
        w={250}
        titulo="Fluxo econômico parado"
        sub="VAB, ensino, SUS, lavouras"
        tom="etapa"
      />
      <Caixa
        x={390}
        y={214}
        w={250}
        titulo="Valor de reposição"
        sub="custo × área × multiplicador"
        tom="etapa"
      />
      <Caixa
        x={40}
        y={300}
        w={250}
        titulo="Perdas operacionais"
        sub="método DaLA, em R$"
        tom="etapa"
      />
      <Caixa
        x={390}
        y={300}
        w={250}
        titulo="Exposição física"
        sub="um teto, em R$"
        tom="etapa"
      />
      <text x={340} y={322} textAnchor="middle" fontSize={12} fill="#64748b">
        não se
      </text>
      <text x={340} y={340} textAnchor="middle" fontSize={12} fill="#64748b">
        somam
      </text>
      <Caixa
        x={40}
        y={390}
        w={600}
        titulo="Dano evitado"
        sub="base do mesmo evento − intervenção"
        tom="resultado"
      />
      {[130, 340, 550].map((x) => (
        <Seta key={x} id={id} x={x} y1={446} y2={498} />
      ))}
      <Caixa
        x={40}
        y={500}
        w={180}
        titulo="Painel do mapa"
        sub="Resumo e Dano Evitado"
        tom="entrada"
      />
      <Caixa
        x={250}
        y={500}
        w={180}
        titulo="Perdas Operacionais"
        sub="30, 45 ou 60 dias"
        tom="entrada"
      />
      <Caixa
        x={460}
        y={500}
        w={180}
        titulo="Danos Físicos"
        sub="exposição por cota"
        tom="entrada"
      />
    </svg>
  )
}
