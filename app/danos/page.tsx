import type { Metadata } from "next"
import { DanosClient } from "./DanosClient"
import { getDanosData } from "./get-data"

export const metadata: Metadata = {
  title: "Danos — Rio Grande (RS)",
  description:
    "Danos operacionais (perdas econômicas, metodologia DaLA/CEPAL) e danos físicos (exposição por cota) causados por cenários de inundação em Rio Grande/RS.",
}

export default function DanosPage() {
  return <DanosClient dados={getDanosData()} />
}
