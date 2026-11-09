import type { Metadata } from "next";
import { MetodologiaContent } from "./MetodologiaContent";
import { getComparativoData } from "../danos/get-data";

export const metadata: Metadata = {
  title: "Metodologia — Rio Grande (RS)",
  description: "Metodologia de cruzamento espacial e cálculo de indicadores do Painel de Vulnerabilidade Econômica — CIEX/GPEA.",
};

export default function MetodologiaPage() {
  return <MetodologiaContent comparativo={getComparativoData()} />;
}
