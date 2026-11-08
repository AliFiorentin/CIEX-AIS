# Insumos dos conversores (`scripts/data/`)

Esta pasta guarda as entradas dos scripts de `scripts/`. Só as pequenas são versionadas; as grandes ficam fora do git
(ver `.gitignore`) e precisam ser baixadas ou copiadas para cá.

## Versionados

| Arquivo | Uso |
|---|---|
| `rio_grande_limite.geojson` | Limite municipal de Rio Grande (IBGE); recorte dos rasters e filtro de pontos fora do município. |
| `producao_sus_por_cnes_rio_grande.json` | Produção SUS (SIA + SIH) anualizada por CNES, usada em `calcular_perdas_rio_grande.py`. |

## Fora do git (baixar)

| Arquivo | O que é | Quem usa |
|---|---|---|
| `cobertura_30m_mapbiomas.tif` | MapBiomas Coleção 10 (2024), uso e cobertura da terra, 30 m, recortado em Rio Grande. | `converter_cobertura_rio_grande.py` |
| `agricultura_30m_mapbiomas.tif` | MapBiomas Coleção 10 (2024), lavouras (classes 39, 40 e 41), 30 m, recortado em Rio Grande. | `converter_agricultura_rio_grande.py` |
| `cobertura_10m_mapbiomas.tif`, `agricultura_riogrande_col10_2024.geojson` | Versões auxiliares; nenhum script atual depende delas. | (nenhum) |

Fonte: <https://brasil.mapbiomas.org/downloads/mapas-para-download-geotiff/> (Coleção 10). Os nomes acima devem ser mantidos.

## Outras entradas (fora desta pasta)

Informadas por variável de ambiente; cada script explica o que falta e para onde apontar:

| Variável | Script | O que é |
|---|---|---|
| `PATRIMONIO_SHP` | `converter_patrimonio_rio_grande.py` | Shapefile do levantamento de patrimônio histórico. |
| `INFRA_DADOS_DIR` | `converter_infra_rio_grande.py` | Pasta com os shapefiles da Prefeitura (`PMRG_231215_layer_*.shp`). |
| `RASTER_DIR` | `gerar_cota_mapa.py` | Pasta `pico210524_evolucaoPorCota` com as máscaras por cota (6 bacias × 6 cotas). |
| `POP_RASTER` | `gerar_populacao_atingida.py` | Raster de densidade populacional (`bra_pd_2020_1km.tif`); método descartado, ver `docs/dados-externos-rio-grande.md`. |
| `DADOS_EXTERNOS_DIR` | `sincronizar_dados_externos.py` | Pasta `dados_convertidos` do projeto de origem dos dados. |

As simulações hidrológicas (rasters de lâmina d'água do 16/05/2024) ficam em `../dados-brutos/plataforma-economia-azul/`
(ver `SIM_DIR` em `converter_manchas_altura.py`).
