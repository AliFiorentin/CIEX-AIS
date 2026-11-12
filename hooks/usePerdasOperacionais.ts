"use client"

import { useEffect, useState } from "react"
import type {
  CenarioPerdas,
  PerdasData,
} from "@/app/perdas-operacionais/PerdasClient"

const URL_PERDAS_OPERACIONAIS = "/dados_convertidos/perdas_operacionais.json"
let cache: Record<string, CenarioPerdas> | null = null

/**
 * Carrega as perdas operacionais dos cenarios que estao em perdas_operacionais.json
 * (incluindo "Simulacao de Maio de 2024 + 50%" e "Nivel da Lagoa + Chuva Acumulada – 16/05/2024").
 */
export function usePerdasOperacionais(): {
  perdas: Record<string, CenarioPerdas> | null
  carregando: boolean
  erro: boolean
} {
  const [perdas, setPerdas] = useState<Record<string, CenarioPerdas> | null>(
    cache
  )
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (cache) return
    const ctrl = new AbortController()
    fetch(URL_PERDAS_OPERACIONAIS, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<PerdasData>
      })
      .then((json) => {
        cache = json["Rio Grande"] ?? {}
        setPerdas(cache)
        setErro(false)
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setErro(true)
      })
    return () => ctrl.abort()
  }, [])

  return { perdas, carregando: !perdas && !erro, erro }
}
