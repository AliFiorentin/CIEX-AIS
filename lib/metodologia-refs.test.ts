import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { join } from "node:path"

const RAIZ = fileURLToPath(new URL("../", import.meta.url))
const metodologia = readFileSync(join(RAIZ, "app/metodologia/MetodologiaContent.tsx"), "utf8")

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? arquivos(p) : /\.(tsx|ts)$/.test(n) ? [p] : []
  })

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

// <Section id="x" num="N" title="Título"> (em uma ou várias linhas)
const secoes = [...metodologia.matchAll(/<Section\s+id="([a-z-]+)"\s+num="(\d+)"\s+title="([^"]+)"/g)].map((m) => ({
  id: m[1],
  num: Number(m[2]),
  titulo: m[3],
}))
const numDe = (id: string) => secoes.find((s) => s.id === id)?.num

test("os números das seções são 1..14, consecutivos e na ordem do arquivo", () => {
  assert.deepEqual(
    secoes.map((s) => s.num),
    Array.from({ length: 14 }, (_, i) => i + 1)
  )
})

test("a nova seção de dano evitado é a 12, Limitações é a 13 e Fontes a 14", () => {
  assert.equal(numDe("dano-evitado"), 12)
  assert.equal(secoes.find((s) => s.id === "dano-evitado")?.titulo, "Cenários de Intervenção e Dano Evitado")
  assert.equal(numDe("limitacoes"), 13)
  assert.equal(numDe("fontes"), 14)
  assert.equal(numDe("danos"), 10)
  assert.equal(numDe("dano-fisico"), 11)
})

test("o sumário lista cada seção com o mesmo número e o mesmo título", () => {
  const toc = [...metodologia.matchAll(/\["#([a-z-]+)", "(\d+)\. ([^"]+)"\]/g)]
  assert.equal(toc.length, 14)
  for (const [, id, num, titulo] of toc) {
    const s = secoes.find((x) => x.id === id)
    assert.ok(s, `sumário aponta para #${id}, que não existe`)
    assert.equal(s.num, Number(num), `#${id}: número`)
    assert.ok(semAcento(s.titulo).includes(semAcento(titulo.replace(/\s*\(.*\)$/, ""))), `#${id}: título "${titulo}" x "${s.titulo}"`)
  }
})

test("toda referência 'Seção N' perto de um link para #âncora cita o número da seção dessa âncora", () => {
  const erros: string[] = []
  for (const f of [...arquivos(join(RAIZ, "app")), join(RAIZ, "lib/pilhas.ts")]) {
    const txt = readFileSync(f, "utf8")
    for (const m of txt.matchAll(/href="(?:\/metodologia)?#([a-z-]+)"[\s\S]{0,260}?Seção (\d+)/g)) {
      const esperado = numDe(m[1])
      if (esperado !== undefined && esperado !== Number(m[2])) erros.push(`${f.replace(RAIZ, "")}: #${m[1]} é a seção ${esperado}, mas o texto diz ${m[2]}`)
    }
  }
  assert.deepEqual(erros, [])
})

test("'Seção N: Rótulo' no texto da Metodologia aponta para uma seção cujo título contém o rótulo", () => {
  const erros: string[] = []
  for (const m of metodologia.matchAll(/Seção (\d+): ([A-Za-zÀ-ÿ ]+?)(?=\s*(?:<|\{|\n|$|\.|,))/g)) {
    const s = secoes.find((x) => x.num === Number(m[1]))
    if (!s || !semAcento(s.titulo).includes(semAcento(m[2].trim()))) erros.push(`Seção ${m[1]}: ${m[2]} x ${s?.titulo}`)
  }
  assert.deepEqual(erros, [])
})

test("a Seção 12 tem a âncora dano-evitado e a subseção lim-intervencoes existe em Limitações", () => {
  assert.match(metodologia, /id="dano-evitado"/)
  assert.match(metodologia, /id="lim-intervencoes"/)
})
