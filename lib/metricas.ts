// Calculadoras de KPI do painel: reduzem uma FeatureCollection GeoJSON a números (empresas, educação, saúde).
// Chamadas uma vez para a base e uma para os "atingidos", para derivar o % atingido. A matemática está
// documentada no README. Funções puras (antes viviam em app/page.tsx), com testes em lib/metricas.test.ts.

export const STAFF_COLS = [
  "staff_acs_endemias",
  "staff_admin_gestao_apoio",
  "staff_diag_lab_imagem",
  "staff_enfermagem",
  "staff_farmacia",
  "staff_medicos",
  "staff_odontologia",
  "staff_outros",
  "staff_outros_superior_saude",
  "staff_servicos_gerais",
  "staff_transporte_urgencia",
]

export const calcEmp = (base: any) => {
  if (!base?.features) return { estab: 0, emp: 0, massa: 0, media: 0 }
  const estab = base.features.length
  const emp = base.features.reduce(
    (a: number, f: any) => a + (f.properties?.Empregados || 0),
    0
  )
  const massa = base.features.reduce(
    (a: number, f: any) => a + (f.properties?.Massa_Salarial || 0),
    0
  )
  // Média ponderada por vínculo: massa salarial / vínculos (mesma definição da
  // Metodologia e da aba /danos). Média simples de salario_medio por
  // estabelecimento dava peso igual a empresas de 1 e de 500 vínculos.
  const media = emp > 0 ? massa / emp : 0
  return { estab, emp, massa, media }
}

export const calcEdu = (base: any) => {
  if (!base?.features)
    return {
      escolas: 0,
      prof: 0,
      inf: 0,
      fund: 0,
      med: 0,
      profis: 0,
      eja: 0,
      esp: 0,
    }
  const sum = (p: string) =>
    base.features.reduce((a: number, f: any) => a + (f.properties?.[p] || 0), 0)
  return {
    escolas: base.features.length,
    // Docentes (qtd_doc). qtd_prof = profissionais escolares não docentes.
    prof: sum("qtd_doc"),
    inf: sum("qtd_matri_inf"),
    fund: sum("qtd_matri_fund"),
    med: sum("qtd_matri_med"),
    profis: sum("qtd_matri_prof"),
    eja: sum("qtd_matri_eja"),
    esp: sum("qtd_matri_esp"),
  }
}

export const calcSau = (base: any) => {
  if (!base?.features)
    return {
      unidades: 0,
      tipos: {} as Record<string, number>,
      staff: {} as Record<string, number>,
    }
  const tipos: Record<string, number> = {}
  const staff: Record<string, number> = {}
  STAFF_COLS.forEach((c) => (staff[c] = 0))
  base.features.forEach((f: any) => {
    const t = f.properties?.co_tipo_estabelecimento
    if (t && t !== "nan" && t !== "") tipos[t] = (tipos[t] || 0) + 1
    STAFF_COLS.forEach((c) => (staff[c] += f.properties?.[c] || 0))
  })
  return { unidades: base.features.length, tipos, staff }
}
