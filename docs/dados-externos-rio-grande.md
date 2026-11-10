# Dados de Rio Grande copiados da origem

Sincronizados em 2026-11-07 a partir de `<pasta do projeto de origem>/dashboard/public/dados_convertidos/` (a origem não é
um repositório git; não há commit de referência) com `python3 scripts/sincronizar_dados_externos.py --apply`.

## Regra

A origem prevalece nos arquivos de mesmo nome dos 3 cenários comuns (Setembro 2023, Maio 2024, Maio 2024 + 50%).
O CIEX prevalece no que só ele tem ou no que vem de conversor próprio: o cenário "Nível da Lagoa + Chuva
Acumulada – 16/05/2024", `agricultura_*` (exceto `agricultura_stats_*` dos cenários comuns), `cobertura_*`,
`patrimonio_*`, `*.fgb`, rasters PNG, `populacao.png` e `infra_quadras/terrenos` (o app lê esses layers em `.fgb`).

## Arquivos copiados (18)

- Cotas (novos): `rio_grande/cota_mapa.{json,webp}`, `rio_grande/cota_pontos.json`,
  `climada_cota_rio_grande.json`, `climada_cota_detalhe_rio_grande.json`, `climada_exposicao_rio_grande.json`.
- Sobrescritos: `agricultura_stats_*` dos 3 cenários comuns; `educacao/empresas/saude_ATINGIDOS` e
  `infra_logradouros_ATINGIDOS` de Setembro 2023 e `saude_ATINGIDOS` de Maio 2024 e Maio 2024 + 50% (conforme
  diferiam); mancha de Maio 2024 e Maio 2024 + 50%; `saude_BASE.geojson`.

`scripts/sincronizar_dados_externos.py` sem `--apply` lista o estado atual (deve mostrar 0 arquivos a copiar).

## Resultado

`scripts/calcular_perdas_rio_grande.py` recalculado sobre esses dados reproduz, ao centavo, os totais da origem
nos 3 cenários comuns (Setembro 2023 R$ 12.901.005,15; Maio 2024 R$ 96.059.060,85; Maio 2024 + 50%
R$ 557.838.356,02). A correção da classificação de CNAE (5 dígitos) e das chaves de cultura sem acento está
em `scripts/calcular_perdas_rio_grande.py` e coberta por `scripts/tests/test_perdas.py`.

## Correções locais sobre os dados da origem

`scripts/corrigir_coordenadas.py` (reaplicado por `sincronizar_dados_externos.py --apply`) corrige coordenadas que o
geocodificador da origem colocou fora do lugar. Hoje há uma:

- **SECRETARIA MUNICIPAL DE SAUDE DE RIO GRANDE (CNES 6303609)**, Rua Marechal Floriano, 05, Centro, CEP 96200-380.
  A base trazia o ponto ~1 km a nordeste, fora do município (índice de cota −1). Nova posição: centroide do CEP
  (lon −52,0985343, lat −32,031745), a mesma de 3 empresas do CEP, todas com índice de cota 0.
  Efeitos: sai do cenário Maio 2024 (a nova posição está fora da mancha) e continua em Maio 2024 + 50%; não entra em
  Setembro 2023 nem em 16/05/2024; as Perdas não mudam (a unidade não tem produção SUS no índice).
  Os totais por cota da origem (`climada_*_rio_grande.json`) foram calculados com a unidade excluída por estar fora do
  município, então seu `n_total` e a exposição total de saúde não a incluem; como ela nunca molha, `n_atingidos` não muda.
- Depois de uma correção, o dry run do sincronizador lista esses arquivos como "a copiar" (diferem da origem): é esperado.

## Limitações conhecidas

- A mancha dos cenários Maio 2024 e Maio 2024 + 50% mudou (geometria mais detalhada na origem). Os arquivos
  `patrimonio_`, `cobertura_` e `agricultura_ATINGIDOS` do CIEX vêm de conversores próprios (rasters e
  shapefiles externos) e foram **mantidos**; podem estar defasados em relação à nova mancha até serem
  regenerados com os conversores de `scripts/`.
- Os rasters brutos por cota (`RAW/cotas-pico-2024-05-21`, antes `pico210524_evolucaoPorCota`, 6 bacias × 6 cotas, máscaras binárias de 1 m em EPSG:31982) não
  ficam no repositório; informe a pasta em `RASTER_DIR` ao rodar `scripts/gerar_cota_mapa.py`.
- Rio Grande é `sem_profundidade` na origem: as cotas trazem exposição, sem dano físico em R$.

## Simulações de intervenção (2026-11-09)

Gerados por `scripts/converter_intervencoes.py` a partir de `RAW/simulacoes-intervencoes/` (4 eventos × sem intervenção,
diques e diques + barragens), com `scripts/calcular_perdas_rio_grande.py --intervencoes` (`perdas_intervencoes.json`) e
`scripts/gerar_comparativo_intervencoes.py` (`intervencoes_comparativo.json`). Os arquivos `*simulacao_*` em
`rio_grande/cenarios/` somam **41,9 MB** (12 cenários × 12 arquivos). Limiar: profundidade ≥ 10 cm; nas sobreposições entre bacias
vale a maior profundidade (a soma por bacia contaria a sobreposição em dobro: 21/05/2024 com diques dá 465,7 ha por soma e 333 ha pelo mosaico).

| Evento | Sem intervenção | Diques | Diques + barragens |
|---|---|---|---|
| 29/09/2023 | 333,1 ha · 324 empresas · R$ 25,7 mi | 221,9 ha · 128 · R$ 16,2 mi | 222,7 ha · 128 · R$ 16,2 mi |
| 29/11/2023 | 352,2 ha · 339 · R$ 55,0 mi | 247,0 ha · 143 · R$ 34,4 mi | 244,6 ha · 141 · R$ 34,0 mi |
| 21/05/2024 | 654,9 ha · 2.075 · R$ 462,4 mi | 333,2 ha · 325 · R$ 51,4 mi | 327,3 ha · 324 · R$ 51,4 mi |
| 28/06/2025 | 253,6 ha · 140 · R$ 34,2 mi | 192,7 ha · 99 · R$ 27,9 mi | 192,1 ha · 99 · R$ 27,9 mi |

Perdas no DaLA do evento (Setembro de 2023: `setembro_2023`; Maio de 2024: `maio_2024`; Novembro de 2023 e Junho de 2025 não têm parâmetros próprios e usam dias interpolados pela área atingida, `novembro_2023` = 32 e `junho_2025` = 23 dias efetivos, estimativa). Os modelos
das simulações (TELEMAC) **não são comparáveis** aos cenários antigos: o baseline de 21/05/2024 tem perdas de R$ 462 mi contra
R$ 96 mi do "Cenário Maio 2024". A exposição em R$ (`valor_reposicao.py`) reproduz os totais do CLIMADA (empresas ao centavo; educação e saúde com razão 1,0000).

## Auditoria de 2026-11-08: o que foi medido e deixado como está

- **ATINGIDOS de empresas, educação, saúde e patrimônio × mancha atual.** Conferido ponto a ponto contra
  `*_BASE ∩ mancha`. Nos 4 cenários, os pontos gravados que ficam fora da mancha estão a **0,5 a 10 m** da borda
  (efeito da geometria simplificada da mancha); educação e saúde batem quase por inteiro. A maior diferença é Maio 2024
  empresas (601 gravados × 556 dentro), e 46 das 53 empresas fora estão num único ponto, a 10 m da borda. Os ATINGIDOS do
  origem não estão defasados de forma relevante, então **não foram recalculados** (recalcular deixaria de reproduzir os
  totais da origem ao centavo).
- **Pilha de geocodificação.** 777 das 3.220 empresas (24%, 14.854 de 43.568 vínculos) estão no mesmo ponto
  (lon −52,09913, lat −32,03343) apesar de terem ruas e CEPs diferentes (260 CEPs): é o ponto de falha do geocodificador.
  Esse ponto cai fora da mancha em Setembro 2023 e Maio 2024 e dentro em Maio 2024 + 50% e 16/05/2024; ou seja, os 777
  entram nesses dois últimos cenários só por causa do ponto falso. A pilha existe também em educação (40 de 140 escolas)
  e saúde (164 de 462 unidades), e a origem já a sinaliza na aba Danos Físicos (`maior_pilha`).
  **Não foi aplicada aqui.** Mover os pontos só no dashboard deixaria o mapa "Simulação por Cotas" com pontos secos/molhados
  errados (o índice de cota por ponto, `cota_pontos.json`, não pode ser recalculado: `cota_mapa.webp` só reproduz o índice
  de 85% das empresas e 53% das unidades de saúde) e os totais de Danos Físicos (`climada_*_rio_grande.json`) inconsistentes
  com as posições. Em vez disso, `scripts/propor_realocacao_pilhas.py` gera `docs/realocacao-pilhas-geocodificacao.csv`
  com a posição proposta de cada membro da pilha (mediana dos demais estabelecimentos do mesmo CEP; senão da mesma
  rua+bairro): empresas 398 por CEP + 13 por rua e bairro, 366 sem referência; escolas 9 por CEP, 31 sem referência; saúde
  138 por CEP + 6 por rua e bairro, 20 sem referência. A origem aplica no `05_geocodificar.py` e regenera ATINGIDOS, cotas e
  perdas de uma vez. Efeito estimado nas empresas realocáveis: dentro da mancha ficariam 10 (Set/2023), 15 (Maio 2024),
  185 (+50%) e 109 (16/05), contra 777 nos dois últimos hoje.
- **Rio Grande + origem, CRS.** O pipeline da origem calcula áreas em EPSG:32722; os scripts do CIEX usam EPSG:31982
  (SIRGAS 2000 / UTM 22S). A diferença de área é desprezível nessa escala.
- **"Maio 2024 + 50%".** O nome vem da origem; a mancha é o shapefile `CEN_MAI24_MAIS60CM` (água 60 cm acima), com cerca de
  7× a área de Maio 2024. Não é "50% de área adicional".
- **População.** Setembro 2023, Maio 2024 e Maio 2024 + 50% vêm da origem (raster de 100 m). O raster de densidade
  WorldPop 2020 a ~1 km (`bra_pd_2020_1km.tif`) foi testado com `gerar_populacao_atingida.py` e **descartado**: Setembro
  2023 saía 15,5% (30.835 hab.) contra 4,0% (7.844) exato; Maio 2024 24,8% contra 11,6%; +50% 50,2% contra 40,4%. O 16/05/2024 e as 12 simulações são calculados no raster WorldPop 2024 de 100 m (`RAW/populacao/`, `calcular_populacao_intervencoes.py`), método idêntico ao da origem: 16/05/2024 dá 18.553 hab. (9,4%) (a estimativa por proxy anterior era 18.000, aposentada).
- **Mancha do 16/05/2024 inflada (corrigido).** `converter_manchas_altura.py` reduzia a máscara por max-pool 4×4
  (`any`): um pixel molhado em 16 molhava o bloco. A mancha publicada tinha 7,99 km² contra 5,76 km² pelo limiar bruto
  (≥ 45 cm OU faixa 86–253), +39%. Agora a redução vota por maioria (≥ 50%) e a mancha tem 6,35 km² (+10% sobre o bruto,
  do fechamento de vãos de até ~16 m e da simplificação). Regenerados: mancha, ATINGIDOS, `infra_stats`, perdas do 16/05
  (R$ 450,8 mi → R$ 433,6 mi) e a população estimada. O VAB do 16/05 (R$ 379 mi) é dominado pela pilha de geocodificação
  (777 empresas num ponto dentro da mancha); veja o item da pilha acima.
- **`cota_mapa.webp` corrigido (2026-11-08).** A imagem da origem (reduzida por max-pooling em `climada_cota_mapa.py`, que o próprio script reconhece que infla a área) desenhava 9,19 km² no pico, contra 6,864 km² em
  `cota_mapa.json` e 6,906 km² medidos nas máscaras brutas (+34%); só 85% das empresas e 53% das unidades de saúde tinham
  o índice de cota igual ao da imagem. `scripts/gerar_cota_mapa.py` regenera a imagem a partir das máscaras (fração molhada
  por célula, alaga com ≥ 50%): agora 7,00 km² no pico (+1,4% sobre as máscaras) e 94% / 97% / 96% de concordância com o
  índice por ponto (empresas / escolas / saúde). O `cota_mapa.json`, o `cota_pontos.json` e os `climada_*` da origem estão
  corretos e não mudaram. O sincronizador agora mantém a imagem do CIEX. Armadilha ao refazer: os `.tif` declaram `nodata=0`,
  e o rasterio então ignora os pixels secos na média; o script usa `src_nodata=255` e `dst_nodata=0`.
- **Pilha de geocodificação e a cota.** Com as máscaras, o índice de cota de um ponto movido pode ser recalculado, o que
  libera a realocação (`docs/realocacao-pilhas-geocodificacao.csv`) no `cota_pontos.json`; os totais `climada_*` ainda
  dependem do pipeline da origem.
