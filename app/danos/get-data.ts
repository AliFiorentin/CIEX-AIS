import { readFileSync } from "fs"
import { join } from "path"
import type { DanosData, PerdasData } from "./DanosClient"
import type { CotasData, DetalheCota, ExposicaoMun } from "./types"

/** Lê um JSON de public/dados_convertidos; `null` se ausente ou inválido (a página degrada sem quebrar). */
function lerJson<T>(arquivo: string): T | null {
  try {
    const p = join(process.cwd(), "public", "dados_convertidos", arquivo)
    return JSON.parse(readFileSync(p, "utf8")) as T
  } catch {
    return null
  }
}

/** Dados da página Danos (abas Operacionais e Físicos), lidos no servidor. */
export function getDanosData(): DanosData {
  const expo = lerJson<ExposicaoMun>("climada_exposicao_rio_grande.json")
  // O detalhe por categoria e por cota vai dentro de `expo.detalhe` (como no BID).
  if (expo)
    expo.detalhe =
      lerJson<DetalheCota>("climada_cota_detalhe_rio_grande.json") ?? undefined
  return {
    perdas: lerJson<PerdasData>("perdas_operacionais.json") ?? {},
    expo,
    cotas: lerJson<CotasData>("climada_cota_rio_grande.json"),
  }
}
