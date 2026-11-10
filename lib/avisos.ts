// Avisos de interpretação dos resultados (lacunas F1, F2, F3 e F7 da revisão de 2026-11-09), testados em lib/avisos.test.ts.

import { formatoBr } from "./formatos.ts"

export interface PopulacaoCenario {
  pop_atingida: number
  pct_atingida: number
  /** Presente e começando por "estimado" quando o valor é estimativa por proxy (hoje todos são calculados no raster). */
  _metodologia?: string
}

/**
 * F1 e F2: como rotular a população atingida. Uma estimativa por proxy (campo `_metodologia` começando por
 * "estimado") não pode aparecer como valor exato; sem dado para o cenário o texto diz "não calculada".
 */
export function rotuloPopulacao(popCen: PopulacaoCenario | null | undefined): {
  estimado: boolean
  texto: string
} {
  if (!popCen)
    return { estimado: false, texto: "não calculada para este cenário" }
  const metodo = popCen._metodologia
  if (metodo && /^estimad/i.test(metodo.trim())) {
    const faixa = metodo.match(/faixa\s+(\d+)\s+a\s+(\d+)/i)
    return {
      estimado: true,
      texto: faixa
        ? `estimada por proxy (faixa de ${formatoBr(Number(faixa[1]))} a ${formatoBr(Number(faixa[2]))} hab.)`
        : "estimada por proxy",
    }
  }
  return { estimado: false, texto: "calculada a partir do raster de população" }
}

/** F3: "Maio 2024 + 50%" não é 50% a mais de área (a explicação só estava na Metodologia). */
export const AVISO_MAIO_2024_MAIS_50 =
  "Maio 2024 + 50%: a água fica 60 cm mais alta que em Maio 2024 (mancha ~7 vezes maior), não 50% a mais de área."

/** F7: defasagem das bases (RAIS 2023, Censo Escolar 2024, CNES abr/2024) frente ao ano do evento simulado. */
export function AVISO_BASES(ano: number): string {
  const relacao =
    ano <= 2023
      ? "posteriores ao evento"
      : ano === 2024
        ? "do mesmo período do evento ou anteriores"
        : "anteriores ao evento"
  return `Bases: RAIS 2023, Censo Escolar 2024 e CNES de abril/2024, ${relacao} (evento de ${ano}). Ver Metodologia, Seção 13.`
}
