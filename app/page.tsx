"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import Map, {
  Source,
  Layer,
  NavigationControl,
  MapRef,
  Popup,
} from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import { setWorkerUrl } from "maplibre-gl"
import * as turf from "@turf/turf"
import Image from "next/image"
import * as flatgeobuf from "flatgeobuf"
import Link from "next/link"

import {
  Building2,
  GraduationCap,
  HeartPulse,
  Wrench,
  Leaf,
  Sprout,
  Landmark,
  Users,
  Layers,
  EyeOff,
  SlidersHorizontal,
  PanelLeft,
  PanelRightClose,
  TrendingDown,
  Info,
  BookOpen,
  Waves,
  LayoutGrid,
  Stethoscope,
  LandPlot,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { DonutChart } from "@/components/ui/donut-chart"
import { FitHeight } from "@/components/FitHeight"
import { CotaCanvasLayer } from "@/components/CotaCanvasLayer"
import { CotaControle } from "@/components/CotaControle"
import { useCotas, useCotaAtingidos } from "@/hooks/useCotas"
import { COTAS_CENARIO } from "@/lib/cotas"
import { detectarPilha, pontosNaPilha } from "@/lib/pilhas"
import { calcEmp, calcEdu, calcSau, STAFF_COLS } from "@/lib/metricas"

// maplibre-gl 6 is ESM-only: worker is copied to public/ by `pnpm copy:maplibre`.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")

// ─── Constantes ──────────────────────────────────────────────────────────────

const COLORS = {
  empresas: "#2563eb",
  educacao: "#16a34a",
  saude: "#dc2626",
  cenario: "#1d4ed8",
  infra: "#f59e0b",
  agricultura: "#6B8E23",
  patrimonio: "#a16207",
}

const INFRA_COLORS: Record<string, string> = {
  Logradouros: "#e67e22",
  Quadras: "#8e44ad",
  Terrenos: "#27ae60",
}

// Coordenadas geográficas dos rasters MapBiomas (EPSG:4326): [NW, NE, SE, SW]
// Agricultura e Cobertura usam o mesmo TIFF extent (município de Rio Grande)
const RASTER_COORDS: [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
] = [
  [-52.69778, -31.76883],
  [-52.058269, -31.76883],
  [-52.058269, -32.648461],
  [-52.69778, -32.648461],
]

// Paleta para gráficos de rosca
const DONUT_COLORS = [
  "#1e404a",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#be185d",
  "#059669",
  "#b45309",
]

// Cores por classe de cobertura (MapBiomas Col.10) — sem classes agricolas
const COBERTURA_COLORS: Record<string, string> = {
  Silvicultura: "#7a5900",
  "Campo Alagado e Area Pantanosa": "#519799",
  "Formacao Campestre": "#d6bc74",
  "Mosaico de Usos": "#E8C06B",
  "Restinga Arborea": "#02d659",
  "Restinga Herbacea": "#ad5100",
}

// Cores por cultura agricola
const AGRI_COLORS: Record<string, string> = {
  Soja: "#D4A017",
  Arroz: "#4FC3F7",
  "Outras Lavouras Temporarias": "#AED581",
}

// CIEX brand
const C = {
  primary: "#1E404A",
  dark: "#163037",
  field: "#255362",
  bg: "#ffffff",
  cardBg: "#f8f9fa",
  border: "#e2e5e2",
  muted: "#6b7a69",
}

// Gradiente de marca CIEX (135°) — usado em cabeçalhos de card, header e painéis
const BRAND_GRADIENT = `linear-gradient(135deg, ${C.primary} 0%, ${C.field} 100%)`

// Efeito "glass" (glassmorphism) — paleta CIEX preservada via tinte na cor de fundo.
// `tint` opcional: cor de marca aplicada como fundo translúcido (ex.: header sobre o mapa).
const glassStyle = (opacity = 0.55, tint?: string) =>
  ({
    backgroundColor: tint
      ? `${tint}${Math.round(opacity * 255)
          .toString(16)
          .padStart(2, "0")}`
      : `rgba(255,255,255,${opacity})`,
    backdropFilter: "saturate(180%) blur(20px)",
    WebkitBackdropFilter: "saturate(180%) blur(20px)",
    border: tint
      ? `0.5px solid rgba(255,255,255,0.18)`
      : "0.5px solid rgba(255,255,255,0.6)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
  }) as const

// Fundo padrão de TODOS os cards/gráficos/elementos do Painel (translúcido)
const PANEL_CARD_BG = "rgba(255,255,255,0.55)"
const PANEL_TRACK_BG = "rgba(30,64,74,0.10)"

// Tipografia fluida do header (clamp: min, vw, max) — evita quebra em notebooks pequenos
const HEADER_FLUID = {
  logoH: "clamp(20px, 1.8vw, 28px)",
  logoHSecondary: "clamp(17px, 1.55vw, 24px)",
  titleSize: "clamp(11px, 1.05vw, 15px)",
  subtitleSize: "clamp(7px, 0.65vw, 9px)",
  selectLabelSize: "clamp(7px, 0.65vw, 9px)",
  selectTriggerSize: "clamp(9px, 0.85vw, 11px)",
}

// Botões de navegação do cabeçalho (Perdas · Danos Físicos · Metodologia)
const NAV_LINK_CLASS =
  "active-press hover-lift flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 font-black whitespace-nowrap text-white/90 hover:bg-white/20 focus-visible:outline-none"
const NAV_LINK_STYLE = {
  fontSize: "var(--btn-size)",
  height: "var(--btn-h)",
} as const

// Tipografia fluida dos cards do painel de análise (clamp: min, vh, max) — o painel rola verticalmente
const PANEL_FLUID = {
  donutCss: "clamp(120px, 19vh, 170px)",
  donutStroke: 22,
  fontValor: "clamp(16px, 2.4vh, 24px)",
  fontLabel: "clamp(8px, 1.05vh, 10px)",
}

// Header em glass tintado com a marca CIEX (gradiente translúcido + blur do mapa por trás)
const HEADER_GLASS = {
  backgroundImage:
    "linear-gradient(135deg, rgba(30,64,74,0.82) 0%, rgba(37,83,98,0.82) 100%)",
  backdropFilter: "saturate(180%) blur(20px)",
  WebkitBackdropFilter: "saturate(180%) blur(20px)",
  border: "0.5px solid rgba(255,255,255,0.18)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)",
} as const

// Ordem cronológica do evento (Setembro 2023 é anterior a Maio 2024).
const CENARIOS = [
  "Cenário Setembro 2023",
  "Cenário Maio 2024",
  "Cenário Maio 2024 + 50%",
  "Nível da Lagoa + Chuva Acumulada – 16/05/2024",
  COTAS_CENARIO, // água avançando por cota (só exposição; ver hooks/useCotas.ts)
]
// Cenário inicial ao carregar sem permalink — independente da posição no
// array acima, para a ordem de exibição não mudar o comportamento padrão.
const DEFAULT_CENARIO = "Cenário Maio 2024"

// Códigos curtos e legíveis para a URL (?cenario=<código>) — independentes do
// slug interno usado nos nomes de arquivo (scenarioSlug/slugify), para não
// acoplar a estética do link compartilhável à convenção de nomenclatura dos
// dados. Todo cenário novo precisa de uma entrada aqui.
const CENARIO_URL_SLUGS: Record<string, string> = {
  "Cenário Maio 2024": "maio-2024",
  "Cenário Maio 2024 + 50%": "maio-2024-mais-50",
  "Cenário Setembro 2023": "setembro-2023",
  "Nível da Lagoa + Chuva Acumulada – 16/05/2024": "lagoa-chuva-16-05-2024",
  [COTAS_CENARIO]: "todas-as-cotas",
}
const cenarioParaUrl = (nome: string) =>
  CENARIO_URL_SLUGS[nome] ?? slugify(nome)
// Câmera de cada cenário (centro e zoom), usada como posição inicial e ao trocar de cenário.
// Cenário sem entrada aqui enquadra a mancha (fitBounds). Uma URL com lng/lat/zoom explícitos tem prioridade.
const CENARIO_VISTA: Record<
  string,
  { lng: number; lat: number; zoom: number }
> = {
  "Cenário Setembro 2023": { lng: -52.16722, lat: -32.0562, zoom: 11.8 },
  "Cenário Maio 2024": { lng: -52.16827, lat: -32.04972, zoom: 11.8 },
  "Cenário Maio 2024 + 50%": { lng: -52.18762, lat: -32.09603, zoom: 11.07 },
  "Nível da Lagoa + Chuva Acumulada – 16/05/2024": {
    lng: -52.15801,
    lat: -32.05772,
    zoom: 11.8,
  },
  [COTAS_CENARIO]: { lng: -52.16756, lat: -32.05942, zoom: 11.8 },
}
const urlParaCenario = (codigo: string) =>
  CENARIOS.find((c) => CENARIO_URL_SLUGS[c] === codigo)

const AVISO_MANCHA_BINARIA =
  "Mancha binária: áreas com lâmina d'água ≥ 10 cm decorrente de acúmulo de chuva. Não indica extensão de alagamento contínuo nem profundidade além do limiar mínimo."

// Manchas estilizadas por raster (altura da lâmina d'água), em vez do
// preenchimento de cor única usado pelos demais cenários. Bounds e paleta
// derivados do estilo QGIS (.qml) original — ver scripts/converter_manchas_altura.py
// e README.md ("Manchas de altura da lâmina d'água") para a metodologia completa.
// A área atingida é a união das duas simulações (nível da lagoa + chuva
// acumulada); no raster, a classificação da Lagoa tem prioridade onde as
// duas se sobrepõem, com o lilás da Chuva preenchendo o restante.
const ALTURA_MANCHAS: Record<
  string,
  {
    coords: [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ]
    legenda: { label: string; cor: string }[]
  }
> = {
  "Nível da Lagoa + Chuva Acumulada – 16/05/2024": {
    coords: [
      [-52.204013, -32.023926], // NW — preencher com o output do script
      [-52.071023, -32.023926], // NE
      [-52.071023, -32.1052], // SE
      [-52.204013, -32.1052], // SW
    ],
    legenda: [
      { label: "45–64 cm", cor: "#4b0082" },
      { label: "65–84 cm", cor: "#00ffff" },
      { label: "85–104 cm", cor: "#00ff00" },
      { label: "105–124 cm", cor: "#ffff00" },
      { label: "125–144 cm", cor: "#ff7f00" },
      { label: "≥145 cm", cor: "#ff0000" },
      { label: "Chuva acumulada ≥10cm", cor: "#ba82e6" },
    ],
  },
}

const INFRA_LAYERS = ["Logradouros", "Quadras", "Terrenos"]

const EMPTY_GEO: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
}

const INFRA_TAMANHOS_MB: Record<string, number> = {
  Terrenos: 17,
}

const STAFF_LABELS: Record<string, string> = {
  staff_acs_endemias: "ACS/Endemias",
  staff_admin_gestao_apoio: "Admin/Gestão",
  staff_diag_lab_imagem: "Diag/Imagem",
  staff_enfermagem: "Enfermagem",
  staff_farmacia: "Farmácia",
  staff_medicos: "Médicos",
  staff_odontologia: "Odontologia",
  staff_outros: "Outros",
  staff_outros_superior_saude: "Outros (Sup.)",
  staff_servicos_gerais: "Serviços Gerais",
  staff_transporte_urgencia: "Transporte",
}

const DEP_LABELS: Record<string, string> = {
  "1": "Federal",
  "2": "Estadual",
  "3": "Municipal",
  "4": "Privada",
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

// Cenário sem agricultura atingida não tem .fgb (o arquivo é removido por estar vazio). As estatísticas
// agrícolas ({} quando não há nada) existem para todo cenário e dizem isso sem gerar 404 no console.
async function loadAgriculturaAtingida(
  sSlug: string,
  signal?: AbortSignal
): Promise<any> {
  const base = "/dados_convertidos/rio_grande/cenarios"
  try {
    const r = await fetch(
      `${base}/agricultura_stats_${sSlug}.json`,
      signal ? { signal } : {}
    )
    if (r.ok) {
      const stats = await r.json()
      if (!stats || Object.keys(stats).length === 0) return null
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e
  }
  return loadFGB(`${base}/agricultura_ATINGIDOS_${sSlug}.fgb`, signal)
}

async function loadFGB(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, signal ? { signal } : {})
  if (!res.ok || !res.body) return null
  const features: any[] = []
  for await (const f of flatgeobuf.geojson.deserialize(res.body)) {
    features.push(f)
  }
  return { type: "FeatureCollection", features }
}

const slugify = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

const scenarioSlug = (cen: string) => `rio_grande___${slugify(cen)}`

const normalizeDep = (val: string) => DEP_LABELS[val] || val

// Remove prefixo numérico de classificação (ex.: "6- Arquitetura Civil Privada" → "Arquitetura Civil Privada")
const normalizeTipologia = (val: string) => val.replace(/^\d+-\s*/, "").trim()

// Seções CNAE 2.0 — a fonte (RAIS) vem em caixa alta e sem acentos; mapeamos para o rótulo correto em pt-BR
const SETOR_LABELS: Record<string, string> = {
  "ADMINISTRACAO PUBLICA, DEFESA E SEGURIDADE SOCIAL":
    "Administração Pública, Defesa e Seguridade Social",
  "AGRICULTURA, PECUARIA, PRODUCAO FLORESTAL, PESCA E AQUICULTURA":
    "Agricultura, Pecuária, Produção Florestal, Pesca e Aquicultura",
  "AGUA, ESGOTO, GESTAO DE RESIDUOS E DESCONTAMINACAO":
    "Água, Esgoto, Gestão de Resíduos e Descontaminação",
  "ALOJAMENTO E ALIMENTACAO": "Alojamento e Alimentação",
  "ARTES, CULTURA, ESPORTE E RECREACAO": "Artes, Cultura, Esporte e Recreação",
  "ATIVIDADES ADMINISTRATIVAS E SERVICOS COMPLEMENTARES":
    "Atividades Administrativas e Serviços Complementares",
  "ATIVIDADES FINANCEIRAS E SEGUROS": "Atividades Financeiras e Seguros",
  "ATIVIDADES IMOBILIARIAS": "Atividades Imobiliárias",
  "ATIVIDADES PROFISSIONAIS, CIENTIFICAS E TECNICAS":
    "Atividades Profissionais, Científicas e Técnicas",
  "COMERCIO; REPARACAO DE VEICULOS": "Comércio; Reparação de Veículos",
  CONSTRUCAO: "Construção",
  EDUCACAO: "Educação",
  "ELETRICIDADE E GAS": "Eletricidade e Gás",
  "INDUSTRIAS DE TRANSFORMACAO": "Indústrias de Transformação",
  "INDUSTRIAS EXTRATIVAS": "Indústrias Extrativas",
  "INFORMACAO E COMUNICACAO": "Informação e Comunicação",
  "OUTRAS ATIVIDADES DE SERVICOS": "Outras Atividades de Serviços",
  "SAUDE HUMANA E SERVICOS SOCIAIS": "Saúde Humana e Serviços Sociais",
  "TRANSPORTE, ARMAZENAGEM E CORREIO": "Transporte, Armazenagem e Correio",
}
const normalizeSetor = (val: string) => SETOR_LABELS[val] || val

const formatoBr = (num: number, casas = 0) =>
  num.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })

const compactoBr = (n: number, casas = 1) => {
  if (n === undefined || n === null || isNaN(n)) return "0"
  const abs = Math.abs(n)
  const sinal = n < 0 ? "-" : ""
  // Arredonda antes de escolher a unidade: 999.950 não pode virar "1.000,0 Mil".
  const arred = (d: number) => Number((abs / d).toFixed(casas))
  if (abs >= 1e9 || arred(1e6) >= 1000)
    return `${sinal}${formatoBr(abs / 1e9, casas)} Bi`
  if (abs >= 1e6 || arred(1e3) >= 1000)
    return `${sinal}${formatoBr(abs / 1e6, casas)} Mi`
  if (abs >= 1e3) return `${sinal}${formatoBr(abs / 1e3, casas)} Mil`
  return `${sinal}${formatoBr(abs, casas)}`
}

const calcPct = (parte: number, total: number) =>
  !total ? "0%" : `${formatoBr((parte / total) * 100, 0)}%`

// ─── Métricas ────────────────────────────────────────────────────────────────

const calcPatrimonio = (base: any) => {
  if (!base?.features) return { total: 0, tipos: {} as Record<string, number> }
  const tipos: Record<string, number> = {}
  base.features.forEach((f: any) => {
    const t = normalizeTipologia(String(f.properties?.Tipologia || ""))
    if (t) tipos[t] = (tipos[t] || 0) + 1
  })
  return { total: base.features.length, tipos }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const mapRef = useRef<MapRef>(null)
  // A câmera já nasce na posição correta (da URL, se houver, senão o enquadramento
  // padrão abaixo) — inicia true para sempre pular a animação de fitBounds do
  // carregamento inicial (nunca é lido/escrito durante o render).
  const hasFlownInitialRef = useRef(true)

  const [initialViewState] = useState(() => {
    const padrao = CENARIO_VISTA[DEFAULT_CENARIO]
    if (typeof window === "undefined") {
      return {
        longitude: padrao.lng,
        latitude: padrao.lat,
        zoom: padrao.zoom,
        pitch: 0,
        bearing: 0,
      }
    }
    const p = new URLSearchParams(window.location.search)
    const z = p.get("zoom")
    const lat = p.get("lat")
    const lng = p.get("lng")
    // Sem lng/lat/zoom na URL, a câmera nasce na vista do cenário pedido em `?cenario=` (ou do cenário padrão).
    const codigo = p.get("cenario")
    const vista =
      CENARIO_VISTA[(codigo && urlParaCenario(codigo)) || DEFAULT_CENARIO] ??
      padrao

    return {
      longitude: lng ? parseFloat(lng) : vista.lng,
      latitude: lat ? parseFloat(lat) : vista.lat,
      zoom: z ? parseFloat(z) : vista.zoom,
      pitch: 0,
      bearing: 0,
    }
  })
  // Lido diretamente na inicialização (não em useEffect) porque o efeito que
  // carrega base+atingidos+mancha roda antes de qualquer outro useEffect com
  // deps vazias definido mais abaixo no componente — um useEffect separado só
  // para ler `?cenario=` nunca chegaria a tempo de influenciar essa primeira carga.
  const permalinkCenarioRef = useRef<string | null>(
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("cenario")
  )
  const headerRef = useRef<HTMLElement>(null)
  // Deslocamento vertical dos painéis flutuantes; acompanha a altura do header
  // (que cresce quando os botões de camada quebram linha em telas menores).
  const [panelTop, setPanelTop] = useState(90)

  const [cenario, setCenario] = useState<string>("(nenhum)")
  // Aviso metodológico temporário ao selecionar cenários com mancha binária
  // (ex.: o componente de chuva acumulada da mancha combinada) — some sozinho
  // após 10s ou ao ser fechado manualmente.
  const [avisoMancha, setAvisoMancha] = useState<string | null>(null)

  const [camadas, setCamadas] = useState<string[]>([
    "Empresas",
    "Saúde",
    "Educação",
    "Agricultura",
    "Uso e Cobertura da Terra",
    "Infraestrutura",
    "Patrimônio Histórico",
  ])
  const [infraAtivas, setInfraAtivas] = useState<string[]>([
    "Logradouros",
    "Terrenos",
  ])
  const [tabAtiva, setTabAtiva] = useState("resumo")
  const [mapReady, setMapReady] = useState(false)
  const [showHeatmapPopulacao, setShowHeatmapPopulacao] = useState(false)
  const [showHeatmapEmpresas, setShowHeatmapEmpresas] = useState(false)
  const [showHeatmapSaude, setShowHeatmapSaude] = useState(false)
  const [showHeatmapEducacao, setShowHeatmapEducacao] = useState(false)

  const [filtroSetor, setFiltroSetor] = useState("(todos)")
  const [filtroDep, setFiltroDep] = useState("(todas)")
  const [filtroTipo, setFiltroTipo] = useState("(todas)")
  const [filtroTipologia, setFiltroTipologia] = useState("(todas)")

  const [showPainelAnalise, setShowPainelAnalise] = useState(true)
  const [showFiltros, setShowFiltros] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showLegenda, setShowLegenda] = useState(false)
  const [showMancha, setShowMancha] = useState(true)
  const [showListaLogradouros, setShowListaLogradouros] = useState(false)
  const [showListaEscolas, setShowListaEscolas] = useState(false)
  const [showListaHospitais, setShowListaHospitais] = useState(false)
  const [showListaUBS, setShowListaUBS] = useState(false)
  const [showListaAmbulat, setShowListaAmbulat] = useState(false)

  const [baseEmpresas, setBaseEmpresas] = useState<any>(null)
  const [baseEducacao, setBaseEducacao] = useState<any>(null)
  const [baseSaude, setBaseSaude] = useState<any>(null)
  const [popData, setPopData] = useState<any>(null)
  const [baseCobertura, setBaseCobertura] = useState<any>(null)
  const [baseAgricultura, setBaseAgricultura] = useState<any>(null)
  const [baseInfra, setBaseInfra] = useState<Record<string, any>>({})
  // Estatísticas de infra pré-computadas offline (contagens/flags por camada) —
  // permite o Painel mostrar todas as camadas de Infraestrutura mesmo as que
  // não estão ativas no mapa, sem precisar baixar a geometria completa
  // (Terrenos sozinho tem ~28MB). Ver scripts/gerar_infra_stats.py.
  const [infraStats, setInfraStats] = useState<Record<string, any> | null>(null)
  const [basePatrimonio, setBasePatrimonio] = useState<any>(null)

  const [atingidosEmpresas, setAtingidosEmpresas] = useState<any>(null)
  const [atingidosEducacao, setAtingidosEducacao] = useState<any>(null)
  const [atingidosSaude, setAtingidosSaude] = useState<any>(null)
  const [atingidosCobertura, setAtingidosCobertura] = useState<any>(null)
  const [atingidosAgricultura, setAtingidosAgricultura] = useState<any>(null)
  const [atingidosInfra, setAtingidosInfra] = useState<Record<string, any>>({})
  const [atingidosPatrimonio, setAtingidosPatrimonio] = useState<any>(null)
  const [manchaCenario, setManchaCenario] = useState<any>(null)

  // Cenário "Todas as cotas": água avançando por cota (raster) e, a cada cota, os pontos sob a água.
  // Só empresas/educação/saúde têm dado por ponto em cada cota; o resto (cobertura, agricultura, patrimônio,
  // infra) fica vazio neste modo.
  const cotas = useCotas(cenario)
  const cotaAting = useCotaAtingidos(cotas, {
    empresas: baseEmpresas,
    educacao: baseEducacao,
    saude: baseSaude,
    patrimonio: basePatrimonio,
  })
  useEffect(() => {
    if (!cotas.cotasAtivo) return
    setAtingidosEmpresas(cotaAting.empresas)
    setAtingidosEducacao(cotaAting.educacao)
    setAtingidosSaude(cotaAting.saude)
    setAtingidosPatrimonio(cotaAting.patrimonio)
  }, [cotas.cotasAtivo, cotaAting])

  const [baseReady, setBaseReady] = useState(false)
  // true = carga inicial ainda em andamento; cenário effect deve ser ignorado até o mount terminar
  const initialLoadDoneRef = useRef(false)
  // Evita que o effect de cenário refaça o fetch/animação logo após a carga inicial
  // (a carga inicial já buscou os dados e ajustou o mapa para o cenário inicial).
  const skipInitialScenarioRef = useRef(false)

  const [cursor, setCursor] = useState("grab")
  const [popupInfo, setPopupInfo] = useState<{
    lngLat: [number, number]
    properties: any
    source: string
  } | null>(null)

  // Carrega base + atingidos + mancha juntos para evitar flash de camadas
  useEffect(() => {
    const ctrl = new AbortController()
    const { signal } = ctrl
    setIsLoading(true)

    // Não zerar o ref aqui: em desenvolvimento o React (StrictMode) roda este efeito duas vezes, e a segunda
    // execução perdia o permalink e caía no cenário padrão (ex.: ?cenario=todas-as-cotas abria Maio 2024).
    const desired = permalinkCenarioRef.current
    // `desired` é o código amigável da URL (CENARIO_URL_SLUGS) — ver o efeito
    // que escreve `?cenario=`, mais abaixo.
    const initialCenario =
      (desired && urlParaCenario(desired)) || DEFAULT_CENARIO
    const sSlug = scenarioSlug(initialCenario)
    const defaultInfra = ["Logradouros", "Terrenos"] // deve bater com infraAtivas inicial

    const infraAtingidosPromises = defaultInfra.map((infra) => {
      const iSlug = slugify(infra)
      const useFgb = iSlug === "terrenos" || iSlug === "quadras"
      const url = `/dados_convertidos/rio_grande/cenarios/infra_${iSlug}_ATINGIDOS_${sSlug}.${useFgb ? "fgb" : "geojson"}`
      return (
        useFgb
          ? loadFGB(url, signal)
          : fetch(url, { signal }).then((r) => (r.ok ? r.json() : null))
      )
        .then((d: any) => ({ infra, d }))
        .catch(() => ({ infra, d: null }))
    })

    Promise.all([
      // Base
      fetch("/dados_convertidos/rio_grande/empresas_BASE.geojson", {
        signal,
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("/dados_convertidos/rio_grande/educacao_BASE.geojson", {
        signal,
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("/dados_convertidos/rio_grande/saude_BASE.geojson", {
        signal,
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("/dados_convertidos/rio_grande/patrimonio_BASE.geojson", {
        signal,
      }).then((r) => (r.ok ? r.json() : null)),
      // Mancha
      fetch(`/dados_convertidos/rio_grande/cenarios/${sSlug}.geojson`, {
        signal,
      }).then((r) => (r.ok ? r.json() : null)),
      // Atingidos
      fetch(
        `/dados_convertidos/rio_grande/cenarios/empresas_ATINGIDOS_${sSlug}.geojson`,
        { signal }
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `/dados_convertidos/rio_grande/cenarios/educacao_ATINGIDOS_${sSlug}.geojson`,
        { signal }
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `/dados_convertidos/rio_grande/cenarios/saude_ATINGIDOS_${sSlug}.geojson`,
        { signal }
      ).then((r) => (r.ok ? r.json() : null)),
      loadFGB(
        `/dados_convertidos/rio_grande/cenarios/cobertura_ATINGIDOS_${sSlug}.fgb`,
        signal
      ),
      loadAgriculturaAtingida(sSlug, signal),
      fetch(
        `/dados_convertidos/rio_grande/cenarios/patrimonio_ATINGIDOS_${sSlug}.geojson`,
        { signal }
      ).then((r) => (r.ok ? r.json() : null)),
      fetch("/dados_convertidos/populacao_atingida.json", { signal }).then(
        (r) => (r.ok ? r.json() : null)
      ),
      Promise.all(infraAtingidosPromises),
      fetch(
        `/dados_convertidos/rio_grande/cenarios/infra_stats_${sSlug}.json`,
        { signal }
      ).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(
        ([
          emp,
          edu,
          sau,
          patr,
          mancha,
          aEmp,
          aEdu,
          aSau,
          aCob,
          aAgr,
          aPatr,
          popJson,
          infraResults,
          infraStatsJson,
        ]) => {
          if (signal.aborted) return

          if (popJson) setPopData(popJson)

          setBaseEmpresas(emp)
          setBaseEducacao(edu)
          setBaseSaude(sau)
          setBasePatrimonio(patr)
          setManchaCenario(mancha)
          setAtingidosEmpresas(aEmp)
          setAtingidosEducacao(aEdu)
          setAtingidosSaude(aSau)
          setAtingidosCobertura(aCob)
          setAtingidosAgricultura(aAgr)
          setAtingidosPatrimonio(aPatr)
          const infraData: Record<string, any> = {}
          ;(infraResults as any[]).forEach(({ infra, d }) => {
            if (d) infraData[infra] = d
          })
          setAtingidosInfra(infraData)
          setInfraStats(infraStatsJson)

          skipInitialScenarioRef.current = true
          setCenario(initialCenario)
          initialLoadDoneRef.current = true
          setBaseReady(true)
          setIsLoading(false)

          // Uso do solo e agricultura (BASE): ~16 MB, a maior parte da carga. Só começam depois dos dados
          // principais, para não disputar banda com eles (antes o seletor de cenário só aparecia depois de baixar
          // tudo). Cada camada aparece por conta própria; as abas de Cobertura e Agricultura mostram esqueleto
          // enquanto `baseCobertura`/`baseAgricultura` são null.
          loadFGB("/dados_convertidos/rio_grande/agricultura_BASE.fgb", signal)
            .then((agr) => {
              if (!signal.aborted) setBaseAgricultura(agr)
            })
            .catch((e) => {
              if ((e as Error).name !== "AbortError") console.error(e)
            })
          loadFGB("/dados_convertidos/rio_grande/cobertura_BASE.fgb", signal)
            .then((cob) => {
              if (!signal.aborted) setBaseCobertura(cob)
            })
            .catch((e) => {
              if ((e as Error).name !== "AbortError") console.error(e)
            })

          requestAnimationFrame(() => {
            const map = mapRef.current?.getMap()
            if (map && mancha) {
              if (!hasFlownInitialRef.current) {
                hasFlownInitialRef.current = true
                const bbox = turf.bbox(mancha) as [
                  number,
                  number,
                  number,
                  number,
                ]
                map.fitBounds(bbox, {
                  padding: 40,
                  maxZoom: 11.8,
                  offset: [40, 60],
                  duration: 1500,
                  essential: true,
                })
              }
            }
          })
        }
      )
      .catch((e) => {
        if ((e as Error).name !== "AbortError") {
          console.error(e)
          // Sem isto, falha de rede no carregamento inicial deixava o app preso em loading.
          setIsLoading(false)
        }
      })

    return () => ctrl.abort()
  }, [])

  const handleMapMoveEnd = () => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const center = map.getCenter()
    const zoom = map.getZoom()

    const params = new URLSearchParams(window.location.search)
    params.set("lng", center.lng.toFixed(5))
    params.set("lat", center.lat.toFixed(5))
    params.set("zoom", zoom.toFixed(2))
    params.delete("p")
    params.delete("b")
    params.delete("z") // nome antigo do parâmetro (agora `zoom`)

    window.history.replaceState(null, "", `?${params.toString()}`)
  }

  // Timer que limpa os atingidos 5 s depois de "(nenhum)": cancelado ao trocar de cenário antes disso,
  // senão ele zerava os atingidos de "Todas as cotas" (ou de outro cenário escolhido em seguida).
  const limpaNenhumTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cenário → mancha + atingidos (pula todos os runs até o mount terminar)
  useEffect(() => {
    if (!initialLoadDoneRef.current) return
    if (limpaNenhumTimerRef.current) {
      clearTimeout(limpaNenhumTimerRef.current)
      limpaNenhumTimerRef.current = null
    }
    // Pula a execução redundante disparada pelo setCenario da carga inicial
    // (dados e enquadramento do cenário inicial já foram feitos no mount).
    if (skipInitialScenarioRef.current) {
      skipInitialScenarioRef.current = false
      return
    }
    if (cenario === COTAS_CENARIO) {
      // Sem mancha nem arquivos de cenário: a água vem do raster de cotas (hooks/useCotas.ts).
      setManchaCenario(null)
      setAtingidosCobertura(null)
      setAtingidosAgricultura(null)
      setAtingidosPatrimonio(null)
      setAtingidosInfra({})
      setInfraStats(null)
      setIsLoading(false)
      const vista = CENARIO_VISTA[COTAS_CENARIO]
      mapRef.current?.getMap().flyTo({
        center: [vista.lng, vista.lat],
        zoom: vista.zoom,
        duration: 2500,
        essential: true,
      })
      return
    }
    if (!cenario || cenario === "(nenhum)") {
      const map = mapRef.current?.getMap()
      if (map)
        map.flyTo({ center: [-52.22, -32.09], zoom: 10.8, duration: 5000 })
      limpaNenhumTimerRef.current = setTimeout(() => {
        setManchaCenario(null)
        setAtingidosEmpresas(null)
        setAtingidosEducacao(null)
        setAtingidosSaude(null)
        setAtingidosCobertura(null)
        setAtingidosAgricultura(null)
        setAtingidosPatrimonio(null)
        setAtingidosInfra((prev) =>
          Object.keys(prev).length === 0 ? prev : {}
        )
      }, 5000)
      return
    }
    const ctrl = new AbortController()
    const { signal } = ctrl
    const sSlug = scenarioSlug(cenario)
    setIsLoading(true)
    // Limpa já os resultados do cenário anterior: a câmera leva ~5 s antes de os novos chegarem, e nesse tempo o
    // painel mostraria os números antigos sob o título do cenário novo (ex.: 601 empresas de Maio 2024 sob "+50%").
    setAtingidosEmpresas(null)
    setAtingidosEducacao(null)
    setAtingidosSaude(null)
    setAtingidosCobertura(null)
    setAtingidosAgricultura(null)
    setAtingidosPatrimonio(null)
    setAtingidosInfra({})
    setInfraStats(null)

    fetch(`/dados_convertidos/rio_grande/cenarios/${sSlug}.geojson`, { signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((mancha) => {
        if (signal.aborted) return
        // A mancha nova aparece já durante o voo da câmera; os atingidos entram depois.
        setManchaCenario(mancha)

        // Câmera fixa do cenário (CENARIO_VISTA); sem entrada, enquadra a mancha.
        const map = mapRef.current?.getMap()
        const vista = CENARIO_VISTA[cenario]
        if (map && vista) {
          map.flyTo({
            center: [vista.lng, vista.lat],
            zoom: vista.zoom,
            duration: 5000,
            essential: true,
          })
        } else if (map && mancha) {
          const bbox = turf.bbox(mancha) as [number, number, number, number]
          map.fitBounds(bbox, {
            padding: 40,
            maxZoom: 11.8,
            offset: [40, 60],
            duration: 5000,
            essential: true,
          })
        }

        return new Promise((res) => setTimeout(() => res(mancha), 5000))
      })
      .then((mancha) => {
        if (signal.aborted) return

        const infraPromises = infraAtivas.map((infra) => {
          const iSlug = slugify(infra)
          const useFgb = iSlug === "terrenos" || iSlug === "quadras"
          const ext = useFgb ? "fgb" : "geojson"
          const url = `/dados_convertidos/rio_grande/cenarios/infra_${iSlug}_ATINGIDOS_${sSlug}.${ext}`
          return (
            useFgb
              ? loadFGB(url, signal)
              : fetch(url, { signal }).then((r) => (r.ok ? r.json() : null))
          )
            .then((d: any) => ({ infra, d }))
            .catch(() => ({ infra, d: null }))
        })

        const dataPromises = Promise.all([
          fetch(
            `/dados_convertidos/rio_grande/cenarios/empresas_ATINGIDOS_${sSlug}.geojson`,
            { signal }
          ).then((r) => (r.ok ? r.json() : null)),
          fetch(
            `/dados_convertidos/rio_grande/cenarios/educacao_ATINGIDOS_${sSlug}.geojson`,
            { signal }
          ).then((r) => (r.ok ? r.json() : null)),
          fetch(
            `/dados_convertidos/rio_grande/cenarios/saude_ATINGIDOS_${sSlug}.geojson`,
            { signal }
          ).then((r) => (r.ok ? r.json() : null)),
          loadFGB(
            `/dados_convertidos/rio_grande/cenarios/cobertura_ATINGIDOS_${sSlug}.fgb`,
            signal
          ),
          loadAgriculturaAtingida(sSlug, signal),
          fetch(
            `/dados_convertidos/rio_grande/cenarios/patrimonio_ATINGIDOS_${sSlug}.geojson`,
            { signal }
          ).then((r) => (r.ok ? r.json() : null)),
          Promise.all(infraPromises),
          fetch(
            `/dados_convertidos/rio_grande/cenarios/infra_stats_${sSlug}.json`,
            { signal }
          ).then((r) => (r.ok ? r.json() : null)),
        ])

        return Promise.all([dataPromises, Promise.resolve(mancha)])
      })
      .then((res) => {
        if (!res || signal.aborted) return
        const [
          [emp, edu, sau, cob, agr, patr, infraResults, infraStatsJson],
          mancha,
        ] = res

        setManchaCenario(mancha)
        setInfraStats(infraStatsJson)
        setAtingidosEmpresas(emp)
        setAtingidosEducacao(edu)
        setAtingidosSaude(sau)
        setAtingidosCobertura(cob)
        setAtingidosAgricultura(agr)
        setAtingidosPatrimonio(patr)

        const newInfraData: Record<string, any> = {}
        ;(infraResults as any[]).forEach(({ infra, d }) => {
          if (d) newInfraData[infra] = d
        })
        // Substitui (não faz merge): camadas que falharam ou não existem no novo
        // cenário não podem herdar a geometria do cenário anterior.
        setAtingidosInfra(newInfraData)

        setIsLoading(false)
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") {
          console.error(e)
          setIsLoading(false)
        }
      })

    return () => ctrl.abort()
  }, [cenario]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bases de infra (geometria completa; Terrenos sozinho tem ~17 MB). Espera os dados principais (baseReady) para
  // não disputar banda com eles. Com um cenário ativo o mapa desenha só os atingidos, então a base carrega sem
  // trazer o painel de volta ao esqueleto.
  useEffect(() => {
    if (!baseReady) return
    const ctrl = new AbortController()
    const { signal } = ctrl
    const precisaDaBase = !cenario || cenario === "(nenhum)"

    setBaseInfra((prev) => {
      const u = { ...prev }
      Object.keys(u).forEach((k) => {
        if (!infraAtivas.includes(k)) delete u[k]
      })
      return u
    })

    const toLoad = infraAtivas.filter((i) => !baseInfra[i])
    if (!toLoad.length) return
    if (precisaDaBase) setIsLoading(true)

    Promise.all(
      toLoad.map((infra) => {
        const iSlug = slugify(infra)
        const useFgb = iSlug === "terrenos" || iSlug === "quadras"
        const url = `/dados_convertidos/rio_grande/infraestrutura/${iSlug}_BASE.${useFgb ? "fgb" : "geojson"}`
        const p = useFgb
          ? loadFGB(url, signal)
          : fetch(url, { signal }).then((r) => (r.ok ? r.json() : null))
        return p.then((d: any) => ({ infra, d })).catch(() => null)
      })
    ).then((results) => {
      if (signal.aborted) return
      results.forEach((r) => {
        if (r?.d) setBaseInfra((prev) => ({ ...prev, [r.infra]: r.d }))
      })
      if (precisaDaBase) setIsLoading(false)
    })

    if (cenario && cenario !== "(nenhum)") {
      const sSlug = scenarioSlug(cenario)
      toLoad.forEach((infra) => {
        const iSlug = slugify(infra)
        const useFgb = iSlug === "terrenos" || iSlug === "quadras"
        const ext = useFgb ? "fgb" : "geojson"
        const url = `/dados_convertidos/rio_grande/cenarios/infra_${iSlug}_ATINGIDOS_${sSlug}.${ext}`
        ;(useFgb
          ? loadFGB(url, signal)
          : fetch(url, { signal }).then((r) => (r.ok ? r.json() : null))
        )
          .then((d: any) => {
            if (d && !signal.aborted)
              setAtingidosInfra((prev) => ({ ...prev, [infra]: d }))
          })
          .catch(() => null)
      })
    }

    return () => ctrl.abort()
  }, [infraAtivas, baseReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Permalink (leitura do `?cenario=` inicial acontece na inicialização do ref, acima)
  useEffect(() => {
    const params = new URLSearchParams()
    if (cenario !== "(nenhum)") params.set("cenario", cenarioParaUrl(cenario))
    const qs = params.toString()
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname
    )
  }, [cenario])

  // Aviso metodológico: mancha binária (componente de chuva acumulada) —
  // some sozinho após 10s, tanto ao trocar de cenário quanto ao ser reaberto
  // sob demanda pelo botão de info do Painel (avisoManchaTimerRef evita dois
  // timers concorrentes fecharem um ao outro cedo demais).
  const avisoManchaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mostrarAvisoMancha = useCallback((texto: string) => {
    if (avisoManchaTimerRef.current) clearTimeout(avisoManchaTimerRef.current)
    setAvisoMancha(texto)
    avisoManchaTimerRef.current = setTimeout(() => setAvisoMancha(null), 10000)
  }, [])

  useEffect(() => {
    if (ALTURA_MANCHAS[cenario]) mostrarAvisoMancha(AVISO_MANCHA_BINARIA)
    else setAvisoMancha(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cenario])

  // Mede a altura do header e reposiciona os painéis (para quando os botões
  // de camada quebram linha em telas menores e o header fica mais alto).
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => setPanelTop(el.offsetTop + el.offsetHeight + 10)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener("resize", update)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [])

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const toggleCamada = (c: string) => {
    setCamadas((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
    setPopupInfo(null)
  }

  const toggleInfra = (infra: string) => {
    const ativando = !infraAtivas.includes(infra)
    if (ativando && INFRA_TAMANHOS_MB[infra]) {
      if (
        !window.confirm(
          `"${infra}" tem ~${INFRA_TAMANHOS_MB[infra]}MB. Carregar?`
        )
      )
        return
    }
    setInfraAtivas((prev) =>
      prev.includes(infra) ? prev.filter((i) => i !== infra) : [...prev, infra]
    )
    setCamadas((prev) =>
      prev.includes("Infraestrutura") ? prev : [...prev, "Infraestrutura"]
    )
    setPopupInfo(null)
  }

  const toggleMenuInfra = () =>
    setCamadas(
      camadas.includes("Infraestrutura")
        ? camadas.filter((c) => c !== "Infraestrutura")
        : [...camadas, "Infraestrutura"]
    )

  // ─── Dados derivados ───────────────────────────────────────────────────────

  const isCenarioAtivo =
    (cenario !== "(nenhum)" && manchaCenario != null) || cotas.cotaPausada

  const showEmp = baseReady
    ? isCenarioAtivo
      ? atingidosEmpresas
      : baseEmpresas
    : null
  const showEdu = baseReady
    ? isCenarioAtivo
      ? atingidosEducacao
      : baseEducacao
    : null
  const showSau = baseReady
    ? isCenarioAtivo
      ? atingidosSaude
      : baseSaude
    : null
  const showCobertura = baseReady
    ? isCenarioAtivo
      ? atingidosCobertura
      : baseCobertura
    : null
  const showAgricultura = baseReady
    ? isCenarioAtivo
      ? atingidosAgricultura
      : baseAgricultura
    : null
  const showPatrimonio = baseReady
    ? isCenarioAtivo
      ? atingidosPatrimonio
      : basePatrimonio
    : null

  const renderEmp = useMemo(() => {
    if (!showEmp?.features) return null
    if (filtroSetor === "(todos)") return showEmp
    return {
      ...showEmp,
      features: showEmp.features.filter(
        (f: any) => String(f.properties?.CNAE_2 || "") === filtroSetor
      ),
    }
  }, [showEmp, filtroSetor])

  const renderEdu = useMemo(() => {
    if (!showEdu?.features) return null
    if (filtroDep === "(todas)") return showEdu
    return {
      ...showEdu,
      features: showEdu.features.filter(
        (f: any) =>
          normalizeDep(
            String(f.properties?.tp_dependencia || "")
          ).toLowerCase() === filtroDep.toLowerCase()
      ),
    }
  }, [showEdu, filtroDep])

  const renderSau = useMemo(() => {
    if (!showSau?.features) return null
    if (filtroTipo === "(todas)") return showSau
    return {
      ...showSau,
      features: showSau.features.filter(
        (f: any) =>
          String(f.properties?.co_tipo_estabelecimento || "").toLowerCase() ===
          filtroTipo.toLowerCase()
      ),
    }
  }, [showSau, filtroTipo])

  const renderPatrimonio = useMemo(() => {
    if (!showPatrimonio?.features) return null
    if (filtroTipologia === "(todas)") return showPatrimonio
    return {
      ...showPatrimonio,
      features: showPatrimonio.features.filter(
        (f: any) =>
          normalizeTipologia(String(f.properties?.Tipologia || "")) ===
          filtroTipologia
      ),
    }
  }, [showPatrimonio, filtroTipologia])

  const metricasEmp = useMemo(
    () => ({
      base: calcEmp(baseEmpresas),
      impacto: calcEmp(atingidosEmpresas),
    }),
    [baseEmpresas, atingidosEmpresas]
  )
  const metricasEdu = useMemo(
    () => ({
      base: calcEdu(baseEducacao),
      impacto: calcEdu(atingidosEducacao),
    }),
    [baseEducacao, atingidosEducacao]
  )
  const metricasSau = useMemo(
    () => ({ base: calcSau(baseSaude), impacto: calcSau(atingidosSaude) }),
    [baseSaude, atingidosSaude]
  )
  const metricasPatrimonio = useMemo(
    () => ({
      base: calcPatrimonio(basePatrimonio),
      impacto: calcPatrimonio(atingidosPatrimonio),
    }),
    [basePatrimonio, atingidosPatrimonio]
  )

  // O ruído de vetorização (fragmentos < 0,5 ha) é removido na conversão offline
  // (scripts/filtro_ruido.py, por fragmento e em hectares reais). Como as camadas
  // vêm dissolvidas em 1 MultiPolygon por classe, filtrar aqui por feição cortava a
  // classe inteira (ex.: sumiam culturas com < 0,5 ha atingidos, apesar de reais).
  const featsFiltrados = (gdf: any): { f: any; ha: number }[] =>
    (gdf?.features ?? []).map((f: any) => ({
      f,
      ha: turf.area(f) / 10000,
    }))

  const metricasAgri = useMemo(
    () => ({
      base: featsFiltrados(baseAgricultura),
      impacto: featsFiltrados(atingidosAgricultura),
    }),
    [baseAgricultura, atingidosAgricultura]
  )

  const metricasCob = useMemo(
    () => ({
      base: featsFiltrados(baseCobertura),
      impacto: featsFiltrados(atingidosCobertura),
    }),
    [baseCobertura, atingidosCobertura]
  )

  const setoresUnicos = useMemo(() => {
    if (!baseEmpresas?.features) return []
    return Array.from(
      new Set(
        baseEmpresas.features
          .map((f: any) => String(f.properties?.CNAE_2 || ""))
          .filter(Boolean)
      )
    ).sort() as string[]
  }, [baseEmpresas])

  const depsUnicas = useMemo(() => {
    if (!baseEducacao?.features) return []
    return Array.from(
      new Set(
        baseEducacao.features
          .map((f: any) =>
            normalizeDep(String(f.properties?.tp_dependencia || ""))
          )
          .filter(Boolean)
      )
    ).sort() as string[]
  }, [baseEducacao])

  const tiposUnicos = useMemo(() => {
    if (!baseSaude?.features) return []
    return Array.from(
      new Set(
        baseSaude.features
          .map((f: any) => String(f.properties?.co_tipo_estabelecimento || ""))
          .filter(Boolean)
      )
    ).sort() as string[]
  }, [baseSaude])

  const tipologiasUnicas = useMemo(() => {
    if (!basePatrimonio?.features) return []
    return Array.from(
      new Set(
        basePatrimonio.features
          .map((f: any) =>
            normalizeTipologia(String(f.properties?.Tipologia || ""))
          )
          .filter(Boolean)
      )
    ).sort() as string[]
  }, [basePatrimonio])

  const empPorSetor = useMemo(() => {
    const agrega = (gdf: any): Record<string, number> => {
      const r: Record<string, number> = {}
      gdf?.features?.forEach((f: any) => {
        const s = String(f.properties?.CNAE_2 || "Sem Setor")
        r[s] = (r[s] || 0) + (Number(f.properties?.Empregados) || 0)
      })
      return r
    }
    return { base: agrega(baseEmpresas), impacto: agrega(atingidosEmpresas) }
  }, [baseEmpresas, atingidosEmpresas])

  const profPorDep = useMemo(() => {
    const agrega = (gdf: any): Record<string, number> => {
      const r: Record<string, number> = {}
      gdf?.features?.forEach((f: any) => {
        const dep = normalizeDep(String(f.properties?.tp_dependencia || ""))
        if (dep) r[dep] = (r[dep] || 0) + (Number(f.properties?.qtd_doc) || 0)
      })
      return r
    }
    return { base: agrega(baseEducacao), impacto: agrega(atingidosEducacao) }
  }, [baseEducacao, atingidosEducacao])

  // Base filtrada pelo filtro ativo (para denominadores de KPI quando filtro está ativo)
  const baseEmpFiltrado = useMemo(() => {
    if (filtroSetor === "(todos)") return baseEmpresas
    return baseEmpresas
      ? {
          ...baseEmpresas,
          features: (baseEmpresas.features || []).filter(
            (f: any) => String(f.properties?.CNAE_2 || "") === filtroSetor
          ),
        }
      : null
  }, [baseEmpresas, filtroSetor])
  const baseEduFiltrado = useMemo(() => {
    if (filtroDep === "(todas)") return baseEducacao
    return baseEducacao
      ? {
          ...baseEducacao,
          features: (baseEducacao.features || []).filter(
            (f: any) =>
              normalizeDep(String(f.properties?.tp_dependencia || "")) ===
              filtroDep
          ),
        }
      : null
  }, [baseEducacao, filtroDep])
  const baseSauFiltrado = useMemo(() => {
    if (filtroTipo === "(todas)") return baseSaude
    return baseSaude
      ? {
          ...baseSaude,
          features: (baseSaude.features || []).filter(
            (f: any) =>
              String(
                f.properties?.co_tipo_estabelecimento || ""
              ).toLowerCase() === filtroTipo.toLowerCase()
          ),
        }
      : null
  }, [baseSaude, filtroTipo])

  // Métricas calculadas sobre o dado filtrado atualmente exibido no mapa
  const renderEmpMetrics = useMemo(() => calcEmp(renderEmp), [renderEmp])
  const renderEduMetrics = useMemo(() => calcEdu(renderEdu), [renderEdu])
  // Pilha de geocodificação: empresas de CEPs diferentes no mesmo ponto (aviso no painel de Empresas).
  const pilhaEmpresas = useMemo(
    () => (baseEmpresas?.features ? detectarPilha(baseEmpresas.features) : null),
    [baseEmpresas]
  )
  const empresasNaPilha = useMemo(
    () =>
      pilhaEmpresas && atingidosEmpresas?.features
        ? pontosNaPilha(atingidosEmpresas.features, pilhaEmpresas)
        : 0,
    [pilhaEmpresas, atingidosEmpresas]
  )
  const renderSauMetrics = useMemo(() => calcSau(renderSau), [renderSau])
  const baseEmpFiltMetrics = useMemo(
    () => calcEmp(baseEmpFiltrado),
    [baseEmpFiltrado]
  )
  const baseEduFiltMetrics = useMemo(
    () => calcEdu(baseEduFiltrado),
    [baseEduFiltrado]
  )
  const baseSauFiltMetrics = useMemo(
    () => calcSau(baseSauFiltrado),
    [baseSauFiltrado]
  )

  const setoresChart = useMemo(() => {
    const src = isCenarioAtivo ? atingidosEmpresas : baseEmpresas
    if (!src?.features) return [] as [string, number][]
    const counts: Record<string, number> = {}
    src.features.forEach((f: any) => {
      const s = String(f.properties?.CNAE_2 || "")
      if (s) counts[s] = (counts[s] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]) as [
      string,
      number,
    ][]
    const top = sorted.slice(0, 9)
    const outros = sorted.slice(9).reduce((s, [, c]) => s + c, 0)
    if (outros > 0) top.push(["Outros", outros])
    return top
  }, [isCenarioAtivo, atingidosEmpresas, baseEmpresas])

  const interactiveLayerIds = useMemo(() => {
    const ids: string[] = []
    if (camadas.includes("Empresas") && renderEmp?.features)
      ids.push("empresas-cluster", "empresas-point")
    if (camadas.includes("Educação") && renderEdu?.features)
      ids.push("educacao-cluster", "educacao-point")
    if (camadas.includes("Saúde") && renderSau?.features)
      ids.push("saude-cluster", "saude-point")
    if (camadas.includes("Patrimônio Histórico") && renderPatrimonio?.features)
      ids.push("patrimonio-cluster", "patrimonio-point")
    if (camadas.includes("Infraestrutura")) {
      Object.keys(baseInfra).forEach((nome) => {
        const geo = isCenarioAtivo ? atingidosInfra[nome] : baseInfra[nome]
        if (geo?.features) {
          const sid = `infra-${slugify(nome)}`
          ids.push(`${sid}-fill`, `${sid}-line`, `${sid}-point`)
        }
      })
    }
    return ids
  }, [
    camadas,
    renderEmp,
    renderEdu,
    renderSau,
    renderPatrimonio,
    baseInfra,
    atingidosInfra,
    isCenarioAtivo,
  ])

  // Força ponto layers (empresas/educação/saúde/patrimônio) sempre no topo do z-order
  useEffect(() => {
    if (!baseReady) return
    const map = mapRef.current?.getMap()
    if (!map) return
    const ids = [
      "empresas-cluster",
      "empresas-count",
      "empresas-point",
      "educacao-cluster",
      "educacao-count",
      "educacao-point",
      "saude-cluster",
      "saude-count",
      "saude-point",
      "patrimonio-cluster",
      "patrimonio-count",
      "patrimonio-point",
    ]
    requestAnimationFrame(() => {
      ids.forEach((id) => {
        try {
          if (map.getLayer(id)) map.moveLayer(id)
        } catch {}
      })
    })
  }, [baseReady, camadas, renderEmp, renderEdu, renderSau, renderPatrimonio])

  // ─── Map click ────────────────────────────────────────────────────────────

  const handleMapClick = (event: any) => {
    const feature = event.features?.[0]
    if (!feature) {
      setPopupInfo(null)
      return
    }

    if (feature.source?.startsWith("infra-")) {
      const n = feature.source.replace("infra-", "").toLowerCase()
      if (["terrenos"].includes(n)) {
        setPopupInfo(null)
        return
      }
    }

    if (feature.properties?.cluster) {
      const map = mapRef.current?.getMap()
      if (!map) return
      const source: any = map.getSource(feature.source)
      source?.getClusterExpansionZoom?.(
        feature.properties.cluster_id,
        (err: any, zoom: number) => {
          if (!err)
            map.easeTo({
              center: feature.geometry.coordinates,
              zoom: zoom + 0.5,
              duration: 800,
            })
        }
      )
      return
    }

    const lngLat = ["Point", "MultiPoint"].includes(feature.geometry.type)
      ? [feature.geometry.coordinates[0], feature.geometry.coordinates[1]]
      : [event.lngLat.lng, event.lngLat.lat]

    // Switch panel tab to match clicked layer
    const srcToTab: Record<string, string> = {
      empresas: "empresas",
      educacao: "educacao",
      saude: "saude",
      patrimonio: "patrimonio",
    }
    if (srcToTab[feature.source]) {
      setTabAtiva(srcToTab[feature.source])
      setShowPainelAnalise(true)
    } else if (feature.source?.startsWith("infra-")) {
      setTabAtiva("infra")
      setShowPainelAnalise(true)
    }

    setPopupInfo({
      lngLat: lngLat as [number, number],
      properties: feature.properties,
      source: feature.source,
    })
  }

  // ─── Popup ────────────────────────────────────────────────────────────────

  const renderPopupContent = () => {
    if (!popupInfo) return null
    const { source, properties: p } = popupInfo

    if (source === "empresas")
      return (
        <div className="flex w-56 flex-col gap-1.5 rounded-xl border border-slate-100 bg-white p-3 shadow-lg">
          <strong className="border-b border-slate-100 pb-1 text-[10px] tracking-wider text-blue-700 uppercase">
            🏢 Empresa
          </strong>
          <span className="text-xs leading-tight font-bold text-slate-800">
            {p.CNAE_2 ? normalizeSetor(p.CNAE_2) : "Sem Setor"}
          </span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="rounded border border-slate-100 bg-slate-50 p-1.5">
              <span className="block text-[9px] font-bold text-slate-500 uppercase">
                Empregados
              </span>
              <span className="text-xs font-black text-slate-800">
                {p.Empregados}
              </span>
            </div>
            <div className="rounded border border-slate-100 bg-slate-50 p-1.5">
              <span className="block text-[9px] font-bold text-slate-500 uppercase">
                Massa Sal.
              </span>
              <span className="text-xs font-black text-slate-800">
                R$ {compactoBr(p.Massa_Salarial, 1)}
              </span>
            </div>
          </div>
        </div>
      )

    if (source === "educacao")
      return (
        <div className="flex w-56 flex-col gap-1.5 rounded-xl border border-slate-100 bg-white p-3 shadow-lg">
          <strong className="border-b border-slate-100 pb-1 text-[10px] tracking-wider text-green-700 uppercase">
            🎓 Educação ({normalizeDep(String(p.tp_dependencia || "")) || "N/A"}
            )
          </strong>
          <span className="text-xs leading-tight font-bold text-slate-800">
            {p.no_entidade || "Escola"}
          </span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="rounded border border-slate-100 bg-slate-50 p-1.5">
              <span className="block text-[9px] font-bold text-slate-500 uppercase">
                Professores
              </span>
              <span className="text-xs font-black text-slate-800">
                {p.qtd_doc || 0}
              </span>
            </div>
            <div className="rounded border border-slate-100 bg-slate-50 p-1.5">
              <span className="block text-[9px] font-bold text-slate-500 uppercase">
                Total Alunos
              </span>
              <span className="text-xs font-black text-slate-800">
                {(p.qtd_matri_inf || 0) +
                  (p.qtd_matri_fund || 0) +
                  (p.qtd_matri_med || 0) +
                  (p.qtd_matri_prof || 0) +
                  (p.qtd_matri_eja || 0) +
                  (p.qtd_matri_esp || 0)}
              </span>
            </div>
          </div>
        </div>
      )

    if (source === "saude") {
      const totalProf = STAFF_COLS.reduce((a, c) => a + (p[c] || 0), 0)
      return (
        <div className="flex w-56 flex-col gap-1.5 rounded-xl border border-slate-100 bg-white p-3 shadow-lg">
          <strong className="border-b border-slate-100 pb-1 text-[10px] tracking-wider text-red-700 uppercase">
            🏥 Saúde ({p.co_tipo_estabelecimento || "N/A"})
          </strong>
          <span className="text-xs leading-tight font-bold text-slate-800">
            {p.no_fantasia || p.no_razao_social || "Unidade"}
          </span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="rounded border border-slate-100 bg-slate-50 p-1.5">
              <span className="block text-[9px] font-bold text-slate-500 uppercase">
                Médicos
              </span>
              <span className="text-xs font-black text-slate-800">
                {p.staff_medicos || 0}
              </span>
            </div>
            <div className="rounded border border-slate-100 bg-slate-50 p-1.5">
              <span className="block text-[9px] font-bold text-slate-500 uppercase">
                Enfermagem
              </span>
              <span className="text-xs font-black text-slate-800">
                {p.staff_enfermagem || 0}
              </span>
            </div>
            <div className="col-span-2 rounded border border-slate-100 bg-slate-50 p-1.5">
              <span className="block text-[9px] font-bold text-slate-500 uppercase">
                Total Profissionais
              </span>
              <span className="text-xs font-black text-slate-800">
                {totalProf}
              </span>
            </div>
          </div>
        </div>
      )
    }

    if (source === "patrimonio")
      return (
        <div className="flex w-56 flex-col gap-1.5 rounded-xl border border-slate-100 bg-white p-3 shadow-lg">
          <strong
            className="border-b border-slate-100 pb-1 text-[10px] tracking-wider uppercase"
            style={{ color: COLORS.patrimonio }}
          >
            🏛 Patrimônio Histórico (
            {normalizeTipologia(String(p.Tipologia || "")) || "N/A"})
          </strong>
          <span className="text-xs leading-tight font-bold text-slate-800">
            {p.Nome || "Sem nome"}
          </span>
          <div className="flex justify-between gap-2 text-[10px]">
            <span className="font-bold text-slate-500 uppercase">
              Endereço:
            </span>
            <span className="text-right font-medium text-slate-800">
              {p["ENDEREÇO"] || "—"}
            </span>
          </div>
        </div>
      )

    if (source?.startsWith("infra-")) {
      const nomeLower = source.replace("infra-", "")
      let content: React.ReactNode = null
      if (nomeLower === "logradouros" && (p.nome || p.tipo))
        content = (
          <>
            {p.tipo && (
              <div className="flex justify-between gap-2 border-b border-slate-50 pb-0.5 text-[10px]">
                <span className="font-bold text-slate-500 uppercase">
                  Tipo:
                </span>
                <span className="text-right font-medium text-slate-800">
                  {p.tipo}
                </span>
              </div>
            )}
            {p.nome && String(p.nome).length > 1 && (
              <div className="flex justify-between gap-2 text-[10px]">
                <span className="font-bold text-slate-500 uppercase">
                  Nome:
                </span>
                <span className="text-right font-medium text-slate-800">
                  {p.nome}
                </span>
              </div>
            )}
          </>
        )
      else if (nomeLower === "quadras" && (p.codigo || p.Area_m2))
        content = (
          <>
            {p.codigo && (
              <div className="flex justify-between gap-2 border-b border-slate-50 pb-0.5 text-[10px]">
                <span className="font-bold text-slate-500 uppercase">
                  Código:
                </span>
                <span className="text-right font-medium text-slate-800">
                  {p.codigo}
                </span>
              </div>
            )}
            {p.Area_m2 && (
              <div className="flex justify-between gap-2 text-[10px]">
                <span className="font-bold text-slate-500 uppercase">
                  Área:
                </span>
                <span className="text-right font-medium text-slate-800">
                  {Number(p.Area_m2).toFixed(1)} m²
                </span>
              </div>
            )}
          </>
        )
      if (!content) return null
      return (
        <div className="flex w-56 flex-col gap-1.5 rounded-xl border border-slate-100 bg-white p-3 shadow-lg">
          <strong className="border-b border-slate-100 pb-1 text-[10px] tracking-wider text-orange-600 uppercase">
            🏗️ {nomeLower.replace(/_/g, " ")}
          </strong>
          <div className="mt-1 flex flex-col gap-1">{content}</div>
        </div>
      )
    }
    return null
  }

  // ─── Helpers de layout ────────────────────────────────────────────────────

  const possuiInfra = true
  const temCamadaTabular =
    camadas.includes("Empresas") ||
    camadas.includes("Educação") ||
    camadas.includes("Saúde") ||
    camadas.includes("Agricultura") ||
    camadas.includes("Uso e Cobertura da Terra") ||
    camadas.includes("Infraestrutura") ||
    camadas.includes("Patrimônio Histórico")

  useEffect(() => {
    if (tabAtiva === "agricultura" && !camadas.includes("Agricultura"))
      setTabAtiva("empresas")
    if (
      tabAtiva === "cobertura" &&
      !camadas.includes("Uso e Cobertura da Terra")
    )
      setTabAtiva("empresas")
    if (tabAtiva === "infra" && !camadas.includes("Infraestrutura"))
      setTabAtiva("empresas")
    if (tabAtiva === "patrimonio" && !camadas.includes("Patrimônio Histórico"))
      setTabAtiva("empresas")
  }, [camadas, infraAtivas, tabAtiva])

  // ─── Render ───────────────────────────────────────────────────────────────

  // Filtros: o painel nasce aberto (descobribilidade) e se recolhe sozinho uma vez, a menos que a pessoa
  // interaja antes. Trocar de cenário reabre e rearma o recolhimento. Os selects de dados ficam em "Filtrar dados".
  const [abertoFiltros, setAbertoFiltros] = useState(false)
  const filtrosInteragiu = useRef(false)
  const filtrosJaRecolheu = useRef(false)
  const primeiraSelecao = useRef(true)
  useEffect(() => {
    if (primeiraSelecao.current) {
      primeiraSelecao.current = false
      return
    }
    filtrosInteragiu.current = false
    filtrosJaRecolheu.current = false
    setShowFiltros(true)
  }, [cenario])
  const filtrosVisiveis = showFiltros && (temCamadaTabular || isCenarioAtivo)
  useEffect(() => {
    if (!filtrosVisiveis || filtrosJaRecolheu.current) return
    const t = setTimeout(() => {
      filtrosJaRecolheu.current = true
      if (!filtrosInteragiu.current) setShowFiltros(false)
    }, 6000)
    return () => clearTimeout(t)
  }, [filtrosVisiveis])
  const nFiltrosAtivos = [
    filtroSetor !== "(todos)",
    filtroDep !== "(todas)",
    filtroTipo !== "(todas)",
    filtroTipologia !== "(todas)",
  ].filter(Boolean).length
  const temFiltroDados =
    camadas.includes("Empresas") ||
    camadas.includes("Educação") ||
    camadas.includes("Saúde") ||
    camadas.includes("Patrimônio Histórico")

  return (
    <div
      className="relative h-screen w-screen overflow-hidden font-sans text-slate-900"
      style={{ backgroundColor: C.bg }}
    >
      {/* ── Aviso de tamanho: abaixo de 1150 x 650 px mostra só esta tela (sem rolagem/escala) ── */}
      <div className="fixed inset-0 z-[100] hidden flex-col items-center justify-center gap-6 bg-white px-8 text-center telefone:flex">
        <div className="flex items-center gap-3">
          <Image
            src="/CIEX.png"
            alt="CIEX"
            width={120}
            height={42}
            className="h-10 w-auto object-contain"
            style={{ filter: "brightness(0) saturate(100%)", opacity: 0.8 }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <Image
            src="/GPEA.png"
            alt="GPEA"
            width={120}
            height={36}
            className="h-9 w-auto object-contain"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h1
            className="text-xl leading-tight font-black"
            style={{ color: C.primary }}
          >
            Painel de Vulnerabilidade Econômica
          </h1>
          <p className="text-sm text-slate-500">Rio Grande, RS</p>
        </div>
        <div
          className="flex max-w-sm flex-col items-center gap-3 rounded-2xl px-6 py-5"
          style={{ backgroundColor: "#f1f5f4", border: "1px solid #c9d3d1" }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.primary}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p className="text-sm font-bold" style={{ color: C.primary }}>
            Tamanho de tela insuficiente
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            O painel precisa de uma janela de, no mínimo,{" "}
            <strong>1150 × 650 px</strong>. Aumente a janela do navegador ou
            acesse em um computador.
          </p>
        </div>
      </div>

      {/* ── Mapa (fundo) ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .maplibregl-popup-content { background-color: #fff !important; padding: 0 !important; border-radius: 0.75rem !important; box-shadow: 0 20px 25px -5px rgb(0 0 0/.1),0 8px 10px -6px rgb(0 0 0/.1) !important; }
          .maplibregl-popup-tip { border-top-color: #fff !important; border-bottom-color: #fff !important; }
          .maplibregl-popup-close-button { right:6px !important; top:6px !important; font-size:16px !important; color:#64748b !important; z-index:10 !important; }
          .maplibregl-popup-close-button:hover { background-color: transparent !important; color:#000 !important; }
        `,
          }}
        />
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
          interactiveLayerIds={interactiveLayerIds}
          onClick={handleMapClick}
          cursor={cursor}
          onMouseEnter={() => setCursor("pointer")}
          onMouseLeave={() => setCursor("grab")}
          onLoad={() => setMapReady(true)}
          maxPitch={0}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          onMoveEnd={handleMapMoveEnd}
        >
          {/* Âncoras para manter Z-Index correto (primeira coisa a ser renderizada) */}
          <Source id="anchors" type="geojson" data={EMPTY_GEO}>
            <Layer
              id="anchor-mancha"
              type="circle"
              paint={{ "circle-radius": 0, "circle-opacity": 0 }}
            />
            <Layer
              id="anchor-buildings"
              type="circle"
              paint={{ "circle-radius": 0, "circle-opacity": 0 }}
            />
            <Layer
              id="anchor-pts"
              type="circle"
              paint={{ "circle-radius": 0, "circle-opacity": 0 }}
            />
          </Source>

          <NavigationControl position="bottom-right" />

          {popupInfo && (
            <Popup
              longitude={popupInfo.lngLat[0]}
              latitude={popupInfo.lngLat[1]}
              anchor="bottom"
              onClose={() => setPopupInfo(null)}
              closeButton
              closeOnClick={false}
              className="z-50 !p-0"
              maxWidth="250px"
            >
              {renderPopupContent()}
            </Popup>
          )}

          {/* Polygon/line layers rendered first (below point layers) */}
          {mapReady && baseReady && manchaCenario && showMancha && (
            <Source id="cenario" type="geojson" data={manchaCenario}>
              {!ALTURA_MANCHAS[cenario] && (
                <Layer
                  beforeId="anchor-mancha"
                  id="cenario-fill"
                  type="fill"
                  paint={{ "fill-color": COLORS.cenario, "fill-opacity": 0.25 }}
                />
              )}
              {!ALTURA_MANCHAS[cenario] && (
                <Layer
                  beforeId="anchor-mancha"
                  id="cenario-line"
                  type="line"
                  paint={{
                    "line-color": COLORS.cenario,
                    "line-width": 2,
                    "line-opacity": 0.9,
                  }}
                />
              )}
            </Source>
          )}

          {/* Raster de altura da lâmina d'água (Nível da Lagoa / Chuva Acumulada) */}
          {mapReady &&
            baseReady &&
            manchaCenario &&
            showMancha &&
            ALTURA_MANCHAS[cenario] && (
              <Source
                id="mancha-altura-img"
                type="image"
                url={`/dados_convertidos/rio_grande/cenarios/altura_raster_${scenarioSlug(cenario)}.png`}
                coordinates={ALTURA_MANCHAS[cenario].coords}
              >
                <Layer
                  beforeId="anchor-mancha"
                  id="mancha-altura-raster"
                  type="raster"
                  paint={{
                    "raster-opacity": 0.85,
                    "raster-resampling": "linear",
                  }}
                />
              </Source>
            )}

          {/* Cenário "Todas as cotas": água avançando por cota (canvas recolorido a cada cota) */}
          {mapReady && cotas.cotasAtivo && (
            <CotaCanvasLayer
              raster={cotas.cotaRaster}
              beforeId="anchor-mancha"
            />
          )}

          {/* Raster de População */}
          {mapReady && showHeatmapPopulacao && popData?.["Rio Grande"] && (
            <Source
              id="populacao-img"
              type="image"
              url="/dados_convertidos/rio_grande/populacao.png"
              coordinates={
                popData["Rio Grande"].coordinates as [
                  [number, number],
                  [number, number],
                  [number, number],
                  [number, number],
                ]
              }
            >
              <Layer
                beforeId="anchor-buildings"
                id="populacao-raster"
                type="raster"
                paint={{
                  "raster-opacity": 0.65,
                  "raster-resampling": "nearest",
                }}
              />
            </Source>
          )}

          {/* Heatmap Empresas */}
          {mapReady && showHeatmapEmpresas && renderEmp?.features && (
            <Source id="heatmap-empresas" type="geojson" data={renderEmp}>
              <Layer
                id="heatmap-empresas-layer"
                beforeId="anchor-buildings"
                type="heatmap"
                paint={{
                  "heatmap-weight": [
                    "interpolate",
                    ["linear"],
                    ["get", "massa_salarial"],
                    0,
                    0,
                    100000,
                    0.2,
                    1000000,
                    1,
                  ],
                  "heatmap-intensity": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    1,
                    15,
                    3,
                  ],
                  "heatmap-color": [
                    "interpolate",
                    ["linear"],
                    ["heatmap-density"],
                    0,
                    "rgba(0, 0, 255, 0)",
                    0.2,
                    "rgba(29, 78, 216, 0.5)",
                    0.4,
                    "rgba(0, 255, 255, 0.7)",
                    0.6,
                    "rgba(0, 255, 0, 0.8)",
                    0.8,
                    "rgba(255, 255, 0, 0.9)",
                    1,
                    "rgba(255, 0, 0, 1)",
                  ],
                  "heatmap-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    15,
                    15,
                    40,
                  ],
                  "heatmap-opacity": 0.8,
                }}
              />
            </Source>
          )}

          {/* Heatmap Saúde */}
          {mapReady && showHeatmapSaude && renderSau?.features && (
            <Source id="heatmap-saude" type="geojson" data={renderSau}>
              <Layer
                id="heatmap-saude-layer"
                beforeId="anchor-buildings"
                type="heatmap"
                paint={{
                  "heatmap-weight": [
                    "interpolate",
                    ["linear"],
                    [
                      "+",
                      ["coalesce", ["get", "staff_medicos"], 0],
                      ["coalesce", ["get", "staff_enfermagem"], 0],
                    ],
                    0,
                    0,
                    10,
                    0.2,
                    50,
                    1,
                  ],
                  "heatmap-intensity": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    1,
                    15,
                    3,
                  ],
                  "heatmap-color": [
                    "interpolate",
                    ["linear"],
                    ["heatmap-density"],
                    0,
                    "rgba(0, 0, 255, 0)",
                    0.2,
                    "rgba(185, 28, 28, 0.5)",
                    0.4,
                    "rgba(239, 68, 68, 0.7)",
                    0.6,
                    "rgba(248, 113, 113, 0.8)",
                    0.8,
                    "rgba(255, 255, 0, 0.9)",
                    1,
                    "rgba(255, 0, 0, 1)",
                  ],
                  "heatmap-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    15,
                    15,
                    40,
                  ],
                  "heatmap-opacity": 0.8,
                }}
              />
            </Source>
          )}

          {/* Heatmap Educação */}
          {mapReady && showHeatmapEducacao && renderEdu?.features && (
            <Source id="heatmap-educacao" type="geojson" data={renderEdu}>
              <Layer
                id="heatmap-educacao-layer"
                beforeId="anchor-buildings"
                type="heatmap"
                paint={{
                  "heatmap-weight": [
                    "interpolate",
                    ["linear"],
                    [
                      "+",
                      ["coalesce", ["get", "qtd_matri_inf"], 0],
                      ["coalesce", ["get", "qtd_matri_fund"], 0],
                      ["coalesce", ["get", "qtd_matri_med"], 0],
                    ],
                    0,
                    0,
                    100,
                    0.2,
                    500,
                    1,
                  ],
                  "heatmap-intensity": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    1,
                    15,
                    3,
                  ],
                  "heatmap-color": [
                    "interpolate",
                    ["linear"],
                    ["heatmap-density"],
                    0,
                    "rgba(0, 0, 255, 0)",
                    0.2,
                    "rgba(21, 128, 61, 0.5)",
                    0.4,
                    "rgba(34, 197, 94, 0.7)",
                    0.6,
                    "rgba(134, 239, 172, 0.8)",
                    0.8,
                    "rgba(255, 255, 0, 0.9)",
                    1,
                    "rgba(255, 0, 0, 1)",
                  ],
                  "heatmap-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    15,
                    15,
                    40,
                  ],
                  "heatmap-opacity": 0.8,
                }}
              />
            </Source>
          )}

          {/* Ordem z (do fundo para o topo): Mancha → Infraestrutura → Agricultura → Cobertura → Prédios 3D → Empresas/Educação/Saúde/Patrimônio */}

          {/* Infra em ordem z: Logradouros → Terrenos → Quadras (último=fundo) */}
          {mapReady &&
            baseReady &&
            camadas.includes("Infraestrutura") &&
            ["Logradouros", "Terrenos", "Quadras"].map((nome) => {
              const total = baseInfra[nome]
              if (!total || !infraAtivas.includes(nome)) return null
              const sid = `infra-${slugify(nome)}`
              const geo =
                cenario !== "(nenhum)"
                  ? (atingidosInfra[nome] ?? {
                      type: "FeatureCollection",
                      features: [],
                    })
                  : total
              const cor = INFRA_COLORS[nome] ?? COLORS.infra
              const corContorno = INFRA_COLORS[nome] ?? "#d97706"
              return (
                <Source key={sid} id={sid} type="geojson" data={geo}>
                  <Layer
                    beforeId="anchor-buildings"
                    id={`${sid}-fill`}
                    type="fill"
                    filter={[
                      "any",
                      ["==", ["geometry-type"], "Polygon"],
                      ["==", ["geometry-type"], "MultiPolygon"],
                    ]}
                    paint={{
                      "fill-color": cor,
                      "fill-opacity": 0.25,
                      "fill-outline-color": corContorno,
                    }}
                  />
                  <Layer
                    beforeId="anchor-buildings"
                    id={`${sid}-line`}
                    type="line"
                    filter={[
                      "any",
                      ["==", ["geometry-type"], "LineString"],
                      ["==", ["geometry-type"], "MultiLineString"],
                    ]}
                    paint={{ "line-color": cor, "line-width": 2.5 }}
                  />
                  <Layer
                    beforeId="anchor-buildings"
                    id={`${sid}-point`}
                    type="circle"
                    filter={[
                      "any",
                      ["==", ["geometry-type"], "Point"],
                      ["==", ["geometry-type"], "MultiPoint"],
                    ]}
                    paint={{
                      "circle-color": cor,
                      "circle-radius": 4.5,
                      "circle-stroke-width": 1.5,
                      "circle-stroke-color": "#fff",
                    }}
                  />
                </Source>
              )
            })}

          {mapReady &&
            camadas.includes("Agricultura") &&
            showAgricultura?.features && (
              <Source id="agricultura" type="geojson" data={showAgricultura}>
                <Layer
                  beforeId="anchor-buildings"
                  id="agricultura-fill"
                  type="fill"
                  paint={{
                    "fill-color": [
                      "match",
                      ["get", "tipo_cultura"],
                      "Soja",
                      "#D4A017",
                      "Arroz",
                      "#4FC3F7",
                      "Outras Lavouras Temporarias",
                      "#AED581",
                      "#888888",
                    ],
                    "fill-opacity": 0.72,
                  }}
                />
                <Layer
                  beforeId="anchor-buildings"
                  id="agricultura-line"
                  type="line"
                  paint={{
                    "line-color": [
                      "match",
                      ["get", "tipo_cultura"],
                      "Soja",
                      "#D4A017",
                      "Arroz",
                      "#4FC3F7",
                      "Outras Lavouras Temporarias",
                      "#AED581",
                      "#888888",
                    ],
                    "line-width": 1,
                    "line-opacity": 0.45,
                  }}
                />
              </Source>
            )}

          {mapReady &&
            camadas.includes("Uso e Cobertura da Terra") &&
            showCobertura?.features && (
              <Source id="cobertura" type="geojson" data={showCobertura}>
                <Layer
                  beforeId="anchor-buildings"
                  id="cobertura-fill"
                  type="fill"
                  paint={{
                    "fill-color": [
                      "match",
                      ["get", "tipo_classe"],
                      "Silvicultura",
                      "#7a5900",
                      "Campo Alagado e Area Pantanosa",
                      "#519799",
                      "Formacao Campestre",
                      "#d6bc74",
                      "Mosaico de Usos",
                      "#E8C06B",
                      "Restinga Arborea",
                      "#02d659",
                      "Restinga Herbacea",
                      "#ad5100",
                      "#888888",
                    ],
                    "fill-opacity": 0.68,
                  }}
                />
                <Layer
                  beforeId="anchor-buildings"
                  id="cobertura-line"
                  type="line"
                  paint={{
                    "line-color": [
                      "match",
                      ["get", "tipo_classe"],
                      "Silvicultura",
                      "#7a5900",
                      "Campo Alagado e Area Pantanosa",
                      "#519799",
                      "Formacao Campestre",
                      "#d6bc74",
                      "Mosaico de Usos",
                      "#E8C06B",
                      "Restinga Arborea",
                      "#02d659",
                      "Restinga Herbacea",
                      "#ad5100",
                      "#888888",
                    ],
                    "line-width": 1,
                    "line-opacity": 0.45,
                  }}
                />
              </Source>
            )}

          {/* Point layers rendered last (above polygon/line layers) */}
          <Source
            id="empresas"
            type="geojson"
            data={
              camadas.includes("Empresas") && renderEmp?.features
                ? renderEmp
                : EMPTY_GEO
            }
            cluster
            clusterMaxZoom={14}
            clusterRadius={40}
          >
            <Layer
              id="empresas-cluster"
              type="circle"
              filter={["has", "point_count"]}
              layout={{
                visibility:
                  camadas.includes("Empresas") && !!renderEmp?.features
                    ? "visible"
                    : "none",
              }}
              paint={{
                "circle-color": COLORS.empresas,
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  14,
                  50,
                  20,
                  200,
                  26,
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
              }}
            />
            <Layer
              id="empresas-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                visibility:
                  camadas.includes("Empresas") && !!renderEmp?.features
                    ? "visible"
                    : "none",
                "text-field": "{point_count_abbreviated}",
                "text-size": 11,
              }}
              paint={{ "text-color": "#fff" }}
            />
            <Layer
              id="empresas-point"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              layout={{
                visibility:
                  camadas.includes("Empresas") && !!renderEmp?.features
                    ? "visible"
                    : "none",
              }}
              paint={{
                "circle-color": COLORS.empresas,
                "circle-radius": 5,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
          <Source
            id="educacao"
            type="geojson"
            data={
              camadas.includes("Educação") && renderEdu?.features
                ? renderEdu
                : EMPTY_GEO
            }
            cluster
            clusterMaxZoom={14}
            clusterRadius={40}
          >
            <Layer
              id="educacao-cluster"
              type="circle"
              filter={["has", "point_count"]}
              layout={{
                visibility:
                  camadas.includes("Educação") && !!renderEdu?.features
                    ? "visible"
                    : "none",
              }}
              paint={{
                "circle-color": COLORS.educacao,
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  14,
                  50,
                  20,
                  200,
                  26,
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
              }}
            />
            <Layer
              id="educacao-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                visibility:
                  camadas.includes("Educação") && !!renderEdu?.features
                    ? "visible"
                    : "none",
                "text-field": "{point_count_abbreviated}",
                "text-size": 11,
              }}
              paint={{ "text-color": "#fff" }}
            />
            <Layer
              id="educacao-point"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              layout={{
                visibility:
                  camadas.includes("Educação") && !!renderEdu?.features
                    ? "visible"
                    : "none",
              }}
              paint={{
                "circle-color": COLORS.educacao,
                "circle-radius": 5,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
          <Source
            id="saude"
            type="geojson"
            data={
              camadas.includes("Saúde") && renderSau?.features
                ? renderSau
                : EMPTY_GEO
            }
            cluster
            clusterMaxZoom={14}
            clusterRadius={40}
          >
            <Layer
              id="saude-cluster"
              type="circle"
              filter={["has", "point_count"]}
              layout={{
                visibility:
                  camadas.includes("Saúde") && !!renderSau?.features
                    ? "visible"
                    : "none",
              }}
              paint={{
                "circle-color": COLORS.saude,
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  14,
                  50,
                  20,
                  200,
                  26,
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
              }}
            />
            <Layer
              id="saude-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                visibility:
                  camadas.includes("Saúde") && !!renderSau?.features
                    ? "visible"
                    : "none",
                "text-field": "{point_count_abbreviated}",
                "text-size": 11,
              }}
              paint={{ "text-color": "#fff" }}
            />
            <Layer
              id="saude-point"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              layout={{
                visibility:
                  camadas.includes("Saúde") && !!renderSau?.features
                    ? "visible"
                    : "none",
              }}
              paint={{
                "circle-color": COLORS.saude,
                "circle-radius": 5,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
          <Source
            id="patrimonio"
            type="geojson"
            data={
              camadas.includes("Patrimônio Histórico") &&
              renderPatrimonio?.features
                ? renderPatrimonio
                : EMPTY_GEO
            }
            cluster
            clusterMaxZoom={14}
            clusterRadius={40}
          >
            <Layer
              id="patrimonio-cluster"
              type="circle"
              filter={["has", "point_count"]}
              layout={{
                visibility:
                  camadas.includes("Patrimônio Histórico") &&
                  !!renderPatrimonio?.features
                    ? "visible"
                    : "none",
              }}
              paint={{
                "circle-color": COLORS.patrimonio,
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  14,
                  50,
                  20,
                  200,
                  26,
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
              }}
            />
            <Layer
              id="patrimonio-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                visibility:
                  camadas.includes("Patrimônio Histórico") &&
                  !!renderPatrimonio?.features
                    ? "visible"
                    : "none",
                "text-field": "{point_count_abbreviated}",
                "text-size": 11,
              }}
              paint={{ "text-color": "#fff" }}
            />
            <Layer
              id="patrimonio-point"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              layout={{
                visibility:
                  camadas.includes("Patrimônio Histórico") &&
                  !!renderPatrimonio?.features
                    ? "visible"
                    : "none",
              }}
              paint={{
                "circle-color": COLORS.patrimonio,
                "circle-radius": 5,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
        </Map>

        {/* Logo CIEX + GPEA — barra com a altura do grupo de zoom (72 px), alinhada a ele, à esquerda do zoom, na base; a legenda se apoia acima dela */}
        <div className="pointer-events-none absolute right-[40px] bottom-[40px] z-10">
          <div
            className="flex h-[72px] w-[150px] items-center justify-center gap-2 rounded-md bg-white/90 px-2 shadow-sm"
            style={{ border: "2px solid rgba(0,0,0,0.1)" }}
          >
            <Image
              src="/CIEX2.png"
              alt="CIEX"
              width={58}
              height={58}
              className="object-contain"
              style={{
                width: "auto",
                height: "auto",
                maxWidth: "58px",
                maxHeight: "58px",
              }}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <div className="h-10 w-px bg-black/10" />
            <Image
              src="/GPEA.png"
              alt="GPEA"
              width={80}
              height={26}
              className="object-contain"
              style={{
                width: "auto",
                height: "auto",
                maxWidth: "56px",
                maxHeight: "30px",
              }}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center pb-6">
          <div className="flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/90 px-4 py-2 shadow-lg backdrop-blur-md">
            <svg
              className="h-4 w-4 animate-spin"
              style={{ color: C.primary }}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-xs font-bold text-slate-700">
              Carregando dados...
            </span>
          </div>
        </div>
      )}

      {/* ── Legenda: canto direito, acima da barra de logos e dos controles do mapa ──────── */}
      <div
        className="absolute right-2 bottom-[120px] z-10 flex w-[182px] flex-col justify-end"
        style={{
          maxHeight: filtrosVisiveis
            ? "calc(100vh - 262px)"
            : `calc(100vh - ${120 + panelTop + 44}px)`,
        }}
      >
        <div
          className="flex min-h-0 flex-col overflow-hidden rounded-xl"
          style={glassStyle(0.55)}
        >
          <button
            onClick={() => setShowLegenda((p) => !p)}
            className="flex w-full shrink-0 items-center justify-between gap-3 px-2 py-1.5"
            style={{ background: BRAND_GRADIENT }}
          >
            <span className="text-[8px] font-black tracking-wider text-white uppercase">
              Legenda
            </span>
            <span className="text-white/80" style={{ fontSize: 8 }}>
              {showLegenda ? "▼" : "▲"}
            </span>
          </button>
          {showLegenda && (
            <div className="flex min-h-0 flex-col gap-2 overflow-y-auto px-2 py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
              {(() => {
                const pontos = [
                  camadas.includes("Empresas") && renderEmp?.features && (
                    <LegendItem
                      key="emp"
                      cor={COLORS.empresas}
                      label="Empresas"
                    />
                  ),
                  camadas.includes("Saúde") && renderSau?.features && (
                    <LegendItem key="sau" cor={COLORS.saude} label="Saúde" />
                  ),
                  camadas.includes("Educação") && renderEdu?.features && (
                    <LegendItem
                      key="edu"
                      cor={COLORS.educacao}
                      label="Educação"
                    />
                  ),
                  camadas.includes("Patrimônio Histórico") &&
                    renderPatrimonio?.features && (
                      <LegendItem
                        key="pat"
                        cor={COLORS.patrimonio}
                        label="Patrimônio Histórico"
                      />
                    ),
                ].filter(Boolean)
                const mostraInfra =
                  camadas.includes("Infraestrutura") && infraAtivas.length > 0
                const mostraAgri =
                  camadas.includes("Agricultura") && !!showAgricultura?.features
                const mostraCob =
                  camadas.includes("Uso e Cobertura da Terra") &&
                  !!showCobertura?.features
                const mostraPop =
                  showHeatmapPopulacao && !!popData?.["Rio Grande"]
                const mostraMancha = !!manchaCenario && showMancha
                const secoes: {
                  key: string
                  titulo: string
                  corpo: React.ReactNode
                }[] = [
                  ...(pontos.length > 0
                    ? [{ key: "pontos", titulo: "Pontos", corpo: pontos }]
                    : []),
                  ...(mostraInfra
                    ? [
                        {
                          key: "infra",
                          titulo: "Infraestrutura",
                          corpo: infraAtivas.map((nome) => (
                            <LegendItem
                              key={`infra-${nome}`}
                              cor={INFRA_COLORS[nome] ?? COLORS.infra}
                              label={nome}
                              area={["Quadras", "Terrenos"].includes(nome)}
                            />
                          )),
                        },
                      ]
                    : []),
                  ...(mostraAgri
                    ? [
                        {
                          key: "agri",
                          titulo: "Agricultura",
                          corpo: Object.entries(AGRI_COLORS).map(
                            ([tipo, cor]) => (
                              <LegendItem
                                key={`agr-${tipo}`}
                                cor={cor}
                                label={tipo}
                                area
                              />
                            )
                          ),
                        },
                      ]
                    : []),
                  ...(mostraCob
                    ? [
                        {
                          key: "cob",
                          titulo: "Cobertura da Terra",
                          corpo: Object.entries(COBERTURA_COLORS).map(
                            ([tipo, cor]) => (
                              <LegendItem
                                key={`cob-${tipo}`}
                                cor={cor}
                                label={tipo}
                                area
                              />
                            )
                          ),
                        },
                      ]
                    : []),
                  ...(mostraPop
                    ? [
                        {
                          key: "pop",
                          titulo: "População",
                          corpo: (
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-16 shrink-0 rounded-sm"
                                style={{
                                  background:
                                    "linear-gradient(to right, #0d0887, #9c179e, #ed7953, #f0f921)",
                                }}
                              />
                              <div className="flex flex-col gap-0.5 leading-none">
                                <span
                                  className="text-[10px] font-medium"
                                  style={{ color: C.primary }}
                                >
                                  Pop. (hab./pixel)
                                </span>
                                <span
                                  className="text-[8px]"
                                  style={{ color: C.muted }}
                                >
                                  baixo → alto
                                </span>
                              </div>
                            </div>
                          ),
                        },
                      ]
                    : []),
                  ...(mostraMancha
                    ? [
                        {
                          key: "mancha",
                          titulo: ALTURA_MANCHAS[cenario]
                            ? "Altura da lâmina d'água"
                            : "Cenário",
                          corpo: ALTURA_MANCHAS[cenario] ? (
                            ALTURA_MANCHAS[cenario].legenda.map(
                              ({ label, cor }) => (
                                <LegendItem
                                  key={`altura-${label}`}
                                  cor={cor}
                                  label={label}
                                  area
                                />
                              )
                            )
                          ) : (
                            <LegendItem
                              cor={COLORS.cenario}
                              label={cenario}
                              area
                            />
                          ),
                        },
                      ]
                    : []),
                ]
                if (secoes.length === 0)
                  return (
                    <span className="text-[9px]" style={{ color: C.muted }}>
                      Nenhuma camada ativa.
                    </span>
                  )
                return secoes.map(({ key, titulo, corpo }, i) => (
                  <div
                    key={key}
                    className={`flex flex-col gap-1 ${i > 0 ? "border-t pt-2" : ""}`}
                    style={{ borderColor: C.border }}
                  >
                    <div
                      className="text-[8px] font-black tracking-wider uppercase"
                      style={{ color: C.muted }}
                    >
                      {titulo}
                    </div>
                    {corpo}
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ── Copyright: base, centralizado na área livre do mapa (entre o painel e a atribuição) ── */}
      <div
        className={`pointer-events-none absolute right-[330px] bottom-4 z-10 flex items-end justify-center transition-[left] duration-300 ${showPainelAnalise ? "left-[397px]" : "left-0"}`}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        <div
          className="pointer-events-none shrink-0 rounded-xl px-3 py-1 text-center leading-none select-none"
          style={glassStyle(0.55)}
        >
          <span
            className="text-[9px] font-black tracking-wider uppercase"
            style={{ color: C.muted }}
          >
            © GPEa — Grupo de Pesquisa em Economia Azul
          </span>
          <span className="text-[9px]" style={{ color: C.muted }}>
            {" "}
            | Alisson T. G. Fiorentin
          </span>
        </div>
      </div>

      {/* ── Aviso metodológico (mancha binária) ─────────────────────────── */}
      {avisoMancha && (
        <div
          className="absolute inset-x-0 z-20 flex justify-center px-4"
          style={{ top: panelTop }}
        >
          <div
            className="animate-fade-in-up flex max-w-md items-start gap-2 rounded-xl px-3.5 py-2.5 shadow-2xl"
            style={glassStyle(0.75)}
          >
            <span className="mt-0.5 shrink-0 text-sm leading-none">⚠️</span>
            <p
              className="text-[11px] leading-snug"
              style={{ color: C.primary }}
            >
              {avisoMancha}
            </p>
            <button
              onClick={() => setAvisoMancha(null)}
              aria-label="Fechar aviso"
              className="shrink-0 rounded p-0.5 transition-colors hover:bg-slate-100"
              style={{ color: C.muted }}
            >
              <span className="text-[13px] leading-none">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Header — flex-wrap com tamanhos fluidos (.dash-header); em < 2000 px o cabeçalho tem 2 linhas (camadas na 2ª); painéis seguem panelTop */}
      <header
        ref={headerRef}
        className="dash-header absolute top-1.5 right-3 left-3 z-20 flex flex-wrap items-center rounded-xl shadow-2xl"
        style={{
          ...HEADER_GLASS,
          paddingInline: "0.75rem",
          paddingBlock: "0.25rem",
          gap: "var(--section-gap)",
        }}
      >
        {/* Logos CIEX + GPEA + título */}
        <div
          className="flex shrink-0 items-center gap-3 border-r"
          style={{
            borderColor: "rgba(255,255,255,0.2)",
            paddingRight: "var(--section-gap)",
          }}
        >
          <Image
            src="/CIEX.png"
            alt="CIEX"
            width={80}
            height={28}
            className="object-contain"
            style={{ height: "var(--logo-h)", width: "auto" }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <Image
            src="/GPEA.png"
            alt="GPEA"
            width={80}
            height={24}
            className="object-contain"
            style={{ height: "var(--logo-h2)", width: "auto" }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <div
            className="flex min-w-0 flex-col justify-center pl-3"
            style={{ maxWidth: "clamp(130px, 15vw, 260px)" }}
          >
            <h1
              className="leading-tight font-black text-white"
              style={{ fontSize: HEADER_FLUID.titleSize }}
            >
              Painel de Vulnerabilidade Econômica
            </h1>
            <span
              className="font-medium tracking-wider whitespace-nowrap text-white/70 uppercase"
              style={{ fontSize: HEADER_FLUID.subtitleSize }}
            >
              Rio Grande, RS
            </span>
          </div>
        </div>

        {/* Perdas Operacionais / Metodologia — empilhados, empurram o resto para a direita (mr-auto) */}
        <div className="grid shrink-0 grid-cols-2 gap-0.5 min-[2000px]:mr-auto max-[1999px]:flex max-[1999px]:flex-row max-[1999px]:gap-1">
          <Link
            href="/danos"
            className={NAV_LINK_CLASS}
            style={NAV_LINK_STYLE}
            title="Ver perdas operacionais (DaLA)"
          >
            <TrendingDown size={11} strokeWidth={2.5} />
            <span className="min-[2000px]:hidden">Perdas</span>
            <span className="max-[1999px]:hidden">Perdas Operacionais</span>
          </Link>
          <Link
            href="/danos?aba=fisico"
            className={NAV_LINK_CLASS}
            style={NAV_LINK_STYLE}
            title="Ver danos físicos (exposição por cota)"
          >
            <Waves size={11} strokeWidth={2.5} />
            <span className="min-[2000px]:hidden">Danos</span>
            <span className="max-[1999px]:hidden">Danos Físicos</span>
          </Link>
          <Link
            href="/metodologia"
            className={`${NAV_LINK_CLASS} min-[2000px]:col-span-2`}
            style={NAV_LINK_STYLE}
            title="Ver metodologia do painel"
          >
            <BookOpen size={11} strokeWidth={2.5} />
            Metodologia
          </Link>
        </div>

        {/* Cenário */}
        <div
          className="flex w-[calc(var(--select-w)+var(--section-gap))] shrink-0 flex-col gap-0 border-r border-white/20 pr-[var(--section-gap)] max-[1999px]:w-auto max-[1999px]:min-w-[var(--select-w)] max-[1999px]:flex-1 max-[1999px]:border-r-0 max-[1999px]:pr-0"
        >
          <label
            className="font-bold tracking-wider whitespace-nowrap text-white/70 uppercase"
            style={{ fontSize: "var(--select-label)" }}
          >
            Cenário de Inundação
          </label>
          <Select value={cenario} onValueChange={setCenario}>
            <SelectTrigger
              aria-label="Cenário de inundação"
              className="w-full min-w-0 border-white/20 text-white"
              style={{
                backgroundColor: `${C.field}cc`,
                fontSize: "var(--select-trigger)",
                height: "var(--select-h)",
              }}
            >
              <SelectValue placeholder="(nenhum)" />
            </SelectTrigger>
            {/* popper: abre abaixo do gatilho e mostra todas as opções; o padrão (item-aligned) alinha a
                opção selecionada ao gatilho e, perto do topo da tela, corta as primeiras opções */}
            <SelectContent position="popper" align="start" sideOffset={4}>
              <SelectItem value="(nenhum)">(Ver Total)</SelectItem>
              {CENARIOS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Camadas — 1 linha em telas largas; abaixo de 2000 px vão para a 2ª linha do cabeçalho, numa linha só (os botões dividem a largura; abaixo de 1000 px só ícones) */}
        <div
          className="flex items-center max-[1999px]:order-last max-[1999px]:basis-full"
          style={{ gap: "var(--layer-gap)" }}
        >
          {[
            {
              id: "Empresas",
              label: "Empresas",
              icon: <Building2 size={11} strokeWidth={2.5} />,
            },
            {
              id: "Saúde",
              label: "Saúde",
              icon: <HeartPulse size={11} strokeWidth={2.5} />,
            },
            {
              id: "Educação",
              label: "Educação",
              icon: <GraduationCap size={11} strokeWidth={2.5} />,
            },
            {
              id: "Agricultura",
              label: "Agricultura",
              icon: <Sprout size={11} strokeWidth={2.5} />,
            },
            {
              id: "Uso e Cobertura da Terra",
              label: "Cobertura",
              icon: <Leaf size={11} strokeWidth={2.5} />,
            },
            {
              id: "Patrimônio Histórico",
              label: "Patrimônio",
              icon: <Landmark size={11} strokeWidth={2.5} />,
            },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => toggleCamada(id)}
              aria-pressed={camadas.includes(id)}
              title={label}
              className={`active-press hover-lift flex shrink-0 items-center justify-center gap-1 rounded-md border font-black whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#1E404A]/40 focus-visible:ring-offset-1 focus-visible:outline-none max-[1999px]:flex-1 ${camadas.includes(id) ? "border-[#dce1d8] bg-white text-[#1E404A]" : "border-white/20 text-white/80 hover:bg-white/10"}`}
              style={{
                fontSize: "var(--btn-size)",
                height: "var(--btn-h)",
                paddingInline: "var(--btn-px)",
                ...(camadas.includes(id) ? {} : { backgroundColor: C.field }),
              }}
            >
              {icon}
              <span className="max-[999px]:sr-only">{label}</span>
            </button>
          ))}

          {/* Infraestrutura dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={!possuiInfra}
              className={`active-press hover-lift flex shrink-0 items-center justify-center gap-1.5 rounded-md border font-black whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 max-[1999px]:flex-1 ${camadas.includes("Infraestrutura") && infraAtivas.length > 0 ? "border-[#dce1d8] bg-white text-[#1E404A]" : "border-white/20 text-white/80 hover:bg-white/10"}`}
              style={{
                fontSize: "var(--btn-size)",
                height: "var(--btn-h)",
                paddingInline: "var(--btn-px)",
                ...(camadas.includes("Infraestrutura") && infraAtivas.length > 0
                  ? {}
                  : { backgroundColor: C.field }),
              }}
            >
              <span className="flex items-center gap-1">
                <Wrench size={11} strokeWidth={2.5} />
                <span className="max-[999px]:sr-only">Infraestrutura</span>{" "}
                {infraAtivas.length > 0 && `(${infraAtivas.length})`}
              </span>
              <span className="text-[7px] opacity-70">▼</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <button
                onClick={toggleMenuInfra}
                className="mb-1 w-full border-b border-slate-200/60 px-2 py-1 text-left text-xs font-bold text-slate-500 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none"
              >
                {camadas.includes("Infraestrutura")
                  ? "Ocultar Camada"
                  : "Exibir Camada"}
              </button>
              {INFRA_LAYERS.map((nome) => (
                <DropdownMenuCheckboxItem
                  key={nome}
                  checked={infraAtivas.includes(nome)}
                  onCheckedChange={() => toggleInfra(nome)}
                  className="text-xs hover:bg-slate-100"
                >
                  {nome}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Filtros (direita) — camadas/heatmaps como chips; selects de dados recolhidos em "Filtrar dados" ── */}
      {showFiltros && (temCamadaTabular || isCenarioAtivo) && (
        <div
          onPointerDown={() => {
            filtrosInteragiu.current = true
          }}
          onPointerEnter={() => {
            filtrosInteragiu.current = true
          }}
          onFocus={() => {
            filtrosInteragiu.current = true
          }}
          className="absolute right-4 z-10 flex w-44 flex-col gap-1.5 overflow-y-auto rounded-xl p-2 shadow-2xl [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent"
          style={{
            top: panelTop,
            maxHeight: `calc(100vh - ${panelTop + 20}px)`,
            ...glassStyle(0.6),
          }}
        >
          <div
            className="flex items-center justify-between border-b pb-1"
            style={{ borderColor: C.border }}
          >
            <span
              className="text-[9px] font-black tracking-wider uppercase"
              style={{ color: C.primary }}
            >
              Filtros de Mapa
            </span>
            <button
              onClick={() => setShowFiltros(false)}
              title="Recolher filtros"
              aria-label="Recolher filtros"
              className="flex items-center justify-center rounded p-0.5 transition-colors hover:bg-slate-100"
              style={{ color: C.muted }}
            >
              <PanelRightClose size={13} strokeWidth={2.5} />
            </button>
          </div>

          {(() => {
            type Chip = {
              id: string
              label: string
              cor: string
              on: boolean
              toggle: () => void
            }
            const chip = (c: Chip) => (
              <button
                key={c.id}
                onClick={c.toggle}
                aria-pressed={c.on}
                className="flex h-6 min-w-0 items-center gap-1 rounded-full border px-1.5 text-[9px] font-bold transition-colors duration-150"
                style={{
                  backgroundColor: c.on ? `${c.cor}20` : "transparent",
                  borderColor: c.on ? c.cor : "#cbd5e1",
                  color: c.on ? c.cor : "#64748b",
                }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: c.on ? c.cor : "#cbd5e1" }}
                />
                <span className="truncate">{c.label}</span>
              </button>
            )
            const titulo = (txt: string) => (
              <div className="text-[8px] font-black tracking-wider text-slate-500 uppercase">
                {txt}
              </div>
            )
            const heatmaps: Chip[] = [
              {
                id: "pop",
                label: "População",
                cor: "#7e22ce",
                on: showHeatmapPopulacao,
                toggle: () => setShowHeatmapPopulacao((p) => !p),
              },
              {
                id: "emp",
                label: "Empresas",
                cor: "#1d4ed8",
                on: showHeatmapEmpresas,
                toggle: () => setShowHeatmapEmpresas((p) => !p),
              },
              {
                id: "sau",
                label: "Saúde",
                cor: "#b91c1c",
                on: showHeatmapSaude,
                toggle: () => setShowHeatmapSaude((p) => !p),
              },
              {
                id: "edu",
                label: "Educação",
                cor: "#15803d",
                on: showHeatmapEducacao,
                toggle: () => setShowHeatmapEducacao((p) => !p),
              },
            ]
            return (
              <>
                {isCenarioAtivo && (
                  <div className="flex flex-col gap-1">
                    {titulo("Camadas")}
                    <div className="grid grid-cols-2 gap-1">
                      {chip({
                        id: "mancha",
                        label: "Mancha",
                        cor: COLORS.cenario,
                        on: showMancha,
                        toggle: () => setShowMancha((p) => !p),
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  {titulo("Heatmaps")}
                  <div className="grid grid-cols-2 gap-1">
                    {heatmaps.map(chip)}
                  </div>
                </div>
              </>
            )
          })()}

          {temFiltroDados && (
            <div
              className="flex flex-col gap-1 border-t pt-1"
              style={{ borderColor: C.border }}
            >
              <button
                onClick={() => setAbertoFiltros((v) => !v)}
                aria-expanded={abertoFiltros}
                className="flex items-center justify-between text-[8px] font-black tracking-wider text-slate-500 uppercase"
              >
                <span>
                  Filtrar dados
                  {nFiltrosAtivos > 0 && (
                    <span
                      className="ml-1 rounded-full px-1.5 py-px text-white"
                      style={{ backgroundColor: C.primary }}
                    >
                      {nFiltrosAtivos}
                    </span>
                  )}
                </span>
                <span className="opacity-70">{abertoFiltros ? "▲" : "▼"}</span>
              </button>
              {abertoFiltros && (
                <>
                  {camadas.includes("Empresas") && (
                    <div className="flex w-full shrink-0 flex-col gap-0.5 overflow-hidden">
                      <label className="text-[8px] font-bold tracking-wider text-blue-700 uppercase">
                        Setor (Empresas)
                      </label>
                      <Select
                        value={filtroSetor}
                        onValueChange={setFiltroSetor}
                      >
                        <SelectTrigger className="h-6 w-full border-blue-200/60 bg-blue-50/50 text-[10px] [&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="(todos)">(todos)</SelectItem>
                          {setoresUnicos.map((s) => (
                            <SelectItem key={s} value={s}>
                              {normalizeSetor(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {camadas.includes("Educação") && (
                    <div className="flex w-full shrink-0 flex-col gap-0.5 overflow-hidden">
                      <label className="text-[8px] font-bold tracking-wider text-green-700 uppercase">
                        Dependência (Escolas)
                      </label>
                      <Select value={filtroDep} onValueChange={setFiltroDep}>
                        <SelectTrigger className="h-6 w-full border-green-200/60 bg-green-50/50 text-[10px] [&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="(todas)">(todas)</SelectItem>
                          {depsUnicas.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {camadas.includes("Saúde") && (
                    <div className="flex w-full shrink-0 flex-col gap-0.5 overflow-hidden">
                      <label className="text-[8px] font-bold tracking-wider text-red-700 uppercase">
                        Unidade (Saúde)
                      </label>
                      <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                        <SelectTrigger className="h-6 w-full border-red-200/60 bg-red-50/50 text-[10px] [&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="(todas)">(todas)</SelectItem>
                          {tiposUnicos.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {camadas.includes("Patrimônio Histórico") && (
                    <div className="flex w-full shrink-0 flex-col gap-0.5 overflow-hidden">
                      <label className="text-[8px] font-bold tracking-wider text-amber-700 uppercase">
                        Tipologia (Patrimônio)
                      </label>
                      <Select
                        value={filtroTipologia}
                        onValueChange={setFiltroTipologia}
                      >
                        <SelectTrigger className="h-6 w-full border-amber-200/60 bg-amber-50/50 text-[10px] [&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="(todas)">(todas)</SelectItem>
                          {tipologiasUnicas.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
      {!showFiltros && (temCamadaTabular || isCenarioAtivo) && (
        <button
          onClick={() => setShowFiltros(true)}
          className="active-press hover-lift absolute right-4 z-20 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black shadow-2xl focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
          style={{ top: panelTop, ...glassStyle(0.6), color: C.primary }}
        >
          <SlidersHorizontal size={12} strokeWidth={2.5} />
          Filtros
        </button>
      )}

      {/* Cenário "Todas as cotas": slider vertical ao lado do Painel (cota alta em cima), com play/pause.
          Segue o Painel (397 px de borda direita + folga) e vai para a esquerda, abaixo do botão "Abrir Painel", quando ele está oculto. */}
      {cotas.cotasAtivo &&
        (cotas.cotaRaster.erro || cotas.cotaRaster.cota !== null) && (
          <div
            className={`absolute bottom-1.5 z-20 rounded-xl px-2 py-3 transition-[left] duration-300 ${
              showPainelAnalise ? "left-[405px]" : "left-3"
            } ${cotas.cotaRaster.erro ? "max-w-[140px]" : "w-[68px]"}`}
            style={{
              top: showPainelAnalise ? panelTop : panelTop + 44,
              // aviso de erro: caixa só do tamanho do texto, não a coluna inteira
              ...(cotas.cotaRaster.erro ? { bottom: "auto" } : {}),
              ...glassStyle(0.8),
            }}
          >
            {cotas.cotaRaster.erro ? (
              <p className="text-center text-[11px] text-slate-600">
                Mapa por cota indisponível
              </p>
            ) : (
              <CotaControle
                raster={cotas.cotaRaster}
                vertical
                className="h-full"
              />
            )}
          </div>
        )}

      {/* ── Painel de Análise (esquerda flutuante) ─────────────────────── */}
      {showPainelAnalise && (
        <div
          className="absolute bottom-1.5 left-3 z-20 flex w-[385px] flex-col overflow-hidden rounded-xl p-4 shadow-2xl"
          style={{
            top: panelTop,
            ...glassStyle(0.6),
            animation: "panelSlideIn 320ms var(--ease-drawer) both",
          }}
        >
          <div className="mb-3 shrink-0">
            <h2
              className="flex items-center justify-between text-base font-black tracking-tight"
              style={{ color: C.primary }}
            >
              Painel
              <div className="flex gap-1">
                {ALTURA_MANCHAS[cenario] && (
                  <button
                    onClick={() => mostrarAvisoMancha(AVISO_MANCHA_BINARIA)}
                    title="Sobre a mancha binária"
                    className="active-press hover-lift flex h-6 w-6 items-center justify-center rounded-md bg-slate-200/80 text-slate-700 hover:bg-slate-300"
                  >
                    <Info size={12} strokeWidth={2.5} />
                  </button>
                )}
                <button
                  onClick={() => setShowPainelAnalise(false)}
                  className="active-press hover-lift flex items-center gap-1 rounded-md bg-slate-200/80 px-2 py-1 text-[9px] font-bold text-slate-700 hover:bg-slate-300"
                >
                  <EyeOff size={10} strokeWidth={2.5} />
                  Ocultar
                </button>
              </div>
            </h2>
            <p className="mt-0.5 text-[10px] leading-tight font-medium text-slate-500">
              <strong className="text-slate-700">Rio Grande, RS</strong>
              {isCenarioAtivo && ` — ${cenario}`}
            </p>
          </div>

          <Tabs
            value={tabAtiva}
            className="flex w-full flex-1 flex-col overflow-hidden"
          >
            <div
              className="flex shrink-0 flex-wrap gap-1.5 border-b pb-3"
              style={{ borderColor: C.border }}
            >
              {(
                [
                  {
                    value: "resumo",
                    label: "Resumo",
                    icon: <LayoutGrid size={11} strokeWidth={2.5} />,
                  },
                  {
                    value: "empresas",
                    label: "Empresas",
                    icon: <Building2 size={11} strokeWidth={2.5} />,
                  },
                  {
                    value: "saude",
                    label: "Saúde",
                    icon: <HeartPulse size={11} strokeWidth={2.5} />,
                  },
                  {
                    value: "educacao",
                    label: "Educação",
                    icon: <GraduationCap size={11} strokeWidth={2.5} />,
                  },
                  ...(camadas.includes("Patrimônio Histórico")
                    ? [
                        {
                          value: "patrimonio",
                          label: "Patrimônio",
                          icon: <Landmark size={11} strokeWidth={2.5} />,
                        },
                      ]
                    : []),
                  ...(camadas.includes("Infraestrutura")
                    ? [
                        {
                          value: "infra",
                          label: "Infraestrutura",
                          icon: <Wrench size={11} strokeWidth={2.5} />,
                        },
                      ]
                    : []),
                  ...(camadas.includes("Agricultura")
                    ? [
                        {
                          value: "agricultura",
                          label: "Agricultura",
                          icon: <Sprout size={11} strokeWidth={2.5} />,
                        },
                      ]
                    : []),
                  ...(camadas.includes("Uso e Cobertura da Terra")
                    ? [
                        {
                          value: "cobertura",
                          label: "Cobertura",
                          icon: <Leaf size={11} strokeWidth={2.5} />,
                        },
                      ]
                    : []),
                ] as { value: string; label: string; icon: React.ReactNode }[]
              ).map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setTabAtiva(value)}
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none"
                  style={
                    tabAtiva === value
                      ? {
                          backgroundColor: C.primary,
                          color: "#fff",
                          borderColor: C.dark,
                          boxShadow: "0 1px 3px rgba(0,0,0,.18)",
                        }
                      : {
                          backgroundColor: PANEL_CARD_BG,
                          color: C.muted,
                          borderColor: C.border,
                        }
                  }
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Resumo */}
            <TabsContent
              value="resumo"
              className="mt-2 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
            >
              <FitHeight min={0.5} max={1.3}>
                {tabAtiva === "resumo" &&
                  popData?.["Rio Grande"] &&
                  (() => {
                    const cenSlug = cenario
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                    const popCen =
                      cenario !== "(nenhum)"
                        ? popData["Rio Grande"].cenarios?.[cenSlug]
                        : null
                    return (
                      <div
                        className="mt-2 mb-4 shrink-0 overflow-hidden rounded-lg border"
                        style={{
                          borderColor: "#e9d5ff",
                          background:
                            "linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)",
                        }}
                      >
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Users
                            size={13}
                            strokeWidth={2.5}
                            className="shrink-0 text-purple-600"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-end justify-between gap-1">
                              <div className="min-w-0">
                                <div className="mb-0.5 text-[9px] leading-none font-bold tracking-wider text-purple-500 uppercase">
                                  Pop. Total
                                </div>
                                <div className="flex items-baseline gap-0.5">
                                  <span className="text-[13px] font-black text-purple-800 tabular-nums">
                                    {formatoBr(popData["Rio Grande"].pop_total)}
                                  </span>
                                  <span className="text-[9px] text-purple-400">
                                    hab.
                                  </span>
                                </div>
                              </div>
                              {popCen && (
                                <div className="min-w-0 shrink-0 text-right">
                                  <div className="mb-0.5 text-[9px] leading-none font-bold tracking-wider text-red-500 uppercase">
                                    Atingida
                                  </div>
                                  <div className="flex items-baseline justify-end gap-0.5">
                                    <span className="text-[13px] font-black text-red-700 tabular-nums">
                                      {formatoBr(popCen.pop_atingida)}
                                    </span>
                                    <span className="text-[9px] text-red-400">
                                      ({formatoBr(popCen.pct_atingida, 1)}%)
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            {popCen && (
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-purple-100">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(popCen.pct_atingida, 100)}%`,
                                    background:
                                      "linear-gradient(to right, #9333ea, #dc2626)",
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                {(() => {
                  const staffBase = Object.values(
                    metricasSau.base.staff
                  ).reduce((a, b) => a + (b as number), 0)
                  const staffImpacto = Object.values(
                    metricasSau.impacto.staff
                  ).reduce((a, b) => a + (b as number), 0)
                  const infraTerr = infraStats?.["Terrenos"]
                  const NIVEIS_ALUNOS = [
                    "inf",
                    "fund",
                    "med",
                    "profis",
                    "eja",
                    "esp",
                  ]
                  const somaAlunos = (m: any) =>
                    NIVEIS_ALUNOS.reduce(
                      (acc, k) => acc + ((m[k] as number) || 0),
                      0
                    )
                  const alunosBase = somaAlunos(metricasEdu.base)
                  const alunosImpacto = somaAlunos(metricasEdu.impacto)
                  const haBaseAgri = metricasAgri.base.reduce(
                    (s, { ha }) => s + ha,
                    0
                  )
                  const haImpAgri = metricasAgri.impacto.reduce(
                    (s, { ha }) => s + ha,
                    0
                  )

                  const tiles: {
                    icon: React.ReactNode
                    cor: string
                    titulo: string
                    valor: number
                    base: number
                    sufixo?: string
                    casas?: number
                  }[] = [
                    {
                      icon: <Users size={15} strokeWidth={2.5} />,
                      cor: COLORS.empresas,
                      titulo: "Empregados",
                      valor: isCenarioAtivo
                        ? metricasEmp.impacto.emp
                        : metricasEmp.base.emp,
                      base: metricasEmp.base.emp,
                    },
                    {
                      icon: <Building2 size={15} strokeWidth={2.5} />,
                      cor: COLORS.empresas,
                      titulo: "Empresas",
                      valor: isCenarioAtivo
                        ? metricasEmp.impacto.estab
                        : metricasEmp.base.estab,
                      base: metricasEmp.base.estab,
                    },
                    {
                      icon: <BookOpen size={15} strokeWidth={2.5} />,
                      cor: COLORS.educacao,
                      titulo: "Alunos",
                      valor: isCenarioAtivo ? alunosImpacto : alunosBase,
                      base: alunosBase,
                    },
                    {
                      icon: <GraduationCap size={15} strokeWidth={2.5} />,
                      cor: COLORS.educacao,
                      titulo: "Escolas",
                      valor: isCenarioAtivo
                        ? metricasEdu.impacto.escolas
                        : metricasEdu.base.escolas,
                      base: metricasEdu.base.escolas,
                    },
                    {
                      icon: <HeartPulse size={15} strokeWidth={2.5} />,
                      cor: COLORS.saude,
                      titulo: "Unidades de Saúde",
                      valor: isCenarioAtivo
                        ? metricasSau.impacto.unidades
                        : metricasSau.base.unidades,
                      base: metricasSau.base.unidades,
                    },
                    {
                      icon: <Stethoscope size={15} strokeWidth={2.5} />,
                      cor: COLORS.saude,
                      titulo: "Profissionais Saúde",
                      valor: isCenarioAtivo ? staffImpacto : staffBase,
                      base: staffBase,
                    },
                    ...(metricasPatrimonio.base.total > 0
                      ? [
                          {
                            icon: <Landmark size={15} strokeWidth={2.5} />,
                            cor: COLORS.patrimonio,
                            titulo: "Patrimônio Histórico",
                            valor: isCenarioAtivo
                              ? metricasPatrimonio.impacto.total
                              : metricasPatrimonio.base.total,
                            base: metricasPatrimonio.base.total,
                          },
                        ]
                      : []),
                    ...(infraTerr
                      ? [
                          {
                            icon: <LandPlot size={15} strokeWidth={2.5} />,
                            cor: INFRA_COLORS["Terrenos"],
                            titulo: "Terrenos",
                            valor: isCenarioAtivo
                              ? infraTerr.atingidos
                              : infraTerr.total,
                            base: infraTerr.total,
                          },
                        ]
                      : []),
                  ]

                  return (
                    <>
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        {tiles.map((t, i) => {
                          const pct = t.base > 0 ? (t.valor / t.base) * 100 : 0
                          const valorFmt =
                            t.sufixo === "R$"
                              ? `R$ ${compactoBr(t.valor, 1)}`
                              : compactoBr(t.valor, t.valor < 1000 ? 0 : 1)
                          const sub = isCenarioAtivo
                            ? `de ${t.sufixo === "R$" ? `R$ ${compactoBr(t.base, 1)}` : compactoBr(t.base, 1)} (${Math.round(pct)}%)`
                            : "Total"
                          return (
                            <MiniStatCard
                              key={i}
                              icon={t.icon}
                              cor={t.cor}
                              titulo={t.titulo}
                              valor={valorFmt}
                              sub={sub}
                              pct={isCenarioAtivo ? pct : 100}
                              isLoading={isLoading}
                            />
                          )
                        })}
                      </div>

                      {haBaseAgri > 0 && (
                        <div className="mb-2 overflow-hidden rounded-lg shadow-sm">
                          <div
                            className="flex items-center gap-1.5 px-3 py-1.5"
                            style={{ background: BRAND_GRADIENT }}
                          >
                            <Sprout
                              size={12}
                              strokeWidth={2.5}
                              className="text-white"
                            />
                            <span className="text-[10px] font-black tracking-wider text-white uppercase">
                              Área Agrícola
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-3 px-3 py-2.5"
                            style={{ backgroundColor: PANEL_CARD_BG }}
                          >
                            <DonutChart
                              size={56}
                              strokeWidth={7}
                              highlightOnHover={false}
                              data={[
                                {
                                  value: isCenarioAtivo
                                    ? haImpAgri
                                    : haBaseAgri,
                                  color: COLORS.agricultura,
                                  label: "Área",
                                },
                                {
                                  value: Math.max(
                                    0,
                                    haBaseAgri -
                                      (isCenarioAtivo ? haImpAgri : haBaseAgri)
                                  ),
                                  color: `${COLORS.agricultura}22`,
                                  label: "Resto",
                                },
                              ]}
                              centerContent={
                                <span
                                  className="text-[10px] font-black"
                                  style={{ color: COLORS.agricultura }}
                                >
                                  {haBaseAgri > 0
                                    ? Math.round(
                                        ((isCenarioAtivo
                                          ? haImpAgri
                                          : haBaseAgri) /
                                          haBaseAgri) *
                                          100
                                      )
                                    : 0}
                                  %
                                </span>
                              }
                            />
                            <div className="flex min-w-0 flex-col">
                              <span
                                className="text-[9px] font-bold tracking-wider uppercase"
                                style={{ color: C.muted }}
                              >
                                {isCenarioAtivo
                                  ? "Área Atingida"
                                  : "Área Total"}
                              </span>
                              <span
                                className="leading-tight font-black"
                                style={{
                                  color: C.primary,
                                  fontSize: PANEL_FLUID.fontValor,
                                }}
                              >
                                {compactoBr(
                                  isCenarioAtivo ? haImpAgri : haBaseAgri,
                                  1
                                )}{" "}
                                ha
                              </span>
                              {isCenarioAtivo && (
                                <span
                                  className="text-[9px]"
                                  style={{ color: C.muted }}
                                >
                                  de {compactoBr(haBaseAgri, 1)} ha
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </FitHeight>
            </TabsContent>

            {/* Empresas */}
            <TabsContent
              value="empresas"
              className="mt-4 flex-1 overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent"
            >
              {pilhaEmpresas && isCenarioAtivo && (
                <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900">
                  <strong>Localização aproximada.</strong>{" "}
                  {empresasNaPilha > 0 ? (
                    <>
                      {formatoBr(empresasNaPilha, 0)} das{" "}
                      {formatoBr(atingidosEmpresas?.features?.length ?? 0, 0)}{" "}
                      empresas atingidas (
                      {calcPct(
                        empresasNaPilha,
                        atingidosEmpresas?.features?.length ?? 0
                      )}
                      ) estão num mesmo ponto: o geocodificador colocou
                      endereços diferentes no centro da cidade. Os totais de
                      empresas, vínculos e VAB deste cenário dependem desse
                      ponto.
                    </>
                  ) : (
                    <>
                      {formatoBr(pilhaEmpresas.n, 0)} empresas da base (
                      {calcPct(
                        pilhaEmpresas.n,
                        baseEmpresas?.features?.length ?? 0
                      )}
                      ) têm localização aproximada e ficam fora da mancha deste
                      cenário: o total atingido pode estar subestimado.
                    </>
                  )}{" "}
                  <a
                    href="/metodologia#limitacoes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline"
                  >
                    Saiba mais ↗
                  </a>
                </div>
              )}
              {setoresChart.length > 0 &&
                (() => {
                  const totalBase = metricasEmp.base.estab
                  const total = setoresChart.reduce(
                    (s, [, c]) => s + (c as number),
                    0
                  )
                  const pieData = setoresChart.map(([name, value]) => ({
                    name,
                    value,
                  }))
                  return (
                    <ChartCard titulo="Empresas por Setor">
                      <div className="flex items-center justify-center py-1">
                        <DonutChart
                          size={152}
                          strokeWidth={26}
                          cssSize={PANEL_FLUID.donutCss}
                          data={pieData.map((d, i) => ({
                            value: d.value as number,
                            color: DONUT_COLORS[i % DONUT_COLORS.length],
                            label: d.name,
                            opacity:
                              filtroSetor !== "(todos)" &&
                              filtroSetor !== d.name
                                ? 0.35
                                : 1,
                          }))}
                          onSegmentClick={(seg) => {
                            // "Outros" agrega setores fora do top 9; não é um CNAE
                            // e filtrar por ele esvaziaria o mapa e os KPIs.
                            if (seg.label === "Outros") return
                            setFiltroSetor(
                              filtroSetor === seg.label ? "(todos)" : seg.label
                            )
                          }}
                          centerContent={
                            <div className="flex flex-col items-center">
                              <span
                                className="leading-none font-black"
                                style={{
                                  color: C.primary,
                                  fontSize: PANEL_FLUID.fontValor,
                                }}
                              >
                                {total}
                              </span>
                              {isCenarioAtivo ? (
                                <>
                                  <span
                                    className="font-medium"
                                    style={{
                                      color: C.muted,
                                      fontSize: PANEL_FLUID.fontLabel,
                                    }}
                                  >
                                    {Math.round((total / totalBase) * 100)}%
                                    empresas
                                  </span>
                                  <span
                                    style={{
                                      color: C.muted,
                                      fontSize: PANEL_FLUID.fontLabel,
                                    }}
                                  >
                                    de {totalBase}
                                  </span>
                                </>
                              ) : (
                                <span
                                  className="font-medium"
                                  style={{
                                    color: C.muted,
                                    fontSize: PANEL_FLUID.fontLabel,
                                  }}
                                >
                                  empresas
                                </span>
                              )}
                            </div>
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {setoresChart.map(([setor, count], i) => (
                          <div
                            key={setor}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition-colors"
                            style={{
                              backgroundColor:
                                filtroSetor === setor
                                  ? `${DONUT_COLORS[i % DONUT_COLORS.length]}22`
                                  : "transparent",
                              outline:
                                filtroSetor === setor
                                  ? `1px solid ${DONUT_COLORS[i % DONUT_COLORS.length]}55`
                                  : "none",
                            }}
                            onClick={() => {
                              if (setor === "Outros") return
                              setFiltroSetor(
                                filtroSetor === setor ? "(todos)" : setor
                              )
                            }}
                            title={
                              setor === "Outros"
                                ? "Setores agrupados (fora do top 9)"
                                : filtroSetor === setor
                                  ? "Clique para remover filtro"
                                  : `Filtrar por ${normalizeSetor(setor)}`
                            }
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-sm"
                              style={{
                                backgroundColor:
                                  DONUT_COLORS[i % DONUT_COLORS.length],
                              }}
                            />
                            <span
                              className="flex-1 truncate text-[9px]"
                              style={{
                                color:
                                  filtroSetor === setor ? C.primary : C.muted,
                              }}
                              title={normalizeSetor(setor)}
                            >
                              {normalizeSetor(setor)}
                            </span>
                            <span
                              className="text-[9px] font-bold tabular-nums"
                              style={{ color: C.primary }}
                            >
                              {count}
                            </span>
                            <span
                              className="w-8 text-right text-[9px] tabular-nums"
                              style={{ color: C.muted }}
                            >
                              {Math.round(((count as number) / total) * 100)}%
                            </span>
                          </div>
                        ))}
                        {filtroSetor !== "(todos)" && (
                          <button
                            className="mt-1.5 self-start rounded-md px-2.5 py-1 text-[9px] font-bold"
                            style={{
                              backgroundColor: `${C.primary}15`,
                              color: C.primary,
                              border: `1px solid ${C.primary}35`,
                            }}
                            onClick={() => setFiltroSetor("(todos)")}
                          >
                            ✕ Limpar filtro
                          </button>
                        )}
                      </div>
                    </ChartCard>
                  )
                })()}
              <div className="animate-fade-in-up flex flex-col gap-2 pb-2">
                <KPIRow
                  isLoading={isLoading}
                  titulo="Empregados"
                  cor={COLORS.empresas}
                  valor={compactoBr(renderEmpMetrics.emp, 0)}
                  sub={isCenarioAtivo ? "Atingidos" : "Total"}
                  delta={
                    isCenarioAtivo
                      ? `de ${compactoBr(baseEmpFiltMetrics.emp, 0)} (${calcPct(renderEmpMetrics.emp, baseEmpFiltMetrics.emp)})`
                      : undefined
                  }
                />
              </div>
              {(() => {
                const setores = Object.keys(empPorSetor.base)
                  .sort(
                    (a, b) =>
                      (empPorSetor.base[b] || 0) - (empPorSetor.base[a] || 0)
                  )
                  .slice(0, 9)
                if (setores.length === 0) return null
                const maxBase = empPorSetor.base[setores[0]] || 1
                return (
                  <ChartCard titulo="Empregados por Setor">
                    <div className="flex flex-col gap-1.5">
                      {setores.map((setor, i) => {
                        const baseVal = empPorSetor.base[setor] || 0
                        const atgVal = empPorSetor.impacto[setor] || 0
                        const val = isCenarioAtivo ? atgVal : baseVal
                        const pct =
                          baseVal > 0 ? Math.round((atgVal / baseVal) * 100) : 0
                        const isSelected = filtroSetor === setor
                        return (
                          <div
                            key={setor}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 transition-colors"
                            style={{
                              backgroundColor: isSelected
                                ? `${DONUT_COLORS[i % DONUT_COLORS.length]}18`
                                : "transparent",
                              outline: isSelected
                                ? `1px solid ${DONUT_COLORS[i % DONUT_COLORS.length]}44`
                                : "none",
                            }}
                            onClick={() =>
                              setFiltroSetor(isSelected ? "(todos)" : setor)
                            }
                            title={
                              isSelected
                                ? "Clique para remover filtro"
                                : `Filtrar por ${normalizeSetor(setor)}`
                            }
                          >
                            <span
                              className="w-24 shrink-0 truncate text-[9px]"
                              style={{
                                color: isSelected ? C.primary : C.muted,
                              }}
                              title={normalizeSetor(setor)}
                            >
                              {normalizeSetor(setor)}
                            </span>
                            <div
                              className="h-2.5 flex-1 overflow-hidden rounded-full"
                              style={{ backgroundColor: PANEL_TRACK_BG }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${isCenarioAtivo ? pct : Math.round((val / maxBase) * 100)}%`,
                                  backgroundColor:
                                    DONUT_COLORS[i % DONUT_COLORS.length],
                                }}
                              />
                            </div>
                            <span
                              className="w-16 shrink-0 text-right text-[9px] font-bold tabular-nums"
                              style={{ color: C.primary }}
                            >
                              {compactoBr(val, 0)}
                              {isCenarioAtivo ? ` (${pct}%)` : ""}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </ChartCard>
                )
              })()}
              <div className="flex flex-col gap-2 pb-2">
                <KPIRow
                  isLoading={isLoading}
                  titulo="Massa Salarial"
                  cor={COLORS.empresas}
                  valor={`R$ ${compactoBr(renderEmpMetrics.massa, 1)}`}
                  sub="Mensal Estimada"
                  delta={
                    isCenarioAtivo
                      ? `de R$ ${compactoBr(baseEmpFiltMetrics.massa, 1)} (${calcPct(renderEmpMetrics.massa, baseEmpFiltMetrics.massa)})`
                      : undefined
                  }
                />
                <KPIRow
                  isLoading={isLoading}
                  titulo="Média Salarial"
                  cor={COLORS.empresas}
                  valor={`R$ ${compactoBr(renderEmpMetrics.media, 1)}`}
                  sub="Por Vínculo (massa ÷ vínculos)"
                />
              </div>
              <p
                className="mt-3 border-t pt-2 text-[9px] italic"
                style={{ color: C.muted, borderColor: C.border }}
              >
                Fonte: RAIS — Relação Anual de Informações Sociais
              </p>
            </TabsContent>

            {/* Educação */}
            <TabsContent
              value="educacao"
              className="mt-4 flex-1 overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent"
            >
              {(() => {
                const src = isCenarioAtivo ? atingidosEducacao : baseEducacao
                if (!src?.features) return null
                const counts: Record<string, number> = {}
                src.features.forEach((f: any) => {
                  const dep = normalizeDep(
                    String(f.properties?.tp_dependencia || "")
                  )
                  if (dep) counts[dep] = (counts[dep] || 0) + 1
                })
                const pieData = Object.entries(counts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, value]) => ({ name, value }))
                const totalDep = pieData.reduce((s, d) => s + d.value, 0)
                const baseTotalDep = isCenarioAtivo
                  ? (baseEducacao?.features?.length ?? 0)
                  : totalDep
                if (pieData.length === 0) return null
                const listaFeats = isCenarioAtivo
                  ? (atingidosEducacao?.features ?? []).filter(
                      (f: any) =>
                        filtroDep === "(todas)" ||
                        normalizeDep(
                          String(f.properties?.tp_dependencia || "")
                        ) === filtroDep
                    )
                  : []
                const lista = listaFeats
                  .map((f: any) =>
                    String(f.properties?.no_entidade ?? "").trim()
                  )
                  .filter(Boolean)
                  .sort((a: string, b: string) => a.localeCompare(b, "pt-BR"))
                return (
                  <>
                    <ChartCard titulo="Escolas por Dependência">
                      <div className="flex items-center justify-center py-1">
                        <DonutChart
                          size={140}
                          strokeWidth={24}
                          cssSize={PANEL_FLUID.donutCss}
                          data={pieData.map((d, i) => ({
                            value: d.value as number,
                            color: DONUT_COLORS[i % DONUT_COLORS.length],
                            label: d.name,
                            opacity:
                              filtroDep !== "(todas)" && filtroDep !== d.name
                                ? 0.35
                                : 1,
                          }))}
                          onSegmentClick={(seg) =>
                            setFiltroDep(
                              filtroDep === seg.label ? "(todas)" : seg.label
                            )
                          }
                          centerContent={
                            <div className="flex flex-col items-center">
                              <span
                                className="leading-none font-black"
                                style={{
                                  color: C.primary,
                                  fontSize: PANEL_FLUID.fontValor,
                                }}
                              >
                                {totalDep}
                              </span>
                              {isCenarioAtivo ? (
                                <>
                                  <span
                                    className="font-medium"
                                    style={{
                                      color: C.muted,
                                      fontSize: PANEL_FLUID.fontLabel,
                                    }}
                                  >
                                    {Math.round(
                                      (totalDep / baseTotalDep) * 100
                                    )}
                                    % escolas
                                  </span>
                                  <span
                                    style={{
                                      color: C.muted,
                                      fontSize: PANEL_FLUID.fontLabel,
                                    }}
                                  >
                                    de {baseTotalDep}
                                  </span>
                                </>
                              ) : (
                                <span
                                  className="font-medium"
                                  style={{
                                    color: C.muted,
                                    fontSize: PANEL_FLUID.fontLabel,
                                  }}
                                >
                                  escolas
                                </span>
                              )}
                            </div>
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {pieData.map((d, i) => (
                          <div
                            key={d.name}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition-colors"
                            style={{
                              backgroundColor:
                                filtroDep === d.name
                                  ? `${DONUT_COLORS[i % DONUT_COLORS.length]}22`
                                  : "transparent",
                              outline:
                                filtroDep === d.name
                                  ? `1px solid ${DONUT_COLORS[i % DONUT_COLORS.length]}55`
                                  : "none",
                            }}
                            onClick={() =>
                              setFiltroDep(
                                filtroDep === d.name ? "(todas)" : d.name
                              )
                            }
                            title={
                              filtroDep === d.name
                                ? "Clique para remover filtro"
                                : `Filtrar por ${d.name}`
                            }
                          >
                            <span
                              className="h-3 w-3 shrink-0 rounded-sm"
                              style={{
                                backgroundColor:
                                  DONUT_COLORS[i % DONUT_COLORS.length],
                              }}
                            />
                            <span
                              className="flex-1 text-[11px]"
                              style={{
                                color:
                                  filtroDep === d.name ? C.primary : C.muted,
                              }}
                            >
                              {d.name}
                            </span>
                            <span
                              className="text-[11px] font-bold tabular-nums"
                              style={{ color: C.primary }}
                            >
                              {d.value}
                            </span>
                            <span
                              className="w-9 text-right text-[11px] tabular-nums"
                              style={{ color: C.muted }}
                            >
                              {Math.round((d.value / totalDep) * 100)}%
                            </span>
                          </div>
                        ))}
                        {filtroDep !== "(todas)" && (
                          <button
                            className="mt-1.5 self-start rounded-md px-2.5 py-1 text-[9px] font-bold"
                            style={{
                              backgroundColor: `${C.primary}15`,
                              color: C.primary,
                              border: `1px solid ${C.primary}35`,
                            }}
                            onClick={() => setFiltroDep("(todas)")}
                          >
                            ✕ Limpar filtro
                          </button>
                        )}
                      </div>
                    </ChartCard>
                    {lista.length > 0 && (
                      <div className="mb-2 flex flex-col gap-1">
                        <button
                          onClick={() => setShowListaEscolas((p) => !p)}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: PANEL_CARD_BG,
                            color: C.primary,
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          <span>Escolas Atingidas ({lista.length})</span>
                          <span style={{ fontSize: 9 }}>
                            {showListaEscolas ? "▲" : "▼"}
                          </span>
                        </button>
                        {showListaEscolas && (
                          <div
                            className="flex max-h-52 flex-col gap-0.5 overflow-y-auto rounded-lg p-1.5"
                            style={{
                              backgroundColor: PANEL_CARD_BG,
                              border: `1px solid ${C.border}`,
                            }}
                          >
                            {lista.map((nome: string, i: number) => (
                              <span
                                key={i}
                                className="rounded px-1.5 py-0.5 text-[10px]"
                                style={{ color: C.muted }}
                                title={nome}
                              >
                                {nome}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
              <div className="animate-fade-in-up mt-2 flex flex-col gap-2">
                <KPIRow
                  isLoading={isLoading}
                  titulo="Professores"
                  cor={COLORS.educacao}
                  valor={compactoBr(renderEduMetrics.prof, 0)}
                  sub={isCenarioAtivo ? "Atingidos" : "Total"}
                  delta={
                    isCenarioAtivo
                      ? `de ${compactoBr(baseEduFiltMetrics.prof, 0)} (${calcPct(renderEduMetrics.prof, baseEduFiltMetrics.prof)})`
                      : undefined
                  }
                />
              </div>
              {(() => {
                const deps = Object.keys(profPorDep.base).sort(
                  (a, b) =>
                    (profPorDep.base[b] || 0) - (profPorDep.base[a] || 0)
                )
                if (deps.length === 0) return null
                const maxBase = profPorDep.base[deps[0]] || 1
                return (
                  <ChartCard titulo="Professores por Dependência">
                    <div className="flex flex-col gap-1.5">
                      {deps.map((dep, i) => {
                        const baseVal = profPorDep.base[dep] || 0
                        const atgVal = profPorDep.impacto[dep] || 0
                        const val = isCenarioAtivo ? atgVal : baseVal
                        const pct =
                          baseVal > 0 ? Math.round((atgVal / baseVal) * 100) : 0
                        const isSelected = filtroDep === dep
                        return (
                          <div
                            key={dep}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 transition-colors"
                            style={{
                              backgroundColor: isSelected
                                ? `${DONUT_COLORS[i % DONUT_COLORS.length]}18`
                                : "transparent",
                              outline: isSelected
                                ? `1px solid ${DONUT_COLORS[i % DONUT_COLORS.length]}44`
                                : "none",
                            }}
                            onClick={() =>
                              setFiltroDep(isSelected ? "(todas)" : dep)
                            }
                            title={
                              isSelected
                                ? "Clique para remover filtro"
                                : `Filtrar por ${dep}`
                            }
                          >
                            <span
                              className="w-20 shrink-0 truncate text-[9px]"
                              style={{
                                color: isSelected ? C.primary : C.muted,
                              }}
                              title={dep}
                            >
                              {dep}
                            </span>
                            <div
                              className="h-2.5 flex-1 overflow-hidden rounded-full"
                              style={{ backgroundColor: PANEL_TRACK_BG }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${isCenarioAtivo ? pct : Math.round((val / maxBase) * 100)}%`,
                                  backgroundColor:
                                    DONUT_COLORS[i % DONUT_COLORS.length],
                                }}
                              />
                            </div>
                            <span
                              className="w-16 shrink-0 text-right text-[9px] font-bold tabular-nums"
                              style={{ color: C.primary }}
                            >
                              {compactoBr(val, 0)}
                              {isCenarioAtivo ? ` (${pct}%)` : ""}
                            </span>
                          </div>
                        )
                      })}
                      {filtroDep !== "(todas)" && (
                        <button
                          className="mt-1.5 self-start rounded-md px-2.5 py-1 text-[9px] font-bold"
                          style={{
                            backgroundColor: `${C.primary}15`,
                            color: C.primary,
                            border: `1px solid ${C.primary}35`,
                          }}
                          onClick={() => setFiltroDep("(todas)")}
                        >
                          ✕ Limpar filtro
                        </button>
                      )}
                    </div>
                  </ChartCard>
                )
              })()}
              {(() => {
                const NIVEIS = [
                  ["Infantil", "inf"],
                  ["Fundamental", "fund"],
                  ["Médio", "med"],
                  ["Profissional", "profis"],
                  ["EJA", "eja"],
                  ["Especial", "esp"],
                ] as [string, string][]
                // Dado filtrado (dependência administrativa), igual ao que o mapa exibe.
                const src = renderEduMetrics
                const pieData = NIVEIS.map(([name, key]) => ({
                  name,
                  value: (src as any)[key] as number,
                })).filter((d) => d.value > 0)
                const totalAlunos = pieData.reduce((s, d) => s + d.value, 0)
                const baseAlunos = NIVEIS.reduce(
                  (s, [, key]) =>
                    s + (((baseEduFiltMetrics as any)[key] as number) || 0),
                  0
                )
                if (pieData.length === 0) return null
                return (
                  <ChartCard titulo="Matrículas por Nível">
                    <div className="flex items-center justify-center py-1">
                      <DonutChart
                        size={152}
                        strokeWidth={26}
                        cssSize={PANEL_FLUID.donutCss}
                        data={pieData.map((d, i) => ({
                          value: d.value as number,
                          color: DONUT_COLORS[i % DONUT_COLORS.length],
                          label: d.name,
                        }))}
                        centerContent={
                          <div className="flex flex-col items-center">
                            <span
                              className="leading-none font-black"
                              style={{
                                color: C.primary,
                                fontSize: PANEL_FLUID.fontValor,
                              }}
                            >
                              {compactoBr(totalAlunos, 0)}
                            </span>
                            {isCenarioAtivo ? (
                              <>
                                <span
                                  className="font-medium"
                                  style={{
                                    color: C.muted,
                                    fontSize: PANEL_FLUID.fontLabel,
                                  }}
                                >
                                  {baseAlunos > 0
                                    ? Math.round(
                                        (totalAlunos / baseAlunos) * 100
                                      )
                                    : 0}
                                  % alunos
                                </span>
                                <span
                                  style={{
                                    color: C.muted,
                                    fontSize: PANEL_FLUID.fontLabel,
                                  }}
                                >
                                  de {compactoBr(baseAlunos, 0)}
                                </span>
                              </>
                            ) : (
                              <span
                                className="font-medium"
                                style={{
                                  color: C.muted,
                                  fontSize: PANEL_FLUID.fontLabel,
                                }}
                              >
                                alunos
                              </span>
                            )}
                          </div>
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-sm"
                            style={{
                              backgroundColor:
                                DONUT_COLORS[i % DONUT_COLORS.length],
                            }}
                          />
                          <span
                            className="flex-1 text-[11px]"
                            style={{ color: C.muted }}
                          >
                            {d.name}
                          </span>
                          <span
                            className="text-[11px] font-bold tabular-nums"
                            style={{ color: C.primary }}
                          >
                            {compactoBr(d.value, 0)}
                          </span>
                          <span
                            className="w-9 text-right text-[11px] tabular-nums"
                            style={{ color: C.muted }}
                          >
                            {Math.round((d.value / totalAlunos) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                )
              })()}
              <p
                className="mt-3 border-t pt-2 text-[9px] italic"
                style={{ color: C.muted, borderColor: C.border }}
              >
                Fonte: IBGE — Censo Escolar
              </p>
            </TabsContent>

            {/* Saúde */}
            <TabsContent
              value="saude"
              className="mt-4 flex-1 overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent"
            >
              {(() => {
                const LISTAS: Record<
                  string,
                  {
                    label: string
                    state: boolean
                    setState: (v: (p: boolean) => boolean) => void
                  }
                > = {
                  Hospital: {
                    label: "Hospitais",
                    state: showListaHospitais,
                    setState: setShowListaHospitais,
                  },
                  "Unidade Básica de Saúde": {
                    label: "Unidades Básicas de Saúde",
                    state: showListaUBS,
                    setState: setShowListaUBS,
                  },
                  Ambulatório: {
                    label: "Ambulatórios",
                    state: showListaAmbulat,
                    setState: setShowListaAmbulat,
                  },
                }
                const srcFeats =
                  (isCenarioAtivo ? renderSau?.features : null) ?? []
                const tipos = isCenarioAtivo
                  ? metricasSau.impacto.tipos
                  : metricasSau.base.tipos
                const pieData = Object.entries(tipos)
                  .filter(([, v]) => (v as number) > 0)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([name, value]) => ({ name, value: value as number }))
                const totalU = pieData.reduce((s, d) => s + d.value, 0)
                if (pieData.length === 0) return null
                return (
                  <>
                    <ChartCard titulo="Unidades por Tipo">
                      <div className="flex items-center justify-center py-1">
                        <DonutChart
                          size={152}
                          strokeWidth={26}
                          cssSize={PANEL_FLUID.donutCss}
                          data={pieData.map((d, i) => ({
                            value: d.value,
                            color: DONUT_COLORS[i % DONUT_COLORS.length],
                            label: d.name,
                            opacity:
                              filtroTipo !== "(todas)" && filtroTipo !== d.name
                                ? 0.35
                                : 1,
                          }))}
                          onSegmentClick={(seg) =>
                            setFiltroTipo(
                              filtroTipo === seg.label ? "(todas)" : seg.label
                            )
                          }
                          centerContent={
                            <div className="flex flex-col items-center">
                              <span
                                className="leading-none font-black"
                                style={{
                                  color: C.primary,
                                  fontSize: PANEL_FLUID.fontValor,
                                }}
                              >
                                {totalU}
                              </span>
                              {isCenarioAtivo ? (
                                <>
                                  <span
                                    className="font-medium"
                                    style={{
                                      color: C.muted,
                                      fontSize: PANEL_FLUID.fontLabel,
                                    }}
                                  >
                                    {Math.round(
                                      (totalU / metricasSau.base.unidades) * 100
                                    )}
                                    % unidades
                                  </span>
                                  <span
                                    style={{
                                      color: C.muted,
                                      fontSize: PANEL_FLUID.fontLabel,
                                    }}
                                  >
                                    de {metricasSau.base.unidades}
                                  </span>
                                </>
                              ) : (
                                <span
                                  className="font-medium"
                                  style={{
                                    color: C.muted,
                                    fontSize: PANEL_FLUID.fontLabel,
                                  }}
                                >
                                  unidades
                                </span>
                              )}
                            </div>
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {pieData.map((d, i) => (
                          <div
                            key={d.name}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition-colors"
                            style={{
                              backgroundColor:
                                filtroTipo === d.name
                                  ? `${DONUT_COLORS[i % DONUT_COLORS.length]}22`
                                  : "transparent",
                              outline:
                                filtroTipo === d.name
                                  ? `1px solid ${DONUT_COLORS[i % DONUT_COLORS.length]}55`
                                  : "none",
                            }}
                            onClick={() =>
                              setFiltroTipo(
                                filtroTipo === d.name ? "(todas)" : d.name
                              )
                            }
                            title={
                              filtroTipo === d.name
                                ? "Clique para remover filtro"
                                : `Filtrar por ${d.name}`
                            }
                          >
                            <span
                              className="h-3 w-3 shrink-0 rounded-sm"
                              style={{
                                backgroundColor:
                                  DONUT_COLORS[i % DONUT_COLORS.length],
                              }}
                            />
                            <span
                              className="flex-1 truncate text-[11px]"
                              style={{
                                color:
                                  filtroTipo === d.name ? C.primary : C.muted,
                              }}
                              title={d.name}
                            >
                              {d.name}
                            </span>
                            <span
                              className="text-[11px] font-bold tabular-nums"
                              style={{ color: C.primary }}
                            >
                              {d.value}
                            </span>
                            <span
                              className="w-9 text-right text-[11px] tabular-nums"
                              style={{ color: C.muted }}
                            >
                              {Math.round((d.value / totalU) * 100)}%
                            </span>
                          </div>
                        ))}
                        {filtroTipo !== "(todas)" && (
                          <button
                            className="mt-1.5 self-start rounded-md px-2.5 py-1 text-[9px] font-bold"
                            style={{
                              backgroundColor: `${C.primary}15`,
                              color: C.primary,
                              border: `1px solid ${C.primary}35`,
                            }}
                            onClick={() => setFiltroTipo("(todas)")}
                          >
                            ✕ Limpar filtro
                          </button>
                        )}
                      </div>
                    </ChartCard>
                    {isCenarioAtivo && (
                      <div className="flex flex-col gap-2">
                        {Object.entries(LISTAS).map(([tipoKey, cfg]) => {
                          const feats = srcFeats.filter(
                            (f: any) =>
                              f.properties?.co_tipo_estabelecimento === tipoKey
                          )
                          const lista = feats
                            .map((f: any) =>
                              String(
                                f.properties?.no_fantasia ||
                                  f.properties?.no_razao_social ||
                                  ""
                              ).trim()
                            )
                            .filter(Boolean)
                            .sort((a: string, b: string) =>
                              a.localeCompare(b, "pt-BR")
                            )
                          if (lista.length === 0) return null
                          return (
                            <div key={tipoKey}>
                              <button
                                onClick={() => cfg.setState((p) => !p)}
                                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[10px] font-bold"
                                style={{
                                  backgroundColor: PANEL_CARD_BG,
                                  color: C.primary,
                                  border: `1px solid ${C.border}`,
                                }}
                              >
                                <span>
                                  {cfg.label} ({lista.length})
                                </span>
                                <span style={{ fontSize: 9 }}>
                                  {cfg.state ? "▲" : "▼"}
                                </span>
                              </button>
                              {cfg.state && (
                                <div
                                  className="mt-1 flex max-h-44 flex-col gap-0.5 overflow-y-auto rounded-lg p-1.5"
                                  style={{
                                    backgroundColor: PANEL_CARD_BG,
                                    border: `1px solid ${C.border}`,
                                  }}
                                >
                                  {lista.map((nome: string, i: number) => (
                                    <span
                                      key={i}
                                      className="rounded px-1.5 py-0.5 text-[10px]"
                                      style={{ color: C.muted }}
                                      title={nome}
                                    >
                                      {nome}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )
              })()}
              {(() => {
                const totalBase = STAFF_COLS.reduce(
                  (a, c) => a + (baseSauFiltMetrics.staff[c] || 0),
                  0
                )
                const totalImpacto = STAFF_COLS.reduce(
                  (a, c) => a + (renderSauMetrics.staff[c] || 0),
                  0
                )
                return (
                  <div className="mt-4 mb-2">
                    <KPIRow
                      isLoading={isLoading}
                      titulo="Profissionais"
                      cor={COLORS.saude}
                      valor={compactoBr(
                        isCenarioAtivo ? totalImpacto : totalBase,
                        0
                      )}
                      sub={isCenarioAtivo ? "Atingidos" : "Total"}
                      delta={
                        isCenarioAtivo
                          ? `de ${compactoBr(totalBase, 0)} (${calcPct(totalImpacto, totalBase)})`
                          : undefined
                      }
                    />
                  </div>
                )
              })()}
              {(() => {
                const baseStaff = baseSauFiltMetrics.staff
                const impactoStaff = renderSauMetrics.staff
                const staffData = STAFF_COLS.map((c) => ({
                  name: STAFF_LABELS[c],
                  val: isCenarioAtivo
                    ? impactoStaff[c] || 0
                    : baseStaff[c] || 0,
                  tot: baseStaff[c] || 0,
                }))
                  .filter((d) => d.tot > 0)
                  .sort((a, b) => b.tot - a.tot)
                const maxTot = staffData[0]?.tot || 1
                return (
                  <ChartCard titulo="Profissionais por Categoria">
                    <div className="flex flex-col gap-1.5">
                      {staffData.map((d, i) => {
                        const pct = isCenarioAtivo
                          ? Math.round((d.val / d.tot) * 100)
                          : Math.round((d.val / maxTot) * 100)
                        const barW = isCenarioAtivo
                          ? pct
                          : Math.round((d.val / maxTot) * 100)
                        return (
                          <div key={d.name} className="flex items-center gap-2">
                            <span
                              className="w-20 shrink-0 truncate text-[9px]"
                              style={{ color: C.muted }}
                              title={d.name}
                            >
                              {d.name}
                            </span>
                            <div
                              className="h-2.5 flex-1 overflow-hidden rounded-full"
                              style={{ backgroundColor: PANEL_TRACK_BG }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${barW}%`,
                                  backgroundColor:
                                    DONUT_COLORS[i % DONUT_COLORS.length],
                                }}
                              />
                            </div>
                            <span
                              className="w-14 shrink-0 text-right text-[9px] font-bold tabular-nums"
                              style={{ color: C.primary }}
                            >
                              {compactoBr(d.val, 0)}
                              {isCenarioAtivo ? ` (${pct}%)` : ""}
                            </span>
                          </div>
                        )
                      })}
                      {isCenarioAtivo && (
                        <p
                          className="mt-1 text-[8px]"
                          style={{ color: C.muted }}
                        >
                          % = atingidos / total município por categoria
                        </p>
                      )}
                    </div>
                  </ChartCard>
                )
              })()}
              <p
                className="mt-3 border-t pt-2 text-[9px] italic"
                style={{ color: C.muted, borderColor: C.border }}
              >
                Fonte: CNES — Cadastro Nacional de Estabelecimentos de Saúde
              </p>
            </TabsContent>

            {/* Patrimônio Histórico */}
            {camadas.includes("Patrimônio Histórico") && (
              <TabsContent
                value="patrimonio"
                className="mt-4 flex-1 overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent"
              >
                <KPIRow
                  isLoading={isLoading}
                  titulo="Patrimônios"
                  cor={COLORS.patrimonio}
                  valor={compactoBr(
                    isCenarioAtivo
                      ? metricasPatrimonio.impacto.total
                      : metricasPatrimonio.base.total,
                    0
                  )}
                  sub={isCenarioAtivo ? "Atingidos" : "Total"}
                  delta={
                    isCenarioAtivo
                      ? `de ${compactoBr(metricasPatrimonio.base.total, 0)} (${calcPct(metricasPatrimonio.impacto.total, metricasPatrimonio.base.total)})`
                      : undefined
                  }
                />

                {(() => {
                  const tipos = isCenarioAtivo
                    ? metricasPatrimonio.impacto.tipos
                    : metricasPatrimonio.base.tipos
                  const pieData = Object.entries(tipos)
                    .filter(([, v]) => (v as number) > 0)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([name, value]) => ({ name, value: value as number }))
                  const totalT = pieData.reduce((s, d) => s + d.value, 0)
                  if (pieData.length === 0) return null
                  return (
                    <ChartCard titulo="Por Tipologia">
                      <div className="flex items-center justify-center py-1">
                        <DonutChart
                          size={152}
                          strokeWidth={26}
                          cssSize={PANEL_FLUID.donutCss}
                          data={pieData.map((d, i) => ({
                            value: d.value,
                            color: DONUT_COLORS[i % DONUT_COLORS.length],
                            label: d.name,
                            opacity:
                              filtroTipologia !== "(todas)" &&
                              filtroTipologia !== d.name
                                ? 0.35
                                : 1,
                          }))}
                          onSegmentClick={(seg) =>
                            setFiltroTipologia(
                              filtroTipologia === seg.label
                                ? "(todas)"
                                : seg.label
                            )
                          }
                          centerContent={
                            <div className="flex flex-col items-center">
                              <span
                                className="leading-none font-black"
                                style={{
                                  color: C.primary,
                                  fontSize: PANEL_FLUID.fontValor,
                                }}
                              >
                                {totalT}
                              </span>
                              {isCenarioAtivo ? (
                                <>
                                  <span
                                    className="font-medium"
                                    style={{
                                      color: C.muted,
                                      fontSize: PANEL_FLUID.fontLabel,
                                    }}
                                  >
                                    {Math.round(
                                      (totalT / metricasPatrimonio.base.total) *
                                        100
                                    )}
                                    % do total
                                  </span>
                                  <span
                                    style={{
                                      color: C.muted,
                                      fontSize: PANEL_FLUID.fontLabel,
                                    }}
                                  >
                                    de {metricasPatrimonio.base.total}
                                  </span>
                                </>
                              ) : (
                                <span
                                  className="font-medium"
                                  style={{
                                    color: C.muted,
                                    fontSize: PANEL_FLUID.fontLabel,
                                  }}
                                >
                                  itens
                                </span>
                              )}
                            </div>
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {pieData.map((d, i) => (
                          <div
                            key={d.name}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition-colors"
                            style={{
                              backgroundColor:
                                filtroTipologia === d.name
                                  ? `${DONUT_COLORS[i % DONUT_COLORS.length]}22`
                                  : "transparent",
                              outline:
                                filtroTipologia === d.name
                                  ? `1px solid ${DONUT_COLORS[i % DONUT_COLORS.length]}55`
                                  : "none",
                            }}
                            onClick={() =>
                              setFiltroTipologia(
                                filtroTipologia === d.name ? "(todas)" : d.name
                              )
                            }
                            title={
                              filtroTipologia === d.name
                                ? "Clique para remover filtro"
                                : `Filtrar por ${d.name}`
                            }
                          >
                            <span
                              className="h-3 w-3 shrink-0 rounded-sm"
                              style={{
                                backgroundColor:
                                  DONUT_COLORS[i % DONUT_COLORS.length],
                              }}
                            />
                            <span
                              className="flex-1 truncate text-[11px]"
                              style={{
                                color:
                                  filtroTipologia === d.name
                                    ? C.primary
                                    : C.muted,
                              }}
                              title={d.name}
                            >
                              {d.name}
                            </span>
                            <span
                              className="text-[11px] font-bold tabular-nums"
                              style={{ color: C.primary }}
                            >
                              {d.value}
                            </span>
                            <span
                              className="w-9 text-right text-[11px] tabular-nums"
                              style={{ color: C.muted }}
                            >
                              {Math.round((d.value / totalT) * 100)}%
                            </span>
                          </div>
                        ))}
                        {filtroTipologia !== "(todas)" && (
                          <button
                            className="mt-1.5 self-start rounded-md px-2.5 py-1 text-[9px] font-bold"
                            style={{
                              backgroundColor: `${C.primary}15`,
                              color: C.primary,
                              border: `1px solid ${C.primary}35`,
                            }}
                            onClick={() => setFiltroTipologia("(todas)")}
                          >
                            ✕ Limpar filtro
                          </button>
                        )}
                      </div>
                    </ChartCard>
                  )
                })()}

                <p
                  className="mt-3 border-t pt-2 text-[9px] italic"
                  style={{ color: C.muted, borderColor: C.border }}
                >
                  Fonte: Levantamento de Patrimônio Histórico — Rio Grande/RS
                </p>
              </TabsContent>
            )}

            {/* Agricultura */}
            {camadas.includes("Agricultura") && (
              <TabsContent
                value="agricultura"
                className="mt-4 flex-1 overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent"
              >
                {!baseAgricultura ? (
                  <div className="flex flex-col gap-3 p-2">
                    <div className="flex items-center justify-center py-4">
                      <Skeleton className="h-[170px] w-[170px] rounded-full" />
                    </div>
                    <Skeleton className="mx-auto mt-2 h-6 w-1/2" />
                    <div className="mt-4 flex flex-col gap-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                ) : (
                  (() => {
                    const feats = isCenarioAtivo
                      ? metricasAgri.impacto
                      : metricasAgri.base
                    const base = metricasAgri.base
                    const haTotal = feats.reduce((acc, { ha }) => acc + ha, 0)
                    const haBase = base.reduce((acc, { ha }) => acc + ha, 0)
                    return (
                      <>
                        {feats.length > 0 &&
                          (() => {
                            const pieData = feats.map(({ f, ha }, i) => ({
                              name:
                                f.properties?.tipo_cultura ?? `cultura-${i}`,
                              value: ha,
                              cor:
                                AGRI_COLORS[f.properties?.tipo_cultura] ??
                                COLORS.agricultura,
                            }))
                            return (
                              <ChartCard titulo="Área por Cultura">
                                <div className="flex items-center justify-center py-1">
                                  <DonutChart
                                    size={152}
                                    strokeWidth={26}
                                    cssSize={PANEL_FLUID.donutCss}
                                    data={pieData.map((d) => ({
                                      value: d.value,
                                      color: d.cor,
                                      label: d.name,
                                    }))}
                                    centerContent={
                                      <div className="flex flex-col items-center">
                                        <span
                                          className="leading-none font-black"
                                          style={{
                                            color: C.primary,
                                            fontSize: PANEL_FLUID.fontValor,
                                          }}
                                        >
                                          {compactoBr(haTotal, 1)}
                                        </span>
                                        {isCenarioAtivo ? (
                                          <>
                                            <span
                                              className="font-medium"
                                              style={{
                                                color: C.muted,
                                                fontSize: PANEL_FLUID.fontLabel,
                                              }}
                                            >
                                              {haBase > 0
                                                ? ((haTotal / haBase) * 100)
                                                    .toFixed(2)
                                                    .replace(".", ",")
                                                : "0,00"}
                                              % da área
                                            </span>
                                            <span
                                              style={{
                                                color: C.muted,
                                                fontSize: PANEL_FLUID.fontLabel,
                                              }}
                                            >
                                              de {compactoBr(haBase, 1)} ha
                                            </span>
                                          </>
                                        ) : (
                                          <span
                                            className="font-medium"
                                            style={{
                                              color: C.muted,
                                              fontSize: PANEL_FLUID.fontLabel,
                                            }}
                                          >
                                            ha
                                          </span>
                                        )}
                                      </div>
                                    }
                                  />
                                </div>
                              </ChartCard>
                            )
                          })()}
                        <ChartCard
                          titulo={`Culturas ${isCenarioAtivo ? "Atingidas" : "no Município"}`}
                        >
                          <div className="flex flex-col gap-2">
                            {feats.map(({ f, ha }, i) => {
                              const tipo =
                                f.properties?.tipo_cultura ?? `cultura-${i}`
                              const cor =
                                AGRI_COLORS[tipo] ?? COLORS.agricultura
                              const haBaseTipo =
                                base.find(
                                  ({ f: bf }) =>
                                    bf.properties?.tipo_cultura === tipo
                                )?.ha ?? 0
                              return (
                                <KPIRow
                                  isLoading={isLoading}
                                  key={`agr-${tipo}-${i}`}
                                  titulo={tipo}
                                  cor={cor}
                                  valor={`${formatoBr(ha, 0)} ha`}
                                  sub="Área"
                                  delta={
                                    isCenarioAtivo && haBaseTipo > 0
                                      ? `de ${formatoBr(haBaseTipo, 0)} ha (${formatoBr((ha / haBaseTipo) * 100, 2)}%)`
                                      : undefined
                                  }
                                />
                              )
                            })}
                            {feats.length === 0 && isCenarioAtivo && (
                              <p
                                className="py-2 text-center text-xs"
                                style={{ color: C.muted }}
                              >
                                {cenario === COTAS_CENARIO
                                  ? "Indisponível neste cenário (exposição por cota só cobre empresas, educação, saúde e patrimônio)."
                                  : "Nenhuma cultura atingida neste cenário."}
                              </p>
                            )}
                          </div>
                        </ChartCard>
                        <p
                          className="mt-3 border-t pt-2 text-[9px] italic"
                          style={{ color: C.muted, borderColor: C.border }}
                        >
                          Fonte: MapBiomas — Coleção 10
                        </p>
                      </>
                    )
                  })()
                )}
              </TabsContent>
            )}

            {/* Uso e Cobertura da Terra */}
            {camadas.includes("Uso e Cobertura da Terra") && (
              <TabsContent
                value="cobertura"
                className="mt-4 flex-1 overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent"
              >
                {!baseCobertura ? (
                  <div className="flex flex-col gap-3 p-2">
                    <div className="flex items-center justify-center py-4">
                      <Skeleton className="h-[170px] w-[170px] rounded-full" />
                    </div>
                    <Skeleton className="mx-auto mt-2 h-6 w-1/2" />
                    <div className="mt-4 flex flex-col gap-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                ) : (
                  (() => {
                    const feats = isCenarioAtivo
                      ? metricasCob.impacto
                      : metricasCob.base
                    const base = metricasCob.base
                    const haTotal = feats.reduce((acc, { ha }) => acc + ha, 0)
                    const haBase = base.reduce((acc, { ha }) => acc + ha, 0)
                    return (
                      <>
                        {feats.length > 0 &&
                          (() => {
                            const pieData = feats.map(({ f, ha }, i) => ({
                              name: f.properties?.tipo_classe ?? `classe-${i}`,
                              value: ha,
                              cor:
                                COBERTURA_COLORS[f.properties?.tipo_classe] ??
                                COLORS.agricultura,
                            }))
                            return (
                              <ChartCard titulo="Área por Classe">
                                <div className="flex items-center justify-center py-1">
                                  <DonutChart
                                    size={152}
                                    strokeWidth={26}
                                    cssSize={PANEL_FLUID.donutCss}
                                    data={pieData.map((d) => ({
                                      value: d.value,
                                      color: d.cor,
                                      label: d.name,
                                    }))}
                                    centerContent={
                                      <div className="flex flex-col items-center">
                                        <span
                                          className="leading-none font-black"
                                          style={{
                                            color: C.primary,
                                            fontSize: PANEL_FLUID.fontValor,
                                          }}
                                        >
                                          {compactoBr(haTotal, 1)}
                                        </span>
                                        {isCenarioAtivo ? (
                                          <>
                                            <span
                                              className="font-medium"
                                              style={{
                                                color: C.muted,
                                                fontSize: PANEL_FLUID.fontLabel,
                                              }}
                                            >
                                              {haBase > 0
                                                ? ((haTotal / haBase) * 100)
                                                    .toFixed(2)
                                                    .replace(".", ",")
                                                : "0,00"}
                                              % da área
                                            </span>
                                            <span
                                              style={{
                                                color: C.muted,
                                                fontSize: PANEL_FLUID.fontLabel,
                                              }}
                                            >
                                              de {compactoBr(haBase, 1)} ha
                                            </span>
                                          </>
                                        ) : (
                                          <span
                                            className="font-medium"
                                            style={{
                                              color: C.muted,
                                              fontSize: PANEL_FLUID.fontLabel,
                                            }}
                                          >
                                            ha
                                          </span>
                                        )}
                                      </div>
                                    }
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  {pieData.map((d) => {
                                    const haBaseClasse =
                                      base.find(
                                        ({ f: bf }) =>
                                          bf.properties?.tipo_classe === d.name
                                      )?.ha ?? 0
                                    return (
                                      <div
                                        key={d.name}
                                        className="flex items-center gap-2 rounded-md px-1 py-0.5"
                                        title={
                                          isCenarioAtivo && haBaseClasse > 0
                                            ? `${formatoBr(d.value, 0)} de ${formatoBr(haBaseClasse, 0)} ha (${formatoBr((d.value / haBaseClasse) * 100, 2)}% da classe)`
                                            : undefined
                                        }
                                      >
                                        <span
                                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                          style={{ backgroundColor: d.cor }}
                                        />
                                        <span
                                          className="flex-1 truncate text-[9px]"
                                          style={{ color: C.muted }}
                                        >
                                          {d.name}
                                        </span>
                                        <span
                                          className="text-[9px] font-bold tabular-nums"
                                          style={{ color: C.primary }}
                                        >
                                          {formatoBr(d.value, 0)} ha
                                        </span>
                                        <span
                                          className="w-10 text-right text-[9px] tabular-nums"
                                          style={{ color: C.muted }}
                                        >
                                          {haTotal > 0
                                            ? Math.round(
                                                (d.value / haTotal) * 100
                                              )
                                            : 0}
                                          %
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </ChartCard>
                            )
                          })()}
                        {feats.length === 0 && isCenarioAtivo && (
                          <p
                            className="py-2 text-center text-xs"
                            style={{ color: C.muted }}
                          >
                            {cenario === COTAS_CENARIO
                              ? "Indisponível neste cenário (exposição por cota só cobre empresas, educação, saúde e patrimônio)."
                              : "Nenhuma classe atingida neste cenário."}
                          </p>
                        )}
                        <p
                          className="mt-3 border-t pt-2 text-[9px] italic"
                          style={{ color: C.muted, borderColor: C.border }}
                        >
                          Fonte: MapBiomas — Coleção 10
                        </p>
                      </>
                    )
                  })()
                )}
              </TabsContent>
            )}

            {/* Infraestrutura — mostra todas as camadas (Logradouros/Quadras/Terrenos)
                mesmo as não ativas no mapa, usando estatísticas pré-computadas
                offline (infraStats) em vez da geometria completa: Terrenos sozinho
                tem ~28MB e só é buscado quando ativado no mapa. O toggle de cada
                camada continua controlando apenas a visibilidade no mapa. */}
            {camadas.includes("Infraestrutura") && (
              <TabsContent
                value="infra"
                className="mt-4 flex-1 overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent"
              >
                {!infraStats && cenario === COTAS_CENARIO ? (
                  <p
                    className="py-6 text-center text-xs"
                    style={{ color: C.muted }}
                  >
                    Indisponível neste cenário (exposição por cota só cobre
                    empresas, educação, saúde e patrimônio).
                  </p>
                ) : !infraStats ? (
                  <div className="flex flex-col gap-5 pb-2">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  <div className="animate-fade-in-up flex flex-col gap-5 pb-2">
                    {/* ── Logradouros ── */}
                    {(() => {
                      const s = infraStats["Logradouros"]
                      if (!s) return null
                      const ruasLista: string[] = s.ruas_atingidas_lista ?? []
                      return (
                        <div>
                          <h3
                            className="mb-2 flex items-center gap-1.5 pb-1 text-[11px] font-black tracking-wider uppercase"
                            style={{
                              color: INFRA_COLORS["Logradouros"],
                              borderBottom: `1px solid ${C.border}`,
                            }}
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: INFRA_COLORS["Logradouros"],
                              }}
                            />
                            Logradouros
                            {!infraAtivas.includes("Logradouros") && (
                              <span
                                className="ml-auto text-[9px] font-normal normal-case"
                                style={{ color: C.muted }}
                              >
                                oculto no mapa
                              </span>
                            )}
                          </h3>
                          <div className="mb-2 flex flex-col gap-2">
                            <KPIRow
                              isLoading={isLoading}
                              titulo="Segmentos"
                              cor={INFRA_COLORS["Logradouros"]}
                              valor={compactoBr(
                                isCenarioAtivo
                                  ? s.segmentos_atingidos
                                  : s.segmentos_total,
                                0
                              )}
                              sub={isCenarioAtivo ? "Atingidos" : "Total"}
                              delta={
                                isCenarioAtivo
                                  ? `de ${compactoBr(s.segmentos_total, 0)} (${calcPct(s.segmentos_atingidos, s.segmentos_total)})`
                                  : undefined
                              }
                            />
                            <div className="flex flex-col gap-1.5">
                              <KPIRow
                                isLoading={isLoading}
                                titulo="Ruas Únicas"
                                cor={INFRA_COLORS["Logradouros"]}
                                valor={compactoBr(
                                  isCenarioAtivo
                                    ? s.ruas_atingidas
                                    : s.ruas_total,
                                  0
                                )}
                                sub={isCenarioAtivo ? "Atingidas" : "Total"}
                                delta={
                                  isCenarioAtivo
                                    ? `de ${compactoBr(s.ruas_total, 0)} (${calcPct(s.ruas_atingidas, s.ruas_total)})`
                                    : undefined
                                }
                              />
                              {isCenarioAtivo && ruasLista.length > 0 && (
                                <>
                                  <button
                                    onClick={() =>
                                      setShowListaLogradouros((p) => !p)
                                    }
                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[10px] font-bold"
                                    style={{
                                      backgroundColor: PANEL_CARD_BG,
                                      color: C.primary,
                                      border: `1px solid ${C.border}`,
                                    }}
                                  >
                                    <span>
                                      Ruas Atingidas ({ruasLista.length})
                                    </span>
                                    <span style={{ fontSize: 9 }}>
                                      {showListaLogradouros ? "▲" : "▼"}
                                    </span>
                                  </button>
                                  {showListaLogradouros && (
                                    <div
                                      className="flex max-h-52 flex-col gap-0.5 overflow-y-auto rounded-lg p-1.5"
                                      style={{
                                        backgroundColor: PANEL_CARD_BG,
                                        border: `1px solid ${C.border}`,
                                      }}
                                    >
                                      {ruasLista.map((label, i) => (
                                        <span
                                          key={i}
                                          className="rounded px-1.5 py-0.5 text-[10px]"
                                          style={{ color: C.muted }}
                                          title={label}
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            {s.segmentos_total > 0 && (
                              <ChartCard
                                titulo={
                                  <>
                                    Cobertura de Serviços{" "}
                                    <span className="text-[9px] font-normal text-white/70 normal-case">
                                      — de {compactoBr(s.segmentos_total, 0)}{" "}
                                      segmentos
                                    </span>
                                  </>
                                }
                              >
                                <div className="flex flex-col gap-2">
                                  <BarServico
                                    label="Drenagem"
                                    value={
                                      isCenarioAtivo
                                        ? s.drenagem_atingidos
                                        : s.drenagem_total
                                    }
                                    total={
                                      isCenarioAtivo
                                        ? s.drenagem_total
                                        : s.segmentos_total
                                    }
                                    cor={INFRA_COLORS["Logradouros"]}
                                  />
                                  <BarServico
                                    label="Iluminação"
                                    value={
                                      isCenarioAtivo
                                        ? s.iluminacao_atingidos
                                        : s.iluminacao_total
                                    }
                                    total={
                                      isCenarioAtivo
                                        ? s.iluminacao_total
                                        : s.segmentos_total
                                    }
                                    cor={INFRA_COLORS["Logradouros"]}
                                  />
                                </div>
                              </ChartCard>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {/* ── Quadras ── */}
                    {(() => {
                      const s = infraStats["Quadras"]
                      if (!s) return null
                      return (
                        <div>
                          <h3
                            className="mb-2 flex items-center gap-1.5 pb-1 text-[11px] font-black tracking-wider uppercase"
                            style={{
                              color: INFRA_COLORS["Quadras"],
                              borderBottom: `1px solid ${C.border}`,
                            }}
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: INFRA_COLORS["Quadras"],
                              }}
                            />
                            Quadras
                            {!infraAtivas.includes("Quadras") && (
                              <span
                                className="ml-auto text-[9px] font-normal normal-case"
                                style={{ color: C.muted }}
                              >
                                oculto no mapa
                              </span>
                            )}
                          </h3>
                          <div className="flex flex-col gap-2">
                            <KPIRow
                              isLoading={isLoading}
                              titulo="Quadras"
                              cor={INFRA_COLORS["Quadras"]}
                              valor={compactoBr(
                                isCenarioAtivo ? s.atingidas : s.total,
                                0
                              )}
                              sub={isCenarioAtivo ? "Atingidas" : "Total"}
                              delta={
                                isCenarioAtivo
                                  ? `de ${compactoBr(s.total, 0)} (${calcPct(s.atingidas, s.total)})`
                                  : undefined
                              }
                            />
                          </div>
                        </div>
                      )
                    })()}

                    {/* ── Terrenos ── */}
                    {(() => {
                      const s = infraStats["Terrenos"]
                      if (!s) return null
                      const cor = INFRA_COLORS["Terrenos"]
                      const pct =
                        s.total > 0
                          ? Math.round((s.atingidos / s.total) * 100)
                          : 0
                      const pieData = [
                        { name: "Atingidos", value: s.atingidos },
                        {
                          name: "Não Atingidos",
                          value: Math.max(0, s.total - s.atingidos),
                        },
                      ]
                      const items = [
                        {
                          label: "Água",
                          val: isCenarioAtivo ? s.agua.atingidos : s.agua.total,
                          tot: isCenarioAtivo ? s.agua.total : s.total,
                        },
                        {
                          label: "Coleta de Lixo",
                          val: isCenarioAtivo ? s.lixo.atingidos : s.lixo.total,
                          tot: isCenarioAtivo ? s.lixo.total : s.total,
                        },
                        {
                          label: "Esgoto Pluvial",
                          val: isCenarioAtivo
                            ? s.esgoto_pluvial.atingidos
                            : s.esgoto_pluvial.total,
                          tot: isCenarioAtivo
                            ? s.esgoto_pluvial.total
                            : s.total,
                        },
                        {
                          label: "Esgoto Cloacal",
                          val: isCenarioAtivo
                            ? s.esgoto_cloacal.atingidos
                            : s.esgoto_cloacal.total,
                          tot: isCenarioAtivo
                            ? s.esgoto_cloacal.total
                            : s.total,
                        },
                        {
                          label: "Fossa Séptica",
                          val: isCenarioAtivo
                            ? s.fossa.atingidos
                            : s.fossa.total,
                          tot: isCenarioAtivo ? s.fossa.total : s.total,
                        },
                        {
                          label: "Condomínios",
                          val: isCenarioAtivo
                            ? s.condominio.atingidos
                            : s.condominio.total,
                          tot: isCenarioAtivo ? s.condominio.total : s.total,
                        },
                      ]
                      return (
                        <ChartCard
                          titulo="Terrenos"
                          extra={
                            !infraAtivas.includes("Terrenos") && (
                              <span className="shrink-0 text-[9px] font-normal text-white/70 normal-case">
                                oculto no mapa
                              </span>
                            )
                          }
                        >
                          <div className="flex flex-col gap-2">
                            {isCenarioAtivo && s.total > 0 && (
                              <div className="flex items-center justify-center py-1">
                                <DonutChart
                                  size={116}
                                  strokeWidth={20}
                                  cssSize="clamp(90px, 14vh, 130px)"
                                  data={[
                                    {
                                      value: pieData[0].value,
                                      color: cor,
                                      label: "Atingidos",
                                    },
                                    {
                                      value: pieData[1].value,
                                      color: `${cor}25`,
                                      label: "Não Atingidos",
                                    },
                                  ]}
                                  centerContent={
                                    <div className="flex flex-col items-center">
                                      <span
                                        className="text-lg leading-none font-black"
                                        style={{ color: cor }}
                                      >
                                        {compactoBr(s.atingidos, 0)}
                                      </span>
                                      <span
                                        className="text-[9px] font-medium"
                                        style={{ color: C.muted }}
                                      >
                                        {pct}% atingidos
                                      </span>
                                      <span
                                        className="text-[9px]"
                                        style={{ color: C.muted }}
                                      >
                                        de {compactoBr(s.total, 0)}
                                      </span>
                                    </div>
                                  }
                                />
                              </div>
                            )}
                            <h3
                              className="border-t pt-2 pb-1 text-[10px] font-bold tracking-wider uppercase"
                              style={{ color: cor, borderColor: C.border }}
                            >
                              Cobertura de Serviços{" "}
                              <span
                                className="text-[9px] font-normal normal-case"
                                style={{ color: C.muted }}
                              >
                                — de {compactoBr(s.total, 0)} terrenos
                              </span>
                            </h3>
                            <div className="flex flex-col gap-2">
                              {items.map(({ label, val, tot }) => (
                                <BarServico
                                  key={label}
                                  label={label}
                                  value={val}
                                  total={tot}
                                  cor={cor}
                                />
                              ))}
                            </div>
                          </div>
                        </ChartCard>
                      )
                    })()}
                  </div>
                )}
                <p
                  className="mt-3 border-t pt-2 text-[9px] italic"
                  style={{ color: C.muted, borderColor: C.border }}
                >
                  Fonte: Prefeitura Municipal de Rio Grande
                </p>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}

      {/* ── Botão abrir painel ────────────────────────────────────────── */}
      {!showPainelAnalise && (
        <button
          onClick={() => setShowPainelAnalise(true)}
          className="active-press hover-lift absolute left-4 z-20 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black shadow-2xl focus-visible:outline-none"
          style={{ top: panelTop, ...glassStyle(0.6), color: C.primary }}
        >
          <PanelLeft size={12} strokeWidth={2.5} />
          Abrir Painel
        </button>
      )}
    </div>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function ChartCard({
  titulo,
  extra,
  children,
}: {
  titulo: React.ReactNode
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 overflow-hidden rounded-lg">
      <div
        className="flex items-center justify-between gap-2 px-3 py-1.5"
        style={{ background: BRAND_GRADIENT }}
      >
        <span className="truncate text-[10px] font-black tracking-wider text-white uppercase">
          {titulo}
        </span>
        {extra}
      </div>
      <div className="p-3" style={{ backgroundColor: PANEL_CARD_BG }}>
        {children}
      </div>
    </div>
  )
}

function MiniStatCard({
  icon,
  cor,
  titulo,
  valor,
  sub,
  pct,
  isLoading,
}: {
  icon: React.ReactNode
  cor: string
  titulo: string
  valor: string | number
  sub: string
  pct?: number
  isLoading?: boolean
}) {
  const p = Math.max(0, Math.min(100, pct ?? 100))
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg p-2.5"
      style={{ backgroundColor: PANEL_CARD_BG }}
    >
      <DonutChart
        size={40}
        strokeWidth={5}
        highlightOnHover={false}
        data={[
          { value: p, color: cor, label: "atingido" },
          { value: 100 - p, color: `${cor}22`, label: "resto" },
        ]}
        centerContent={<span style={{ color: cor }}>{icon}</span>}
      />
      <div className="flex min-w-0 flex-col">
        <span
          className="truncate text-[8.5px] leading-tight font-bold tracking-wider uppercase"
          style={{ color: C.muted }}
        >
          {titulo}
        </span>
        {isLoading ? (
          <Skeleton className="mt-0.5 h-5 w-16" />
        ) : (
          <span
            className="truncate leading-tight font-black"
            style={{ color: C.primary, fontSize: PANEL_FLUID.fontValor }}
          >
            {valor}
          </span>
        )}
        <span
          className="truncate text-[9px] leading-none"
          style={{ color: C.muted }}
        >
          {sub}
        </span>
      </div>
    </div>
  )
}

function KPIRow({
  titulo,
  valor,
  sub,
  delta,
  cor,
  isLoading,
}: {
  titulo: string
  valor: string | number
  sub: string
  delta?: string
  cor?: string
  isLoading?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-lg">
      <div
        className="flex items-center gap-1.5 px-3 py-1"
        style={{ background: BRAND_GRADIENT }}
      >
        {cor && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: cor }}
          />
        )}
        <span className="truncate text-[9px] leading-none font-black tracking-wider text-white uppercase">
          {titulo}
        </span>
      </div>
      <div
        className="flex items-center justify-between gap-3 px-3 py-2"
        style={{ backgroundColor: PANEL_CARD_BG }}
      >
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] leading-none" style={{ color: C.muted }}>
            {sub}
          </span>
          {delta &&
            (isLoading ? (
              <Skeleton className="mt-1.5 h-4 w-16" />
            ) : (
              <span
                className="mt-1.5 inline-block w-fit rounded px-1.5 py-0.5 text-[9px] font-semibold"
                style={{
                  backgroundColor: PANEL_CARD_BG,
                  border: `1px solid ${C.border}`,
                  color: C.primary,
                }}
              >
                {delta}
              </span>
            ))}
        </div>
        {isLoading ? (
          <Skeleton className="h-6 w-20 shrink-0" />
        ) : (
          <span
            className="shrink-0 leading-none font-black"
            style={{ color: C.primary, fontSize: PANEL_FLUID.fontValor }}
          >
            {valor}
          </span>
        )}
      </div>
    </div>
  )
}

function BarServico({
  label,
  value,
  total,
  cor,
}: {
  label: string
  value: number
  total: number
  cor: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px]" style={{ color: C.muted }}>
          {label}
        </span>
        <span
          className="shrink-0 text-[10px] font-bold"
          style={{ color: C.primary }}
        >
          {value.toLocaleString("pt-BR")}{" "}
          <span className="font-normal" style={{ color: C.muted }}>
            ({pct}%)
          </span>
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: `${cor}25` }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: cor }}
        />
      </div>
    </div>
  )
}

function LegendItem({
  cor,
  label,
  area,
}: {
  cor: string
  label: string
  area?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      {area ? (
        <div
          className="h-2.5 w-3 shrink-0 rounded-sm border"
          style={{ borderColor: cor, backgroundColor: `${cor}30` }}
        />
      ) : (
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: cor }}
        />
      )}
      <span
        className="min-w-0 truncate text-[9px] leading-tight font-medium text-slate-700"
        title={label}
      >
        {label}
      </span>
    </div>
  )
}

function KPICard({
  titulo,
  valor,
  sub,
  delta,
  isLoading,
}: {
  titulo: string
  valor: string | number
  sub: string
  delta?: string
  isLoading?: boolean
}) {
  return (
    <Card className="hover-lift gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none">
      <div className="px-3 py-1.5" style={{ background: BRAND_GRADIENT }}>
        <CardTitle className="text-[10px] leading-tight font-black tracking-wider text-white uppercase">
          {titulo}
        </CardTitle>
      </div>
      <CardContent
        className="flex flex-col px-3 pt-2 pb-2.5"
        style={{ backgroundColor: PANEL_CARD_BG }}
      >
        {isLoading ? (
          <Skeleton className="mb-1 h-6 w-24" />
        ) : (
          <div
            className="leading-tight font-black"
            style={{ color: C.primary, fontSize: PANEL_FLUID.fontValor }}
          >
            {valor}
          </div>
        )}
        <div
          className="mt-0.5 mb-1 text-[10px] leading-none font-medium"
          style={{ color: C.muted }}
        >
          {sub}
        </div>
        {delta &&
          (isLoading ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            <div
              className="inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: PANEL_CARD_BG,
                border: `1px solid ${C.border}`,
                color: C.primary,
              }}
            >
              {delta}
            </div>
          ))}
      </CardContent>
    </Card>
  )
}
