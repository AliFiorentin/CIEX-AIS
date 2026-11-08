import { test } from "node:test"
import assert from "node:assert/strict"
import { fmtCompacto, escalaAgradavel } from "../app/danos/helpers.ts"

// Testes dos auxiliares dos gráficos de Danos Operacionais (app/danos/helpers.ts), novos nesta revisão.
// Antes, os eixos usavam toFixed(0) ("13mi" para R$ 12,9 mi) e ponto decimal ("1.5bi").

test("fmtCompacto: milhões com uma casa e vírgula", () => {
  assert.equal(fmtCompacto(12_901_005), "12,9 mi")
  assert.equal(fmtCompacto(557_838_356), "557,8 mi")
})

test("fmtCompacto: bilhões com duas casas e vírgula", () => {
  assert.equal(fmtCompacto(1_234_000_000), "1,23 bi")
})

test("fmtCompacto: arredonda antes de escolher a unidade", () => {
  assert.equal(fmtCompacto(999_960_000), "1,00 bi")
})

test("fmtCompacto: abaixo de 1 mi usa mil, e zero é 0", () => {
  assert.equal(fmtCompacto(146_880), "147 mil")
  assert.equal(fmtCompacto(0), "0")
})

test("escalaAgradavel: máximo arredondado para cima em passos de 1, 2, 2,5 ou 5 vezes 10^n", () => {
  assert.equal(escalaAgradavel(557_838_356).max, 600_000_000)
  assert.equal(escalaAgradavel(12_901_005).max, 15_000_000)
  assert.equal(escalaAgradavel(96_000_000).max, 100_000_000)
})

test("escalaAgradavel: ticks igualmente espaçados de 0 ao máximo", () => {
  const { max, ticks } = escalaAgradavel(557_838_356)
  assert.equal(ticks[0], 0)
  assert.equal(ticks[ticks.length - 1], max)
  const passo = ticks[1] - ticks[0]
  ticks.forEach((t, i) => assert.ok(Math.abs(t - i * passo) < 1e-6))
})

test("escalaAgradavel: valor zero ou negativo não quebra", () => {
  assert.equal(escalaAgradavel(0).max, 1)
})
