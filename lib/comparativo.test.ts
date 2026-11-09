import { test } from "node:test"
import assert from "node:assert/strict"
import {
  formatarEvitado,
  perdasEmDias,
  perdasEvitadasEmDias,
  type Indicadores,
} from "./comparativo.ts"
import { calcPct, compactoBr, fmtBRL, formatoBr } from "./formatos.ts"

const ind = (p: Partial<Indicadores>): Indicadores => ({
  area_ha: 0,
  prof_max_cm: 0,
  area_por_faixa_ha: {},
  empresas: 0,
  vinculos: 0,
  massa_salarial: 0,
  escolas: 0,
  matriculas: 0,
  unidades_saude: 0,
  logradouros: 0,
  quadras: 0,
  perdas_total: 0,
  perdas_empresas: 0,
  perdas_educacao: 0,
  perdas_saude: 0,
  perdas_agricultura: 0,
  perdas_dias_efetivos: 60,
  ...p,
})

test("formatarEvitado: positivo é evitado, negativo é piora, zero é neutro", () => {
  assert.deepEqual(formatarEvitado(139, 0.4664), { texto: "46,6%", tom: "evitado" })
  assert.deepEqual(formatarEvitado(-3.2, -0.02), { texto: "2%", tom: "piora" })
  assert.equal(formatarEvitado(0, 0).tom, "neutro")
})

test("formatarEvitado: percentual nulo (baseline 0) vira traço, nunca NaN nem Infinity", () => {
  assert.equal(formatarEvitado(0, null).texto, "—")
  const r = formatarEvitado(5, null)
  assert.equal(r.tom, "evitado")
  assert.equal(r.texto, "—")
  assert.ok(!/NaN|Infinity/.test(formatarEvitado(-7, null).texto))
})

test("perdasEmDias reescala linearmente como scaleTo e mantém a agricultura fixa", () => {
  const a = ind({
    perdas_dias_efetivos: 60,
    perdas_empresas: 6000,
    perdas_educacao: 1200,
    perdas_saude: 300,
    perdas_agricultura: 100,
  })
  assert.deepEqual(perdasEmDias(a, 30), {
    empresas: 3000,
    educacao: 600,
    saude: 150,
    agricultura: 100,
    total: 3850,
  })
  assert.equal(perdasEmDias(a, 60).total, 7600)
})

test("perdasEvitadasEmDias: valor e percentual contra o baseline", () => {
  const base = ind({ perdas_dias_efetivos: 60, perdas_empresas: 6000, perdas_agricultura: 100 })
  const dique = ind({ perdas_dias_efetivos: 60, perdas_empresas: 2000, perdas_agricultura: 100 })
  const r = perdasEvitadasEmDias(base, dique, 30)
  assert.equal(r.valor, 2000) // (3000 + 100) - (1000 + 100)
  assert.ok(Math.abs((r.pct as number) - 2000 / 3100) < 1e-9)
})

test("perdasEvitadasEmDias: baseline sem perdas dá percentual nulo", () => {
  const r = perdasEvitadasEmDias(ind({}), ind({ perdas_empresas: 10 }), 30)
  assert.equal(r.pct, null)
  assert.ok(r.valor < 0)
})

test("formatadores movidos do page.tsx mantêm o comportamento", () => {
  assert.equal(formatoBr(1234.5, 1), "1.234,5")
  assert.equal(compactoBr(1234567), "1,2 Mi")
  assert.equal(compactoBr(999950, 1), "1,0 Mi")
  assert.equal(calcPct(1, 4), "25%")
  assert.equal(calcPct(1, 0), "0%")
  assert.equal(fmtBRL(1_500_000), "R$ 1,5 mi")
  assert.equal(fmtBRL(999_600), "R$ 1,0 mi")
})
