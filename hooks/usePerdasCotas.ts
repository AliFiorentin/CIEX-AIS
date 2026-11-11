"use client"

import { useEffect, useState } from "react"
import type { PerdasCota, PerdasCotasJson } from "@/lib/cotas-types"

const URL_PERDAS_COTAS = "/dados_convertidos/perdas_cotas.json"
let cache: Record<string, PerdasCota> | null = null // o JSON não muda: carrega uma vez

/**
 * Perdas operacionais por cota (perdas_cotas.json), chaveadas como climada_cota_detalhe. `erro` cobre falha de rede e
 * arquivo ausente: o card mostra "indisponível" em vez de ficar em branco.
 */
export function usePerdasCotas(): {
  perdas: Record<string, PerdasCota> | null
  erro: boolean
} {
  const [perdas, setPerdas] = useState(cache)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (cache) return
    const ctrl = new AbortController()
    fetch(URL_PERDAS_COTAS, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<PerdasCotasJson>
      })
      .then((json) => {
        cache = json["Rio Grande"].por_cota
        setPerdas(cache)
        setErro(false)
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setErro(true)
      })
    return () => ctrl.abort()
  }, [])

  return { perdas, erro }
}
