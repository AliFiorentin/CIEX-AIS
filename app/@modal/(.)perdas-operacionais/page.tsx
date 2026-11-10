import { PerdasClient } from "@/app/perdas-operacionais/PerdasClient"
import { getComparativoData, getPerdasData } from "@/app/danos/get-data"
import { RouteModal } from "@/components/RouteModal"

export default function PerdasOperacionaisModal() {
  return (
    <RouteModal>
      <PerdasClient
        dados={getPerdasData()}
        comparativo={getComparativoData()}
      />
    </RouteModal>
  )
}
