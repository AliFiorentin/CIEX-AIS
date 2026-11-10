// Gráficos SVG (sem dependências) da página Danos Físicos: barras empilhadas, linhas e barras agrupadas.
import { escalaAgradavel, fmtCompacto } from "./helpers"

const W = 680
const H = 260
const PL = 56 // margem esquerda (eixo)
const PR = 16
const PT = 16
const PB = 44 // margem inferior (rótulos)
const AREA_H = H - PT - PB
const AREA_W = W - PL - PR

export interface SerieGrafico {
  nome: string
  cor: string
  valores: number[]
}

function Eixo({ max, fmt }: { max: number; fmt: (v: number) => string }) {
  const esc = escalaAgradavel(max)
  return (
    <>
      {esc.ticks.map((t) => {
        const y = PT + AREA_H - (t / esc.max) * AREA_H
        return (
          <g key={t}>
            <line
              x1={PL}
              x2={W - PR}
              y1={y}
              y2={y}
              stroke="#e2eef3"
              strokeWidth={t === 0 ? 1.25 : 0.75}
            />
            <text
              x={PL - 6}
              y={y + 3}
              textAnchor="end"
              fontSize={10}
              fill="#94a3b8"
            >
              {fmt(t)}
            </text>
          </g>
        )
      })}
    </>
  )
}

function Legenda({ series }: { series: SerieGrafico[] }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-4">
      {series.map((s) => (
        <span
          key={s.nome}
          className="flex items-center gap-1.5 text-[11px] text-slate-600"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: s.cor }}
          />
          {s.nome}
        </span>
      ))}
    </div>
  )
}

function Moldura({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <figure className="mt-3 rounded-xl border border-[#b3cdd8] bg-white p-4 shadow-sm">
      <figcaption className="mb-2 text-[11px] font-black tracking-wide text-[#2f6a83] uppercase">
        {titulo}
      </figcaption>
      {children}
    </figure>
  )
}

/** Barras empilhadas: uma coluna por categoria (cota), uma fatia por série (setor). */
export function GraficoBarrasEmpilhadas({
  titulo,
  categorias,
  series,
  fmt = fmtCompacto,
}: {
  titulo: string
  categorias: string[]
  series: SerieGrafico[]
  fmt?: (v: number) => string
}) {
  const totais = categorias.map((_, i) =>
    series.reduce((s, x) => s + x.valores[i], 0)
  )
  const esc = escalaAgradavel(Math.max(...totais, 1))
  const passo = AREA_W / categorias.length
  const larg = Math.min(passo * 0.6, 70)
  return (
    <Moldura titulo={titulo}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={titulo}
      >
        <Eixo max={Math.max(...totais, 1)} fmt={fmt} />
        {categorias.map((cat, i) => {
          const x = PL + passo * i + (passo - larg) / 2
          let acima = 0
          return (
            <g key={cat}>
              {series.map((s) => {
                const h = (s.valores[i] / esc.max) * AREA_H
                const y = PT + AREA_H - acima - h
                acima += h
                return (
                  <rect
                    key={s.nome}
                    x={x}
                    y={y}
                    width={larg}
                    height={Math.max(h, 0)}
                    fill={s.cor}
                  >
                    <title>{`${s.nome}, cota ${cat} m: ${fmt(s.valores[i])}`}</title>
                  </rect>
                )
              })}
              <text
                x={x + larg / 2}
                y={PT + AREA_H - acima - 5}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill="#334155"
              >
                {fmt(totais[i])}
              </text>
              <text
                x={x + larg / 2}
                y={H - PB + 16}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="#475569"
              >
                {cat} m
              </text>
            </g>
          )
        })}
      </svg>
      <Legenda series={series} />
    </Moldura>
  )
}

/** Linhas: uma por série, valores em % (0 a 100) ao longo das categorias (cotas). */
export function GraficoLinhas({
  titulo,
  categorias,
  series,
}: {
  titulo: string
  categorias: string[]
  series: SerieGrafico[]
}) {
  const px = (i: number) =>
    PL + 20 + (i * (AREA_W - 64)) / Math.max(categorias.length - 1, 1)
  const py = (v: number) => PT + AREA_H - (Math.min(v, 100) / 100) * AREA_H
  return (
    <Moldura titulo={titulo}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={titulo}
      >
        <Eixo max={100} fmt={(v) => `${v}%`} />
        {categorias.map((cat, i) => (
          <text
            key={cat}
            x={px(i)}
            y={H - PB + 16}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="#475569"
          >
            {cat} m
          </text>
        ))}
        {series.map((s) => (
          <g key={s.nome}>
            <polyline
              fill="none"
              stroke={s.cor}
              strokeWidth={2.25}
              strokeLinejoin="round"
              points={s.valores.map((v, i) => `${px(i)},${py(v)}`).join(" ")}
            />
            {s.valores.map((v, i) => (
              <circle key={i} cx={px(i)} cy={py(v)} r={3.5} fill={s.cor}>
                <title>{`${s.nome}, cota ${categorias[i]} m: ${v.toFixed(1).replace(".", ",")}%`}</title>
              </circle>
            ))}
            <text
              x={px(s.valores.length - 1) + 9}
              y={py(s.valores[s.valores.length - 1]) + 4}
              textAnchor="start"
              fontSize={10}
              fontWeight={700}
              fill={s.cor}
            >
              {s.valores[s.valores.length - 1].toFixed(0)}%
            </text>
          </g>
        ))}
      </svg>
      <Legenda series={series} />
    </Moldura>
  )
}

/** Barras agrupadas: por categoria (evento), uma barra por série (variante). */
export function GraficoBarrasAgrupadas({
  titulo,
  categorias,
  series,
  fmt = fmtCompacto,
}: {
  titulo: string
  categorias: string[]
  series: SerieGrafico[]
  fmt?: (v: number) => string
}) {
  const max = Math.max(...series.flatMap((s) => s.valores), 1)
  const esc = escalaAgradavel(max)
  const passo = AREA_W / categorias.length
  const grupo = Math.min(passo * 0.78, 190)
  const larg = grupo / series.length - 4
  return (
    <Moldura titulo={titulo}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={titulo}
      >
        <Eixo max={max} fmt={fmt} />
        {categorias.map((cat, i) => {
          const x0 = PL + passo * i + (passo - grupo) / 2
          return (
            <g key={cat}>
              {series.map((s, k) => {
                const h = (s.valores[i] / esc.max) * AREA_H
                const x = x0 + k * (larg + 4)
                const y = PT + AREA_H - h
                return (
                  <g key={s.nome}>
                    <rect
                      x={x}
                      y={y}
                      width={larg}
                      height={Math.max(h, 0)}
                      fill={s.cor}
                      rx={2}
                    >
                      <title>{`${s.nome}, ${cat}: ${fmt(s.valores[i])}`}</title>
                    </rect>
                    <text
                      x={x + larg / 2}
                      y={y - 4}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight={700}
                      fill={s.cor}
                    >
                      {fmt(s.valores[i])}
                    </text>
                  </g>
                )
              })}
              <text
                x={x0 + grupo / 2}
                y={H - PB + 16}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="#475569"
              >
                {cat}
              </text>
            </g>
          )
        })}
      </svg>
      <Legenda series={series} />
    </Moldura>
  )
}
