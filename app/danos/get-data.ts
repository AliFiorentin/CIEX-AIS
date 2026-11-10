import { readFileSync } from "fs"
import { join } from "path"
import type { PerdasData } from "../perdas-operacionais/PerdasClient"
import type { Comparativo } from "@/lib/comparativo"
import type { DetalheCota, ExposicaoMun } from "./types"

/** Lê um JSON de public/dados_convertidos; `null` se ausente ou inválido (a página degrada sem quebrar). */
function lerJson<T>(arquivo: string): T | null {
  try {
    const p = join(process.cwd(), "public", "dados_convertidos", arquivo)
    return JSON.parse(readFileSync(p, "utf8")) as T
  } catch {
    return null
  }
}

/** Cenários antigos que as simulações substituíram no seletor (os dados continuam em perdas_operacionais.json). */
const SUBSTITUIDOS = new Set(["Cenário Setembro 2023", "Cenário Maio 2024"])

/**
 * Dados da página Perdas Operacionais, lidos no servidor: as 4 simulações (a base "sem intervenção" de cada evento, em
 * ordem cronológica) e depois os cenários da origem que seguem no seletor (Maio de 2024 + 50% e 16/05/2024). Os antigos
 * Setembro 2023 e Maio 2024 saem da página porque foram substituídos pelas simulações; as intervenções ficam na seção 4.
 */
export function getPerdasData(): PerdasData {
  const antigos = lerJson<PerdasData>("perdas_operacionais.json") ?? {}
  const sims = lerJson<PerdasData>("perdas_intervencoes.json") ?? {}
  const resultado: PerdasData = {}
  for (const mun of Object.keys(antigos)) {
    const baseSims = Object.entries(sims[mun] ?? {})
      .filter(([nome]) => nome.endsWith(" – Sem intervenção"))
      .map(([nome, v]) => [nome.replace(" – Sem intervenção", ""), v] as const)
    const restantes = Object.entries(antigos[mun]).filter(
      ([nome]) => !SUBSTITUIDOS.has(nome)
    )
    resultado[mun] = Object.fromEntries([...baseSims, ...restantes])
  }
  return resultado
}

/** Comparativo de dano evitado pelas intervenções (intervencoes_comparativo.json); null se o arquivo faltar. */
export function getComparativoData(): Comparativo | null {
  return lerJson<Comparativo>("intervencoes_comparativo.json")
}

/** Dados da página Danos Físicos (exposição por cota), lidos no servidor; null se o arquivo faltar. */
export function getFisicosData(): ExposicaoMun | null {
  const expo = lerJson<ExposicaoMun>("climada_exposicao_rio_grande.json")
  // O detalhe por categoria e por cota vai dentro de `expo.detalhe`.
  if (expo)
    expo.detalhe =
      lerJson<DetalheCota>("climada_cota_detalhe_rio_grande.json") ?? undefined
  return expo
}
