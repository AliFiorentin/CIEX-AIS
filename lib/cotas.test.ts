import { test } from "node:test"
import assert from "node:assert/strict"
import {
  nCotasAtingidas,
  indiceAlinhado,
  filtrarPorIndice,
  passosPorIndice,
  primeiraCotaExposta,
  popAtingidaNaCota,
  chaveCotaAtingida,
  perdasCotaEmDias,
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

test("popAtingidaNaCota devolve a populacao da cota atual (acumulada)", () => {
  const pop = {
    por_cota: COTAS.map((cota, i) => ({
      cota,
      pop_atingida: (i + 1) * 100,
      pct_atingida: i + 1,
    })),
  }
  assert.deepEqual(popAtingidaNaCota(pop, COTAS, 3), {
    pop_atingida: 300,
    pct_atingida: 3,
    _metodologia: undefined,
  })
  assert.equal(popAtingidaNaCota(pop, COTAS, 5)?.pop_atingida, 500)
  assert.equal(popAtingidaNaCota(pop, COTAS, 9)?.pop_atingida, 500)
  assert.equal(popAtingidaNaCota(pop, COTAS, 0)?.pop_atingida, 0)
})

test("popAtingidaNaCota nao mostra valor desalinhado ou ausente", () => {
  const pop = { por_cota: [{ cota: 1, pop_atingida: 5, pct_atingida: 0 }] }
  assert.equal(popAtingidaNaCota(null, COTAS, 2), null)
  assert.equal(popAtingidaNaCota(undefined, COTAS, 2), null)
  assert.equal(popAtingidaNaCota(pop, COTAS, 1), null) // tamanho diferente
  const outras = {
    por_cota: COTAS.map((c) => ({
      cota: c + 1,
      pop_atingida: 1,
      pct_atingida: 1,
    })),
  }
  assert.equal(popAtingidaNaCota(outras, COTAS, 2), null) // cotas diferentes
})

test("chaveCotaAtingida devolve a ultima cota ja atingida", () => {
  const chaves = ["1.0", "1.5", "2.0", "2.5", "2.6215"]
  assert.equal(chaveCotaAtingida(chaves, 1.7), "1.5")
  assert.equal(chaveCotaAtingida(chaves, 2.0), "2.0")
  assert.equal(chaveCotaAtingida(chaves, 2.6215), "2.6215")
  assert.equal(chaveCotaAtingida(chaves, 0.4), null)
  assert.equal(chaveCotaAtingida(chaves, null), null)
})

test("perdasCotaEmDias reescala por dias efetivos e mantem a agricultura fixa", () => {
  const p = {
    dias_efetivos: 60,
    empresas_vab: 600,
    educacao_perdas: 60,
    educacao_custo_adicional: 60,
    saude_producao: 120,
    agricultura_perdas: 50,
  }
  assert.deepEqual(perdasCotaEmDias(p, 30), {
    empresas: 300,
    educacao: 60,
    saude: 60,
    agricultura: 50,
    total: 470,
  })
  assert.equal(perdasCotaEmDias({ ...p, dias_efetivos: 0 }, 30).total, 50)
})
