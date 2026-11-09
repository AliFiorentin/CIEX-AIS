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

/** Dados da página Perdas Operacionais, lidos no servidor. */
export function getPerdasData(): PerdasData {
  return lerJson<PerdasData>("perdas_operacionais.json") ?? {}
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
