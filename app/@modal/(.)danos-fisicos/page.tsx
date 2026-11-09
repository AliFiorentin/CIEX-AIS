import { FisicosClient } from "@/app/danos-fisicos/FisicosClient"
import { getFisicosData } from "@/app/danos/get-data"
import { RouteModal } from "@/components/RouteModal"

export default function DanosFisicosModal() {
  return (
    <RouteModal>
      <FisicosClient expo={getFisicosData()} />
    </RouteModal>
  )
}
