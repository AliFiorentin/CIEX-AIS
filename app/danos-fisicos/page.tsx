import type { Metadata } from "next"
import { FisicosClient } from "./FisicosClient"
import { getComparativoData, getFisicosData } from "../danos/get-data"

export const metadata: Metadata = {
  title: "Danos Físicos — Rio Grande (RS)",
  description:
    "Danos físicos (exposição por cota do pico de 21/05/2024 e das simulações com intervenção) em Rio Grande/RS: o que fica sob a água e quanto vale, como teto do dano.",
}

export default function DanosFisicosPage() {
  return <FisicosClient expo={getFisicosData()} comparativo={getComparativoData()} />
}
