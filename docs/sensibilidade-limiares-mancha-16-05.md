# Sensibilidade dos limiares da mancha do 16/05/2024

Gerado por `scripts/sensibilidade_limiares.py` sobre os rasters brutos (sem suavizacao nem reducao de
resolucao; a mancha publicada e ~10% maior por causa do fechamento de vaos). Area em km2.

Uniao com os limiares do projeto (Lagoa >= 45 cm OU Chuva 86-253): **5.76 km2**.

## Lagoa (profundidade em cm)

| Limiar | Area da Lagoa | Uniao com a Chuva do projeto | Variacao da uniao |
|---|---|---|---|
| >= 30 cm | 3.88 | 6.14 | +6.5% |
| >= 45 cm (projeto) | 3.30 | 5.76 | +0.0% |
| >= 60 cm | 2.73 | 5.27 | -8.6% |
| >= 75 cm | 2.13 | 4.70 | -18.5% |
| >= 100 cm | 1.25 | 3.82 | -33.7% |

## Chuva Acumulada (valor do modelo)

| Faixa | Area da Chuva | Uniao com a Lagoa do projeto | Variacao da uniao |
|---|---|---|---|
| 70-253 | 2.58 | 5.77 | +0.0% |
| 70-254 | 2.68 | 5.87 | +1.8% |
| 70-sem limite | 14.70 | 17.88 | +210.1% |
| 86-253 (projeto) | 2.58 | 5.76 | +0.0% |
| 86-254 | 2.68 | 5.87 | +1.8% |
| 86-sem limite | 14.70 | 17.88 | +210.1% |
| 100-253 | 2.57 | 5.76 | -0.1% |
| 100-254 | 2.68 | 5.86 | +1.7% |
| 100-sem limite | 14.70 | 17.87 | +210.0% |
| 120-253 | 2.56 | 5.75 | -0.2% |
| 120-254 | 2.67 | 5.85 | +1.6% |
| 120-sem limite | 14.69 | 17.86 | +209.9% |

Leitura:
- **Lagoa:** o limiar importa. Subir de 45 para 60 cm reduz a uniao em ~9% e para 100 cm em ~34%; baixar para 30 cm
  aumenta a uniao em ~6,5%.
- **Chuva, limite inferior:** quase nao importa (70 a 120 muda a uniao em menos de 0,3%).
- **Chuva, limite superior:** pesa muito. Incluir os valores >= 254 (que o estilo QGIS trata como agua
  pre-existente) multiplica a area da Chuva por ~5,7 (2,6 para 14,7 km2) e a uniao em ~3 vezes. A exclusao dos 254+
  e, portanto, uma decisao de modelagem com grande efeito; ela so esta certa se esses pixels forem mesmo agua
  ja existente (lagoa, canais) e nao alagamento novo, o que a fonte nao confirma.
