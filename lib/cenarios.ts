// Lógica pura dos cenários de simulação com intervenção (sem React nem DOM), testada em lib/cenarios.test.ts.
//
// O par evento + intervenção vira um "cenário efetivo" (ex.: "Simulação 29/09/2023 – Diques"); o resto do app usa
// esse nome como identificador de arquivo (scenarioSlug) igual aos demais cenários. Os nomes e slugs têm de bater com
// scripts/cenarios_intervencao.py (o teste confere os 12 slugs).

export type IntervencaoId = "sem-intervencao" | "diques" | "diques-barragens"

export const INTERVENCAO_PADRAO: IntervencaoId = "sem-intervencao"

export const INTERVENCOES: { id: IntervencaoId; rotulo: string }[] = [
  { id: "sem-intervencao", rotulo: "Sem intervenção" },
  { id: "diques", rotulo: "Diques" },
  { id: "diques-barragens", rotulo: "Diques + barragens" },
]

/** Eventos simulados com intervenção, em ordem cronológica. `nome` é o valor do seletor de cenário. */
export const EVENTOS_SIMULACAO: { id: string; nome: string; codigo: string }[] =
  [
    {
      id: "2023-09-29",
      nome: "Simulação 29/09/2023",
      codigo: "simulacao-29-09-2023",
    },
    {
      id: "2023-11-29",
      nome: "Simulação 29/11/2023",
      codigo: "simulacao-29-11-2023",
    },
    {
      id: "2024-05-21",
      nome: "Simulação 21/05/2024",
      codigo: "simulacao-21-05-2024",
    },
    {
      id: "2025-06-28",
      nome: "Simulação 28/06/2025",
      codigo: "simulacao-28-06-2025",
    },
  ]

export const slugify = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

export const scenarioSlug = (cen: string) => `rio_grande___${slugify(cen)}`

/** O cenário (valor do seletor) é uma simulação com intervenção? */
export const temIntervencao = (evento: string): boolean =>
  EVENTOS_SIMULACAO.some((e) => e.nome === evento)

/** Nome do cenário efetivo; em cenário antigo (sem intervenção disponível) é o próprio cenário. */
export function nomeEfetivo(
  evento: string,
  intervencao: IntervencaoId
): string {
  if (!temIntervencao(evento)) return evento
  const rotulo =
    INTERVENCOES.find((i) => i.id === intervencao)?.rotulo ??
    INTERVENCOES[0].rotulo
  return `${evento} – ${rotulo}`
}

/** Inverso de nomeEfetivo: o nome efetivo de uma simulação vira {evento, intervencao}; os demais cenários voltam iguais. */
export function desmontarEfetivo(cenario: string): {
  evento: string
  intervencao: IntervencaoId
} {
  for (const e of EVENTOS_SIMULACAO)
    for (const i of INTERVENCOES)
      if (nomeEfetivo(e.nome, i.id) === cenario)
        return { evento: e.nome, intervencao: i.id }
  return { evento: cenario, intervencao: INTERVENCAO_PADRAO }
}

/** Os 12 nomes efetivos (4 eventos × 3 intervenções). */
export const todosNomesEfetivos = (): string[] =>
  EVENTOS_SIMULACAO.flatMap((e) =>
    INTERVENCOES.map((i) => nomeEfetivo(e.nome, i.id))
  )

/** Aba inicial do Painel: com intervenção numa simulação, "Dano Evitado" substitui "Resumo". */
export function abaDoPainel(
  evento: string,
  intervencao: IntervencaoId
): "resumo" | "dano-evitado" {
  return temIntervencao(evento) && intervencao !== "sem-intervencao"
    ? "dano-evitado"
    : "resumo"
}

/** Lê `?intervencao=`; valor inválido ou ausente cai em "sem-intervencao". */
export function lerIntervencao(
  codigo: string | null | undefined
): IntervencaoId {
  return INTERVENCOES.find((i) => i.id === codigo)?.id ?? INTERVENCAO_PADRAO
}

/** Nome do evento a partir do código de URL (`?cenario=`), ou undefined se não for uma simulação. */
export function eventoDoCodigo(
  codigo: string | null | undefined
): string | undefined {
  return EVENTOS_SIMULACAO.find((e) => e.codigo === codigo)?.nome
}

/**
 * Raster de profundidade das simulações: as 12 compartilham limites e legenda. Os limites (NW, NE, SE, SW em
 * graus) são os `bounds` que scripts/converter_intervencoes.py grava em scripts/data/intervencoes_mancha_meta.json.
 */
export const ALTURA_SIMULACAO: {
  coords: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ]
  legenda: { label: string; cor: string }[]
} = {
  coords: [
    [-52.204013, -32.023926], // NW
    [-52.071023, -32.023926], // NE
    [-52.071023, -32.1052], // SE
    [-52.204013, -32.1052], // SW
  ],
  legenda: [
    { label: "10–44 cm", cor: "#b8a1d9" },
    { label: "45–64 cm", cor: "#4b0082" },
    { label: "65–84 cm", cor: "#00ffff" },
    { label: "85–104 cm", cor: "#00ff00" },
    { label: "105–124 cm", cor: "#ffff00" },
    { label: "125–144 cm", cor: "#ff7f00" },
    { label: "≥145 cm", cor: "#ff0000" },
  ],
}
