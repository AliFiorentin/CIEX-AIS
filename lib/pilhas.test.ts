import { test } from "node:test"
import assert from "node:assert/strict"
import { detectarPilha, pontosNaPilha } from "./pilhas.ts"

// Pilha de geocodificação: muitos estabelecimentos de CEPs diferentes no mesmo ponto (o geocodificador caindo
// num ponto padrão). Vários no mesmo CEP (um prédio comercial) não contam.

const PONTO = [-52.09913, -32.03343]
const f = (lon: number, lat: number, cep: string | null) => ({
  geometry: { coordinates: [lon, lat] },
  properties: { cep },
})
const pilha = (n: number, ceps: number) =>
  Array.from({ length: n }, (_, i) =>
    f(PONTO[0], PONTO[1], `9620${String(i % ceps).padStart(4, "0")}`)
  )

test("detecta o ponto com muitos CEPs distintos", () => {
  const r = detectarPilha(pilha(25, 12))
  assert.ok(r)
  assert.equal(r.n, 25)
  assert.equal(r.ceps, 12)
  assert.equal(r.lon, PONTO[0])
  assert.equal(r.lat, PONTO[1])
})

test("muitos no mesmo CEP não é pilha", () => {
  assert.equal(detectarPilha(pilha(25, 1)), null)
})

test("poucos pontos não é pilha", () => {
  assert.equal(detectarPilha(pilha(5, 5)), null)
})

test("ruído de ponto flutuante não separa a pilha", () => {
  const feats = pilha(25, 12).map((x, i) =>
    f(PONTO[0] + (i % 3) * 1e-7, PONTO[1] - (i % 2) * 1e-7, x.properties.cep)
  )
  assert.equal(detectarPilha(feats)?.n, 25)
})

test("feições sem geometria são ignoradas", () => {
  const feats = [
    ...pilha(25, 12),
    { properties: { cep: "1" } },
    { geometry: {}, properties: {} },
  ]
  assert.equal(detectarPilha(feats)?.n, 25)
})

test("limites configuráveis", () => {
  assert.ok(detectarPilha(pilha(8, 4), { minPontos: 5, minCeps: 3 }))
})

test("devolve a maior pilha quando há duas", () => {
  const outra = Array.from({ length: 22 }, (_, i) =>
    f(-52.2, -32.1, `7${String(i).padStart(7, "0")}`)
  )
  assert.equal(detectarPilha([...outra, ...pilha(30, 15)])?.n, 30)
})

test("pontosNaPilha conta quantas feições estão no ponto da pilha", () => {
  const p = detectarPilha(pilha(25, 12))!
  const subconjunto = [...pilha(7, 7), f(-52.2, -32.1, "9")]
  assert.equal(pontosNaPilha(subconjunto, p), 7)
  assert.equal(pontosNaPilha([], p), 0)
})
