# Auditoria de Desempenho e Correção de Bugs — 10/11/2026

Registro dos testes de desempenho, diagnósticos e correções aplicados ao Dashboard CIEX (PR #15).

---

## 1. Desempenho (`Slow`, Rede e CPU)

### 1.1 Redução de `-23,93 MB` no carregamento inicial (`app/page.tsx`)
- **Problema**:
  - Na abertura do painel (com o cenário padrão `Simulação de Maio de 2024 – Sem intervenção` ativo), o efeito `useEffect([infraAtivas, baseReady])` disparava imediatamente o download de `terrenos_BASE.fgb` (**17,44 MB**, 71.019 polígonos) e `logradouros_BASE.geojson` (**2,66 MB**, 8.184 feições), embora o mapa desenhasse apenas `atingidosInfra` quando um cenário estava selecionado.
  - Em seguida, o mesmo efeito baixava **pela segunda vez** `infra_terrenos_ATINGIDOS_*.fgb` (**3,07 MB**) e `infra_logradouros_ATINGIDOS_*.geojson` (**0,76 MB**), que já haviam sido carregados no `Promise.all` inicial.
  - Além disso, a condição `if (!total || !infraAtivas.includes(nome)) return null` bloqueava a renderização de `atingidosInfra` no mapa até que `baseInfra` (`terrenos_BASE.fgb`, 17,44 MB) terminasse de baixar.
- **Correção**:
  - `baseInfra` passa a ser baixada somente quando `(Ver Total)` está ativo (`!cenario || cenario === "(nenhum)"`).
  - Quando um cenário está ativo (`cenario !== "(nenhum)"` e `cenario !== COTAS_CENARIO`), apenas camadas em `infraAtivas` que ainda não estejam em `atingidosInfra` são requisitadas (`!atingidosInfra[i]`), eliminando as requisições duplicadas.
  - A renderização das camadas de infraestrutura e `interactiveLayerIds` passaram a usar diretamente `atingidosInfra[nome]` quando há cenário ativo, sem aguardar `baseInfra`.
  - O alerta de confirmação de tamanho (`~17 MB` para `Terrenos`) só é exibido quando `(Ver Total)` está selecionado e `baseInfra["Terrenos"]` ainda não foi carregada.

### 1.2 Remoção da espera bloqueante de `5.000 ms` na troca de cenário (`app/page.tsx`)
- **Problema**:
  - Ao alternar entre eventos de simulação, o aplicativo buscava o `.geojson` da mancha, iniciava `map.flyTo(..., { duration: 5000 })` e aguardava um `setTimeout(..., 5000)` terminar **antes** de iniciar as requisições de rede (`dataPromises`) das camadas atingidas.
- **Correção**:
  - `dataPromises` e `manchaPromise` agora são disparados **em paralelo** via `Promise.all([dataPromises, manchaPromise])`, e a duração da transição de câmera foi ajustada para `2.500 ms`.

### 1.3 Otimização da animação do raster de Cotas (`9×` mais rápida e sem alocação por quadro) (`hooks/useCotaRaster.ts`)
- **Problema**:
  - O raster `cota_mapa.webp` possui `2660 × 1626` = **4.325.160 pixels** (`17,3 MB` em `ImageData`), dos quais apenas **270.323 pixels (~6,2%)** alagam em alguma cota.
  - A cada quadro da animação (`60 fps`), `ctx.createImageData(2660, 1626)` alocava um novo buffer de **17,3 MB** (~`1 GB/s` de pressão no Garbage Collector), varria todos os 4,32 milhões de pixels e recalculava a interpolação de opacidade por pixel.
- **Correção**:
  - Um único `ImageData` (`imgBuffer.current`) é alocado na carga do raster e reutilizado em todos os quadros.
  - Os índices dos pixels que alagam (`molhados.current`, `Uint32Array` com 270.323 posições) são pré-indexados uma única vez na abertura do raster.
  - A cada quadro, a cor RGBA de 32 bits é calculada apenas uma vez por nível de cota (`corPorNivel[1..5]`) e aplicada somente sobre `molhados.current`.
  - **Resultado medido (60 quadros)**: redução de `191,15 ms` para `21,24 ms` (**9× mais rápido**, `0,35 ms/quadro`) e zero alocações de `17,3 MB` durante a reprodução.

### 1.4 Memoização separada do cálculo geodésico `@turf/turf` (`app/page.tsx`)
- **Problema**:
  - `metricasCob` e `metricasAgri` calculavam `featsFiltrados(baseCobertura)` (`16,93 MB`) e `featsFiltrados(baseAgricultura)` (`2,61 MB`) dentro do mesmo `useMemo` que dependia de `atingidosCobertura` / `atingidosAgricultura`, recalculando `turf.area` sobre as bases completas a cada troca de cenário.
- **Correção**:
  - Separados em `featsBaseCob`, `featsImpCob`, `featsBaseAgri` e `featsImpAgri` com dependências independentes.

---

## 2. Correções de Bugs e Glitches

### 2.1 Crash ao abrir permalink `/?cenario=todas-as-cotas` (`app/page.tsx`)
- **Problema**:
  - Quando a URL inicial continha `?cenario=todas-as-cotas` (`Simulação por Cotas`), o efeito de carga inicial tentava buscar `rio_grande___simulacao_por_cotas.geojson` (inexistente → 404 → `mancha = null`) e lançava `Error("mancha do cenário inicial ausente")`, exibindo o alerta de falha de carga e travando o painel.
- **Correção**:
  - Detectado `isCotasInicial = initialCenario === COTAS_CENARIO` na carga inicial: não exige `.geojson` de mancha nem dispara requisições para arquivos `*_ATINGIDOS_*` inexistentes, carregando `infra_stats` do cenário padrão para manter os totais de infraestrutura disponíveis.

### 2.2 Aba Infraestrutura presa em `<Skeleton />` ao alternar `Simulação por Cotas` → `(Ver Total)` (`app/page.tsx`)
- **Problema**:
  - Selecionar `Simulação por Cotas` limpava `infraStats` (`setInfraStats(null)`). Ao mudar em seguida para `(Ver Total)` (`cenario === "(nenhum)"`), `infraStats` permanecia `null` e a aba Infraestrutura exibia `<Skeleton />` permanentemente.
- **Correção**:
  - `infraStats` é preservado ao entrar em `Simulação por Cotas` (onde o bloco `total` é idêntico para qualquer cenário), e a aba Infraestrutura verifica `cenario === COTAS_CENARIO` diretamente antes de checar `!infraStats`.

### 2.3 Mancha residual e rótulo `"(nenhum)"` na Legenda ao selecionar `(Ver Total)` (`app/page.tsx`)
- **Problema**:
  - Ao selecionar `(Ver Total)`, `setManchaCenario(null)` e a limpeza dos atingidos ficavam atrasados em `5.000 ms` (`setTimeout`), mantendo a mancha visível no mapa e exibindo o item `"(nenhum)"` na Legenda durante 5 segundos.
- **Correção**:
  - A limpeza de `manchaCenario` e `atingidos*` agora é imediata ao selecionar `(Ver Total)`, e `mostraMancha` na Legenda exige `cenario !== "(nenhum)"`.

### 2.4 Heatmap de Educação omitindo 3 modalidades de ensino (`app/page.tsx`)
- **Problema**:
  - A camada `heatmap-educacao-layer` somava apenas `qtd_matri_inf`, `qtd_matri_fund` e `qtd_matri_med`, ignorando `qtd_matri_prof`, `qtd_matri_eja` e `qtd_matri_esp` (**8.920 matrículas** em 127 escolas de Rio Grande, deixando 5 escolas com peso zero).
- **Correção**:
  - Incluídas as 6 modalidades na expressão `heatmap-weight`, alinhando o mapa de calor com `calcEdu` (`lib/metricas.ts`).

### 2.5 Permalink apagando `lng`, `lat` e `zoom` da URL (`app/page.tsx`)
- **Problema**:
  - O `useEffect([cenario])` que atualiza a query string rodava antes do término da carga inicial e criava um `new URLSearchParams()` vazio, removendo `lng`, `lat` e `zoom` da URL.
- **Correção**:
  - O efeito aguarda `initialLoadDoneRef.current` e parte de `new URLSearchParams(window.location.search)`, preservando `lng`, `lat` e `zoom`.

### 2.6 Restauração do aviso de pilha de geocodificação na aba Empresas (`app/page.tsx`)
- **Problema**:
  - O aviso metodológico sobre as 777 empresas (260 CEPs distintos) empilhadas na mesma coordenada em Rio Grande (`detectarPilha` / `pontosNaPilha` em `lib/pilhas.ts`) havia sido removido acidentalmente.
- **Correção**:
  - Restaurado o cálculo memoizado de `pilhaEmpresas` / `empresasNaPilha` e o banner de aviso na aba Empresas com link para `/metodologia#limitacoes`.

### 2.7 KPI da aba Patrimônio ignorando o filtro de tipologia (`app/page.tsx`)
- **Problema**:
  - Na aba Patrimônio Histórico, o card `<KPIRow titulo="Patrimônios">` exibia sempre os totais sem filtro (`metricasPatrimonio`), mesmo quando `filtroTipologia !== "(todas)"`.
- **Correção**:
  - Criados `renderPatrimonioMetrics` e `basePatrimonioFiltMetrics`, exibindo o total e o percentual filtrados quando `filtroTipologia !== "(todas)"`, consistente com as abas Empresas, Educação e Saúde.

### 2.8 Aviso de `metadataBase` no build de produção (`app/layout.tsx`)
- **Problema**:
  - `next build` emitia aviso quando `NEXT_PUBLIC_SITE_URL` não estava definida no ambiente.
- **Correção**:
  - Definido fallback `new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")` em `metadataBase`.
