# Dashboard CIEX — Análise de Impacto de Inundações em Rio Grande/RS

Dashboard web interativo para análise geoespacial do impacto socioeconômico e de infraestrutura de cenários de inundação no município de Rio Grande/RS, desenvolvido pelo **Centro de Inteligência em Eventos Extremos (CIEX)**.

---

## Objetivos

- Quantificar o impacto de cenários de inundação sobre empresas, estabelecimentos de saúde, escolas, infraestrutura urbana, agricultura e uso e cobertura da terra no município de Rio Grande/RS.
- Oferecer uma ferramenta visual e interativa para análise espacial de áreas atingidas, comparando cenários de diferentes magnitudes.
- Apoiar a tomada de decisão em gestão de riscos climáticos e formulação de políticas públicas.

---

## Descrição

A aplicação é um dashboard de página única construído com **Next.js + TypeScript**, exibindo dados geoespaciais sobre um mapa base vetorial (MapLibre GL). O usuário pode alternar entre cenários de inundação e visualizar, para cada camada, o total de pontos/áreas atingidos e indicadores agregados (KPIs) no painel lateral.

**Funcionalidades:**
- Alternância entre cenários de inundação com carregamento assíncrono por demanda
- Painel de análise com abas por setor (Empresas, Saúde, Educação, Patrimônio Histórico, Infraestrutura, Agricultura, Cobertura da Terra)
- Heatmap de população (WorldPop) exibido como camada alternável pelo botão "População" no cabeçalho, com KPI de população total e atingida por cenário no topo do painel
- Filtros por setor econômico (CNAE), dependência administrativa, tipo de estabelecimento e tipologia de patrimônio
- Permalink via parâmetro `?cenario=<código>` na URL (mais `lat`/`lng`/`zoom` para a posição do mapa)

---

## Base de Dados

| Camada | Fonte | Descrição |
|---|---|---|
| **Empresas** | RAIS (MTE) | Microdados de vínculos empregatícios formais (empregados, massa salarial, CNAE) |
| **Educação** | Censo Escolar (INEP) | Escolas, matrículas por modalidade, professores e dependência administrativa |
| **Saúde** | CNES (Ministério da Saúde) | Unidades de saúde, tipo de estabelecimento e quadro de pessoal por categoria |
| **Logradouros** | Prefeitura de Rio Grande | Arruamento com atributos de drenagem e iluminação pública |
| **Quadras** | Prefeitura de Rio Grande | Quadras urbanas com código e área |
| **Terrenos** | Prefeitura de Rio Grande | Lotes com informações de saneamento (água, esgoto, coleta de lixo) |
| **Patrimônio Histórico** | Levantamento de Patrimônio Histórico — Rio Grande/RS | Bens tombados/inventariados (355 pontos) com nome, endereço e tipologia arquitetônica |
| **Uso e Cobertura da Terra** | MapBiomas Coleção 10 (2024) | Classes: Silvicultura, Campo Alagado, Formação Campestre, Mosaico de Usos, Restinga Arbórea, Restinga Herbácea |
| **Agricultura** | MapBiomas Coleção 10 (2024) | Culturas: Soja, Arroz, Outras Lavouras Temporárias |
| **População** | WorldPop | Grade populacional (hab./pixel) renderizada como heatmap raster; população total e atingida por cenário pré-computadas |
| **Cenários de inundação** | Modelagem hidrológica | Manchas de inundação vetoriais dos eventos de Setembro de 2023, Maio de 2024 e cenário de sensibilidade "Maio 2024 + 50%" (Maio 2024 com a água 60 cm mais alta; o "+50%" é só o nome herdado do cenário) |
| **Mancha de altura da lâmina d'água** | Simulação hidrológica por bacias — plataforma Economia Azul (GPEA/FURG) | Nível da Lagoa (16/05/2024, 20h) + Chuva Acumulada (60,8mm) combinados: rasters de profundidade por bacia hidrográfica, estilizados por rampa de cor QGIS (`.qml`) |

---

## Metodologia

### 1. Seleção dos atingidos (Python / GeoPandas)

Todos os cruzamentos espaciais são **pré-computados offline** via junção espacial ponto-em-polígono (ou polígono-em-polígono), utilizando o predicado `intersects`:

```python
atingidos = gpd.sjoin(camada_base, mancha_inundacao, how="inner", predicate="intersects")
```

O resultado — apenas as feições que intersectam a mancha de inundação — é exportado como GeoJSON ou FlatGeobuf (`.fgb`) e servido estáticamente pelo Next.js. Não há processamento espacial no browser.

### 2. Cálculo dos indicadores por setor

Notação geral: $N$ = conjunto total de feições no município; $\hat{N} \subseteq N$ = conjunto das feições atingidas pelo cenário selecionado. O percentual de impacto para qualquer métrica $m$ é:

$$\%\,\text{atingido} = \frac{m_{\hat{N}}}{m_N} \times 100$$

#### Empresas

Cada feição é um estabelecimento com os campos `Empregados` ($E_i$), `Massa_Salarial` ($W_i$) e `Média Salarial` ($\bar{S}_i$):

$$\text{Estabelecimentos} = |\hat{N}|$$

$$\text{Vínculos} = \sum_{i \,\in\, \hat{N}} E_i \qquad \text{Massa salarial} = \sum_{i \,\in\, \hat{N}} W_i \qquad \text{Média salarial} = \frac{1}{|\hat{N}|}\sum_{i \,\in\, \hat{N}} \bar{S}_i$$

#### Educação

Cada feição é uma escola com os campos `qtd_prof` ($p_i$) e `qtd_matri_k` ($m_{k,i}$) para cada modalidade $k$ ∈ {infantil, fundamental, médio, profissional, EJA, especial}:

$$P = \sum_{i \,\in\, \hat{N}} p_i \qquad M_k = \sum_{i \,\in\, \hat{N}} m_{k,i}$$

#### Saúde

Cada feição é uma unidade com categoria `co_tipo_estabelecimento` e colunas de staff `staff_k` ($c_{k,i}$) para cada categoria $k$ (médicos, enfermagem, farmácia etc.):

$$\text{Unidades por tipo} \;t = |\{i \in \hat{N} : \text{tipo}_i = t\}|$$

$$C_k = \sum_{i \,\in\, \hat{N}} c_{k,i} \qquad \%\,\text{staff}_k = \frac{C_{k,\,\hat{N}}}{C_{k,\,N}} \times 100$$

#### Logradouros

Cada feição é um segmento de via. A chave de deduplicação é o par (campo `tipo`, campo `nome`):

$$R = |\{(t_i,\, n_i) : i \in \hat{N}\}|$$

onde $R$ é o número de ruas únicas atingidas. Os flags `drenagem` e `iluminacao` são atributos binários $\{0, 1\}$:

$$F_s = |\{i \in \hat{N} : s_i = 1\}|, \quad s \in \{\text{drenagem},\;\text{iluminacao}\}$$

#### Quadras e Terrenos

Cada feição é uma quadra ou um lote. Contagem simples:

$$\text{Quadras} = |\hat{N}|$$

Para terrenos, os atributos de saneamento são flags binários (`agua`, `coleta_lix`, `esgoto_plu`, `condominio`):

$$F_s = |\{i \in \hat{N} : s_i = 1\}|$$

O tipo de esgoto (`esgoto_clo`) é verificado por equivalência de string — valores aceitos como cloacal: `"esgoto_cloacal"`, `"cloacal"`, `"1"`; valores aceitos como fossa: `"fossa_septica"`, `"fossa"`.

#### Uso e Cobertura da Terra / Agricultura

A área de cada feição vetorial $f_i$ é calculada pelo `@turf/turf` (elipsoide WGS 84, m²) e convertida para hectares:

$$a_i = \frac{\text{area}(f_i)}{10000}$$

O ruído de vetorização do raster MapBiomas (fragmentos $< 0{,}5\;\text{ha}$) é removido offline, polígono a polígono e em hectares reais (EPSG:31982), por `scripts/filtro_ruido.py`, antes de dissolver por classe; o navegador não aplica mais corte. A área total atingida por classe ou cultura $k$ é:

$$A_k = \sum_{\substack{i \,\in\, \hat{N},\; k_i = k}} a_i \qquad \%\,\text{área}_k = \frac{A_{k,\,\hat{N}}}{A_{k,\,N}} \times 100$$

#### Patrimônio Histórico

Cada feição é um bem patrimonial (ponto) com os campos `Nome`, `ENDEREÇO` e `Tipologia`. A seleção dos atingidos usa a mesma junção espacial ponto-em-polígono (`intersects`) das demais camadas de ponto. O campo `Tipologia` é normalizado no cliente removendo o prefixo numérico de classificação (ex.: `"6- Arquitetura Civil Privada"` → `"Arquitetura Civil Privada"`), de modo que categorias duplicadas por prefixo sejam agregadas. As métricas são a contagem total e a distribuição por tipologia:

$$\text{Total} = |\hat{N}| \qquad T_k = |\{i \in \hat{N} : \text{tipologia}_i = k\}| \qquad \%\,\text{atingido} = \frac{|\hat{N}|}{|N|} \times 100$$

#### População

Diferente das demais camadas, a população **não** é um recorte vetorial: é uma grade populacional (WorldPop) exibida como *heatmap raster* sobreposto ao mapa. Os valores de população total do município e população atingida por cenário são pré-computados offline e servidos em um único `populacao_atingida.json`:

$$\%\,\text{pop. atingida} = \frac{\text{pop. atingida}}{\text{pop. total}} \times 100$$

O KPI de população é lido diretamente desse JSON (não é recalculado no cliente). A imagem raster (`populacao.png`) é posicionada pelas quatro coordenadas de canto presentes no JSON. A camada é ligada e desligada pelo botão "População" no cabeçalho do mapa; a legenda (gradiente de densidade) e o KPI no painel acompanham o cenário.

**Nota sobre o cenário combinado (Nível da Lagoa + Chuva Acumulada).** Setembro de 2023, Maio de 2024 e Maio de 2024 + 50% têm população atingida exata, de uma base externa ao CIEX (raster de 100 m). Para o 16/05/2024 não há valor exato: `pop_atingida` é **estimado** a partir do `populacao.png` já renderizado. O canal alfa da imagem correlaciona quase perfeitamente (r ≈ 0,998) com a posição de cada pixel na rampa de cor do heatmap, uma proxy da densidade. O alfa é usado como peso por pixel e o resultado é dividido por um fator de calibração $k$, medido nos três cenários com valor exato (a proxy subestima: razões de 0,52 a 0,61; $k = 0{,}545$ pela razão das somas):

$$\text{pop\_atingida} \approx \frac{1}{k}\,\text{pop\_total} \times \frac{\sum_{\text{pixel} \,\in\, \text{mancha}} \text{alfa}}{\sum_{\text{pixel}} \text{alfa}}$$

Resultado: 18.000 hab. (9,1%), faixa de 15.900 a 19.000. Ver `scripts/estimar_populacao_atingida.py`. Um teste com o raster WorldPop de densidade a ~1 km (`scripts/gerar_populacao_atingida.py`, variável `POP_RASTER`) foi descartado: manchas pequenas dependem de poucos pixels de 1 km² (Setembro de 2023 saía 15,5% contra 4,0% exato).

#### Manchas de altura da lâmina d'água (Nível da Lagoa + Chuva Acumulada)

Um cenário adicional que combina duas simulações entregues como rasters de profundidade por bacia hidrográfica pela plataforma Economia Azul (GPEA/FURG), com estilo de visualização definido em QGIS (`.qml`). Processado por `scripts/converter_manchas_altura.py` (não altera os conversores dos demais cenários) e tratado como um cenário comum no restante do pipeline — mesma junção espacial `intersects`/`overlay` da seção 1, mesmos indicadores por setor da seção 2. A área atingida final é a **união** das duas simulações.

**Nível da Lagoa – 16/05/2024, 20h.** Simulação de elevação do nível da lagoa. Fonte: mosaico dos rasters de profundidade das bacias 1–5 e 7 (`profundidade_Valor_21_cm_pontosNaMao.tif`, EPSG:31982, ~1 m/pixel). Cada pixel é a profundidade da lâmina d'água em cm. Rampa de cor (extraída do `.qml`, `classificationMode="DISCRETE"`):

| Faixa (cm) | Cor |
|---|---|
| < 45 | transparente |
| 45 – 64 | `#4b0082` (índigo) |
| 65 – 84 | `#00ffff` (ciano) |
| 85 – 104 | `#00ff00` (verde) |
| 105 – 124 | `#ffff00` (amarelo) |
| 125 – 144 | `#ff7f00` (laranja) |
| ≥ 145 | `#ff0000` (vermelho) |

O limiar **≥ 45 cm** (primeira classe visível do `.qml`) entra na área atingida.

**Chuva Acumulada – 60,8 mm.** Simulação de acúmulo de água de chuva sobre a área urbana central, para uma precipitação de 60,8 mm. Fonte: mosaico dos rasters das bacias 1–5 (`bacia{N}_valor19.tif`, EPSG:31982). O pixel armazena um valor de saída do modelo ("valor19"), não diretamente em cm. O `.qml` (renderizador `paletted`) classifica de forma quase binária: valor < 86 → transparente; **valor 86–253 → lilás `#ba82e6` (visível)**; valor ≥ 254 → transparente novamente (interpretado como água pré-existente — lagoa/canais — e não como alagamento novo pela chuva). Segundo a fonte, o corte inferior (86) corresponde a uma lâmina d'água de aproximadamente **10 cm**. Essa classificação é replicada **literalmente**: apenas pixels com valor entre 86 e 253 entram na área atingida — valores ≥254 ficam de fora.

**Combinação.** As duas simulações são reprojetadas para uma grade compartilhada (`compute_shared_grid`/`reproject_group`). A "área atingida" final é a união booleana das duas máscaras (Lagoa ≥45cm OR Chuva 86–253) — vetorizada com `rasterio.features.shapes`, dissolvida e simplificada (tolerância sub-métrica, para preservar ruas estreitas alagadas), e usada como a mancha do cenário no cruzamento espacial com as demais camadas. No raster visual, a classificação de profundidade da Lagoa tem **prioridade** onde as duas simulações se sobrepõem — o lilás da Chuva Acumulada só aparece onde a Lagoa não tem cobertura.

**Perdas operacionais.** O cenário combinado foi incluído em `CENARIOS`/`CENARIO_PERIODO` de `calcular_perdas_rio_grande.py`, usando os mesmos parâmetros DaLA (dias agudo/recuperação) e coeficientes agrícolas do período "maio_2024".

**Danos (`/danos`) e cotas.** A antiga página `/perdas` virou `/danos`, com as abas Danos Operacionais (perdas DaLA) e Danos Físicos (exposição por cota; sem R$, porque as máscaras de Rio Grande não têm profundidade). O cenário "Todas as cotas" anima a água por cota (1,00 a 2,6215 m) a partir de arquivos de uma fonte externa ao CIEX. O cálculo de perdas normaliza o CNAE para 5 dígitos.

**Renderização.** Diferente dos demais cenários (preenchimento de cor única + contorno), este cenário é exibido como imagem raster colorida (`Source type="image"`), preservando o gradiente/classificação original — ver `ALTURA_MANCHAS` em [app/page.tsx](app/page.tsx).

### 3. Formatos de arquivo e desempenho

| Formato | Camadas | Motivo |
|---|---|---|
| `.geojson` | Empresas, Educação, Saúde, Patrimônio Histórico, Logradouros, Cenário | Tamanho reduzido, parsing nativo |
| `.fgb` (FlatGeobuf) | Cobertura, Agricultura, Quadras, Terrenos | Streaming binário eficiente para arquivos grandes |
| `.png` + `.json` | População | Imagem raster (heatmap) posicionada por coordenadas de canto + métricas pré-computadas por cenário |

O FlatGeobuf é carregado em stream via `flatgeobuf.geojson.deserialize`, sem necessidade de carregar o arquivo inteiro na memória antes de renderizar. Terrenos (~17 MB) solicita confirmação do usuário antes do carregamento.

Dados de base são carregados uma única vez na inicialização. Dados atingidos são carregados sob demanda a cada troca de cenário, com `AbortController` para cancelar requisições em andamento.

### 4. Renderização e z-order

Camadas renderizadas em ordem crescente de z-index (determinada pela posição no JSX, sem uso de `beforeId`):

1. Polígono de inundação (cenário)
2. Heatmap de População (raster, ao fundo)
3. Uso e cobertura da terra
4. Agricultura
5. Infraestrutura (geometrias fill/line/point selecionadas por filtro de tipo)
6. Empresas, Saúde, Educação, Patrimônio Histórico (pontos clusterizados — renderizados por cima)

Pontos são clusterizados automaticamente pelo MapLibre GL (raio 50 px). A bounding box da mancha ativa é calculada via `turf.bbox` para reposicionamento automático do mapa.

### 5. Permalink

O cenário ativo é persistido na URL via `?cenario=<código>` usando `history.replaceState`, junto com `lat`/`lng`/`zoom` para a posição do mapa. O código de cada cenário é um identificador curto e legível (`CENARIO_URL_SLUGS` em [app/page.tsx](app/page.tsx)), independente do slug interno usado nos nomes de arquivo (`scenarioSlug`/`slugify`) — desacopla a estética do link compartilhável da convenção de nomenclatura dos dados. O código é lido por `ref` na inicialização (não em `useEffect`) para evitar re-renderizações desnecessárias e para estar disponível a tempo de influenciar a primeira carga de dados.

---

## Dependências

### Aplicação (Node.js ≥ 18)

| Pacote | Versão | Função |
|---|---|---|
| `next` | ^16 | Framework React com SSR e servidor estático |
| `react` / `react-dom` | ^19 | Biblioteca de UI |
| `maplibre-gl` | ^6 | Motor de renderização de mapas vetoriais |
| `react-map-gl` | ^8 | Wrapper React para MapLibre GL |
| `@turf/turf` | ^7 | Cálculos geoespaciais (área, bounding box) |
| `flatgeobuf` | ^4 | Leitura em stream de arquivos `.fgb` |
| `radix-ui` | ^1 | Primitivos de UI acessíveis (base do shadcn/ui) |
| `lucide-react` | ^1 | Biblioteca de ícones |
| `tailwindcss` | ^4 | Framework CSS utilitário |
| `typescript` | ^5 | Tipagem estática |

Instalar com:
```bash
pnpm install
```

### Scripts de conversão (Python ≥ 3.10)

| Pacote | Função |
|---|---|
| `geopandas` | Leitura de shapefiles/GeoJSON e junção espacial (`sjoin`) |
| `shapely` | Operações geométricas (dependência do geopandas) |
| `pandas` | Manipulação tabular |
| `numpy` | Operações numéricas |
| `rasterio` | Leitura e vetorização de rasters GeoTIFF (MapBiomas) |

Instalar com:
```bash
pip install geopandas shapely pandas numpy rasterio pillow scipy
```

---

## Como Executar

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

```bash
pnpm build      # Build de produção
pnpm typecheck  # Verificação de tipos (tsc --noEmit)
pnpm lint       # ESLint
pnpm format     # Prettier
```

### Adicionando um novo cenário

1. Gere os arquivos `_ATINGIDOS_` via scripts Python para o novo cenário.
2. Adicione o nome do cenário ao array `CENARIOS` em `app/page.tsx`.
3. Coloque os arquivos em `public/dados_convertidos/rio_grande/cenarios/`.

---

## Estrutura do Projeto

```
app/
  page.tsx          — Componente único Dashboard (~6.250 linhas): todo o estado, lógica e UI
  layout.tsx        — Layout raiz Next.js
  globals.css       — Estilos globais e Tailwind
components/ui/      — Componentes shadcn/ui (card, donut-chart, dropdown, select, skeleton, tabs)
public/
  dados_convertidos/
    populacao_atingida.json — População total/atingida por cenário + coordenadas do raster
    rio_grande/     — GeoJSON, FGB e populacao.png prontos para consumo pelo browser
```

> Os conversores Python (GeoPandas/Rasterio), seus testes e a documentação de processo ficam em `scripts/` (`converter_*.py`, `gerar_*.py`, `sincronizar_dados_externos.py`, `tests/`) e `docs/` (`dados-externos-rio-grande.md`, `auditoria-2026-11-08.md`, `sensibilidade-limiares-mancha-16-05.md`). Os insumos grandes (rasters do MapBiomas e outros) não estão no git: veja `scripts/data/LEIA-ME.md`. `pnpm test` roda os testes de `lib/` e os de `scripts/tests/`.

---

## Autores e Instituições

**Grupo de Pesquisa em Economia Azul**
Instituto de Ciências Econômicas, Administrativas e Contábeis
Universidade Federal do Rio Grande — FURG
Av. Itália, KM 8, Rio Grande — RS

**Centro Interinstitucional de Observação e Previsão de Eventos Extremos (CIEX)**
Universidade Federal do Rio Grande — FURG
Av. Itália, KM 8, CIDEC-SUL, Rio Grande — RS

---

**Alisson Tallys Geraldo Fiorentin**
Doutorando em Economia Aplicada — Universidade Federal do Rio Grande do Sul (UFRGS)
✉ alisson.fiorentin@gmail.com

---

Desenvolvido com apoio da **Prefeitura Municipal de Rio Grande/RS**.

Dados de uso e cobertura da terra: [MapBiomas](https://mapbiomas.org/) — Coleção 10 (2024).
Dados de grade populacional: [WorldPop](https://www.worldpop.org/).
