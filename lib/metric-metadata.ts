export interface MetricMetadata {
  titulo: string
  metodologia: string
  formula: string
  parametros?: { nome: string; valor: string }[]
  fonte: string
  observacao?: string
}

export const METRIC_METADATA: Record<string, MetricMetadata> = {
  empresas_vab: {
    titulo: "Perdas de VAB das Empresas",
    metodologia: "Metodologia DaLA (CEPAL / Banco Mundial)",
    formula: "VAB Interrompido = (Massa Salarial Mensal × 12 / Labor Share) × (Dias Efetivos / 365)",
    parametros: [
      { nome: "Labor Share Indústria", valor: "0,338 (33,8% da massa no VAB)" },
      { nome: "Labor Share Comércio", valor: "0,433 (43,3%)" },
      { nome: "Labor Share Serviços", valor: "0,433 (43,3%)" },
      { nome: "Labor Share Agropecuária", valor: "0,176 (17,6%)" },
      { nome: "Labor Share Adm. Pública", valor: "0,883 (88,3%)" },
      { nome: "Dias Efetivos Padrão", valor: "30 dias (período de interrupção e recuperação)" },
    ],
    fonte: "RAIS 2023 (Ministério do Trabalho e Emprego) e Contas Regionais do IBGE (Tabela 17 SCN)",
    observacao:
      "A massa salarial formal é multiplicada pelo inverso do labor share setorial da CNAE do estabelecimento para estimar o Valor Adicionado Bruto (VAB) interrompido durante a cheia.",
  },
  massa_salarial: {
    titulo: "Vínculos e Massa Salarial",
    metodologia: "Cadastro da Relação Anual de Informações Sociais",
    formula: "Massa Salarial Mensal = Σ (Remuneração Média dos Vínculos Formais Ativos)",
    fonte: "RAIS 2023 (MTE) georreferenciada pelo CNPJ e endereço cadastral em Rio Grande, RS",
    observacao:
      "Representa o fluxo mensal de salários diretamente exposto no perímetro da mancha de inundação.",
  },
  educacao: {
    titulo: "Danos e Perdas Operacionais na Educação",
    metodologia: "Metodologia DaLA (CEPAL) com Parâmetros Oficiais FUNDEB",
    formula: "Perda = Matrículas × (VAAT-MIN / 200) × Dias Agudos; Custo Adicional = Perda (Total = 2 × Perda)",
    parametros: [
      { nome: "FUNDEB VAAT-MIN 2024", valor: "R$ 8.481,21 / aluno / ano" },
      { nome: "Dias Letivos Oficiais", valor: "200 dias (R$ 42,41 / aluno / dia letivo)" },
      { nome: "Modalidades Consideradas", valor: "Infantil, Fundamental, Médio, Profissional, EJA e Especial" },
      { nome: "Custo Reposição / Sala", valor: "142,2 m² × Salas Equivalentes × R$ 2.995,52/m² × 1,5" },
    ],
    fonte: "Censo Escolar 2024 (INEP/MEC) e Portaria Interministerial MEC/MF nº 9/2024",
    observacao:
      "Engloba a interrupção do serviço educacional (perda direta) e os custos adicionais de reposição de aulas, alimentação e transporte emergencial.",
  },
  saude: {
    titulo: "Perdas de Produção e Serviços de Saúde",
    metodologia: "Metodologia DaLA com Faturamento SUS SIA/SIH",
    formula: "Perda = Produção Ambulatorial e Hospitalar Anual SUS × (Dias Efetivos / 365)",
    parametros: [
      { nome: "Produção SUS", valor: "Faturamento anual aprovado de AIH (internações) e BPA (ambulatorial)" },
      { nome: "Custo Reposição Leito/Profissional", valor: "9 m²/(profissionais + leitos) × R$ 2.995,52/m² × 2,25" },
      { nome: "Dias Efetivos", valor: "30 dias no período padrão" },
    ],
    fonte: "SIA/SIH DataSUS 2024 e CNES (Cadastro Nacional de Estabelecimentos de Saúde)",
    observacao:
      "Avalia os serviços hospitalares e ambulatoriais suspensos nas unidades de saúde submersas ou ilhadas.",
  },
  agricultura: {
    titulo: "Prejuízo e Perdas Agrícolas",
    metodologia: "Superposição Espacial MapBiomas com Coeficientes EMATER/CONAB",
    formula: "Prejuízo = Σ (Área Atingida da Cultura em ha × Coeficiente R$/ha)",
    parametros: [
      { nome: "Arroz Irrigado", valor: "R$ 6.300,00 / ha" },
      { nome: "Soja", valor: "R$ 5.370,12 / ha" },
      { nome: "Milho", valor: "R$ 4.708,12 / ha" },
      { nome: "Trigo", valor: "R$ 3.800,00 / ha" },
      { nome: "Outras Culturas / Pastagens", valor: "R$ 1.100,00 / ha" },
    ],
    fonte: "MapBiomas Coleção 9 (2023), CONAB e EMATER-RS Ascar (safra 2023/2024)",
    observacao:
      "Perda tratada como custo fixo do ciclo da safra atingida, independente da duração da enchente.",
  },
  populacao: {
    titulo: "População Residente Atingida",
    metodologia: "Estatística Zonal Raster-Vetor de Alta Resolução",
    formula: "População Atingida = Σ [ Células WorldPop (100m) ∩ Mancha de Inundação ]",
    fonte: "WorldPop Hub 2024 (resolução 100m) calibrado para 198.418 habitantes oficiais (Censo IBGE 2022)",
    observacao:
      "Calculada por sobreposição direta da grade populacional contínua com a mancha de inundação do cenário.",
  },
  danos_fisicos: {
    titulo: "Danos Físicos e Exposição Patrimonial",
    metodologia: "Metodologia CLIMADA (ETH Zürich) & Custo Unitário de Reposição",
    formula: "Exposição Total (Teto) = Σ (Empresas + Educação + Saúde + Residencial)",
    parametros: [
      { nome: "CUB/RS Base (dez/2024)", valor: "R$ 2.604,24 a R$ 2.995,52 / m² (Sinduscon-RS)" },
      { nome: "Multiplicadores de Conteúdo", valor: "JRC Table 3-26: Comercial (2,0×), Indústria (2,5×), Saúde (2,25×), Educação (1,5×)" },
      { nome: "Classificação", valor: "Exposição Física (valor de reposição a 100%), não dano com profundidade contínua" },
    ],
    fonte: "scripts/valor_reposicao.py, CUB-RS Sinduscon (dezembro/2024) e cadastros temáticos",
    observacao:
      "Em Rio Grande, os rasters disponíveis são binários (seco/molhado), sem batimetria/profundidade contínua. Portanto, o valor em R$ expressa a Exposição Física (teto máximo da reposição patrimonial), sem aplicação de curvas de vulnerabilidade MDD(h).",
  },
  perdas_operacionais: {
    titulo: "Perdas Operacionais Totais (DaLA)",
    metodologia: "Damage and Loss Assessment (CEPAL / Banco Mundial)",
    formula: "Total = VAB Empresas + Perdas Educação + Custo Adicional Educação + Saúde SUS + Agricultura",
    parametros: [
      { nome: "Escala Temporal Padrão", valor: "30 dias efetivos de interrupção" },
      { nome: "Sensibilidade", valor: "Reescalonável linearmente por dias agudos e dias de recuperação" },
    ],
    fonte: "RAIS 2023, Censo Escolar 2024, DataSUS 2024, CONAB e EMATER-RS",
    observacao:
      "Avalia os fluxos econômicos e de serviços interrompidos pela cheia, sem contagem dupla com os danos a ativos físicos.",
  },
  dano_evitado: {
    titulo: "Dano e Perdas Evitadas por Intervenção",
    metodologia: "Análise Contrafactual Hidrodinâmica",
    formula: "Evitado = Baseline (Sem Intervenção) − Cenário com Obras (Diques ou Diques + Barragens)",
    parametros: [
      { nome: "Diques", valor: "Sistemas de contenção longitudinal nas margens críticas" },
      { nome: "Diques + Barragens", valor: "Contenção periférica combinada com amortecimento de montante" },
    ],
    fonte: "Simulações numéricas hidrodinâmicas e comparativo de impactos socioeconômicos",
    observacao:
      "Valores positivos representam impacto reduzido pelas obras. Valores negativos indicam neutralidade ou ligeiro acréscimo pontual decorrente da redistribuição de vazões.",
  },
  impacto_total: {
    titulo: "Impacto Total Combinado",
    metodologia: "Consolidação DaLA (Fluxos) + CLIMADA (Ativos Físicos)",
    formula: "Impacto Total = Perdas Operacionais DaLA (30 dias) + Exposição Física a Danos (CUB)",
    parametros: [
      { nome: "Perdas Operacionais (30d)", valor: "Fluxos de VAB, custos adicionais da educação, saúde SUS e agricultura" },
      { nome: "Danos Físicos (Exposição)", valor: "Teto de reposição patrimonial CUB Sinduscon dez/2024" },
    ],
    fonte: "Metodologias combinadas CEPAL (DaLA) e ETH Zürich (CLIMADA / CUB-RS)",
    observacao:
      "Soma os fluxos socioeconômicos interrompidos aos custos de reposição dos ativos prediais e conteúdos atingidos pela lâmina d'água.",
  },
  area_atingida: {
    titulo: "Área Inundada / Mancha de Alagamento",
    metodologia: "Sensoriamento Remoto e Modelagem Hidrodinâmica 2D",
    formula: "Área (ha) = Σ Células Alagadas × Área da Célula / 10.000 m²",
    parametros: [
      { nome: "Unidade de Medida", valor: "Hectares (ha) [1 ha = 10.000 m²]" },
      { nome: "Conversão km²", valor: "1 km² = 100 hectares" },
    ],
    fonte: "Simulações hidrodinâmicas FURG / IPH e imagens de satélite Sentinel-1 / PlanetScope",
    observacao:
      "Área territorial contínua de água sobre a terra em hectares durante o ápice do evento no município de Rio Grande.",
  },
  cotas: {
    titulo: "Simulação Linimétrica por Cotas",
    metodologia: "Progressão Altimétrica da Lâmina d'Água",
    formula: "Exposição sob a Cota h = Σ [ Ativos com elevação ≤ h no MDE ]",
    parametros: [
      { nome: "Faixa de Cotas", valor: "1,50 m a 3,00 m (passo de 5 cm com ponto de pico a 2,62 m)" },
      { nome: "Pico Histórico", valor: "2,62 m registrado no canal de Rio Grande em maio de 2024" },
    ],
    fonte: "Modelo Digital de Elevação (MDE) e hidrograma da FURG / IPH",
    observacao:
      "Permite ao tomador de decisão simular o avanço progressivo da água a cada centímetro de elevação da lagoa.",
  },
}
