import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  ALTURA_SIMULACAO,
  EVENTOS_SIMULACAO,
  desmontarEfetivo,
  INTERVENCOES,
  abaDoPainel,
  eventoDoCodigo,
  lerIntervencao,
  nomeEfetivo,
  scenarioSlug,
  slugify,
  temIntervencao,
  todosNomesEfetivos,
} from "./cenarios.ts"

// Os mesmos 12 slugs de scripts/tests/test_cenarios_intervencao.py (paridade Python x TypeScript).
const SLUGS = [
  "setembro_de_2023",
  "novembro_de_2023",
  "maio_de_2024",
  "junho_de_2025",
].flatMap((data) =>
  ["sem_intervencao", "diques", "diques_barragens"].map(
    (v) => `rio_grande___simulacao_de_${data}_${v}`
  )
)

const SIM = "Simulação de Setembro de 2023"

test("slugify remove acentos e pontuação (igual ao Python)", () => {
  assert.equal(
    slugify("Nível da Lagoa + Chuva Acumulada – 16/05/2024"),
    "nivel_da_lagoa_chuva_acumulada_16_05_2024"
  )
  assert.equal(
    scenarioSlug("Simulação de Maio de 2024 + 50%"),
    "rio_grande___simulacao_de_maio_de_2024_50"
  )
})

test("todosNomesEfetivos mapeia exatamente para os 12 slugs de arquivo", () => {
  const slugs = todosNomesEfetivos().map(scenarioSlug)
  assert.equal(slugs.length, 12)
  assert.deepEqual([...slugs].sort(), [...SLUGS].sort())
})

test("nomeEfetivo compõe evento e intervenção", () => {
  assert.equal(
    nomeEfetivo(SIM, "diques-barragens"),
    "Simulação de Setembro de 2023 – Diques + barragens"
  )
  assert.equal(
    nomeEfetivo(SIM, "sem-intervencao"),
    "Simulação de Setembro de 2023 – Sem intervenção"
  )
  assert.equal(
    nomeEfetivo("Simulação de Junho de 2025", "diques"),
    "Simulação de Junho de 2025 – Diques"
  )
})

test("a intervenção é ignorada em cenário antigo", () => {
  assert.equal(nomeEfetivo("Cenário Maio 2024", "diques"), "Cenário Maio 2024")
  assert.equal(temIntervencao("Cenário Maio 2024"), false)
  assert.equal(temIntervencao("Simulação por Cotas"), false)
  assert.equal(temIntervencao("(nenhum)"), false)
  assert.equal(temIntervencao(SIM), true)
})

test("desmontarEfetivo é o inverso de nomeEfetivo nos 12 cenários e identidade nos demais", () => {
  for (const e of EVENTOS_SIMULACAO)
    for (const i of INTERVENCOES)
      assert.deepEqual(desmontarEfetivo(nomeEfetivo(e.nome, i.id)), {
        evento: e.nome,
        intervencao: i.id,
      })
  assert.deepEqual(desmontarEfetivo("Cenário Maio 2024"), {
    evento: "Cenário Maio 2024",
    intervencao: "sem-intervencao",
  })
  assert.deepEqual(desmontarEfetivo("Simulação por Cotas"), {
    evento: "Simulação por Cotas",
    intervencao: "sem-intervencao",
  })
  assert.deepEqual(desmontarEfetivo("(nenhum)"), {
    evento: "(nenhum)",
    intervencao: "sem-intervencao",
  })
})

test("abaDoPainel: Dano Evitado só com simulação e intervenção diferente de sem-intervencao", () => {
  assert.equal(abaDoPainel(SIM, "diques"), "dano-evitado")
  assert.equal(abaDoPainel(SIM, "diques-barragens"), "dano-evitado")
  assert.equal(abaDoPainel(SIM, "sem-intervencao"), "resumo")
  assert.equal(abaDoPainel("Cenário Maio 2024", "diques"), "resumo")
})

test("lerIntervencao: valor inválido ou ausente cai em sem-intervencao", () => {
  assert.equal(lerIntervencao("diques"), "diques")
  assert.equal(lerIntervencao("diques-barragens"), "diques-barragens")
  assert.equal(lerIntervencao("xyz"), "sem-intervencao")
  assert.equal(lerIntervencao(""), "sem-intervencao")
  assert.equal(lerIntervencao(null), "sem-intervencao")
  assert.equal(lerIntervencao(undefined), "sem-intervencao")
})

test("eventoDoCodigo devolve o nome do evento ou undefined", () => {
  assert.equal(eventoDoCodigo("simulacao-setembro-2023"), SIM)
  assert.equal(
    eventoDoCodigo("simulacao-junho-2025"),
    "Simulação de Junho de 2025"
  )
  assert.equal(eventoDoCodigo("nao-existe"), undefined)
  assert.equal(eventoDoCodigo(null), undefined)
})

test("há 4 eventos e 3 intervenções, com códigos de URL únicos", () => {
  assert.equal(EVENTOS_SIMULACAO.length, 4)
  assert.equal(INTERVENCOES.length, 3)
  assert.equal(new Set(EVENTOS_SIMULACAO.map((e) => e.codigo)).size, 4)
})

test("ALTURA_SIMULACAO: coords são os bounds gravados pelo conversor nos 12 conjuntos e a legenda tem 7 faixas", () => {
  const meta = JSON.parse(
    readFileSync(
      new URL("../scripts/data/intervencoes_mancha_meta.json", import.meta.url),
      "utf8"
    )
  )
  const chaves = Object.keys(meta)
  assert.equal(chaves.length, 12)
  const [left, bottom, right, top] = meta[chaves[0]].bounds
  for (const k of chaves)
    assert.deepEqual(meta[k].bounds, [left, bottom, right, top], k)
  assert.deepEqual(ALTURA_SIMULACAO.coords, [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ])
  assert.equal(ALTURA_SIMULACAO.legenda.length, 7)
  assert.equal(ALTURA_SIMULACAO.legenda[0].cor, "#b8a1d9")
  assert.equal(ALTURA_SIMULACAO.legenda[6].cor, "#ff0000")
})
