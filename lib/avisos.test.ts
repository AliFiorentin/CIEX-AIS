import { test } from "node:test"
import assert from "node:assert/strict"
import { AVISO_BASES, AVISO_MAIO_2024_MAIS_50, rotuloPopulacao } from "./avisos.ts"

const ESTIMADA = {
  pop_atingida: 18000,
  pct_atingida: 9.1,
  _metodologia:
    "estimado: proxy do alfa de populacao.png dividido pelo fator de calibracao 0.54 (medido nos 3 cenarios com valor exato; faixa 15900 a 19000) -- ver scripts/estimar_populacao_atingida.py",
}

test("F1: população estimada por proxy é rotulada como estimativa, com a faixa", () => {
  const r = rotuloPopulacao(ESTIMADA)
  assert.equal(r.estimado, true)
  assert.match(r.texto, /estimad/i)
  assert.match(r.texto, /15\.900/)
  assert.match(r.texto, /19\.000/)
})

test("F1: população exata (sem _metodologia) não é rotulada como estimativa", () => {
  const r = rotuloPopulacao({ pop_atingida: 7844, pct_atingida: 4.0 })
  assert.equal(r.estimado, false)
  assert.ok(!/estimad/i.test(r.texto))
})

test("F2: sem população para o cenário o texto diz 'não calculada'", () => {
  const r = rotuloPopulacao(null)
  assert.equal(r.estimado, false)
  assert.match(r.texto, /não calculada/i)
})

test("F1: metodologia 'estimado' sem faixa legível ainda marca como estimativa, sem NaN", () => {
  const r = rotuloPopulacao({ pop_atingida: 1, pct_atingida: 1, _metodologia: "estimado: proxy" })
  assert.equal(r.estimado, true)
  assert.ok(!/NaN|undefined/.test(r.texto))
})

test("F3: o aviso de '+ 50%' diz que é a água 60 cm mais alta, não 50% a mais de área", () => {
  assert.match(AVISO_MAIO_2024_MAIS_50, /60 cm/)
  assert.match(AVISO_MAIO_2024_MAIS_50, /não 50%/i)
})

test("F7: AVISO_BASES cita as bases e a posição frente ao ano do evento", () => {
  assert.match(AVISO_BASES(2025), /RAIS 2023/)
  assert.match(AVISO_BASES(2025), /anteriores/)
  assert.match(AVISO_BASES(2023), /posteriores/)
  assert.match(AVISO_BASES(2024), /CNES/)
})
