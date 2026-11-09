import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error next.config.mjs não tem declaração de tipos (o teste só lê o objeto exportado)
import config from "../next.config.mjs"

type Regra = {
  source: string
  destination: string
  permanent: boolean
  has?: { type: string; key: string; value?: string }[]
}

test("redirecionamentos: links antigos de /perdas e /danos chegam às páginas novas", async () => {
  const regras: Regra[] = await config.redirects()
  assert.deepEqual(regras, [
    {
      source: "/danos",
      has: [{ type: "query", key: "aba", value: "fisico" }],
      destination: "/danos-fisicos",
      permanent: true,
    },
    { source: "/danos", destination: "/perdas-operacionais", permanent: true },
    { source: "/perdas", destination: "/perdas-operacionais", permanent: true },
  ])
})

test("a regra de /danos com aba=fisico vem antes da genérica de /danos", async () => {
  const regras: Regra[] = await config.redirects()
  const iEspecifica = regras.findIndex((r) => r.source === "/danos" && r.has)
  const iGenerica = regras.findIndex((r) => r.source === "/danos" && !r.has)
  assert.ok(iEspecifica >= 0 && iGenerica >= 0)
  assert.ok(iEspecifica < iGenerica)
})

test("nenhum redirecionamento aponta para uma rota que não existe", async () => {
  const regras: Regra[] = await config.redirects()
  const destinos = new Set(regras.map((r) => r.destination))
  assert.deepEqual([...destinos].sort(), [
    "/danos-fisicos",
    "/perdas-operacionais",
  ])
})
