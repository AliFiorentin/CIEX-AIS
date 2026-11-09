import React from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import {
  Section,
  SubTitle,
  MathBlock,
  DataTable,
  Note,
  SectionSources,
  ExtLink,
  Math,
  GeoCard,
  RefBlock,
  RefItem,
} from "@/components/doc-kit"
import { HeaderLogos } from "@/components/HeaderLogos"
import type { Comparativo } from "@/lib/comparativo"
import { ConteudoDanoEvitado } from "./ConteudoDanoEvitado"

const PRIMARY = "#1E404A"

const INDICE: [string, string][] = [
  ["#manchas", "1. Manchas de Inundação"],
  ["#sobreposicao", "2. Sobreposição Espacial"],
  ["#empresas", "3. Empresas"],
  ["#agricultura", "4. Agricultura e Cobertura da Terra"],
  ["#educacao", "5. Educação"],
  ["#saude", "6. Saúde"],
  ["#patrimonio", "7. Patrimônio Histórico"],
  ["#infraestrutura", "8. Infraestrutura"],
  ["#populacao", "9. População Exposta"],
  ["#danos", "10. Perdas Operacionais (DaLA)"],
  ["#dano-fisico", "11. Danos Físicos (Por Cota)"],
  ["#dano-evitado", "12. Cenários de Intervenção e Dano Evitado"],
  ["#limitacoes", "13. Limitações"],
  ["#fontes", "14. Fontes e Referências"],
]

export function MetodologiaContent({
  comparativo = null,
}: {
  comparativo?: Comparativo | null
}) {
  return (
    <div className="min-h-screen bg-[#eef3f4] font-sans text-slate-800">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="px-6 py-10 text-white"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="mx-auto flex max-w-[1440px] items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold text-white/70 transition-colors hover:border-white/40 hover:text-white"
              >
                ← Dashboard
              </Link>
              <Link
                href="/perdas-operacionais"
                className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold text-white/70 transition-colors hover:border-white/40 hover:text-white"
              >
                Danos →
              </Link>
            </div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] uppercase opacity-60">
              CIEX · GPEA · FURG
            </p>
            <h1 className="mb-2 flex items-center gap-3 text-4xl leading-none font-black tracking-tight">
              <BookOpen
                size={36}
                strokeWidth={2.5}
                className="shrink-0 opacity-80"
              />
              Metodologia
            </h1>
            <p className="text-base font-medium opacity-75">
              Avaliação de Vulnerabilidade Econômica a Inundações: Rio Grande
              (RS)
            </p>
            <p className="mt-3 font-mono text-[11px] opacity-50">
              Cenários de Setembro/2023, Maio/2024 e 16/05/2024, e níveis por
              cota · Município de Rio Grande
            </p>
          </div>
          <HeaderLogos />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] items-start gap-8 px-6 py-10">
        {/* ── Sidebar (Índice fixo) ────────────────────────────────────────── */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-6 flex flex-col gap-3">
            <nav className="rounded-xl border border-[#c7d6d9] bg-white p-4 shadow-sm">
              <p
                className="mb-2 text-[10px] font-black tracking-wider uppercase"
                style={{ color: PRIMARY }}
              >
                Índice
              </p>
              <ol className="flex flex-col gap-1">
                {INDICE.map(([href, label]) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="block py-0.5 text-[11px] leading-snug font-medium underline-offset-4 transition-colors duration-150 hover:underline"
                      style={{ color: PRIMARY }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {/* ── Contexto ──────────────────────────────────────────────────── */}
          <div className="mb-8 rounded-xl border border-[#c7d6d9] bg-white p-5 shadow-sm">
            <p
              className="mb-2 text-[10px] font-black tracking-wider uppercase"
              style={{ color: PRIMARY }}
            >
              Contexto
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              A metodologia distingue dois planos analíticos: (a) a{" "}
              <strong>exposição física</strong>: identificação de
              estabelecimentos, escolas, unidades de saúde, bens de patrimônio
              histórico, infraestrutura urbana e áreas agrícolas dentro da
              mancha de inundação de cada cenário; e (b) as{" "}
              <strong>perdas econômicas operacionais</strong>: estimativa do
              fluxo de produção e serviços não realizado durante o período de
              interrupção, seguindo a abordagem DaLA (CEPAL). Todo o
              processamento espacial é <strong>pré-computado offline</strong> em
              Python; o painel web apenas renderiza os arquivos estáticos
              resultantes.
            </p>
          </div>

          {/* ═══ 1. MANCHAS ═══ */}
          <Section
            id="manchas"
            num="1"
            title="Manchas de Inundação: Definição dos Cenários"
          >
            <p>
              As manchas de inundação são{" "}
              <strong>
                polígonos vetoriais que delimitam a extensão geográfica de cada
                evento
              </strong>{" "}
              em Rio Grande/RS, elaborados a partir de modelagem hidrológica e
              hidráulica costeira pelo CIEX/FURG.
            </p>
            <DataTable
              rows={[
                ["Cenário", "Referência temporal", "Descrição"],
                [
                  "Cenário Setembro 2023",
                  "Setembro 2023",
                  "Evento de menor magnitude, anterior ao de maio de 2024",
                ],
                [
                  "Cenário Maio 2024",
                  "Maio 2024",
                  "Extensão modelada para o evento de maio",
                ],
                [
                  "Cenário Maio 2024 + 50%",
                  "Maio 2024, nível 60 cm acima",
                  "Cenário de sensibilidade: o evento de maio com a água 60 cm mais alta (shapefile CEN_MAI24_MAIS60CM). O \"+50%\" é só o nome herdado do cenário; a mancha resultante é ~7× a de Maio 2024 em área",
                ],
                [
                  "Nível da Lagoa + Chuva Acumulada",
                  "16/05/2024, 20h",
                  "União de duas simulações por bacia hidrográfica (ver detalhe abaixo)",
                ],
                [
                  "Todas as cotas",
                  "Pico de 21/05/2024 e níveis anteriores",
                  "Água avançando por cota: 1,00 / 1,50 / 2,00 / 2,50 / 2,6215 m (máscaras molhado/seco, união das bacias); só exposição, sem profundidade",
                ],
                [
                  "Simulações de intervenção (12)",
                  "29/09/2023, 29/11/2023, 21/05/2024 e 28/06/2025",
                  "4 eventos × sem intervenção, diques e diques + barragens, a partir de rasters de profundidade (modelo TELEMAC); mancha com profundidade ≥ 10 cm. Ver Seção 12",
                ],
              ]}
            />

            <SubTitle>
              Nível da Lagoa + Chuva Acumulada: um cenário combinado
            </SubTitle>
            <p>
              Cenário adicional que combina duas simulações entregues como
              rasters de profundidade por bacia hidrográfica pelo GPEA/FURG,
              tratado como um cenário comum no restante do pipeline, mesma
              junção espacial e mesmos indicadores por setor das Seções
              seguintes. A área atingida final é a <strong>união</strong> das
              duas simulações.
            </p>
            <DataTable
              rows={[
                ["Simulação", "Fonte", "Limiar de área atingida"],
                [
                  "Nível da Lagoa – 16/05/2024, 20h",
                  "Mosaico de rasters de profundidade das bacias 1–5 e 7 (~1 m/pixel)",
                  "≥ 45 cm (primeira classe visível do estilo QGIS)",
                ],
                [
                  "Chuva Acumulada – 60,8 mm",
                  "Mosaico de rasters das bacias 1–5 (saída de modelo, não em cm)",
                  "Valor 86–253 (faixa visível do estilo QGIS; segundo a fonte, o corte inferior equivale a ≈ 10 cm de lâmina d'água)",
                ],
              ]}
            />
            <Note type="info">
              <strong>Limiares e processamento da mancha.</strong> A Lagoa
              entra com profundidade ≥ 45 cm (abaixo disso o estilo QGIS é
              transparente). Na Chuva Acumulada, o valor 254 ou mais é tratado
              como água pré-existente e fica de fora, como no estilo QGIS;
              entra só a faixa 86–253. Cada máscara é limpa de ruído por
              votação de maioria (desfoque gaussiano de 2 pixels, corte em
              0,5), reduzida por 4×4 também por maioria (≥ 50% do bloco
              molhado, e não um único pixel) e suavizada com fechamento e
              abertura de ~8 m. Resultado: 6,35 km², +10% sobre o limiar bruto
              (5,76 km²), por causa do fechamento de vãos de até ~16 m.
            </Note>
            <Note type="info">
              No raster visual, a classificação de profundidade da Lagoa tem{" "}
              <strong>prioridade</strong> onde as duas simulações se sobrepõem:
              o lilás da Chuva Acumulada só aparece onde a Lagoa não tem
              cobertura. Este é o único cenário exibido como imagem raster
              colorida (preservando o gradiente de classificação), em vez de
              preenchimento de cor única + contorno.
            </Note>

            <SubTitle>Sistema de Referência de Coordenadas (CRS)</SubTitle>
            <DataTable
              rows={[
                ["CRS", "EPSG", "Uso no pipeline"],
                [
                  "WGS 84 / Geográfico",
                  "4326",
                  "Manchas, GeoJSON de saída e renderização no MapLibre GL",
                ],
                [
                  "SIRGAS 2000 / UTM Zone 22S",
                  "31982",
                  "Shapefiles de origem da Prefeitura de Rio Grande (Logradouros, Quadras, Terrenos)",
                ],
              ]}
            />
            <p className="text-[12px] text-slate-500">
              Diferente do cálculo de área em Python via reprojeção métrica, as
              camadas de polígono (Agricultura, Uso e Cobertura da Terra) têm a
              área calculada no cliente com <code>@turf/turf</code>, que opera
              diretamente sobre coordenadas geográficas (elipsoide WGS 84) sem
              necessidade de reprojeção para um CRS métrico.
            </p>
            <SectionSources
              links={[
                [
                  "CIEX/FURG: Centro de Inteligência em Eventos Extremos",
                  "https://ciex.furg.br",
                ],
              ]}
            />

            <p>
              O modo <strong>Todas as cotas</strong> anima a água avançando de
              uma cota para a seguinte, com slider e play/pause no mapa; as abas
              passam a mostrar o que está sob a água na cota atual (empresas,
              escolas e unidades de saúde). Os resultados por cota estão na aba
              Danos Físicos (Seção 11).
            </p>
          </Section>

          {/* ═══ 2. SOBREPOSIÇÃO ESPACIAL ═══ */}
          <Section
            id="sobreposicao"
            num="2"
            title="Sobreposição Espacial: Cálculo dos Atingidos"
          >
            <p>
              A identificação dos elementos atingidos é feita por{" "}
              <strong>sobreposição espacial (spatial overlay)</strong> entre
              cada camada de feições georreferenciadas e o polígono da mancha de
              inundação do cenário selecionado. Todo o processamento é realizado
              offline com{" "}
              <ExtLink href="https://geopandas.org">GeoPandas</ExtLink> e{" "}
              <ExtLink href="https://shapely.readthedocs.io">Shapely</ExtLink>,
              em Python. O painel web carrega apenas os arquivos pré-computados;
              não realiza interseção em tempo real.
            </p>

            <SubTitle>Método por tipo de geometria</SubTitle>
            <DataTable
              rows={[
                ["Geometria", "Camadas", "Predicado", "Resultado"],
                [
                  "Ponto",
                  "Empresas · Escolas · Unidades de Saúde",
                  "within",
                  "Ponto dentro do polígono da mancha",
                ],
                [
                  "Polígono",
                  "Quadras · Terrenos · Agricultura · Cobertura da terra",
                  "intersects + intersection()",
                  "Área de interseção em ha (EPSG:32722)",
                ],
                [
                  "Linha",
                  "Logradouros",
                  "intersects + intersection()",
                  "Comprimento de interseção em km (EPSG:32722)",
                ],
              ]}
            />

            <GeoCard
              title="Pontos: Empresas · Escolas · Unidades de Saúde"
              operation='geopandas.sjoin(predicate="within")'
            >
              <p className="mb-2 text-sm text-[#2f6a83]">
                Um ponto <em>p</em> com coordenadas{" "}
                <Math tex={"(\\lambda, \\phi)"} /> é classificado como atingido
                se e somente se está geometricamente contido no interior ou
                fronteira do polígono da mancha <em>M</em>:
              </p>
              <MathBlock
                exprs={[{ tex: "\\text{atingido}(p) = \\mathbf{1}[p \\in M]" }]}
              />
              <p className="mt-2 text-[11px] text-[#2f6a83]">
                Empresas e escolas: o ponto geocodificado só é aceito se estiver
                dentro do polígono do município declarado (IBGE). Unidades de
                saúde: coordenadas informadas pelo próprio CNES. Em todas as
                camadas, pontos em (0, 0) ou fora do retângulo do RS (lat ∈
                [−34°, −27°], lon ∈ [−58°, −49°]) são excluídos da análise.
              </p>
            </GeoCard>

            <GeoCard
              title="Polígonos: Quadras · Terrenos · Agricultura · Cobertura da terra"
              operation='sjoin(predicate="intersects") → intersection() → área em EPSG:32722'
            >
              <p className="mb-2 text-sm text-[#2f6a83]">
                Um polígono <em>F</em> é atingido se sua interseção com a mancha
                é não-vazia. A área atingida é calculada reprojetando para UTM
                Zone 22S (EPSG:32722):
              </p>
              <MathBlock
                exprs={[
                  {
                    tex: "\\text{atingido}(F) = \\mathbf{1}[\\mathcal{A}(F \\cap M) > 0]",
                  },
                  {
                    label: "Área atingida [m²]",
                    tex: "A = \\mathcal{A}(F \\cap M) \\quad \\text{(EPSG:32722)}",
                  },
                  {
                    label: "Área atingida [ha]",
                    tex: "A_{\\text{ha}} = A / 10{.}000",
                  },
                ]}
              />
            </GeoCard>

            <GeoCard
              title="Linhas: Logradouros"
              operation='sjoin(predicate="intersects") → intersection() → comprimento em EPSG:32722'
            >
              <p className="mb-2 text-sm text-[#2f6a83]">
                Um segmento <em>L</em> é atingido se intersecta a mancha. O
                comprimento atingido é o trecho da linha dentro do polígono:
              </p>
              <MathBlock
                exprs={[
                  {
                    tex: "\\text{atingido}(L) = \\mathbf{1}[\\ell(L \\cap M) > 0]",
                  },
                  {
                    label: "Comprimento [m]",
                    tex: "C = \\ell(L \\cap M) \\quad \\text{(EPSG:32722)}",
                  },
                  {
                    label: "Comprimento [km]",
                    tex: "C_{\\text{km}} = C / 1{.}000",
                  },
                ]}
              />
            </GeoCard>

            <SubTitle>Notação formal: indicadores agregados</SubTitle>
            <p>
              Para um conjunto de <Math tex={"N_t"} /> feições e uma mancha{" "}
              <Math tex={"M_j"} />
              do cenário <em>j</em>:
            </p>
            <MathBlock
              exprs={[
                {
                  label: "Indicadora de impacto",
                  tex: "\\chi_i = \\begin{cases} 1 & \\text{se}\\ \\mathcal{A}(F_i \\cap M_j) > 0 \\\\ 0 & \\text{caso contrário} \\end{cases}",
                },
                {
                  label: "Unidades afetadas",
                  tex: "N_a = \\sum_{i=1}^{N_t} \\chi_i",
                },
                {
                  label: "Percentual",
                  tex: "P = \\dfrac{N_a}{N_t} \\times 100\\,\\%",
                },
                {
                  label: "Atributo ponderado",
                  tex: "Q_a = \\sum_{i=1}^{N_t} q_i \\cdot \\chi_i \\quad (q_i = \\text{vínculos, matrículas, etc.})",
                },
                {
                  label: "Percentual ponderado",
                  tex: "P_q = \\dfrac{Q_a}{\\sum_i q_i} \\times 100\\,\\%",
                },
              ]}
            />
            <p className="text-[11px] text-[#2f6a83] italic">
              Fluxo CRS: SIRGAS 2000 (EPSG:4674) nos dados cadastrais → WGS 84
              (EPSG:4326) para as manchas → EPSG:32722 para cálculos de área e
              comprimento → EPSG:4326 na saída GeoJSON para MapLibre GL.
            </p>
            <SectionSources
              links={[
                [
                  "GeoPandas Documentation",
                  "https://geopandas.org/en/stable/docs.html",
                ],
                ["Shapely Documentation", "https://shapely.readthedocs.io"],
                [
                  "IBGE: Malha Municipal RS",
                  "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html",
                ],
              ]}
            />

            <Note type="info">
              <strong>Particularidades do Dashboard CIEX:</strong> o painel web
              recalcula no navegador, com <code>@turf/turf</code> (elipsoide WGS
              84), apenas a área em hectares das feições de polígono já
              selecionadas como atingidas; a contagem de <em>ruas únicas</em>{" "}
              deduplica segmentos do mesmo logradouro pelo par (tipo, nome). A
              interseção em si continua sendo feita offline.
              <br />
              <strong>Dois métodos de sobreposição.</strong> Quadras e Terrenos
              são unidades cadastrais discretas e entram <em>inteiros</em> (a
              feição original, sem recorte) quando intersectam a mancha;
              Logradouros, Agricultura e Cobertura da terra são
              <em> recortados</em> pela mancha (<code>overlay</code>), e a
              área ou o comprimento atingido é só o trecho dentro dela. Por isso
              a área de Quadras/Terrenos atingidos é maior que a área alagada
              efetiva, e os dois grupos não devem ser somados como mesma
              grandeza. A medida de cobertura por feição (razão de área
              atingida) não é calculada no CIEX.
            </Note>
          </Section>

          {/* ═══ 3. EMPRESAS ═══ */}
          <Section
            id="empresas"
            num="3"
            title="Empresas: Estabelecimentos Formais Atingidos"
          >
            <p>
              O painel quantifica a{" "}
              <strong>
                exposição física dos estabelecimentos do setor formal
              </strong>{" "}
              dentro de cada mancha de inundação, com base na{" "}
              <ExtLink href="https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/rais/rais-2025/rais-2025">
                RAIS: Relação Anual de Informações Sociais (MTE)
              </ExtLink>
              , ano-base 2023. Cada estabelecimento é georreferenciado a partir
              do endereço constante na própria RAIS, geocodificado via instância
              local do Nominatim (OpenStreetMap).
            </p>

            <SubTitle>Dados base: RAIS 2023</SubTitle>
            <p>
              A RAIS 2023 contém todos os vínculos empregatícios ativos em
              31/12/2023 no território nacional. Para este painel foram
              selecionados apenas estabelecimentos em Rio Grande (filtragem por
              código IBGE de 6 dígitos). As variáveis extraídas por
              estabelecimento (CNPJ) são:
            </p>
            <DataTable
              rows={[
                ["Variável RAIS", "Uso no painel"],
                [
                  "cnpj_cei",
                  "Identificador do estabelecimento (14 dígitos, com zeros à esquerda)",
                ],
                ["municipio (ibge6)", "Filtragem de Rio Grande"],
                [
                  "qtd_vinc_ativos",
                  "Contagem de vínculos ativos (no painel, \"empregados\"): uma pessoa com dois vínculos conta duas vezes",
                ],
                [
                  "vl_remun_media_nom",
                  "Remuneração média mensal por vínculo → soma = folha salarial do estabelecimento",
                ],
                [
                  "cnae20_classe",
                  "CNAE 2.0 (5 dígitos) → classificação setorial → labor share para estimativa de VAB",
                ],
                [
                  "logradouro + município",
                  "Endereço para geocodificação via Nominatim",
                ],
              ]}
            />

            <SubTitle>Geocodificação dos endereços</SubTitle>
            <p>
              A geocodificação é realizada com uma instância local do{" "}
              <ExtLink href="https://nominatim.org">Nominatim</ExtLink>{" "}
              (OpenStreetMap), que converte o endereço textual em coordenadas
              geográficas (lat/lon, EPSG:4326). O ponto só é aceito se estiver
              dentro do polígono do município declarado na fonte (malha
              municipal do IBGE), o que descarta correspondências em municípios
              vizinhos com logradouro homônimo. Na conversão para GeoJSON,
              pontos em (0, 0) ou fora do retângulo do Rio Grande do Sul (lat ∈
              [−34°, −27°], lon ∈ [−58°, −49°]) também são excluídos. As
              coordenadas ficam em cache para uso posterior.
            </p>
            <Note type="info">
              Estabelecimentos sem endereço geocodificável (endereços
              incompletos, caixas postais ou rurais sem numeração) são excluídos
              do mapeamento mas contabilizados separadamente no relatório de
              cobertura de geocodificação.
            </Note>

            <SubTitle>Classificação setorial por CNAE</SubTitle>
            <p>
              O código CNAE 2.0 (Classificação Nacional de Atividades
              Econômicas) de cada estabelecimento determina o setor para fins de
              cálculo de perdas operacionais:
            </p>
            <DataTable
              rows={[
                [
                  "Divisão CNAE",
                  "Setor",
                  "Labor share (LS)",
                  "Exemplos de atividades",
                ],
                [
                  "01–03",
                  "Agropecuária",
                  "17,6%",
                  "Lavouras, criação de animais, silvicultura",
                ],
                [
                  "05–39",
                  "Indústria",
                  "33,8%",
                  "Extração mineral, manufatura, utilidades",
                ],
                [
                  "84",
                  "Adm. Pública",
                  "88,3%",
                  "Administração, defesa, seguridade social",
                ],
                [
                  "Demais (41–83 e 85–99)",
                  "Serviços",
                  "43,3%",
                  "Construção, comércio, transporte, TI, saúde privada, educação privada",
                ],
              ]}
            />

            <Note type="info">
              <strong>Terminologia.</strong> &ldquo;Empregados&rdquo; no painel
              são <em>vínculos</em> formais da RAIS: uma pessoa com dois
              vínculos conta duas vezes. &ldquo;Atingido&rdquo; e
              &ldquo;exposto&rdquo; são usados para o que está dentro da
              mancha e não indicam dano efetivo. Os setores do gráfico são as
              <em> seções</em> da CNAE (letras), e a tabela de labor share usa
              as <em>divisões</em> (dois dígitos).
            </Note>

            <SubTitle>Indicadores calculados</SubTitle>
            <DataTable
              rows={[
                ["Indicador", "Fórmula / Descrição"],
                [
                  "Estabelecimentos atingidos",
                  <span key="e">
                    Contagem <Math tex={"N_a = \\sum \\chi_i"} /> (pontos dentro
                    da mancha)
                  </span>,
                ],
                [
                  "Empregados expostos",
                  <span key="emp">
                    <Math
                      tex={
                        "Q_{\\text{emp}} = \\sum_{i} \\text{qtd\\_vinculos}_i \\cdot \\chi_i"
                      }
                    />
                  </span>,
                ],
                [
                  "Massa salarial exposta",
                  <span key="ms">
                    <Math tex={"W = \\sum_{i} w_i \\cdot \\chi_i"} /> (R$/mês,
                    soma das remunerações médias)
                  </span>,
                ],
                [
                  "Salário médio",
                  <span key="sm">
                    <Math tex={"\\bar{w} = W / Q_{\\text{emp}}"} />
                  </span>,
                ],
                [
                  "Distribuição por setor",
                  "Participação de cada seção CNAE no total de estabelecimentos e vínculos atingidos",
                ],
              ]}
            />

            <Note type="info">
              Os indicadores deste painel medem a <em>exposição estática</em>{" "}
              (snap-shot de 2023), não o efeito causal. Estimar perdas no
              mercado de trabalho formal exigiria comparar municípios atingidos
              com controles similares antes e depois do evento.
            </Note>

            <SubTitle>Origem dos dados</SubTitle>
            <DataTable
              rows={[
                ["Fonte", "Referência temporal", "Variáveis utilizadas"],
                [
                  "RAIS (MTE)",
                  "Ano-base 2023",
                  "Vínculos ativos, endereços, CNAE, remuneração",
                ],
                [
                  "OpenStreetMap / Nominatim",
                  "—",
                  "Geocodificação de endereços (instância local)",
                ],
              ]}
            />
            <SectionSources
              links={[
                [
                  "RAIS: Microdados MTE",
                  "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/rais/rais-2025/rais-2025",
                ],
                ["Nominatim: OpenStreetMap Geocoder", "https://nominatim.org"],
              ]}
            />
          </Section>

          {/* ═══ 4. AGRICULTURA E COBERTURA ═══ */}
          <Section
            id="agricultura"
            num="4"
            title="Agricultura e Cobertura da Terra"
          >
            <p>
              A estimativa de perdas agrícolas combina o{" "}
              <strong>mapeamento de uso do solo</strong> (MapBiomas), fonte da
              área cultivada, com{" "}
              <strong>coeficientes de impacto direto</strong> (R$/ha) calibrados
              ao estágio fenológico de cada cultura no momento do evento. O
              resultado representa o custo direto de produção perdido (insumos,
              sementes, corretivos e trabalho), sem considerar renda futura,
              preços de mercado ou perdas de solo de longo prazo.
            </p>

            <SubTitle>Mapeamento de uso do solo: MapBiomas Coleção 10</SubTitle>
            <p>
              O{" "}
              <ExtLink href="https://brasil.mapbiomas.org/downloads/mapas-para-download-geotiff/">
                MapBiomas Coleção 10
              </ExtLink>{" "}
              fornece rasters anuais de uso e cobertura do solo com resolução de 30 m. As camadas desenhadas no mapa do CIEX usam <strong>um único raster, o de 2024</strong>, em todos os cenários. As estatísticas de área agrícola usadas nas perdas vêm de uma fonte externa que, segundo sua documentação (não verificada aqui), seleciona o ano conforme o evento:
            </p>
            <DataTable
              rows={[
                ["Cenário", "Ano do raster (estatísticas externas)", "Justificativa"],
                [
                  "Maio 2024",
                  "2024",
                  "Reflete a ocupação agrícola da safra 2023/24",
                ],
                [
                  "Setembro 2023",
                  "2023",
                  "Reflete a ocupação agrícola da safra 2022/23",
                ],
                [
                  "Simulações de intervenção",
                  "2024",
                  "Usam o raster único de 2024 (MapBiomas Coleção 10), como o mapa; não há raster por evento",
                ],
              ]}
            />
            <p>As classes de lavouras temporárias mapeadas são:</p>
            <DataTable
              rows={[
                ["Código MapBiomas", "Classe", "Cor no painel"],
                ["39", "Soja", "#D4A017 (amarelo-ouro)"],
                ["40", "Arroz", "#4FC3F7 (azul-claro)"],
                [
                  "41, 20, 62",
                  "Outras Lavouras Temporárias (inclui cana e algodão)",
                  "#AED581 (verde-claro)",
                ],
              ]}
            />
            <p>
              Lavouras perenes (café, citros, dendê e outras; códigos 36, 46,
              47, 35 e 48) ficam fora da camada. Como o raster é referenciado em
              graus, a área de cada pixel depende da latitude: cerca de 0,078 ha em Rio Grande, e não os 0,09 ha nominais de 30 × 30 m.
            </p>
            <MathBlock
              exprs={[
                {
                  label: "Área por pixel [ha]",
                  tex: "a_{\\text{pixel}} = \\dfrac{|\\Delta\\lambda| \\cdot 111{.}320 \\cdot \\cos\\varphi_c \\cdot |\\Delta\\varphi| \\cdot 111{.}320}{10{.}000}",
                },
                {
                  label: "Área total [ha]",
                  tex: "A_{\\text{total}} = N_{\\text{pixels}} \\times a_{\\text{pixel}}",
                },
              ]}
            />
            <p className="text-[12px] text-slate-600">
              Δλ e Δφ: resolução angular do raster; φ<sub>c</sub>: latitude
              central do recorte municipal. A área atingida é medida sobre os
              polígonos de cultura recortados pela mancha (EPSG:32722 no
              pipeline externo ao CIEX, que produz os{" "}
              <code>agricultura_stats_*.json</code>), após suavização da geometria. O pipeline externo descarta ainda fragmentos menores que 5 m²; essa regra não é aplicada nos scripts do CIEX. Os scripts
              próprios do CIEX (filtro de ruído, manchas por cota, Setembro de
              2023) usam EPSG:31982 (SIRGAS 2000 / UTM 22S); a diferença de
              área entre os dois sistemas é desprezível nessa escala.
            </p>

            <SubTitle>
              Coeficientes de impacto: calendário agrícola do RS
            </SubTitle>
            <p>
              Os coeficientes (R$/ha) refletem o estágio fenológico no momento
              do evento e representam o custo direto de produção incorrido até
              aquele ponto da safra:
            </p>
            <DataTable
              rows={[
                [
                  "Cultura",
                  "Período",
                  "Status fenológico",
                  "Coef. (R$/ha)",
                  "Componentes estimados",
                ],
                [
                  "Soja",
                  "Maio 2024",
                  "Colhida (fev–abr/2024)",
                  "R$ 1.100",
                  "Insumos para próxima safra já aplicados + compactação de solo",
                ],
                [
                  "Arroz",
                  "Maio 2024",
                  "Colhido (fev–abr/2024)",
                  "R$ 1.100",
                  "Infraestrutura de irrigação danificada + compactação",
                ],
                [
                  "Outras Lavouras Temporárias",
                  "Maio 2024",
                  "Plantio inicial (mai–jun/2024)",
                  "R$ 1.400",
                  "Sementes, fertilizantes base, preparo do solo",
                ],
                [
                  "Soja",
                  "Set. 2023",
                  "Pré-plantio",
                  "R$ 250",
                  "Solo em preparo, impacto mínimo, insumos não aplicados",
                ],
                [
                  "Arroz",
                  "Set. 2023",
                  "Pré-plantio",
                  "R$ 250",
                  "Solo em preparo, impacto mínimo",
                ],
                [
                  "Outras Lavouras Temporárias",
                  "Set. 2023",
                  "Colheita (set–out/2023)",
                  "R$ 2.800",
                  "Perda quase total de trigo/aveia em ponto de colheita",
                ],
              ]}
            />
            <MathBlock
              exprs={[
                {
                  label: "Perda total [R$]",
                  tex: "L_{\\text{agr}} = \\sum_{c \\in \\text{culturas}} A_c\\,[\\text{ha}] \\times \\text{Coef}_c\\,[\\text{R}\\$/\\text{ha}]",
                },
              ]}
            />
            <Note type="warning">
              Escopo restrito a custos diretos de produção. Excluídos: variação
              de preço de mercado, contratos forward, renda futura de safras
              seguintes, recuperação de solo (calcário, gesso) e perdas na
              pecuária.
            </Note>

            <SubTitle>Origem dos dados</SubTitle>
            <DataTable
              rows={[
                ["Fonte", "Referência temporal", "Variáveis"],
                [
                  "MapBiomas (Coleção 10)",
                  "2023 e 2024",
                  "Raster 30 m; classes 39 (Soja), 40 (Arroz), 41, 20 e 62 (Outras)",
                ],
                [
                  "CONAB (Preços Mínimos)",
                  "2024",
                  "Base para calibração dos coeficientes R$/ha",
                ],
              ]}
            />
            <SectionSources
              links={[
                [
                  "MapBiomas: Coleção 10",
                  "https://brasil.mapbiomas.org/downloads/mapas-para-download-geotiff/",
                ],
                [
                  "MapBiomas: Códigos da legenda da Coleção 10",
                  "https://brasil.mapbiomas.org/wp-content/uploads/sites/4/2025/08/Legenda-Colecao-10-Legend-Code.pdf",
                ],
                ["CONAB: Preços Mínimos 2024", "https://www.conab.gov.br"],
              ]}
            />

            <SubTitle>
              Particularidades do Dashboard CIEX: camadas de agricultura e
              cobertura no mapa
            </SubTitle>
            <p>
              As camadas desenhadas no mapa vêm do{" "}
              <ExtLink href="https://brasil.mapbiomas.org/colecoes-mapbiomas-1/">
                MapBiomas Coleção 10 (2024)
              </ExtLink>{" "}
              vetorizado. A área de cada feição é calculada no navegador com{" "}
              <code>@turf/turf</code> (elipsoide WGS 84, m² → hectares) para os
              totais exibidos. O ruído de vetorização do raster (fragmentos
              &lt; 0,5 ha) é removido <em>offline</em>, polígono a polígono e
              em hectares reais (EPSG:31982), antes de dissolver as feições por
              classe (<code>scripts/filtro_ruido.py</code>); o navegador não
              aplica mais esse corte. O cálculo de <em>perdas agrícolas</em>{" "}
              (Seção 10) usa os hectares por cultura de{" "}
              <code>agricultura_stats_*.json</code>, produzidos como descrito
              acima.
            </p>
            <DataTable
              rows={[
                ["Camada", "Classes"],
                ["Agricultura", "Soja, Arroz, Outras Lavouras Temporárias"],
                [
                  "Uso e Cobertura da Terra",
                  "Silvicultura, Campo Alagado e Área Pantanosa, Formação Campestre, Mosaico de Usos, Restinga Arbórea, Restinga Herbácea",
                ],
              ]}
            />
          </Section>

          {/* ═══ 5. EDUCAÇÃO ═══ */}
          <Section id="educacao" num="5" title="Educação: Estrutura Atingida">
            <p>
              O painel mapeia a{" "}
              <strong>infraestrutura educacional da educação básica</strong>{" "}
              dentro das manchas de inundação, com base no{" "}
              <ExtLink href="https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar">
                Censo Escolar 2024 (INEP)
              </ExtLink>
              . O Censo Escolar é o maior levantamento estatístico educacional
              do Brasil, cobrindo todas as escolas de educação básica
              (pré-escola ao ensino médio) dos sistemas federal, estadual,
              municipal e privado.
            </p>

            <SubTitle>Indicadores de exposição</SubTitle>
            <DataTable
              rows={[
                ["Indicador", "Descrição"],
                [
                  "Escolas atingidas",
                  "Estabelecimentos com ponto geocodificado dentro da mancha",
                ],
                [
                  "Matrículas afetadas",
                  "Soma de todas as matrículas ativas nas escolas atingidas (pré-escola ao EM)",
                ],
                [
                  "Professores afetados",
                  "Vínculos de docentes nas escolas atingidas",
                ],
                [
                  "Dependência administrativa",
                  "Federal / Estadual / Municipal / Privada",
                ],
                [
                  "Tipo de atendimento",
                  "Creche, Pré-escola, EF Anos Iniciais, EF Anos Finais, EM, EJA, Educação Especial",
                ],
              ]}
            />

            <SubTitle>Dependência administrativa</SubTitle>
            <DataTable
              rows={[
                ["Código", "Dependência", "Mantenedora"],
                [
                  "1",
                  "Federal",
                  "União (IFs, colégios de aplicação e militares)",
                ],
                [
                  "2",
                  "Estadual",
                  "Governo do estado (escolas estaduais de EF e EM)",
                ],
                [
                  "3",
                  "Municipal",
                  "Prefeituras (principalmente pré-escola e EF inicial)",
                ],
                [
                  "4",
                  "Privada",
                  "Entidades privadas com ou sem fins lucrativos",
                ],
              ]}
            />

            <SubTitle>Geocodificação das escolas</SubTitle>
            <p>
              As escolas são georreferenciadas pelo endereço registrado no Censo
              Escolar, com o mesmo procedimento das empresas: geocodificação na
              instância local do Nominatim (OSM) e aceite do ponto apenas dentro
              do polígono do município (IBGE).
            </p>

            <Note type="info">
              A interrupção do calendário letivo e os custos de reconstrução
              predial não são estimados nesta seção. A estimativa do custo de{" "}
              <strong>reposição dos dias letivos</strong> perdidos (via
              FUNDEB/VAAT-MIN) é calculada na{" "}
              <a
                href="#danos"
                className="font-semibold text-[#1E404A] underline-offset-4 hover:underline"
              >
                Seção 10: Perdas Operacionais
              </a>
              .
            </Note>

            <SubTitle>Origem dos dados</SubTitle>
            <DataTable
              rows={[
                ["Fonte", "Referência temporal", "Variáveis"],
                [
                  "INEP (Censo Escolar)",
                  "2024",
                  "Estabelecimentos, matrículas por modalidade, docentes, coordenadas",
                ],
                [
                  "OpenStreetMap / Nominatim",
                  "—",
                  "Geocodificação de escolas sem coordenada na base INEP",
                ],
              ]}
            />
            <SectionSources
              links={[
                [
                  "INEP: Censo Escolar",
                  "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar",
                ],
                [
                  "INEP: Microdados Censo Escolar 2024",
                  "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-escolar",
                ],
              ]}
            />
          </Section>

          {/* ═══ 6. SAÚDE ═══ */}
          <Section
            id="saude"
            num="6"
            title="Saúde: Capacidade Instalada Atingida"
          >
            <p>
              O painel quantifica a{" "}
              <strong>capacidade instalada do sistema de saúde</strong> dentro
              das manchas de inundação, com base no{" "}
              <ExtLink href="https://cnes.datasus.gov.br">
                CNES: Cadastro Nacional de Estabelecimentos de Saúde (DataSUS)
              </ExtLink>
              , referência de abril/2024. O CNES registra todos os
              estabelecimentos de saúde do SUS e do setor privado, com
              localização georreferenciada por latitude/longitude disponível
              diretamente na fonte.
            </p>

            <SubTitle>Tipos de estabelecimento (TP_UNID)</SubTitle>
            <p>
              Tipos presentes nas 462 unidades de Rio Grande (campo{" "}
              <code>tp_unidade_label</code>, nomes do CNES):
            </p>
            <DataTable
              rows={[
                ["Tipo", "Unidades"],
                ["Ambulatório", "334"],
                ["Farmácia", "41"],
                ["Unidade Básica de Saúde", "36"],
                ["Unidade de Apoio Diagnóstico", "25"],
                ["Pronto Atendimento", "6"],
                ["Hospital", "4"],
                ["Laboratório de Saúde Pública", "4"],
                ["Unidade de Terapias Especiais", "4"],
                ["Unidade de Reabilitação", "3"],
                ["Unidade de Vigilância de Zoonoses", "2"],
                ["Central de Gestão em Saúde", "2"],
                ["Centro de Imunização", "1"],
              ]}
            />
            <p className="text-[12px] text-slate-600">
              O CNES também define outros tipos (Hospital Especializado, CAPS,
              Clínica Especializada, Pronto-Socorro), mas nenhum deles ocorre
              em Rio Grande nesta base.
            </p>

            <SubTitle>Categorias de profissionais (CBO)</SubTitle>
            <p>
              Os vínculos de profissionais de saúde são agrupados em 11
              categorias com base no código CBO (Classificação Brasileira de
              Ocupações) de 4 dígitos. O agrupamento é feito no pipeline externo ao CIEX; o CIEX recebe as 11 colunas <code>staff_*</code> já
              somadas por unidade e não refaz a classificação:
            </p>
            <DataTable
              rows={[
                [
                  "Categoria painel",
                  "Códigos CBO (4 dígitos)",
                  "Exemplos de ocupações",
                ],
                [
                  "Médicos",
                  "2251–2252, 2231–2235",
                  "Clínicos, cirurgiões, especialistas",
                ],
                [
                  "Enfermagem",
                  "3222–3225, 2235",
                  "Enfermeiros, técnicos e auxiliares de enfermagem",
                ],
                [
                  "Odontologia",
                  "2232, 3224",
                  "Cirurgiões-dentistas, técnicos em saúde bucal",
                ],
                ["Farmácia", "2234, 3227", "Farmacêuticos e auxiliares"],
                [
                  "Diagnóstico/Imagem",
                  "3241–3242, 2236",
                  "Técnicos em radiologia, biomédicos, laboratoristas",
                ],
                [
                  "ACS/Endemias",
                  "5151–5152",
                  "Agentes Comunitários de Saúde, agentes de endemias",
                ],
                [
                  "Transporte/Urgência",
                  "5162–5163",
                  "Socorristas, condutores de ambulância",
                ],
                [
                  "Admin/Gestão",
                  "4110–4130",
                  "Auxiliares administrativos, recepcionistas",
                ],
                [
                  "Serv. Gerais",
                  "5143, 7100–7200",
                  "Higienização, limpeza, manutenção",
                ],
                [
                  "Outros (Sup.)",
                  "2030, 2040",
                  "Psicólogos, fisioterapeutas, nutricionistas",
                ],
                [
                  "Outros",
                  "Demais",
                  "Ocupações não classificadas nas anteriores",
                ],
              ]}
            />

            <SubTitle>Indicadores calculados</SubTitle>
            <DataTable
              rows={[
                ["Indicador", "Fórmula"],
                [
                  "Unidades atingidas",
                  <span key="u">
                    <Math tex={"N_a = \\sum_k \\chi_k"} /> (CNES dentro da
                    mancha)
                  </span>,
                ],
                [
                  "Profissionais afetados",
                  <span key="p">
                    <Math
                      tex={
                        "P_a = \\sum_k \\sum_c \\text{staff}_{k,c} \\cdot \\chi_k"
                      }
                    />{" "}
                    (soma por categoria CBO)
                  </span>,
                ],
              ]}
            />

            <Note type="info">
              A estimativa da <strong>perda de produção SUS</strong> (valor não
              realizado de procedimentos ambulatoriais e internações durante a
              interrupção) está na{" "}
              <a
                href="#danos"
                className="font-semibold text-[#1E404A] underline-offset-4 hover:underline"
              >
                Seção 10: Perdas Operacionais
              </a>
              .
            </Note>

            <SubTitle>Origem dos dados</SubTitle>
            <DataTable
              rows={[
                ["Fonte", "Referência temporal", "Variáveis"],
                [
                  "CNES (DataSUS)",
                  "Abril/2024",
                  "co_cnes, tipo de unidade, lat/lon, vínculos por CBO",
                ],
                [
                  "SIA/SIH (DataSUS)",
                  "Jan–Jul/2024",
                  "Produção ambulatorial (SIA) e hospitalar (SIH) por CNES",
                ],
              ]}
            />
            <SectionSources
              links={[
                ["CNES: DataSUS", "https://cnes.datasus.gov.br"],
                [
                  "DataSUS: Produção Hospitalar SIH/SUS",
                  "https://datasus.saude.gov.br/acesso-a-informacao/producao-hospitalar-sih-sus",
                ],
                [
                  "DataSUS: Produção Ambulatorial SIA/SUS",
                  "https://datasus.saude.gov.br/acesso-a-informacao/producao-ambulatorial-sia-sus",
                ],
              ]}
            />
          </Section>

          {/* ═══ 7. PATRIMÔNIO HISTÓRICO ═══ */}
          <Section id="patrimonio" num="7" title="Patrimônio Histórico">
            <p>
              Cada feição é um bem patrimonial (ponto) com <code>Nome</code>,{" "}
              <code>ENDEREÇO</code> e <code>Tipologia</code>, do Levantamento de
              Patrimônio Histórico de Rio Grande/RS (355 pontos), selecionado
              pela mesma junção ponto-em-polígono das demais camadas de ponto.
            </p>
            <p>
              O campo <code>Tipologia</code> é normalizado no cliente removendo
              o prefixo numérico de classificação (ex.: &quot;6- Arquitetura
              Civil Privada&quot; → &quot;Arquitetura Civil Privada&quot;), de
              modo que categorias duplicadas por prefixo sejam agregadas.
            </p>
            <SubTitle>Georreferenciação</SubTitle>
            <p>
              Cada bem do levantamento é representado por um ponto (WGS 84),
              identificado por um código (<code>Label</code>, ex.:{" "}
              <code>PRS/03-0007.00001</code>) e associado ao endereço textual (
              <code>ENDEREÇO</code>, ex.: &quot;Rua General Abreu, 80&quot;).
            </p>
            <MathBlock
              exprs={[
                {
                  tex: "\\text{Total} = |\\hat{N}| \\qquad T_k = |\\{i \\in \\hat{N} : \\text{tipologia}_i = k\\}| \\qquad \\%\\,\\text{atingido} = \\frac{|\\hat{N}|}{|N|} \\times 100",
                },
              ]}
            />
            <SectionSources
              links={[
                ["Levantamento de Patrimônio Histórico: Rio Grande/RS", ""],
              ]}
            />
          </Section>

          {/* ═══ 8. INFRAESTRUTURA ═══ */}
          <Section id="infraestrutura" num="8" title="Infraestrutura Urbana">
            <p>
              As camadas de Logradouros, Quadras e Terrenos são fornecidas pela
              Prefeitura Municipal de Rio Grande, em formato vetorial. Terrenos
              (~28 MB) solicita confirmação do usuário antes do carregamento por
              conta do tamanho do arquivo.
            </p>
            <SubTitle>Logradouros</SubTitle>
            <p>
              A chave de deduplicação para ruas únicas é o par (
              <code>tipo</code>, <code>nome</code>):
            </p>
            <MathBlock
              exprs={[
                {
                  label: "Ruas únicas",
                  tex: "R = |\\{(t_i, n_i) : i \\in \\hat{N}\\}|",
                },
                {
                  label: "Flags binários",
                  tex: "F_s = |\\{i \\in \\hat{N} : s_i = 1\\}|,\\quad s \\in \\{\\text{drenagem}, \\text{iluminacao}\\}",
                },
              ]}
            />
            <SubTitle>Quadras e Terrenos</SubTitle>
            <p>
              Contagem simples de quadras; para terrenos, os atributos de
              saneamento (<code>agua</code>, <code>coleta_lix</code>,{" "}
              <code>esgoto_plu</code>, <code>condominio</code>) são flags
              binários:
            </p>
            <MathBlock
              exprs={[
                {
                  tex: "\\text{Quadras} = |\\hat{N}| \\qquad F_s = |\\{i \\in \\hat{N} : s_i = 1\\}|",
                },
              ]}
            />
            <Note type="info">
              O tipo de esgoto (<code>esgoto_clo</code>) é verificado por
              equivalência de string: cloacal:{" "}
              <code>&quot;esgoto_cloacal&quot;</code>,{" "}
              <code>&quot;cloacal&quot;</code>, <code>&quot;1&quot;</code>;
              fossa: <code>&quot;fossa_septica&quot;</code>,{" "}
              <code>&quot;fossa&quot;</code>.
            </Note>
            <SubTitle>Métricas calculadas</SubTitle>
            <ul className="list-inside list-disc space-y-1.5 text-sm">
              <li>
                <strong>Segmentos atingidos</strong>: contagem de trechos de
                logradouro com interseção com a mancha.
              </li>
              <li>
                <strong>Ruas únicas</strong>: deduplicação de segmentos do mesmo
                logradouro pelo par (tipo, nome).
              </li>
              <li>
                <strong>Contagem atingida</strong> (Quadras/Terrenos): número de
                polígonos com interseção com a mancha.
              </li>
              <li>
                <strong>Percentual atingido</strong>: razão entre o total
                atingido e o total da camada no município.
              </li>
            </ul>
            <SubTitle>Origem dos dados</SubTitle>
            <DataTable
              rows={[
                ["Fonte", "CRS de origem", "Camadas"],
                [
                  "Prefeitura Municipal de Rio Grande",
                  "SIRGAS 2000 / UTM 22S (EPSG:31982)",
                  "Logradouros, Quadras, Terrenos",
                ],
              ]}
            />
            <p className="text-[12px] text-slate-500">
              Os shapefiles da prefeitura chegam em EPSG:31982 e são
              reprojetados para EPSG:4326 no pipeline Python antes da publicação
              como GeoJSON.
            </p>
            <SectionSources
              links={[["Prefeitura Municipal de Rio Grande", ""]]}
            />
          </Section>

          {/* ═══ 9. POPULAÇÃO ═══ */}
          <Section
            id="populacao"
            num="9"
            title="População Exposta: WorldPop 2024"
          >
            <p>
              A camada de população exposta quantifica o número de habitantes
              residentes dentro de cada mancha de inundação, cruzando as
              geometrias de flood extent com o raster de população do{" "}
              <ExtLink href="https://data.humdata.org/dataset/worldpop-population-counts-for-brazil">
                WorldPop
              </ExtLink>
              . Esse dado complementa as estimativas de perdas operacionais com a
              perspectiva humana direta:{" "}
              <strong>quantas pessoas vivem na área afetada</strong>.
            </p>

            <SubTitle>Fonte dos dados</SubTitle>
            <DataTable
              rows={[
                ["Atributo", "Valor"],
                [
                  "Produto",
                  "WorldPop Global Mosaic 2024: Population Counts (Constrained)",
                ],
                ["Sigla do arquivo", "bra_pop_2024_CN_100m_R2025A_v1.tif"],
                [
                  "Tipo",
                  "Constrained (CN), ajustado ao censo demográfico brasileiro",
                ],
                ["Resolução", "100 m × 100 m por pixel (~1 ha)"],
                ["CRS", "WGS 84 geográfico (EPSG:4326)"],
                ["Unidade", "Número de habitantes por pixel"],
                ["Cobertura", "Brasil inteiro"],
                ["Referência", "Estimativa para 2024 (Revisão A, 2025)"],
                [
                  "Repositório",
                  "Humanitarian Data Exchange (HDX), data.humdata.org",
                ],
              ]}
            />

            <SubTitle>Método de cálculo</SubTitle>
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-slate-700">
              <li>
                <strong>Limite municipal</strong>: polígono oficial obtido via
                API de malhas do IBGE, utilizado para recortar o raster ao
                território de cada município.
              </li>
              <li>
                <strong>População total municipal</strong>: recorte do raster
                pelo limite municipal; soma de todos os pixels com valor
                positivo (pixels sem dado excluídos).
              </li>
              <li>
                <strong>População atingida por cenário</strong>: recorte pela
                interseção da mancha de inundação com o limite municipal; mesma
                operação de soma. A interseção é necessária porque algumas
                manchas se estendem sobre municípios vizinhos (a mancha pode
                ultrapassar o limite municipal), cuja população não pertence ao município.
              </li>
              <li>
                <strong>Heatmap</strong>: raster recortado pelo limite municipal
                convertido a imagem colorida com paleta <em>plasma</em> em
                escala logarítmica, sobreposto ao mapa interativo para
                visualização da densidade populacional.
              </li>
            </ol>

            <SubTitle>Fórmulas</SubTitle>
            <MathBlock
              exprs={[
                {
                  label: "Pop. total",
                  tex: "P_{\\text{total}}(M) = \\sum_{(i,j)\\,\\in\\,\\text{Município}(M)} \\text{pop}_{ij}",
                },
                {
                  label: "Pop. atingida",
                  tex: "P_{\\text{atingida}}(M,C) = \\sum_{(i,j)\\,\\in\\,\\text{Mancha}(M,C)} \\text{pop}_{ij}",
                },
                {
                  label: "% exposta",
                  tex: "\\% = \\dfrac{P_{\\text{atingida}}}{P_{\\text{total}}} \\times 100",
                },
              ]}
            />

            <p className="text-[12px] text-slate-600">As limitações desta seção estão reunidas na{" "}<a href="#limitacoes" className="font-semibold underline underline-offset-4">Seção 13: Limitações</a>.</p>

            <SectionSources
              links={[
                [
                  "WorldPop (2025): Brazil Population Counts 100m 2024, constrained individual countries",
                  "https://data.humdata.org/dataset/worldpop-population-counts-for-brazil",
                ],
                [
                  "IBGE: Malhas Municipais (API v3)",
                  "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/",
                ],
                [
                  "rasterio: Raster I/O in Python",
                  "https://rasterio.readthedocs.io",
                ],
              ]}
            />

            <Note type="info">
              <strong>Procedência dos valores de Rio Grande:</strong> a
              população total (198.418 hab.) e a população atingida de
              Setembro de 2023, Maio de 2024 e Maio de 2024 + 50% vêm de
              uma base externa ao CIEX, calculadas sobre o raster de 100 m descrito
              acima. O cenário de 16/05/2024 é estimado (veja abaixo). Um teste
              com o raster WorldPop de densidade a ~1 km
              (<code>scripts/gerar_populacao_atingida.py</code>) foi
              descartado: com pixels de 1 km², manchas pequenas dependem de
              poucos pixels e o resultado diverge muito do valor exato
              (Setembro de 2023 saía 15,5% contra 4,0%).
            </Note>

            <Note type="info">
              <strong>Particularidades do Dashboard CIEX:</strong> os valores de
              população total e atingida por cenário são pré-computados offline
              e servidos em <code>populacao_atingida.json</code>; o heatmap é a
              imagem <code>populacao.png</code>, posicionada no mapa pelas
              quatro coordenadas de canto do JSON. O KPI é lido do JSON, sem
              recálculo no cliente.
            </Note>
            <SubTitle>Simulações de intervenção</SubTitle>
            <p>
              A população atingida <strong>não foi calculada</strong> para as 12 simulações com intervenção: o raster de
              densidade populacional não está disponível e o método foi descartado na auditoria de 2026-11-08. Por isso o
              Painel mostra &ldquo;não calculada&rdquo; nesse cartão.
            </p>

            <SubTitle>Cenário combinado: estimativa por proxy</SubTitle>
            <p>
              Para o cenário Nível da Lagoa + Chuva Acumulada não há valor
              exato, então a população atingida foi <strong>estimada</strong> a
              partir do raster de população já renderizado
              (<code>populacao.png</code>): o canal alfa da imagem correlaciona
              quase perfeitamente (r ≈ 0,998, testado empiricamente) com a
              posição de cada pixel na rampa de cor do heatmap, uma proxy
              contínua e monotônica da densidade populacional. O alfa é usado
              como peso por pixel, e o resultado é dividido por um fator de
              calibração <em>k</em>, medido nos três cenários que têm valor
              exato (a proxy sempre subestima: razões de 0,52 a 0,61 contra o
              valor exato, <em>k</em> = 0,545 pela razão das somas):
            </p>
            <MathBlock
              exprs={[
                {
                  tex: "\\text{pop\\_atingida} \\approx \\dfrac{1}{k} \\cdot \\text{pop\\_total} \\times \\frac{\\sum_{\\text{pixel} \\,\\in\\, \\text{mancha}} \\text{alfa}}{\\sum_{\\text{pixel}} \\text{alfa}}",
                },
              ]}
            />
            <Note type="warning">
              Estimativa: 18.000 habitantes (9,1%), com faixa de 15.900 a
              19.000 conforme a razão usada na calibração (0,52 a 0,61). É uma
              aproximação, sujeita à quantização de 256 níveis do PNG, não o
              mesmo método (resolução maior) dos demais cenários.
            </Note>
          </Section>

          {/* ═══ 10. DANOS OPERACIONAIS ═══ */}
          <Section
            id="danos"
            num="10"
            title="Perdas Operacionais: Metodologia DaLA"
          >
            <p>
              A estimativa de perdas econômicas segue a metodologia{" "}
              <strong>DaLA (Damage and Loss Assessment)</strong>, desenvolvida
              pela CEPAL em parceria com o Banco Mundial, aplicada pela
              CEPAL na avaliação das enchentes RS/2024. O DaLA distingue dois
              conceitos:
            </p>
            <DataTable
              rows={[
                ["Conceito", "Definição", "Exemplo"],
                [
                  "Danos",
                  "Destruição total ou parcial de ativos físicos (estoque)",
                  "Edificação destruída, equipamento perdido",
                ],
                [
                  "Perdas",
                  "Fluxo de produção ou serviço não realizado durante a interrupção",
                  "VAB não gerado, aulas não ministradas, consultas não realizadas",
                ],
              ]}
            />
            <p>
              Este painel estima as <strong>perdas operacionais</strong>: o
              fluxo econômico que deixou de ocorrer. Os danos físicos (estoque)
              são tratados à parte, como exposição por cota; ver{" "}
              <a
                href="#dano-fisico"
                className="font-semibold text-[#1E404A] underline-offset-4 hover:underline"
              >
                Seção 11: Danos Físicos
              </a>
              .
            </p>

            <SubTitle>Curva de Recuperação Linear (DaLA)</SubTitle>
            <p>
              A produção não se recupera instantaneamente após o evento. O DaLA
              modela a recuperação como uma função linear: durante a{" "}
              <strong>fase aguda</strong> (d<sub>a</sub> dias) a capacidade
              produtiva é zero; durante a <strong>fase de recuperação</strong>{" "}
              (d<sub>r</sub> dias) ela retorna gradualmente, atingindo plena
              capacidade ao final. A perda integrada equivale a d<sub>a</sub>{" "}
              dias de produção zero mais d<sub>r</sub>/2 dias de produção
              perdida (média de 50% do fluxo durante a recuperação):
            </p>
            <MathBlock
              exprs={[
                {
                  label: "Dias efetivos perdidos",
                  tex: "d_{\\text{ef}} = d_a + \\dfrac{d_r}{2}",
                },
                {
                  label: "Fator de interrupção",
                  tex: "f = \\dfrac{d_{\\text{ef}}}{365} \\in (0,\\,1)",
                },
              ]}
            />
            <DataTable
              rows={[
                [
                  "Período",
                  "Fase aguda (dₐ)",
                  "Recuperação (dᵣ)",
                  "Dias ef.",
                  "f",
                  "Base",
                ],
                [
                  "Maio 2024",
                  "30 dias",
                  "60 dias",
                  "60 dias",
                  "0,1644",
                  "DaLA RS (CEPAL, nov. 2024)",
                ],
                [
                  "Setembro 2023",
                  "15 dias",
                  "30 dias",
                  "30 dias",
                  "0,0822",
                  "DaLA RS (CEPAL, nov. 2024)",
                ],
              ]}
            />
            <Note type="info">
              A análise de sensibilidade do painel permite testar d<sub>ef</sub>{" "}
              = 30, 45 ou 60 dias para todos os cenários: ver{" "}
              <a
                href="/perdas-operacionais"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#1E404A] underline-offset-4 hover:underline"
              >
                página de Perdas Operacionais ↗
              </a>
              .
            </Note>

            <SubTitle>Componente 1 · Empresas: Perda de VAB</SubTitle>
            <p>
              A RAIS fornece a folha salarial mensal por estabelecimento, mas
              não o Valor Adicionado Bruto (VAB). O método utilizado é a{" "}
              <strong>inversão pelo labor share setorial</strong>: abordagem
              padrão da contabilidade nacional quando apenas o dado salarial
              está disponível (Karabarbounis &amp; Neiman, 2014; IBGE SCN).
            </p>
            <p>
              O <em>labor share</em> (LS) mede a fração do VAB de um setor que
              corresponde à remuneração do trabalho. Os valores são extraídos
              diretamente da{" "}
              <strong>
                Tabela 17 do Sistema de Contas Nacionais (IBGE SCN 2021)
              </strong>
              , que publica Remunerações totais e VAB a preços básicos por
              atividade econômica:
            </p>
            <MathBlock
              exprs={[
                {
                  label: "Labor share setorial",
                  tex: "LS_s = \\dfrac{\\text{Remunerações}_s}{\\text{VAB}_s} \\quad \\text{(fonte: IBGE SCN 2021, Tab17)}",
                },
                {
                  label: "VAB anual (est.)",
                  tex: "\\widehat{\\text{VAB}}_i = \\dfrac{w_{i,\\text{mensal}} \\times 12}{LS_s}",
                },
                {
                  label: "Perda operacional",
                  tex: "\\Delta_i = \\widehat{\\text{VAB}}_i \\times f",
                },
                {
                  label: "Total empresas",
                  tex: "L_{\\text{emp}} = \\sum_{i \\in \\text{atingidos}} \\Delta_i",
                },
              ]}
            />
            <DataTable
              rows={[
                [
                  "Setor (CNAE)",
                  "Labor share (LS)",
                  "Fonte (IBGE SCN 2021, Tab17)",
                ],
                [
                  "Agropecuária (01–03)",
                  "17,6%",
                  "SCN 2021, Tabela 17, linha Agropecuária",
                ],
                [
                  "Indústria (05–39)",
                  "33,8%",
                  "SCN 2021, Tabela 17, linha Indústria",
                ],
                [
                  "Adm. Pública (84)",
                  "88,3%",
                  "SCN 2021, Tab17 (VAB ≈ custo salarial na Adm. Pública)",
                ],
                [
                  "Serviços (demais, inclui Construção 41–43)",
                  "43,3%",
                  "SCN 2021, Tabela 17, linha Serviços",
                ],
              ]}
            />
            <Note type="info">
              Estabelecimentos CNAE 84 (Administração Pública) são incluídos no
              cálculo; ver a nota e as limitações sobre esse ponto na{" "}
              <a
                href="/perdas-operacionais#notas"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#1E404A] underline-offset-4 hover:underline"
              >
                página de Danos ↗
              </a>
              .
            </Note>

            <SubTitle>
              Componente 2 · Educação: Custo de Reposição FUNDEB
            </SubTitle>
            <p>
              A Lei de Diretrizes e Bases (LDB, Art. 24, I) exige mínimo de 200
              dias letivos por ano. Dias interrompidos por calamidade geram
              obrigação legal de reposição. O custo é estimado pelo Valor Anual
              por Aluno Total Mínimo (VAAT-MIN) do FUNDEB: dois componentes
              distintos, ambos com o mesmo custo unitário FUNDEB/aluno/dia:
            </p>
            <MathBlock
              exprs={[
                {
                  label: "Custo por aluno/dia",
                  tex: "c = \\dfrac{\\text{VAAT-MIN}}{D_{\\text{letivos}}} = \\dfrac{\\text{R}\\$\\,8.481{,}21}{200} = \\text{R}\\$\\,42{,}41/\\text{aluno/dia}",
                },
                {
                  label: "Perdas (serv. não prestado)",
                  tex: "P_{\\text{edu}} = c \\times N_{\\text{alunos}} \\times d_a",
                },
                {
                  label: "Custo adicional (reposição)",
                  tex: "C_{\\text{adic}} = c \\times N_{\\text{alunos}} \\times d_a",
                },
                {
                  label: "Total educação",
                  tex: "L_{\\text{edu}} = P_{\\text{edu}} + C_{\\text{adic}} = 2\\,c\\,N\\,d_a",
                },
              ]}
            />
            <p className="mt-1 text-[12px] text-slate-600">
              Usa <em>d</em>
              <sub>a</sub> (dias de fechamento real), não <em>d</em>
              <sub>ef</sub>, porque escolas são obrigadas a compensar 100% dos
              dias perdidos; não há recuperação parcial como em firmas.
            </p>
            <DataTable
              rows={[
                ["Parâmetro", "Valor", "Fonte"],
                [
                  "VAAT-MIN 2024",
                  "R$ 8.481,21",
                  "Portaria Interministerial MEC/MF nº 9, 28/08/2024",
                ],
                ["Dias letivos", "200/ano", "LDB, Art. 24, I"],
                ["dₐ (Maio 2024)", "30 dias", "DaLA RS (CEPAL, 2024)"],
                ["dₐ (Set. 2023)", "15 dias", "DaLA RS (CEPAL, 2024)"],
              ]}
            />

            <SubTitle>Componente 3 · Saúde: Perda de Produção SUS</SubTitle>
            <p>
              A perda de produção do SUS é estimada pela receita de
              procedimentos não realizada durante a interrupção. A produção de
              cada unidade CNES é apurada a partir de dois sistemas de
              informação do DataSUS:
            </p>
            <DataTable
              rows={[
                ["Sistema", "Sigla", "Conteúdo", "Granularidade"],
                [
                  "Sistema de Informações Ambulatoriais",
                  "SIA",
                  "Procedimentos ambulatoriais aprovados (consultas, exames, terapias): valor em R$ por competência mensal e por CNES",
                  "Mensal por CNES",
                ],
                [
                  "Sistema de Informações Hospitalares",
                  "SIH",
                  "Autorizações de Internação Hospitalar (AIH) aprovadas: valor total das AIH pagas por competência mensal e por CNES",
                  "Mensal por CNES",
                ],
              ]}
            />
            <p>
              A produção disponível cobre <strong>7 meses</strong> (competências
              mais recentes disponíveis no DataSUS no momento da extração). Para
              obter uma estimativa anual, aplica-se uma projeção linear
              proporcional:
            </p>
            <MathBlock
              exprs={[
                {
                  label: "Produção mensal (CNES k)",
                  tex: "P_{\\text{mensal},k} = \\dfrac{P_{\\text{SIA},k} + P_{\\text{SIH},k}}{7}",
                },
                {
                  label: "Produção anual",
                  tex: "P_k = P_{\\text{mensal},k} \\times 12",
                },
                {
                  label: "Perda saúde",
                  tex: "L_{\\text{sau}} = \\sum_{k \\in \\text{atingidos}} P_k \\times f",
                },
              ]}
            />

            <SubTitle>
              Componente 4 · Agricultura: Custo Direto de Produção
            </SubTitle>
            <MathBlock
              exprs={[
                {
                  label: "Perda agrícola",
                  tex: "L_{\\text{agr}} = \\sum_{c \\in \\text{culturas}} A_c\\,[\\text{ha}] \\times \\text{Coef}_c\\,[\\text{R}\\$/\\text{ha}]",
                },
              ]}
            />
            <p>
              Custo fixo por área, independente de <em>f</em> (não é um fluxo
              contínuo, mas um custo incorrido no momento do evento).
            </p>
            <DataTable
              rows={[
                ["Cultura", "Período", "Status", "Coef. (R$/ha)"],
                ["Soja", "Maio 2024", "Colhida (fev–abr/2024)", "R$ 1.100"],
                ["Arroz", "Maio 2024", "Colhido (fev–abr/2024)", "R$ 1.100"],
                [
                  "Outras Lavouras Temporárias",
                  "Maio 2024",
                  "Plantio inicial (mai/2024)",
                  "R$ 1.400",
                ],
                ["Soja", "Set. 2023", "Pré-plantio", "R$ 250"],
                ["Arroz", "Set. 2023", "Pré-plantio", "R$ 250"],
                [
                  "Outras Lavouras Temporárias",
                  "Set. 2023",
                  "Colheita (set–out/2023)",
                  "R$ 2.800",
                ],
              ]}
            />
            <p>
              Ver a delimitação espacial das áreas agrícolas na{" "}
              <a
                href="#agricultura"
                className="font-semibold text-[#1E404A] underline-offset-4 hover:underline"
              >
                Seção 4: Agricultura
              </a>
              .
            </p>

            <SubTitle>Perda total estimada</SubTitle>
            <MathBlock
              exprs={[
                {
                  label: "Total (por cenário)",
                  tex: "L_{\\text{total}} = L_{\\text{emp}} + L_{\\text{edu}} + L_{\\text{sau}} + L_{\\text{agr}}",
                },
              ]}
            />

            <SubTitle>Parâmetros consolidados</SubTitle>
            <DataTable
              rows={[
                ["Parâmetro", "Valor", "Fonte"],
                [
                  "VAAT-MIN FUNDEB 2024",
                  "R$ 8.481,21",
                  "Portaria Interministerial MEC/MF nº 9/2024",
                ],
                ["Dias letivos/ano", "200", "LDB Art. 24, I"],
                ["Labor share (Agropecuária)", "17,6%", "IBGE SCN 2021, Tab17"],
                ["Labor share (Indústria)", "33,8%", "IBGE SCN 2021, Tab17"],
                ["Labor share (Adm. Pública)", "88,3%", "IBGE SCN 2021, Tab17"],
                ["Labor share (Serviços)", "43,3%", "IBGE SCN 2021, Tab17"],
                ["Fase aguda (Maio 2024)", "30 dias", "DaLA RS (CEPAL, 2024)"],
                ["Recuperação (Maio 2024)", "60 dias", "DaLA RS (CEPAL, 2024)"],
                ["Fase aguda (Set. 2023)", "15 dias", "DaLA RS (CEPAL, 2024)"],
                ["Recuperação (Set. 2023)", "30 dias", "DaLA RS (CEPAL, 2024)"],
                ["Meses SIA/SIH disponíveis", "7 (jan–jul/24)", "DataSUS"],
              ]}
            />

            <SectionSources
              links={[
                [
                  "CEPAL (2024): Avaliação dos Efeitos e Impactos das Inundações no Rio Grande do Sul",
                  "https://www.cepal.org/pt-br/publicacoes/81035-avaliacao-efeitos-impactos-inundacoes-rio-grande-sul-novembro-2024",
                ],
                [
                  "PDNA Vol. A Guidelines (GFDRR/UNDP/BM, 2013)",
                  "https://www.gfdrr.org/sites/default/files/2017-09/PDNA-Volume-A.pdf",
                ],
                [
                  "IBGE: SCN 2021, Tabela 17 (Tab17.xls)",
                  "https://ftp.ibge.gov.br/Contas_Nacionais/Sistema_de_Contas_Nacionais/2021/tabelas_xls/sinoticas/",
                ],
                [
                  "Karabarbounis & Neiman (2014, QJE): The Global Decline of the Labor Share",
                  "https://doi.org/10.1093/qje/qjt032",
                ],
                [
                  "LDB: Lei nº 9.394/1996, Art. 24",
                  "https://www.planalto.gov.br/ccivil_03/leis/l9394.htm",
                ],
                [
                  "Portaria Interministerial MEC/MF nº 9, 28/08/2024 (VAAT-MIN FUNDEB 2024)",
                  "https://www.fnde.gov.br",
                ],
                ["CONAB: Preços Mínimos 2024", ""],
                [
                  "MapBiomas: Coleção 10",
                  "https://brasil.mapbiomas.org/downloads/mapas-para-download-geotiff/",
                ],
                ["FNDE: FUNDEB 2024", "https://www.fnde.gov.br"],
                [
                  "DataSUS: Produção Hospitalar SIH/SUS",
                  "https://datasus.saude.gov.br/acesso-a-informacao/producao-hospitalar-sih-sus",
                ],
                [
                  "DataSUS: Produção Ambulatorial SIA/SUS",
                  "https://datasus.saude.gov.br/acesso-a-informacao/producao-ambulatorial-sia-sus",
                ],
              ]}
            />
            <SubTitle>Notas de cálculo</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5">
              <li>
                <strong>Classificação por CNAE:</strong> o código CNAE é
                normalizado para 5 dígitos antes de ler a divisão (um CNAE
                inteiro como <code>1113</code> é a divisão 01, agropecuária, e
                não 11). Sem essa normalização, empresas agropecuárias seriam
                tratadas como indústria (labor share de 33,8% em vez de 17,6%) e
                o VAB ficaria subestimado.
              </li>
            </ul>
            <p className="text-[12px] text-slate-600">As limitações desta seção estão reunidas na{" "}<a href="#limitacoes" className="font-semibold underline underline-offset-4">Seção 13: Limitações</a>.</p>
          </Section>

          {/* ═══ 11. DANOS FÍSICOS ═══ */}
          <Section
            id="dano-fisico"
            num="11"
            title="Danos Físicos: Exposição por Cota"
          >
            <p>
              Os danos físicos (destruição de ativos, o <em>estoque</em> do
              DaLA) aparecem no painel como <strong>exposição por cota</strong>:
              o valor de reposição de tudo o que fica sob a água em cada cota do
              pico de 21/05/2024. É um <strong>teto</strong> do dano, não uma
              estimativa dele, e <strong>não deve ser somado</strong> aos Danos
              Operacionais (Seção 10), que medem produção e serviço
              interrompidos. Os resultados estão na aba{" "}
              <Link
                href="/danos-fisicos"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline-offset-4 hover:underline"
                style={{ color: PRIMARY }}
              >
                Danos Físicos ↗
              </Link>
              .
            </p>

            <SubTitle>Dados de entrada</SubTitle>
            <DataTable
              rows={[
                ["Item", "Descrição"],
                [
                  "Rasters por cota",
                  "Máscaras binárias (molhado/seco) do pico de 21/05/2024 e de níveis anteriores, união das bacias hidrográficas 1–5 e 7, malha de 1 m",
                ],
                [
                  "Cotas",
                  "1,00 / 1,50 / 2,00 / 2,50 / 2,6215 m (a última é o pico de 21/05/2024)",
                ],
                [
                  "Pontos",
                  "Empresas (RAIS), escolas (Censo Escolar) e unidades de saúde (CNES); pontos geocodificados fora do município são excluídos",
                ],
                [
                  "Agricultura",
                  "Área em hectares sob a água (MapBiomas), sem valor em R$",
                ],
              ]}
            />

            <SubTitle>Valor exposto atingido</SubTitle>
            <p>
              Cada ponto tem um valor de reposição estimado e conta como{" "}
              <em>atingido</em> quando está dentro da mancha daquela cota; entra
              com 100% do valor ou não entra. Para cada cota vale o máximo
              acumulado (a água de uma cota maior cobre pelo menos o que a menor
              cobria). O valor de reposição é a área estimada multiplicada pelo
              custo de construção (CUB/RS, Sinduscon-RS, dez/2024) e por um
              multiplicador que acrescenta o conteúdo (equipamentos, estoque) à
              estrutura: empresas 2,0, indústria 2,5, saúde 2,25 e educação 1,5
              (parâmetros do pipeline externo). A tabela abaixo mostra a área e
              o custo por metro quadrado, antes do multiplicador:
            </p>
            <DataTable
              rows={[
                ["Setor", "Área considerada", "Custo unitário"],
                [
                  "Empresas",
                  "9 m² por vínculo",
                  "R$ 2.604,24/m² (industrial: R$ 1.301,56/m²)",
                ],
                [
                  "Escolas",
                  "Escola padrão FNDE de 6 salas (853,2 m²), proporcional às salas equivalentes",
                  "R$ 2.995,52/m²",
                ],
                [
                  "Saúde",
                  "9 m² por pessoa (profissionais + leitos)",
                  "R$ 2.995,52/m²",
                ],
              ]}
            />

            <Note type="warning">
              <strong>Sem profundidade, sem R$ de dano.</strong> As máscaras de
              Rio Grande só dizem se o pixel está molhado, não a altura da água.
              Por isso o painel mostra a <strong>exposição</strong>: o valor de
              reposição de tudo o que fica sob a água em cada cota, com cada
              ponto molhado entrando por 100% do seu valor. Esse valor é um teto
              do dano, não uma estimativa dele, e o painel não mostra dano
              físico em R$.
            </Note>

            <p className="text-[12px] text-slate-600">As limitações desta seção estão reunidas na{" "}<a href="#limitacoes" className="font-semibold underline underline-offset-4">Seção 13: Limitações</a>.</p>

            <SectionSources
              links={[
                [
                  "Sinduscon-RS: Preços e Custos da Construção (CUB/RS)",
                  "https://sinduscon-rs.com.br",
                ],
                [
                  "FNDE: projeto padrão Escola 6 Salas",
                  "https://www.gov.br/fnde",
                ],
              ]}
            />
          </Section>

          {/* ═══ 12. CENÁRIOS DE INTERVENÇÃO E DANO EVITADO ═══ */}
          <Section
            id="dano-evitado"
            num="12"
            title="Cenários de Intervenção e Dano Evitado"
          >
            <ConteudoDanoEvitado comparativo={comparativo} />
          </Section>

          {/* ═══ 13. LIMITAÇÕES ═══ */}
          <Section id="limitacoes" num="13" title="Limitações">
            <p>
              Esta seção reúne <strong>todas as limitações</strong> dos
              resultados do painel, organizadas em quatro eixos: por{" "}
              <a href="#lim-cenarios" className="font-semibold underline underline-offset-4">cenário</a>, por{" "}
              <a href="#lim-metodologia" className="font-semibold underline underline-offset-4">metodologia</a>, por{" "}
              <a href="#lim-municipio" className="font-semibold underline underline-offset-4">município</a> e pelas{" "}<a href="#lim-intervencoes" className="font-semibold underline underline-offset-4">simulações de intervenção</a>. As páginas de Perdas Operacionais e Danos Físicos
              não repetem estas ressalvas.
            </p>

            <h3 id="lim-cenarios" className="mt-8 scroll-mt-24 text-base font-black" style={{ color: PRIMARY }}>
              A. Por cenário
            </h3>

            <p className="text-sm text-slate-700">
              <strong>Cenários independentes.</strong> Maio 2024 está contido em Maio 2024 + 50% sem exceções
              (empresas, escolas, unidades de saúde e patrimônio), como se espera de um mesmo evento com a água
              mais alta. Setembro 2023 e o 16/05/2024 são eventos diferentes e não precisam ser subconjuntos de
              nenhum outro: por exemplo, uma empresa (id 48100) está em Setembro 2023 e não em Maio 2024, a cerca
              de 4 m da borda das duas manchas, e 99 empresas de Maio 2024 ficam fora do 16/05.
            </p>

            <SubTitle>Cenário Setembro 2023</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>A mancha e os pontos atingidos de empresas, educação, saúde, logradouros e agricultura vêm de uma fonte externa ao CIEX; patrimônio, quadras, terrenos e cobertura da terra são gerados pelo CIEX.</li>
              <li>O período de interrupção é menor que o de Maio: 15 dias agudos + 30 de recuperação a 50% (30 dias efetivos, contra 60). Os totais de perdas (R$ 12,9 mi) não são comparáveis diretamente com os de Maio.</li>
              <li>As perdas de produção do SUS e as agrícolas resultam em R$ 0 neste cenário. Na agricultura, os fragmentos atingidos (0,04 a 0,11 ha) ficam abaixo do filtro de ruído de 0,5 ha, e o mapa mostra &ldquo;Nenhuma cultura atingida&rdquo;.</li>
              <li>A população atingida (7.844 hab., 4,0%) é de uma base externa, calculada sobre o raster de 100 m.</li>
            </ul>

            <SubTitle>Cenário Maio 2024</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>A mancha tem 8,25 km² e foi atualizada com geometria mais detalhada na fonte externa. Pontos a menos de 10 m da borda mudam de classificação conforme a simplificação do polígono: por exemplo, 601 empresas estão gravadas como atingidas, contra 556 pela interseção com a mancha atual, e 46 das 53 de diferença estão num único ponto.</li>
              <li>Patrimônio, cobertura da terra e agricultura atingidos vêm de conversores do CIEX e podem divergir da mancha da fonte externa na borda.</li>
              <li>A Secretaria Municipal de Saúde (CNES 6303609) teve a coordenada corrigida pelo CIEX e, com isso, sai deste cenário.</li>
              <li>Perda agrícola de R$ 0 (mesma razão do filtro de 0,5 ha). A perda é calculada para 60 dias efetivos (30 agudos + 60 de recuperação a 50%); a página de Danos permite 30, 45 e 60 dias, e só a parcela proporcional à duração muda (a agrícola não).</li>
              <li>A população atingida (23.058 hab., 11,6%) é de uma base externa.</li>
            </ul>

            <SubTitle>Cenário Maio 2024 + 50%</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>O nome &ldquo;+50%&rdquo; é herdado da fonte dos dados. A mancha corresponde à água 60 cm mais alta (shapefile <code>CEN_MAI24_MAIS60CM</code>) e tem 59,4 km², cerca de 7 vezes a de Maio 2024. É um cenário de sensibilidade, não uma previsão.</li>
              <li>Atinge 2.400 das 3.220 empresas (75%). As 777 empresas da pilha de geocodificação (veja o eixo Município) entram aqui só por causa do ponto falso em que foram colocadas, de modo que o total de R$ 557,8 mi (empresas: R$ 473,9 mi) é o mais sensível a esse erro.</li>
              <li>A área agrícola atingida medida no mapa (53,4 ha) difere em cerca de 7% das estatísticas externas (49,7 ha), que são as usadas no cálculo das perdas.</li>
              <li>A população atingida (80.124 hab., 40,4%) é de uma base externa.</li>
            </ul>

            <SubTitle>Cenário Nível da Lagoa + Chuva Acumulada – 16/05/2024</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>Cenário exclusivo do CIEX: a atualização dos dados externos nunca o sobrescreve e não há totais externos para conferir.</li>
              <li>A mancha é a união de duas simulações com unidades diferentes: a Lagoa em centímetros (≥ 45 cm) e a Chuva Acumulada em unidade do modelo (faixa 86–253; valores ≥ 254 são tratados como água pré-existente e ficam fora). O corte de 86 corresponde a cerca de 10 cm segundo a fonte, não a uma conversão verificada.</li>
              <li>A mancha publicada (6,35 km²) é cerca de 10% maior que o limiar bruto (5,76 km²), por causa do fechamento de vãos de até ~16 m. Antes da correção da redução de resolução, era 39% maior.</li>
              <li><strong>Sensibilidade dos limiares.</strong> Sobre os rasters brutos, subir o limiar da Lagoa de 45 para 60 cm reduz a mancha em ~9% (para 100 cm, ~34%) e baixá-lo para 30 cm a aumenta em ~6,5%. O limite inferior da faixa da Chuva (70 a 120) muda a mancha em menos de 0,3%, mas incluir os valores &ge; 254, hoje tratados como água pré-existente, a multiplicaria por ~3 (de 5,8 para 17,9 km²): a exclusão dos 254+ é uma decisão de modelagem com grande efeito e não é confirmada pela fonte. Tabela completa em <code>docs/sensibilidade-limiares-mancha-16-05.md</code>.</li>
              <li>As mesmas 777 empresas da pilha de geocodificação entram aqui pelo ponto falso, e o VAB de empresas (R$ 379,0 mi) depende delas.</li>
              <li>A população atingida (18.000 hab., 9,1%) é uma <strong>estimativa</strong> por proxy do heatmap, calibrada nos três cenários com valor exato; a faixa de incerteza é de 15.900 a 19.000 hab.</li>
              <li>As perdas agrícolas são R$ 0 (nenhuma cultura acima do filtro de 0,5 ha na mancha).</li>
            </ul>

            <SubTitle>Todas as cotas</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>Mostra só exposição de empresas, educação e saúde (Danos Físicos), com cotas de 1,00 a 2,6215 m do pico de 21/05/2024. Cobertura da terra, agricultura e infraestrutura não têm exposição por cota no mapa.</li>
              <li>As máscaras são molhado/seco, sem profundidade: não existe altura da água, faixa de profundidade nem profundidade média.</li>
              <li>O índice de cota de cada ponto vem da fonte externa e concorda com as máscaras brutas por cota em 94% das empresas, 97% das escolas e 96% das unidades de saúde; a diferença restante vem da resolução e da posição exata de cada ponto. A imagem do mapa (4,7 × 5,5 m por célula) foi regenerada a partir das máscaras de 1 m e confere com a área declarada por cota (7,0 km² no pico, contra 6,9 km² nas máscaras).</li>
              <li>Nenhuma área agrícola mapeada fica sob a água em nenhuma das cotas.</li>
            </ul>

            <h3 id="lim-metodologia" className="mt-10 scroll-mt-24 text-base font-black" style={{ color: PRIMARY }}>
              B. Por metodologia
            </h3>

            <SubTitle>Sobreposição espacial (Seção 2)</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>Um ponto é atingido se está dentro da mancha; pontos a poucos metros da borda dependem da simplificação do polígono (diferenças de 0,5 a 10 m foram medidas).</li>
              <li>Quadras e terrenos entram inteiros, e logradouros, agricultura e cobertura da terra são recortados pela mancha; por isso as áreas dos dois grupos não são a mesma grandeza.</li>
              <li>O pipeline externo calcula áreas em EPSG:32722 e descarta fragmentos menores que 5 m²; os scripts do CIEX usam EPSG:31982 e não aplicam essa regra. A diferença é desprezível nessa escala.</li>
            </ul>

            <SubTitle>Empresas e VAB (Seção 3)</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>Só entram vínculos formais da RAIS; a economia informal fica de fora.</li>
              <li>O VAB perdido é uma estimativa por <em>labor share</em> setorial agregado (massa salarial ÷ labor share), não o faturamento de cada empresa. A construção (CNAE 41–43) usa o mesmo labor share de serviços (43,3%).</li>
              <li>A Administração Pública (CNAE 84) é incluída com labor share de 88,3%: são 5 estabelecimentos, 24% da massa salarial (R$ 26,2 mi/mês) e cerca de R$ 58,5 mi dos R$ 557,8 mi de Maio 2024 + 50% (60 dias). Os salários continuam sendo pagos, então essa parcela mede custo de oportunidade, não produção comercializável perdida; quem quiser excluí-la deve subtrair o CNAE 84.</li>
              <li>A localização vem de geocodificação por endereço, com erros (veja o eixo Município).</li>
            </ul>

            <SubTitle>Agricultura e cobertura da terra (Seção 4)</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>Base MapBiomas Coleção 10 (2024), com pixels de 30 m. O ruído de vetorização (fragmentos &lt; 0,5 ha) é removido antes de dissolver por classe, e a suavização das bordas deixa a área de cada classe dentro de ±3% da área do raster.</li>
              <li>As perdas agrícolas cobrem só o custo direto de produção no estágio da cultura (R$/ha por cultura e período). Ficam fora a variação de preço, contratos, renda de safras seguintes, recuperação de solo e pecuária. Não dependem da duração da interrupção.</li>
              <li>Cenários com poucos hectares atingidos podem zerar depois do filtro de 0,5 ha.</li>
            </ul>

            <SubTitle>Educação (Seção 5)</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li><strong>Matrículas de educação especial:</strong> as seis modalidades (infantil, fundamental, médio, profissional, EJA e especial) são somadas. Nas 140 escolas de Rio Grande, o total declarado na base é exatamente essa soma, então não há contagem repetida dentro dos dados; a educação especial responde por 7% a 10% das matrículas atingidas.</li>
              <li><strong>Matrículas privadas:</strong> o VAAT-MIN do FUNDEB financia a rede pública, mas o cálculo usa as matrículas de todas as escolas atingidas, inclusive as privadas, que são de 20% a 27% do total atingido nos quatro cenários. A perda educacional está superestimada nessa proporção se o objetivo for só o custo público.</li>
              <li><strong>Dias letivos × dias corridos:</strong> o valor diário é o VAAT-MIN dividido por 200 dias letivos, mas é multiplicado pelos dias corridos de interrupção (30 agudos, 15 em Setembro de 2023). Se esses dias forem corridos, o correto seria dividir por 365; o método segue o da fonte dos dados, que usa 200.</li>
              <li><strong>Educação somada em dobro por construção:</strong> a perda (serviço educacional não prestado) e o custo adicional (reposição obrigatória das aulas, LDB art. 24, I) têm o mesmo valor e ambos entram no total, o que dobra a educação em relação a um único componente (as duas parcelas somam de 12,6% a 20,9% do total conforme o cenário).</li>
            </ul>

            <SubTitle>Saúde (Seção 6)</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>A perda é a produção SUS anualizada (SIA + SIH) de cada unidade; unidades sem produção SUS registrada contribuem R$ 0, e a produção que não é do SUS não entra no cálculo.</li>
              <li>O agrupamento dos profissionais por CBO é feito no pipeline externo; o CIEX recebe as 11 colunas já somadas e não o refaz.</li>
              <li>O CNES informa leitos totais; não há separação entre leitos SUS e demais.</li>
            </ul>

            <SubTitle>Infraestrutura e patrimônio (Seções 7 e 8)</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>Os atributos de logradouros e terrenos (drenagem, iluminação, água, esgoto) vêm do cadastro da Prefeitura de Rio Grande tal como informado.</li>
              <li>A contagem de ruas únicas deduplica segmentos pelo par (tipo, nome); ruas homônimas em bairros diferentes contam como uma.</li>
              <li>Prédios públicos e segurança foram retirados do painel e não têm resultado por cenário.</li>
            </ul>

            <SubTitle>População exposta (Seção 9)</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>Os modelos WorldPop são estimativas estatísticas baseadas em dados censitários de 2022 e covariáveis geoespaciais (construções, uso do solo, luminosidade noturna); não capturam migrações pós-enchente nem desalojamentos.</li>
              <li>A resolução de 100 m é adequada para análises municipais, mas pode superestimar a população em áreas de uso misto (industrial/comercial) onde residentes não existem.</li>
              <li>A população <em>exposta</em> (dentro da mancha) não equivale à população <em>afetada</em>: parte das edificações pode ter sido evacuada antes da inundação ou estar em pavimentos superiores.</li>
              <li>Um teste com o raster de densidade a ~1 km foi descartado, porque manchas pequenas dependem de poucos pixels (Setembro de 2023 saía 15,5% contra 4,0% exato).</li>
            </ul>

            <SubTitle>Perdas Operacionais (Seção 10)</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>O DaLA estima fluxo de produção e serviço interrompido, não danos ao estoque (edificações, equipamentos): é uma metodologia de perdas, diferente de dano físico.</li>
              <li>A curva de recuperação é linear (fase aguda a 100% + recuperação a 50%) e os parâmetros (labor share, VAAT-MIN, coeficientes agrícolas) vêm de fontes externas aplicadas igualmente a todos os cenários.</li>
              <li>Os cenários são eventos independentes; os valores não devem ser somados entre si nem aos Danos Físicos.</li>
              <li>A classificação por CNAE é normalizada para 5 dígitos antes de ler a divisão (um CNAE inteiro como 1113 é a divisão 01, agropecuária); sem isso, o VAB agropecuário seria subestimado.</li>
            </ul>

            <SubTitle>Danos Físicos: exposição por cota (Seção 11)</SubTitle>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li><strong>Exposição, não dano.</strong> Todo ponto dentro da mancha conta com 100% do seu valor de reposição; não se estima a fração destruída. O dano real fica entre zero e esse valor, que é um teto.</li>
              <li><strong>Valor de reposição é estimativa</strong> (área por proxy × CUB/RS × multiplicador de conteúdo: 9 m² por pessoa, salas por matrícula; multiplicadores 2,0, 2,5, 2,25 e 1,5), não cadastro nem valor de mercado.</li>
              <li><strong>Setores não disjuntos:</strong> RAIS, CNES e Censo Escolar são fontes distintas e o mesmo estabelecimento pode aparecer em mais de uma; a soma dos três setores não é de ativos disjuntos.</li>
              <li><strong>Rasters não monotônicos entre cotas:</strong> aplica-se o máximo acumulado por ponto (e por pixel, na agricultura), com amostragem por pixel de ~1 m (vizinho mais próximo).</li>
              <li><strong>Agricultura:</strong> área, não valor, sobre o MapBiomas 2024 e a grade do raster; bordas de polígono podem ter erro de até um pixel e a área fora da grade conta como seca.</li>
              <li>Pontos fora da área coberta pelos rasters contam como não atingidos, o que subestima a exposição.</li>
            </ul>

            <h3 id="lim-municipio" className="mt-10 scroll-mt-24 text-base font-black" style={{ color: PRIMARY }}>
              C. Por município: Rio Grande
            </h3>
            <ul className="ml-1 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li><strong>Pilhas de geocodificação.</strong> 777 das 3.220 empresas (24%, 14.854 de 43.568 vínculos), 40 de 140 escolas e 164 de 462 unidades de saúde estão no mesmo ponto, apesar de terem ruas e CEPs diferentes (as empresas vêm de 395 ruas e 106 bairros): é o ponto em que o geocodificador cai quando não acha o endereço. Esse ponto fica fora da mancha em Setembro 2023 e Maio 2024 e dentro em Maio 2024 + 50% e 16/05/2024, e por isso os totais desses dois cenários são os mais sensíveis; no Danos Físicos, o valor sobe em degraus quando cada pilha entra de uma vez. A base é mantida como reportada pela fonte; uma proposta de realocação por CEP e por rua e bairro está em <code>docs/realocacao-pilhas-geocodificacao.csv</code> para a fonte aplicar no geocodificador.</li>
              <li><strong>Pontos fora do município.</strong> 102 empresas, 1 escola e 5 unidades de saúde estão fora do município ou do raster e são excluídas da exposição por cota.</li>
              <li><strong>Sem profundidade.</strong> Rio Grande não tem raster de profundidade por cota, só máscaras molhado/seco; por isso não há dano físico em R$.</li>
              <li><strong>Datas das bases.</strong> RAIS 2023, Censo Escolar 2024, CNES de abril/2024, MapBiomas 2024 e população total de 198.418 habitantes. Os cenários de 2023 usam as mesmas bases mais recentes (Setembro 2023 usa o Censo Escolar 2024 e o CNES de abril/2024), e a produção do SUS (jan–jul/2024) inclui o período da cheia de maio; nenhum dado é do ano do evento. Mudanças posteriores a essas datas não estão refletidas.</li>
              <li><strong>Qualidade dos cadastros.</strong> <code>staff_diag_lab_imagem</code> é zero nas 462 unidades de saúde (nenhum profissional de diagnóstico e imagem registrado); 87 códigos CNES têm 6 dígitos (zero à esquerda perdido, tratado com preenchimento no cálculo das perdas); 42% das quadras não têm número válido (marcador &ldquo;NULLnn&rdquo;); o campo <code>Nome</code> é nulo em 211 dos 355 bens do patrimônio.</li>
              <li><strong>Origem dos dados.</strong> Parte dos dados vem de uma fonte externa e é copiada sem alteração, exceto a coordenada da Secretaria Municipal de Saúde, corrigida pelo CIEX.</li>
            </ul>
            <h3 id="lim-intervencoes" className="mt-10 scroll-mt-24 text-base font-black" style={{ color: PRIMARY }}>
              D. Cenários de intervenção
            </h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
              <li><strong>Sem curva de dano.</strong> As simulações têm profundidade, mas não há curva de dano em função dela: o dano físico em R$ não é estimado, só a exposição (um teto), e exposição evitada não é dano evitado.</li>
              <li><strong>Outro modelo.</strong> As simulações (TELEMAC) não são comparáveis às manchas de Setembro 2023, Maio 2024 e 16/05/2024 (sobreposição de cerca de 50%; totais muito diferentes). Compare uma intervenção só com a base do mesmo evento.</li>
              <li><strong>Efeito das barragens.</strong> Diques + barragens difere de só diques em até cerca de 2% da área atingida, e em 29/09/2023 a variante com barragens tem área ligeiramente maior. Diferenças desse tamanho podem estar dentro da incerteza do modelo, que não foi estimada.</li>
              <li><strong>Parâmetros DaLA.</strong> Os eventos de 29/11/2023 e 28/06/2025 usam os parâmetros de maio/2024 (premissa); os valores em R$ mudam se houver parâmetros próprios.</li>
              <li><strong>Datas das bases.</strong> RAIS 2023, Censo Escolar 2024 e CNES de abril/2024 são aplicados a eventos de 2023 a 2025: em 28/06/2025 as bases são anteriores ao evento; em 2023, posteriores.</li>
              <li><strong>População.</strong> Não calculada para as simulações (o raster de população não está disponível e o método foi descartado na auditoria de 2026-11-08).</li>
              <li><strong>Limiar.</strong> A área atingida usa profundidade ≥ 10 cm; o 16/05 usa 45 cm para o nível da lagoa. Lâminas de 10 a 44 cm entram nas simulações e a faixa é rasa.</li>
            </ul>
          </Section>


          {/* ═══ 14. FONTES ═══ */}
          <Section id="fontes" num="14" title="Fontes e Referências">
            <div className="space-y-4">
              <RefBlock title="Manchas de Inundação">
                <RefItem
                  href="https://ciex.furg.br"
                  label="CIEX/FURG: Centro de Inteligência em Eventos Extremos"
                  desc="Modelagem hidrológica e hidráulica costeira para Rio Grande: manchas de Setembro 2023, Maio 2024, Maio 2024 + 50% e Nível da Lagoa + Chuva Acumulada (16/05/2024), e as máscaras por cota do pico de 21/05/2024."
                />
                <RefItem
                  href=""
                  label="GPEA/FURG: Grupo de Pesquisa em Economia Azul"
                  desc="Simulações de Nível da Lagoa e Chuva Acumulada usadas no cenário combinado, com estilo de visualização definido em QGIS."
                />
              </RefBlock>
              <RefBlock title="Dados Socioeconômicos">
                <RefItem
                  href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/rais"
                  label="RAIS: Relação Anual de Informações Sociais (MTE)"
                  desc="Microdados de vínculos ativos, estabelecimentos, CNAE e remuneração, base de Empresas."
                />
                <RefItem
                  href="https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar"
                  label="INEP: Censo Escolar"
                  desc="Estabelecimentos de educação básica, matrículas por modalidade e docentes."
                />
                <RefItem
                  href="https://cnes.datasus.gov.br"
                  label="CNES: Cadastro Nacional de Estabelecimentos de Saúde (DataSUS)"
                  desc="Unidades de saúde, tipo de estabelecimento e quadro de pessoal por categoria."
                />
              </RefBlock>
              <RefBlock title="Dados Agrícolas e de Cobertura">
                <RefItem
                  href="https://brasil.mapbiomas.org/colecoes-mapbiomas-1/"
                  label="MapBiomas: Coleção 10"
                  desc="Mapeamento anual de uso e cobertura do solo em raster de 30 m, com classes de agricultura e cobertura da terra."
                />
              </RefBlock>
              <RefBlock title="Infraestrutura e Patrimônio">
                <RefItem
                  href=""
                  label="Prefeitura Municipal de Rio Grande"
                  desc="Camadas de Logradouros, Quadras e Terrenos."
                />
                <RefItem
                  href=""
                  label="Levantamento de Patrimônio Histórico: Rio Grande/RS"
                  desc="Bens tombados/inventariados (355 pontos) com nome, endereço e tipologia arquitetônica."
                />
              </RefBlock>
              <RefBlock title="População">
                <RefItem
                  href="https://www.worldpop.org/"
                  label="WorldPop"
                  desc="Grade populacional (hab./pixel) renderizada como heatmap raster."
                />
              </RefBlock>
              <RefBlock title="Metodologia DaLA e Referências Econômicas">
                <RefItem
                  href="https://www.cepal.org/pt-br/publicacoes/81035-avaliacao-efeitos-impactos-inundacoes-rio-grande-sul-novembro-2024"
                  label="CEPAL (2024): Avaliação dos Efeitos e Impactos das Inundações no Rio Grande do Sul"
                  desc="Referência metodológica para a curva de recuperação linear e parâmetros de interrupção."
                />
                <RefItem
                  href="https://www.gfdrr.org/sites/default/files/2017-09/PDNA-Volume-A.pdf"
                  label="PDNA Vol. A Guidelines (GFDRR/UNDP/BM, 2013)"
                  desc="Guia metodológico para avaliação de pós-desastre: danos ao estoque e perdas de fluxo."
                />
              </RefBlock>
              <RefBlock title="Ferramentas e Infraestrutura Geoespacial">
                <RefItem
                  href="https://geopandas.org/en/stable/docs.html"
                  label="GeoPandas"
                  desc="Biblioteca Python para operações de sobreposição espacial (sjoin, intersection)."
                />
                <RefItem
                  href="https://nominatim.org"
                  label="Nominatim (OpenStreetMap)"
                  desc="Geocodificador de endereços baseado em dados OSM, instância local. Usado para estabelecimentos RAIS e unidades sem coordenadas próprias."
                />
                <RefItem
                  href="https://turfjs.org"
                  label="Turf.js"
                  desc="Cálculos geoespaciais no cliente (área, bounding box) em JavaScript/TypeScript."
                />
                <RefItem
                  href="https://maplibre.org/maplibre-gl-js/docs/"
                  label="MapLibre GL JS"
                  desc="Motor de renderização de mapas vetoriais no navegador."
                />
              </RefBlock>
            </div>
          </Section>

          {/* ── Rodapé ──────────────────────────────────────────────────────── */}
          <footer className="mt-12 border-t border-[#c7d6d9] pt-6 text-center">
            <p className="text-[11px]" style={{ color: PRIMARY }}>
              Painel desenvolvido pelo CIEX em parceria com o GPEA/FURG.
            </p>
            <p className="mt-0.5 text-[11px]" style={{ color: PRIMARY }}>
              © GPEA: Grupo de Pesquisa em Economia Azul · Alisson T. G.
              Fiorentin
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
