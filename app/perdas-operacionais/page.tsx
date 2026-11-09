import type { Metadata } from "next"
import { PerdasClient } from "./PerdasClient"
import { getComparativoData, getPerdasData } from "../danos/get-data"

export const metadata: Metadata = {
  title: "Perdas Operacionais — Rio Grande (RS)",
  description:
    "Perdas operacionais (perdas econômicas, metodologia DaLA/CEPAL) causadas por cenários de inundação em Rio Grande/RS, com o dano evitado pelas intervenções.",
}

export default function PerdasOperacionaisPage() {
  return <PerdasClient dados={getPerdasData()} comparativo={getComparativoData()} />
}
