"use client"

import { useState } from "react"
import Link from "next/link"
import { CotaMapa } from "@/components/CotaMapa"
import { KpiRow, Section, DataTable, Note } from "@/components/doc-kit"
import type { ExposicaoSetor, ExposicaoMun } from "./types"
import { SETOR_LABEL, SETOR_COLORS, fmtBRL, fmtN, fmtPct } from "./helpers"
import { DetalhePorCategoria } from "./DetalhePorCategoria"

const MUN = "Rio Grande"
const MAPA_SLUG = "rio_grande"
const PRIMARY = "#1E404A"

export function FisicosView({ expo }: { expo: ExposicaoMun | null }) {
  const mun = MUN
  const cotasLista0 = expo
    ? Object.keys(expo.por_cota).sort((a, b) => parseFloat(a) - parseFloat(b))
    : []
  const [cota, setCota] = useState<string>(
    cotasLista0[Math.floor(cotasLista0.length / 2)] ?? ""
  )
  if (!expo) {
    return (
      <div className="mx-auto max-w-[1440px] px-6 py-10">
        <Note type="warning">Dados de exposição por cota indisponíveis.</Note>
      </div>
    )
  }
  const setores = ["empresas", "educacao", "saude"]
  // Rio Grande: rasters são máscaras molhado/seco (sem profundidade): nada de "prof. média" nem de amostragem em ~5 m.
  const semProf = !!expo.premissas?.sem_profundidade
  const soma = (
    r: Record<string, ExposicaoSetor>,
    k: "valor_exposto_atingido_brl" | "exposicao_total_brl"
  ) => setores.reduce((s, st) => s + r[st][k], 0)
  const cotasLista = Object.keys(expo.por_cota).sort(
    (a, b) => parseFloat(a) - parseFloat(b)
  )
  const cotaAtiva = expo.por_cota[cota]
    ? cota
    : cotasLista[Math.floor(cotasLista.length / 2)]
  const atual = expo.por_cota[cotaAtiva]
  const titulo = `${mun} · cota ${cotaAtiva} m`
  const total = soma(atual, "valor_exposto_atingido_brl")
  const expTotal = soma(atual, "exposicao_total_brl")

  // ── Dados do resumo (cota mais baixa, mais alta e maior salto entre cotas) ──
  const cotaMin = cotasLista[0]
  const cotaMax = cotasLista[cotasLista.length - 1]
  const rMin = expo.por_cota[cotaMin]
  const rMax = expo.por_cota[cotaMax]
  const totMin = soma(rMin, "valor_exposto_atingido_brl")
  const totMax = soma(rMax, "valor_exposto_atingido_brl")
  const expMax = soma(rMax, "exposicao_total_brl")
  let salto = { de: cotaMin, para: cotaMin, valor: 0 }
  cotasLista.forEach((c, i) => {
    if (i === 0) return
    const v =
      soma(expo.por_cota[c], "valor_exposto_atingido_brl") -
      soma(expo.por_cota[cotasLista[i - 1]], "valor_exposto_atingido_brl")
    if (v > salto.valor) salto = { de: cotasLista[i - 1], para: c, valor: v }
  })
  const propSetor = (st: string) =>
    rMax[st].exposicao_total_brl
      ? rMax[st].valor_exposto_atingido_brl / rMax[st].exposicao_total_brl
      : 0
  const setorTop = setores.reduce((a, b) =>
    propSetor(b) > propSetor(a) ? b : a
  )
  const vc = (c: string) => c.replace(".", ",") // cota com vírgula decimal nos textos
  const pilhaEmp = expo.detalhe?.maior_pilha?.empresas
  const agricolaZero = expo.detalhe
    ? Object.values(expo.detalhe.por_cota).every(
        (c) => (c.agricultura?.area_ha ?? 0) === 0
      )
    : null

  // ── Numeração das seções e índice lateral ──
  const temDetalhe = !!expo.detalhe
  const itens: [string, string][] = [
    ["c-como-ler", "Como ler os resultados"],
    ["c-resumo", "Resumo"],
    ["c-tabela", "Valor exposto por cota"],
    ...(temDetalhe
      ? ([
          ["c-empresas", "Empresas"],
          ["c-saude", "Saúde"],
          ["c-educacao", "Educação"],
          ["c-agricultura", "Agricultura"],
        ] as [string, string][])
      : []),
    ["c-mapa", "Mapa por cota"],
  ]
  const numDe = (id: string) => itens.findIndex(([i]) => i === id) + 1

  return (
    <div className="mx-auto flex max-w-[1440px] items-start gap-8 px-6 py-10">
      {/* ── Sidebar (Índice fixo) ───────────────────────────────────────────── */}
      <aside className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-4 flex flex-col gap-3">
          <nav className="rounded-xl border border-[#c7d6d9] bg-white p-4 shadow-sm">
            <p
              className="mb-2 text-[10px] font-black tracking-wider uppercase"
              style={{ color: PRIMARY }}
            >
              Índice
            </p>
            <ol className="flex flex-col gap-1">
              {itens.map(([id, label], i) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="block py-0.5 text-[11px] leading-snug font-medium underline-offset-4 transition-colors duration-150 hover:underline"
                    style={{ color: PRIMARY }}
                  >
                    {i + 1}. {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div
          className="mb-6 flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Cota do rio"
        >
          <span className="text-[10px] font-black tracking-wider text-[#1E404A] uppercase">
            Cota (m)
          </span>
          {cotasLista.map((c) => (
            <button
              key={c}
              onClick={() => setCota(c)}
              className="rounded-full border px-3 py-1 text-[11px] font-black transition-all duration-150"
              style={
                c === cotaAtiva
                  ? {
                      backgroundColor: "#1E404A",
                      color: "#fff",
                      borderColor: "#1E404A",
                    }
                  : {
                      backgroundColor: "#fff",
                      color: "#64748b",
                      borderColor: "#e2e8f0",
                    }
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* ═══ 1. COMO LER OS RESULTADOS ═══ */}
        <Section
          id="c-como-ler"
          num={String(numDe("c-como-ler"))}
          title="Como ler os resultados"
        >
          <p>
            Esta página mostra <strong>o que fica debaixo d&rsquo;água</strong>{" "}
            em cada cota do rio e da lagoa, e quanto vale, em reais, o que fica
            debaixo d&rsquo;água. A cota é o nível da água: as cotas vão de{" "}
            {vc(cotaMin)} a {vc(cotaMax)} m, e a última é o pico de 21/05/2024.
          </p>
          <Note type="warning">
            <strong>Este indicador é exposição, não dano.</strong> O painel soma
            o valor de reposição de tudo o que fica sob a água em cada cota, mas
            não estima quanto disso seria de fato destruído: sem a altura da
            água em Rio Grande, todo ponto molhado entra com 100% do seu valor.
            O resultado é, portanto, um <strong>teto</strong>: o que se perderia
            se tudo o que molha fosse perdido por completo. O dano real fica
            entre zero e esse valor. Ele <strong>não deve ser somado</strong>{" "}
            às Perdas Operacionais (
            <Link
              href="/perdas-operacionais"
              className="font-bold underline underline-offset-2"
            >
              DaLA
            </Link>
            ), que medem outra coisa: a produção e os serviços interrompidos
            durante e depois da cheia.
          </Note>

          <div className="my-4 rounded-xl border border-[#b3cdd8] bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <p className="mb-2 text-[10px] font-black tracking-wider text-[#2f6a83] uppercase">
              Passo a passo
            </p>
            <ol className="list-inside list-decimal space-y-1.5">
              <li>
                <strong>Escolha a cota</strong> nos botões do topo. Todos os
                números e cartões desta página passam a mostrar essa cota.
              </li>
              <li>
                <strong>Veja o resumo</strong> (seção {numDe("c-resumo")}): o
                valor exposto e a porcentagem do patrimônio do município que a
                água alcança nessa cota.
              </li>
              <li>
                <strong>Compare as cotas</strong> na tabela da seção{" "}
                {numDe("c-tabela")}: ela mostra como a exposição cresce quando a
                água sobe.
              </li>
              {temDetalhe && (
                <li>
                  <strong>Abra o detalhe por categoria</strong> (seções{" "}
                  {numDe("c-empresas")} a {numDe("c-agricultura")}): empregados,
                  leitos, matrículas e área agrícola dos pontos atingidos.
                </li>
              )}
              <li>
                <strong>Confira no mapa</strong> (seção {numDe("c-mapa")}) onde
                a água chega em cada cota.
              </li>
            </ol>
          </div>

          <div className="my-4 rounded-xl border border-[#b3cdd8] bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <p className="mb-2 text-[10px] font-black tracking-wider text-[#2f6a83] uppercase">
              O que cada termo significa
            </p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 md:grid-cols-2">
              <div>
                <dt className="font-bold text-slate-800">Ponto atingido</dt>
                <dd>
                  Empresa, escola ou unidade de saúde cuja localização está
                  dentro da mancha de água{semProf ? " daquela cota" : ""}. Ela
                  entra por inteiro ou não entra: não existe &ldquo;meio
                  atingido&rdquo;.
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-800">Valor de reposição</dt>
                <dd>
                  Quanto custaria reconstruir o ponto: área estimada do
                  estabelecimento vezes o custo de construção (CUB/RS), vezes um
                  fator que soma o conteúdo (equipamentos e estoque) à
                  estrutura: 2,0 para empresas, 2,5 para indústria, 2,25 para
                  saúde e 1,5 para educação. É uma estimativa, não o valor de
                  mercado nem o cadastro do imóvel.
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-800">
                  Valor exposto atingido
                </dt>
                <dd>
                  Soma dos valores de reposição de todos os pontos atingidos
                  naquela cota. É o número principal desta página.
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-800">
                  % da exposição total
                </dt>
                <dd>
                  O valor exposto atingido dividido pelo valor de reposição de{" "}
                  <em>todos</em> os pontos do município (atingidos ou não). Diz
                  que fração do patrimônio dos três setores a água alcança.
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-800">% do setor</dt>
                <dd>
                  A mesma conta, mas só dentro de um setor (empresas, educação
                  ou saúde). Mostra qual setor está mais exposto em proporção ao
                  seu próprio patrimônio.
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-800">Máximo acumulado</dt>
                <dd>
                  Cada cota é um cenário independente, mas os valores nunca caem
                  quando a água sobe: a água de uma cota maior cobre pelo menos
                  o que a menor cobria.
                </dd>
              </div>
            </dl>
          </div>

          <Note type="info">
            Use os números para comparar cotas e setores, como ordem de
            grandeza. As limitações e ressalvas deste indicador, por cenário,
            metodologia e município, estão na{" "}
            <a
              href="/metodologia#limitacoes"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              Seção 12 da Metodologia ↗
            </a>
            .
          </Note>
        </Section>

        {/* ═══ 2. RESUMO ═══ */}
        <Section id="c-resumo" num={String(numDe("c-resumo"))} title="Resumo">
          <div className="rounded-xl border border-[#b3cdd8] bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <p className="mb-2 text-[10px] font-black tracking-wider text-[#2f6a83] uppercase">
              Principais resultados · {mun}
            </p>
            <ul className="list-inside list-disc space-y-1.5">
              <li>
                <strong>No pico (cota {vc(cotaMax)} m)</strong>, o valor exposto
                atingido é <strong>{fmtBRL(totMax)}</strong>, ou{" "}
                <strong>{fmtPct(totMax, expMax)}</strong> da exposição total do
                município ({fmtBRL(expMax)}). Isso corresponde a{" "}
                {setores
                  .map(
                    (st) =>
                      `${fmtN(rMax[st].n_atingidos)} de ${fmtN(rMax[st].n_total)} ${{ empresas: "empresas", educacao: "escolas", saude: "unidades de saúde" }[st]} (${fmtPct(rMax[st].n_atingidos, rMax[st].n_total)})`
                  )
                  .join(", ")}
                .
              </li>
              <li>
                <strong>Na cota mais baixa ({vc(cotaMin)} m)</strong>
                {totMin > 0
                  ? `, a água alcança ${fmtBRL(totMin)}, ${fmtPct(totMin, expMax)} da exposição total: a exposição cresce cerca de ${(totMax / totMin).toFixed(0)} vezes até o pico.`
                  : ", a água ainda não alcança nenhuma empresa, escola ou unidade de saúde: a exposição só aparece quando o nível sobe."}
              </li>
              <li>
                <strong>O maior salto</strong> acontece entre as cotas{" "}
                {vc(salto.de)} e {vc(salto.para)} m: o valor exposto aumenta{" "}
                {fmtBRL(salto.valor)}, {fmtPct(salto.valor, totMax)} do valor do
                pico.
              </li>
              <li>
                <strong>{SETOR_LABEL[setorTop]}</strong> é o setor mais exposto
                em proporção: no pico, a água alcança{" "}
                {fmtPct(
                  rMax[setorTop].valor_exposto_atingido_brl,
                  rMax[setorTop].exposicao_total_brl
                )}{" "}
                do patrimônio dele.
              </li>
              {pilhaEmp?.cota_entrada && (
                <li>
                  <strong>Parte do salto vem da geocodificação:</strong>{" "}
                  {fmtN(pilhaEmp.n_pontos)} empresas aparecem no mesmo ponto e
                  entram juntas na cota {vc(pilhaEmp.cota_entrada)} m, quando o
                  valor exposto das empresas passa de{" "}
                  {fmtBRL(pilhaEmp.valor_exposto_antes_brl ?? 0)} para{" "}
                  {fmtBRL(pilhaEmp.valor_exposto_na_entrada_brl ?? 0)}.
                </li>
              )}
              {agricolaZero !== null && (
                <li>
                  <strong>Agricultura:</strong>{" "}
                  {agricolaZero
                    ? "nenhuma área agrícola mapeada fica sob a água em nenhuma das cotas."
                    : "há área agrícola sob a água em pelo menos uma cota; veja a seção de agricultura."}
                </li>
              )}
              <li>
                <strong>Lembrete:</strong> são valores de exposição (teto), não
                perdas. Não somar às Perdas Operacionais.
              </li>
            </ul>
          </div>

          <div className="my-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-[#b3cdd8] bg-white shadow-sm">
              <div className="px-4 py-3" style={{ backgroundColor: "#055071" }}>
                <p className="mb-0.5 text-[10px] font-black tracking-wider text-white/95 uppercase">
                  {titulo}
                </p>
                <p className="text-2xl leading-none font-black text-white">
                  {fmtBRL(total)}
                </p>
                <p className="mt-1 font-mono text-[9px] text-white/95">
                  valor exposto atingido (3 setores) · {fmtPct(total, expTotal)}{" "}
                  da exposição total · teto, não dano
                </p>
              </div>
              <div className="px-4 pt-3 pb-1">
                <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                  {setores.map((st) => (
                    <div
                      key={st}
                      style={{
                        width: `${(atual[st].valor_exposto_atingido_brl / (total || 1)) * 100}%`,
                        backgroundColor: SETOR_COLORS[st],
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-y-1 px-4 pt-2 pb-4">
                {setores.map((st) => (
                  <KpiRow
                    key={st}
                    label={SETOR_LABEL[st]}
                    value={fmtBRL(atual[st].valor_exposto_atingido_brl)}
                    sub={`${fmtPct(atual[st].valor_exposto_atingido_brl, atual[st].exposicao_total_brl)} do setor · ${fmtPct(atual[st].valor_exposto_atingido_brl, total)} do atingido`}
                    color={SETOR_COLORS[st]}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[#b3cdd8] bg-white p-4 shadow-sm">
              <p className="mb-2 text-[10px] font-black tracking-wider text-[#2f6a83] uppercase">
                Exposição total (patrimônio no município)
              </p>
              <p className="mb-3 text-2xl leading-none font-black text-slate-800">
                {fmtBRL(expTotal)}
              </p>
              {setores.map((st) => (
                <div
                  key={st}
                  className="flex items-center justify-between gap-2 border-t border-slate-100 py-1 text-[11px] first:border-t-0"
                >
                  <span className="text-slate-600">
                    {SETOR_LABEL[st]}: {atual[st].n_atingidos}/
                    {atual[st].n_total} pontos atingidos
                  </span>
                  <span className="font-bold text-slate-700">
                    {fmtPct(atual[st].n_atingidos, atual[st].n_total)}
                    {!semProf &&
                      ` · prof. média ${atual[st].profundidade_media_atingidos_m.toFixed(2).replace(".", ",")} m`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══ 3. TABELA POR COTA ═══ */}
        <Section
          id="c-tabela"
          num={String(numDe("c-tabela"))}
          title="Valor exposto atingido por cota do rio"
        >
          <p>
            Valor exposto atingido em cada cota (rasters de {cotasLista[0]} a{" "}
            {cotasLista[cotasLista.length - 1]} m), com o máximo acumulado entre
            cotas. Sem período de retorno associado a cada cota, não há EAI
            (perda anual esperada) nesta visão.
          </p>
          <DataTable
            destaque={cotasLista.indexOf(cotaAtiva)}
            rows={[
              [
                "Cota (m)",
                "Empresas atingidas",
                "Escolas atingidas",
                "Unid. saúde atingidas",
                "Valor exposto atingido",
                "% da exposição total",
              ],
              ...cotasLista.map((c) => {
                const r = expo.por_cota[c]
                const v = soma(r, "valor_exposto_atingido_brl")
                return [
                  <span
                    key="c"
                    className={
                      c === cotaAtiva
                        ? "font-black text-amber-800"
                        : "font-bold"
                    }
                  >
                    {c}
                  </span>,
                  `${r.empresas.n_atingidos}/${r.empresas.n_total} (${fmtPct(r.empresas.n_atingidos, r.empresas.n_total)})`,
                  `${r.educacao.n_atingidos}/${r.educacao.n_total} (${fmtPct(r.educacao.n_atingidos, r.educacao.n_total)})`,
                  `${r.saude.n_atingidos}/${r.saude.n_total} (${fmtPct(r.saude.n_atingidos, r.saude.n_total)})`,
                  fmtBRL(v),
                  fmtPct(v, soma(r, "exposicao_total_brl")),
                ]
              }),
            ]}
          />
        </Section>

        {expo.detalhe && (
          <DetalhePorCategoria
            det={expo.detalhe}
            cota={cotaAtiva}
            mun={mun}
            numInicial={numDe("c-empresas")}
            exposicaoCota={atual}
          />
        )}

        <Section
          id="c-mapa"
          num={String(numDe("c-mapa"))}
          title="Mapa por cota"
        >
          <p>
            A água avança sozinha em loop (pause ou arraste a cota para
            controlar). A frente de avanço, em azul-claro, mostra o que está
            alagando entre uma cota e a seguinte. Mesmos rasters das tabelas
            acima; a cota é o rótulo do raster.
          </p>
          <CotaMapa slug={MAPA_SLUG} cotaInicial={cotaAtiva} />
        </Section>
      </main>
    </div>
  )
}
