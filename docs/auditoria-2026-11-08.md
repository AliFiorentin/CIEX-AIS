# Auditoria da Metodologia e dos Resultados do Dashboard CIEX (2026-11-08)

Auditoria completa da página de Metodologia e dos cálculos de Resultados (painel `/` e `/danos`), com status de cada
achado depois das correções. Os problemas que nascem no projeto de origem estão em
`docs/auditoria-ciex-2026-11-08.md` do repositório do projeto de origem; a política de dados da origem está em
[dados-externos-rio-grande.md](dados-externos-rio-grande.md); as limitações dos resultados estão na Seção 12 da Metodologia.

**Legenda:** ✔ corrigido · ◐ documentado (limitação registrada, sem mudar o dado) · ○ pendente · ↗ depende da origem.

## 1. Corrigir

### Prioridade alta

| # | Problema | Status |
|---|---|---|
| C1 | "Professores" lia `qtd_prof` (não docentes) em vez de `qtd_doc` (2.637 contra 1.762). | ✔ |
| C2 | Média salarial era média de médias; passou a ser massa ÷ vínculos (R$ 4.005 contra R$ 2.374 no município). | ✔ |
| C3 | O slider de cota parava em 2,60 m e não chegava ao pico (2,6215 m). | ✔ |
| C4 | O painel mostrava o cenário anterior sob o título do novo por ~5 s (ex.: 601 empresas sob "+50%"). Agora os resultados antigos são limpos na hora, a mancha nova aparece durante o voo da câmera e os cartões mostram esqueleto até os dados chegarem. Testado no navegador. | ✔ |
| C5 | Logradouros de Setembro 2023 sem atributos (512 feições vazias copiadas da origem). Arquivo restaurado (505 segmentos), sync bloqueia cópia que perde colunas, teste de integridade criado. | ✔ |
| C6 | ATINGIDOS "defasados" em relação à mancha atual. Medido: os pontos fora da mancha estão a 0,5–10 m da borda (601 contra 556 empresas em Maio 2024, 46 num único ponto). Não há defasagem relevante e recalcular deixaria de reproduzir os totais da origem. | ◐ ↗ |
| C7 | `cota_mapa.webp` desenhava 34% mais água (9,19 contra 6,86 km²). Causa: max-pooling em `climada_cota_mapa.py`. Imagem regenerada a partir das máscaras brutas (`scripts/gerar_cota_mapa.py`: 7,00 km² no pico); sync passa a mantê-la. | ✔ ↗ |
| C8 | Cobertura da terra subestimava a área (limiar em graus², −67% na Restinga Arbórea). Filtro de 0,5 ha movido para os conversores, em hectares reais; erro por classe agora dentro de ±3%. | ✔ |
| C9 | População do 16/05 ausente, e o script apagava cenários não recalculados. Script passou a mesclar; 16/05 estimado por proxy do PNG calibrado nos 3 cenários exatos: 18.000 hab. (9,1%), faixa 15.900–19.000. | ✔ |
| C10 | Metodologia descrevia outra fonte de população. Texto corrigido (valores da origem, raster de 1 km testado e descartado: Setembro 2023 saía 15,5% contra 4,0%). | ✔ |
| C11 | "Maio 2024 + 50%" não é +50% de área: é a água 60 cm mais alta (`CEN_MAI24_MAIS60CM`), mancha 7× maior. Texto corrigido; o nome ficou, por herança da origem. | ✔ |
| C12 | 777 empresas (24%) num único ponto de geocodificação; também 40 escolas e 164 unidades de saúde. Documentado na Metodologia (Seção 12) e na página de Danos Físicos. Correção implementada no pipeline da origem (detecção e realocação por CEP/rua+bairro, rejeição de resultados genéricos do Nominatim; testada), falta rodar o pipeline e sincronizar (Seção 6). Proposta em `docs/realocacao-pilhas-geocodificacao.csv`. | ◐ ↗ |
| C13 | 102 empresas, 1 escola e 5 unidades de saúde fora do município/raster (96 empresas a ~38 km, endereço "CENTRO"). Documentado; a re-geocodificação depende da origem. Denominadores: 3.220 no painel e 3.118 em `/danos`. | ◐ ↗ |
| C14 | A Metodologia omitia os multiplicadores de conteúdo (2,0 / 2,5 / 2,25 / 1,5) do valor de reposição. Acrescentados à Metodologia, à Seção 12 e à página de Danos Físicos. | ✔ |

### Prioridade média

| # | Problema | Status |
|---|---|---|
| C15 | Popup de escola somava só 3 modalidades no "Total Alunos". | ✔ |
| C16 | Clicar em "Outros" no gráfico de setores zerava o mapa. | ✔ |
| C17 | "Todas as cotas": abas sem dado mostravam "nenhuma classe atingida". Agora dizem que não há exposição por cota para essas camadas. | ✔ |
| C18 | O corte de 0,5 ha no navegador só removia classes inteiras. Movido para os conversores (por polígono, em hectares, antes do dissolve). | ✔ |
| C19 | Total fixo errado no `/danos` ("R$ 58,5 mi de R$ 460,0 mi"). A tabela foi removida; a Seção 12 cita R$ 58,5 mi de R$ 557,8 mi. | ✔ |
| C20 | A área agrícola diverge entre telas (mapa 53,4 ha contra 49,7 ha da origem em "+50%"). Documentado na Seção 12; o mapa usa o MapBiomas filtrado e as perdas usam as estatísticas da origem. | ◐ |
| C21 | Mancha do 16/05 inflada (7,99 contra 5,76 km² no limiar bruto) por max-pool 4×4 em `converter_manchas_altura.py`. Redução por voto de maioria; mancha de 6,35 km² (+10%, fechamento de vãos). Arquivos derivados regenerados; perdas do 16/05 de R$ 450,8 mi para R$ 433,6 mi. | ✔ |
| C22 | Método misto: quadras e terrenos entram inteiros, e logradouros, agricultura e cobertura são recortados. Documentado na Seção 2 e na Seção 12. | ◐ |
| C23 | Monotonicidade entre cenários. Medido: Maio 2024 está contido em Maio 2024 + 50% sem exceções (empresas, escolas, saúde, patrimônio), e isso agora tem teste. Setembro 2023 e o 16/05 são eventos diferentes e não precisam ser subconjuntos (a empresa 48100 está em Setembro e não em Maio, a ~4 m da borda). Documentado na Seção 12. | ◐ |
| C24 | `gerar_setembro_2023.py` reescrevia arquivos da origem. Reduzido a patrimônio, quadras e terrenos (a origem tem Setembro 2023, exceto patrimônio). | ✔ |
| C25 | Sync da origem: sem backup, sem escrita atômica, sem validação de schema, proteção do 16/05 frágil. Endurecido (backup, escrita atômica, bloqueio de perda de colunas, proteção por qualquer grafia do 16/05, imagem de cota mantida). | ✔ |
| C26 | Tipos de saúde inexistentes na Metodologia (CAPS, Clínica Especializada). Tabela refeita com os 12 tipos reais. | ✔ |
| C27 | Indicadores/camadas descritos e inexistentes (Turmas, leitos SUS, Edificações, Eixos, Rede de Esgoto, r_i, R, linha Construção, regra de 5 m²). Removidos ou marcados como não aplicados no CIEX. | ✔ |
| C28 | CRS 32722 contra 31982. Documentado: o pipeline da origem usa 32722 e os scripts do CIEX 31982; diferença desprezível. | ◐ |
| C29 | O texto dizia que o ano do MapBiomas acompanha o cenário, mas o mapa usa um único raster de 2024. Texto corrigido (o ano por cenário vale só para as estatísticas externas, não verificado). | ✔ |
| C30 | Premissas da educação: educação especial, VAAT por dia letivo × dias corridos, matrícula privada. Medido e documentado (especial sem repetição na base; privada 20–27% do atingido; fator 365/200 se dias corridos). | ◐ ↗ |
| C31 | Limiares 45 cm (Lagoa) e 86–253 (Chuva; ≥ 254 = água pré-existente). Documentados com a fonte e o processamento. | ◐ |
| C32 | População por raster de 1 km: método descartado e documentado. | ◐ |
| C33 | Terminologia: nota na Seção 3 ("empregados" são vínculos da RAIS; "atingido" e "exposto"; seção CNAE contra divisão CNAE) e correção das tabelas e fórmulas. | ✔ |
| C34 | Anacronismo temporal (RAIS 2023, Censo 2024, CNES abr/2024 em Setembro 2023; produção SUS jan–jul/2024 inclui a cheia). Aviso explícito na Seção 12 ("Datas das bases"). | ✔ |
| C35 | Pontos fora do raster por cota contam como secos. Documentado (Seção 12). | ◐ |

### Prioridade baixa
- ✔ **Formatação:** vírgula decimal, arredondamento antes de escolher a unidade (`compactoBr`, `fmtBRL`), `fmtPct` com total zero.
- ✔ **Estado e rede:** o `catch` do carregamento inicial agora desliga o carregando; a faixa do `/danos` lista os 4 cenários.
- ✔ **Código morto:** popups de agricultura/cobertura, ramo de imóveis, `getLen`, `MIN_AREA_DEG2`, scripts de raster de cobertura/agricultura.
- ✔ "Matrículas por Nível" passou a respeitar o filtro de dependência.
- ✔ Docstring de `calcular_perdas_rio_grande.py` corrigida (massa mensal × 12; `dias_agudo = N/2` no `--dias N`).
- ✔ `converter_manchas_altura.py` e `gerar_populacao_atingida.py` funcionam no Python 3.9 (`from __future__ import annotations`); `pillow` e `scipy` entraram no `pip install`.
- ◐ Dados: `staff_diag_lab_imagem` é 0 nas 462 unidades; 87 CNES com 6 dígitos; 42% das quadras sem número válido; `Nome` nulo em 211 de 355 do patrimônio. Documentado na Seção 12 (os cadastros vêm de fora e não foram alterados).
- ◐ Referências: o link da CONAB foi preenchido (página inicial); a CEPAL (2024) já tinha entrada; "Teixeira et al. (2025)" está marcada como "referência completa a confirmar" porque não tenho a citação.

### Bugs do app (testes no navegador)
- ✔ `?cenario=` (inclusive `todas-as-cotas`) abria o cenário padrão no modo de desenvolvimento: o efeito de carga inicial zerava o permalink e o React (StrictMode) o executa duas vezes. Testado nos 4 permalinks.
- ✔ Aviso `Worker failed to load` do MapLibre: não se reproduz (ocorreu uma vez, logo depois de o `predev` recopiar o arquivo do worker); sem erros no desenvolvimento nem na produção.
- ✔ 404 no console nas camadas agrícolas vazias: o painel lê as estatísticas agrícolas (`agricultura_stats_*.json`, que existem para todo cenário) e só pede o `.fgb` quando há agricultura atingida.

## 2. Melhorar

- ✔ **Testes** novos: integridade dos ATINGIDOS (logradouros e aninhamento Maio 2024 ⊂ +50%), sincronização (política e segurança), `corrigir_coordenadas`, filtro de ruído e reparo de geometrias, mesclagem de população, calibração da população, proposta de realocação, mancha de altura, índice de cota do raster, sensibilidade dos limiares, helpers dos gráficos, detecção de pilha e `calcEmp`/`calcEdu`/`calcSau` (extraídas de `app/page.tsx` para `lib/metricas.ts`). Ainda sem testes de ponta a ponta dos conversores e do DaLA.
- ✔ **Sync da origem:** backup, escrita atômica e bloqueio por schema. Falta lista explícita de arquivos protegidos em vez de regras por nome.
- ✔ **Geocodificação na UI:** o painel de Empresas avisa quantas empresas atingidas estão no ponto da pilha (`lib/pilhas.ts`); a correção dos dados continua dependendo da origem (↗).
- ✔ **Incerteza:** `scripts/sensibilidade_limiares.py` e `docs/sensibilidade-limiares-mancha-16-05.md`: Lagoa a 60 cm reduz a mancha em ~9% (100 cm: ~34%); o limite inferior da Chuva pouco importa; incluir os ≥ 254 a triplicaria (decisão de modelagem de grande efeito).
- ✔ **Fonte única de números:** a tabela com totais fixos do `/danos` foi removida; não restam números fixos nas páginas de Danos.
- ✔ **Reprodutibilidade:** caminhos fixos da sua máquina viraram variáveis de ambiente com erro claro (`PATRIMONIO_SHP`, `INFRA_DADOS_DIR`, `POP_RASTER`, `RASTER_DIR`, `DADOS_EXTERNOS_DIR`); `main()` e `__main__` nos conversores de infraestrutura e patrimônio; `reparar_geometrias` (make_valid) no lugar de descartar geometrias inválidas. Medir em UTM não foi feito: a simplificação em graus dá erro de área medido dentro de ±3%.
- ✔ **Metodologia:** aviso temporal, grafia MapBiomas e remoção dos vestígios de "região-foco".
- ✔ **Cobertura da terra (17 MB):** medi tolerâncias de simplificação maiores: 0,0005 reduz o arquivo em 29%, mas leva o erro da Restinga Arbórea de −1,3% para −4,7% (0,0008: −10,7%; 0,0012: −17%). Mantida a de 0,0003.

## 3. Remover

- ✔ **Arquivos órfãos:** `.geojson` duplicados de quadras, terrenos, cobertura e agricultura; `imoveis`, prédios públicos e segurança; PNGs de raster; `public/dados_convertidos` de 191 MB para 72 MB. Backup fora do projeto (temporário).
- ✔ **Código morto** (acima) e dois scripts de raster sem uso.
- ◐ **Colunas `Empregados` e `Massa_Salarial`:** parecem duplicadas, mas `calcEmp` as usa e o sync as recoloca; mantidas.
- ✔ **Texto:** itens inexistentes da Metodologia (C27) e "Limitações" espalhadas, agora reunidas na Seção 12.
- ✔ **README e CLAUDE.md:** `?cenario=`, `recharts`/`xlsx`, `components/ui/map.tsx`, linhas de `page.tsx`, botão de População, Terrenos ~17 MB, conversores no repositório.

## 4. O que está correto (conferido)
- Totais de `perdas_operacionais.json` reproduzidos ao centavo nos 3 cenários comuns com a origem (o 16/05 foi recalculado com as mesmas regras).
- Parâmetros DaLA (dias, f, VAAT-MIN, labor shares, coeficientes agrícolas) batem com o script.
- Slugs de arquivo × `scenarioSlug`, e presença de todos os arquivos que o app pede.
- Mapeamento pixel→lon/lat com erro menor que 1 m; áreas por cota do `cota_mapa.json` batem com as máscaras brutas (≤ 0,6%).
- O índice de cota por ponto concorda com as máscaras brutas em 94% (empresas), 97% (escolas) e 96% (saúde).

## 5. Não verificado
- Fontes externas (VAAT-MIN 2024, SCN 2021 Tabela 17, CEPAL, CONAB).
- O pipeline da origem (agrupamento CBO, geocodificação, origem dos percentuais de conteúdo 50% / 33% / 56%).
- A semântica de `qtd_mat_especial` no Censo Escolar (só se confirmou que, na base, o total é a soma das modalidades).
- Equivalência de 86 do modelo da Chuva a ~10 cm (informação da fonte).

## 6. Pilha de geocodificação (C12): caminho A, correção na origem

Implementada no repositório da origem (`pipeline/pilhas_geocodificacao.py`, `05_geocodificar.py`, `06_geojson.py`, com testes) e
documentada em `docs/auditoria-ciex-2026-11-08.md` do repositório do projeto de origem (item 2a, com o roteiro de execução). Falta **rodar** o
pipeline na máquina que tem o Google Drive e o Nominatim: o geocodificador, o `06`, o `07` e os `climada_*`. Depois, no CIEX,
sincronizar com a origem. Até lá, o CIEX segue com os dados atuais e a pilha só está documentada.

Alternativa provisória (caminho B, não aplicada): aplicar `docs/realocacao-pilhas-geocodificacao.csv` no CIEX e recalcular o
índice de cota com as máscaras brutas; os totais `climada_*` ficariam inconsistentes com as novas posições.
