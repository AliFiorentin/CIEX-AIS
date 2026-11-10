// Formatadores de números em pt-BR compartilhados pelo painel, pelas páginas de Perdas/Danos e pela Metodologia.
// formatoBr, compactoBr e calcPct viviam em app/page.tsx; fmtBRL vivia em app/danos/DanosClient.tsx.

export const formatoBr = (num: number, casas = 0) =>
  num.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })

export const compactoBr = (n: number, casas = 1) => {
  if (n === undefined || n === null || isNaN(n)) return "0"
  const abs = Math.abs(n)
  const sinal = n < 0 ? "-" : ""
  // Arredonda antes de escolher a unidade: 999.950 não pode virar "1.000,0 Mil".
  const arred = (d: number) => Number((abs / d).toFixed(casas))
  if (abs >= 1e9 || arred(1e6) >= 1000)
    return `${sinal}${formatoBr(abs / 1e9, casas)} Bi`
  if (abs >= 1e6 || arred(1e3) >= 1000)
    return `${sinal}${formatoBr(abs / 1e6, casas)} Mi`
  if (abs >= 1e3) return `${sinal}${formatoBr(abs / 1e3, casas)} Mil`
  return `${sinal}${formatoBr(abs, casas)}`
}

export const calcPct = (parte: number, total: number) =>
  !total ? "0%" : `${formatoBr((parte / total) * 100, 0)}%`

/** Reais por extenso curto: "R$ 1,5 mi", "R$ 960 mil". Arredonda antes de escolher a unidade. */
export function fmtBRL(v: number): string {
  // 999.600 não pode virar "R$ 1000 mil".
  if (v >= 1e9 || Number((v / 1e6).toFixed(1)) >= 1000)
    return `R$ ${(v / 1e9).toFixed(2).replace(".", ",")} bi`
  if (v >= 1e6 || Number((v / 1e3).toFixed(0)) >= 1000)
    return `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi`
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
}
