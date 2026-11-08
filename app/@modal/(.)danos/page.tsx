import { DanosClient } from "@/app/danos/DanosClient"
import { getDanosData } from "@/app/danos/get-data"
import { RouteModal } from "@/components/RouteModal"

export default function DanosModal() {
  return (
    <RouteModal>
      <DanosClient dados={getDanosData()} />
    </RouteModal>
  )
}
