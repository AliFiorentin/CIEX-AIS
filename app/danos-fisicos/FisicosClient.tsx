"use client"

import { Banner } from "@/components/danos/Banner"
import { FisicosView } from "../danos/FisicosView"
import type { ExposicaoMun } from "../danos/types"

/** Danos Físicos: banner + exposição por cota (FisicosView). Os dados são lidos no servidor (../danos/get-data.ts). */
export function FisicosClient({ expo }: { expo: ExposicaoMun | null }) {
  return (
    <div className="min-h-screen bg-[#eef3f4] font-sans text-slate-800">
      <Banner
        ativa="fisicos"
        titulo="Danos Físicos"
        subtitulo="Exposição por cota do pico de 21/05/2024 em Rio Grande (RS)"
        nota="Máscaras molhado/seco · sem profundidade, sem R$ de dano"
      />
      <FisicosView expo={expo} />
    </div>
  )
}
