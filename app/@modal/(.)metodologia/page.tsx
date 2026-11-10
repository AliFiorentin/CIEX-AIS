import { MetodologiaContent } from "@/app/metodologia/MetodologiaContent"
import { RouteModal } from "@/components/RouteModal"
import { getComparativoData } from "@/app/danos/get-data"

export default function MetodologiaModal() {
  return (
    <RouteModal>
      <MetodologiaContent comparativo={getComparativoData()} />
    </RouteModal>
  )
}
