import { test } from "node:test"
import assert from "node:assert/strict"
import {
  nCotasAtingidas,
  indiceAlinhado,
  filtrarPorIndice,
  passosPorIndice,
  primeiraCotaExposta,
} from "./cotas.ts"

const COTAS = [1, 1.5, 2, 2.5, 2.6215]

test("nCotasAtingidas conta as cotas ja atingidas", () => {
  assert.equal(nCotasAtingidas(COTAS, 2.0), 3)
  assert.equal(nCotasAtingidas(COTAS, 0.5), 0)
  assert.equal(nCotasAtingidas(COTAS, null), 0)
  assert.equal(nCotasAtingidas(COTAS, 2.6215), 5)
})

test("indiceAlinhado so devolve o indice com o mesmo tamanho da base", () => {
  assert.deepEqual(indiceAlinhado([1, 0, 2], 3), [1, 0, 2])
  assert.equal(indiceAlinhado([1, 0], 3), null)
  assert.equal(indiceAlinhado(undefined, 3), null)
})

test("filtrarPorIndice usa o indice por ponto", () => {
  assert.deepEqual(
    filtrarPorIndice(["a", "b", "c"], [1, 0, 3], 2, () => 0),
    ["a"]
  )
  assert.deepEqual(
    filtrarPorIndice(["a", "b", "c"], [1, 0, 3], 3, () => 0),
    ["a", "c"]
  )
})

test("filtrarPorIndice com zero cotas atingidas devolve vazio", () => {
  assert.deepEqual(
    filtrarPorIndice(["a", "b", "c"], [1, 0, 3], 0, () => 1),
    []
  )
})

test("filtrarPorIndice sem indice cai na amostragem do raster", () => {
  assert.deepEqual(
    filtrarPorIndice(["a", "b"], null, 2, (f) => (f === "a" ? 1 : 0)),
    ["a"]
  )
})

test("passosPorIndice trata passos irregulares", () => {
  const p = passosPorIndice(COTAS)
  const esperado = [0, 0.5, 0.5, 0.5, 0.5, 0.1215]
  assert.equal(p.length, esperado.length)
  esperado.forEach((v, i) =>
    assert.ok(Math.abs(p[i] - v) < 1e-5, `posicao ${i}: ${p[i]} != ${v}`)
  )
})

test("primeiraCotaExposta acha a menor cota com algo exposto", () => {
  assert.equal(
    primeiraCotaExposta({
      "1.0": { empresas: { valor_exposto_brl: 0 } },
      "1.5": { saude: { valor_exposto_brl: 10 } },
    }),
    1.5
  )
  assert.equal(
    primeiraCotaExposta({ "1.0": { empresas: { valor_exposto_brl: 0 } } }),
    null
  )
})
