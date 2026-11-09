"use client"

import { useEffect, useState } from "react"
import type { Comparativo } from "@/lib/comparativo"

const URL_COMPARATIVO = "/dados_convertidos/intervencoes_comparativo.json"
let cache: Comparativo | null = null // o JSON é o mesmo para todas as trocas de cenário: carrega uma vez

/**
 * Carrega o comparativo de dano evitado só quando `ativo` (uma simulação com intervenção está selecionada).
 * `erro` cobre falha de rede e arquivo ausente; a interface mostra "dado ausente" em vez de ficar em branco.
 */
export function useComparativo(ativo: boolean): {
  dados: Comparativo | null
  carregando: boolean
  erro: boolean
} {
  const [dados, setDados] = useState<Comparativo | null>(cache)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!ativo || cache) return
    const ctrl = new AbortController()
    fetch(URL_COMPARATIVO, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<Comparativo>
      })
      .then((json) => {
        cache = json
        setDados(json)
        setErro(false)
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setErro(true)
      })
    return () => ctrl.abort()
  }, [ativo])

  return { dados, carregando: ativo && !dados && !erro, erro }
}
