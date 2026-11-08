import { test } from "node:test"
import assert from "node:assert/strict"
import { calcEmp, calcEdu, calcSau, STAFF_COLS } from "./metricas.ts"

// Calculadoras de KPI do painel (antes dentro de app/page.tsx). Funções puras sobre FeatureCollections.

const fc = (props: Record<string, unknown>[]) => ({
  features: props.map((properties) => ({ properties })),
})

// ─── calcEmp ────────────────────────────────────────────────────────────────

test("calcEmp: base ausente devolve zeros", () => {
  assert.deepEqual(calcEmp(null), { estab: 0, emp: 0, massa: 0, media: 0 })
  assert.deepEqual(calcEmp({}), { estab: 0, emp: 0, massa: 0, media: 0 })
})

test("calcEmp: soma vínculos e massa salarial, e conta estabelecimentos", () => {
  const r = calcEmp(
    fc([
      { Empregados: 10, Massa_Salarial: 30000 },
      { Empregados: 5, Massa_Salarial: 20000 },
    ])
  )
  assert.equal(r.estab, 2)
  assert.equal(r.emp, 15)
  assert.equal(r.massa, 50000)
})

test("calcEmp: média é ponderada por vínculo (massa ÷ vínculos), não média das médias", () => {
  // 1 vínculo a R$ 1.000 e 500 vínculos a R$ 3.000: a média simples das médias daria 2.000
  const r = calcEmp(
    fc([
      { Empregados: 1, Massa_Salarial: 1000 },
      { Empregados: 500, Massa_Salarial: 1500000 },
    ])
  )
  assert.equal(r.media, 1501000 / 501)
  assert.notEqual(r.media, 2000)
})

test("calcEmp: sem vínculos a média é 0 (não NaN)", () => {
  assert.equal(calcEmp(fc([{ Empregados: 0, Massa_Salarial: 0 }])).media, 0)
  assert.equal(calcEmp(fc([{}])).media, 0)
})

// ─── calcEdu ────────────────────────────────────────────────────────────────

test("calcEdu: base ausente devolve zeros", () => {
  assert.deepEqual(calcEdu(null), {
    escolas: 0,
    prof: 0,
    inf: 0,
    fund: 0,
    med: 0,
    profis: 0,
    eja: 0,
    esp: 0,
  })
})

test("calcEdu: professores vêm de qtd_doc (docentes), não de qtd_prof (profissionais não docentes)", () => {
  const r = calcEdu(
    fc([
      { qtd_doc: 10, qtd_prof: 99 },
      { qtd_doc: 5, qtd_prof: 99 },
    ])
  )
  assert.equal(r.prof, 15)
})

test("calcEdu: soma cada modalidade de matrícula", () => {
  const r = calcEdu(
    fc([
      {
        qtd_matri_inf: 1,
        qtd_matri_fund: 2,
        qtd_matri_med: 3,
        qtd_matri_prof: 4,
        qtd_matri_eja: 5,
        qtd_matri_esp: 6,
      },
      { qtd_matri_inf: 10, qtd_matri_fund: 20 },
    ])
  )
  assert.deepEqual(
    {
      escolas: r.escolas,
      inf: r.inf,
      fund: r.fund,
      med: r.med,
      profis: r.profis,
      eja: r.eja,
      esp: r.esp,
    },
    { escolas: 2, inf: 11, fund: 22, med: 3, profis: 4, eja: 5, esp: 6 }
  )
})

// ─── calcSau ────────────────────────────────────────────────────────────────

test("calcSau: base ausente devolve vazio", () => {
  assert.deepEqual(calcSau(null), { unidades: 0, tipos: {}, staff: {} })
})

test("calcSau: conta tipos e ignora vazio e 'nan'", () => {
  const r = calcSau(
    fc([
      { co_tipo_estabelecimento: "UBS" },
      { co_tipo_estabelecimento: "UBS" },
      { co_tipo_estabelecimento: "Hospital" },
      { co_tipo_estabelecimento: "nan" },
      { co_tipo_estabelecimento: "" },
      {},
    ])
  )
  assert.deepEqual(r.tipos, { UBS: 2, Hospital: 1 })
  assert.equal(r.unidades, 6)
})

test("calcSau: soma as 11 categorias de profissionais e começa todas em zero", () => {
  assert.equal(STAFF_COLS.length, 11)
  const vazio = calcSau(fc([{}]))
  for (const c of STAFF_COLS) assert.equal(vazio.staff[c], 0)
  const r = calcSau(
    fc([{ staff_medicos: 3, staff_enfermagem: 4 }, { staff_medicos: 2 }])
  )
  assert.equal(r.staff.staff_medicos, 5)
  assert.equal(r.staff.staff_enfermagem, 4)
})
