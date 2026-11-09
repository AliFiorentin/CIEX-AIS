import { DataTable, Note } from "@/components/doc-kit"
import { formatarEvitado, type Comparativo, type Indicadores } from "@/lib/comparativo"
import { formatoBr } from "@/lib/formatos"

// Exemplo da Metodologia: 21/05/2024, diques. Todos os números vêm do comparativo (nada é digitado no texto).
const EVENTO = "2024-05-21"
const INTERVENCAO = "diques"

type Tipo = "ha" | "n" | "brl"
const LINHAS: { rotulo: string; tipo: Tipo; chave: keyof Indicadores }[] = [
  { rotulo: "Área atingida", tipo: "ha", chave: "area_ha" },
  { rotulo: "Empresas atingidas", tipo: "n", chave: "empresas" },
  { rotulo: "Escolas atingidas", tipo: "n", chave: "escolas" },
  { rotulo: "Unidades de saúde atingidas", tipo: "n", chave: "unidades_saude" },
  { rotulo: "Perdas: empresas (VAB)", tipo: "brl", chave: "perdas_empresas" },
  { rotulo: "Perdas: educação (perdas + custo adicional)", tipo: "brl", chave: "perdas_educacao" },
  { rotulo: "Perdas: saúde (produção SUS)", tipo: "brl", chave: "perdas_saude" },
  { rotulo: "Perdas: agricultura", tipo: "brl", chave: "perdas_agricultura" },
  { rotulo: "Perdas operacionais totais (P)", tipo: "brl", chave: "perdas_total" },
  { rotulo: "Exposição física (teto)", tipo: "brl", chave: "exposicao_total" },
]

const fmt = (tipo: Tipo, v: number) =>
  tipo === "ha" ? `${formatoBr(v, 1)} ha` : tipo === "brl" ? `R$ ${formatoBr(v, 2)}` : formatoBr(v, 0)

export function ExemploDanoEvitado({ comparativo }: { comparativo: Comparativo | null }) {
  const ev = comparativo?.eventos[EVENTO]
  if (!comparativo || !ev) {
    return (
      <Note type="warning">
        <strong>Dado ausente:</strong> o exemplo numérico depende de intervencoes_comparativo.json.
      </Note>
    )
  }
  const sem = ev.variantes["sem-intervencao"]
  const com = ev.variantes[INTERVENCAO]
  const evitado = ev.evitado[INTERVENCAO]
  const linhas = LINHAS.filter((l) => l.chave !== "exposicao_total" || comparativo.exposicao_disponivel)

  const somaComponentes = ["perdas_empresas", "perdas_educacao", "perdas_saude", "perdas_agricultura"].reduce(
    (s, k) => s + evitado[k].valor,
    0
  )
  const fecha = Math.abs(somaComponentes - evitado.perdas_total.valor) < 0.05

  return (
    <>
      <p>
        Simulação de <strong>{ev.rotulo}</strong>, <strong>diques</strong> contra <strong>sem intervenção</strong>. As
        perdas estão nos parâmetros DaLA do evento ({sem.perdas_dias_efetivos} dias efetivos); a exposição é o valor de
        reposição de tudo o que molha.
      </p>
      <DataTable
        rows={[
          ["Indicador X", "Sem intervenção", "Diques", "Evitado: X(sem) − X(diques)", "Evitado %"],
          ...linhas.map(({ rotulo, tipo, chave }) => {
            const e = evitado[chave as string]
            const f = formatarEvitado(e.valor, e.pct)
            return [
              rotulo,
              fmt(tipo, sem[chave] as number),
              fmt(tipo, com[chave] as number),
              fmt(tipo, e.valor),
              f.texto,
            ]
          }),
        ]}
      />
      <p>
        <strong>Conferência.</strong> A soma dos evitados dos quatro componentes de perdas é{" "}
        <strong>R$ {formatoBr(somaComponentes, 2)}</strong> e o evitado das perdas totais é{" "}
        <strong>R$ {formatoBr(evitado.perdas_total.valor, 2)}</strong>
        {fecha ? ": a conta fecha nos dois sentidos." : ": diferem por arredondamento dos componentes."} A exposição
        física evitada <strong>não</strong> entra nessa soma: mede outra coisa (Seção 11).
      </p>
    </>
  )
}
