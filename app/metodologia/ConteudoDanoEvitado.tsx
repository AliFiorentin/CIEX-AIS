import Link from "next/link"
import { SubTitle, MathBlock, DataTable, Note } from "@/components/doc-kit"
import type { Comparativo } from "@/lib/comparativo"
import { ExemploDanoEvitado } from "./ExemploDanoEvitado"

/**
 * Conteúdo da Seção 12 da Metodologia: as 12 simulações com intervenção e o cálculo do dano evitado, do raster ao R$.
 * O número, o título e a âncora (#dano-evitado) ficam em MetodologiaContent.tsx.
 */
export function ConteudoDanoEvitado({ comparativo }: { comparativo: Comparativo | null }) {
  return (
    <>
      <p>
        Esta seção descreve as <strong>12 simulações com intervenção</strong> (4 eventos × 3 variantes) e como se
        calcula o <strong>dano evitado</strong>: quanto uma intervenção reduz a área atingida, os ativos expostos e as
        perdas, em relação à situação sem a intervenção. Os resultados estão em{" "}
        <Link href="/perdas-operacionais" className="font-semibold underline underline-offset-4">
          Perdas Operacionais
        </Link>{" "}
        e{" "}
        <Link href="/danos-fisicos" className="font-semibold underline underline-offset-4">
          Danos Físicos
        </Link>{" "}
        e, para a simulação escolhida, na aba <em>Dano Evitado</em> do Painel.
      </p>

      <SubTitle>1. O que é comparado</SubTitle>
      <DataTable
        rows={[
          ["Variante", "Origem dos rasters", "Papel"],
          ["Sem intervenção", "cenario1", "Base de comparação: a situação sem a intervenção proposta"],
          ["Diques", "cenario6, diques", "Intervenção"],
          ["Diques + barragens", "cenario6, diques e barragens", "Intervenção"],
        ]}
      />
      <p>
        Os eventos simulados são <strong>29/09/2023, 29/11/2023, 21/05/2024 e 28/06/2025</strong>. A fonte são rasters
        de profundidade da lâmina d&rsquo;água (em cm, grade de ~1 m, EPSG:31982) por bacia hidrográfica (bacias 1, 2, 3,
        4, 5 e 7), produzidos com o modelo hidrodinâmico TELEMAC.
      </p>
      <Note type="warning">
        <strong>Não são comparáveis aos cenários anteriores.</strong> As simulações usam outro modelo que as manchas de
        Setembro 2023, Maio 2024 e 16/05/2024: a sobreposição espacial entre elas é de cerca de 50% e os totais diferem
        muito (a base de 21/05/2024 tem perdas várias vezes maiores que o &ldquo;Cenário Maio 2024&rdquo;). Compare
        sempre uma intervenção com a base <em>do mesmo evento</em>, nunca com os cenários antigos. Também não são
        previsão nem dado observado.
      </Note>

      <SubTitle>2. Do raster ao cenário</SubTitle>
      <ul className="list-inside list-disc space-y-1">
        <li>
          <strong>Mosaico.</strong> As 6 bacias são reunidas numa grade comum. Onde duas bacias se sobrepõem vale a{" "}
          <strong>maior profundidade</strong>: somar contaria a mesma água duas vezes (em 21/05/2024 com diques, a
          soma por bacia dá 465,7 ha e o mosaico 333 ha).
        </li>
        <li>
          <strong>Atingido = profundidade ≥ 10 cm</strong> (pixel sem dado é seco). O cenário combinado do 16/05 usa
          45 cm para o nível da lagoa; aqui o corte é o do estilo entregue com os rasters e o mesmo da mancha binária da
          Seção 1. Os dois limiares não são equivalentes.
        </li>
        <li>
          <strong>Mancha.</strong> A máscara é suavizada por voto de maioria, vetorizada, dissolvida e simplificada
          (mesmo tratamento do 16/05), e serve ao cruzamento espacial.
        </li>
        <li>
          <strong>Profundidade.</strong> O mapa mostra a profundidade em 7 faixas de cor (10–44, 45–64, 65–84, 85–104,
          105–124, 125–144 e ≥ 145 cm); a faixa de 10–44 cm é lâmina rasa.
        </li>
      </ul>

      <SubTitle>3. Do cenário aos indicadores</SubTitle>
      <p>
        Cada mancha passa pelo mesmo cruzamento espacial (<code>intersects</code>) das Seções 2 a 8: empresas
        (Seção 3), agricultura e cobertura (Seção 4), educação (Seção 5), saúde (Seção 6), patrimônio (Seção 7) e
        infraestrutura (Seção 8). Ou seja, os 12 cenários têm os mesmos indicadores que os cenários anteriores.
      </p>

      <SubTitle>4. Dos indicadores aos R$</SubTitle>
      <p>
        Há duas medidas em R$, que <strong>não se somam</strong>:
      </p>
      <ul className="list-inside list-disc space-y-1">
        <li>
          <strong>Perdas operacionais</strong> (Seção 10, método DaLA): produção e serviços interrompidos, por
          componente (empresas, educação, saúde e agricultura). Usam os parâmetros do evento: 29/09/2023 usa os de
          setembro/2023; 21/05/2024 usa os de maio/2024; <strong>29/11/2023 e 28/06/2025 usam os de maio/2024</strong>{" "}
          (premissa, pois não há parâmetros próprios).
        </li>
        <li>
          <strong>Exposição física</strong> (Seção 11): valor de reposição de tudo o que molha, com 100% de cada ponto,
          um <strong>teto</strong> do dano. Sem a curva de dano por profundidade não há R$ de dano físico.
        </li>
      </ul>
      <DataTable
        rows={[
          ["Setor", "Área considerada", "Custo unitário (CUB/RS)", "Multiplicador de conteúdo"],
          ["Empresas", "9 m² por vínculo", "R$ 2.604,24/m² (indústria CNAE 05–39: R$ 1.301,56/m²)", "2,0 (indústria: 2,5)"],
          [
            "Educação",
            "salas equivalentes × 142,2 m², com piso de 1 sala; a educação especial é somada ao fundamental",
            "R$ 2.995,52/m²",
            "1,5",
          ],
          ["Saúde", "9 m² por pessoa (profissionais + leitos), com piso de 1 pessoa", "R$ 2.995,52/m²", "2,25"],
        ]}
      />
      <p>
        As salas equivalentes de uma escola são: infantil ÷ (20 × 2) + (fundamental + especial) ÷ (32,2 × 2) +
        (médio + profissional + EJA) ÷ (50 × 2), com 2 turnos. Aplicada às camadas base, essa regra reproduz os totais de
        exposição de Danos Físicos (empresas ao centavo; educação e saúde com razão 1,0000), o que valida o cálculo
        para as simulações.
      </p>

      <SubTitle>5. O dano evitado</SubTitle>
      <p>
        Para um indicador <em>X</em> (área, número de empresas, R$ de perdas, R$ de exposição...) e uma intervenção{" "}
        <em>k</em>:
      </p>
      <MathBlock
        exprs={[
          { label: "Evitado", tex: "E_k(X) = X_{\\text{sem}} - X_k" },
          {
            label: "Evitado em percentual (indefinido se o baseline é zero)",
            tex: "e_k(X) = \\dfrac{E_k(X)}{X_{\\text{sem}}}, \\quad X_{\\text{sem}} \\neq 0",
          },
          {
            label: "Perdas operacionais totais",
            tex: "P = P_{\\text{emp}} + P_{\\text{edu}} + P_{\\text{sau}} + P_{\\text{agr}}",
          },
          {
            label: "Perdas evitadas (a conta fecha nos dois sentidos)",
            tex: "E_k(P) = E_k(P_{\\text{emp}}) + E_k(P_{\\text{edu}}) + E_k(P_{\\text{sau}}) + E_k(P_{\\text{agr}})",
          },
        ]}
      />
      <ul className="list-inside list-disc space-y-1">
        <li>
          Valor <strong>positivo</strong> = evitado; <strong>negativo</strong> = a intervenção piora o indicador, e o
          valor é mostrado como está, sem truncar (acontece, por exemplo, com diques + barragens em 29/09/2023).
        </li>
        <li>
          Com baseline zero o percentual fica indefinido e aparece como &ldquo;—&rdquo;, nunca como 0% nem como infinito.
        </li>
        <li>
          Ao escolher outra duração (30, 45 ou 60 dias), as perdas de empresas, educação e saúde são proporcionais aos
          dias efetivos; a agricultura é custo fixo (como na Seção 10).
        </li>
      </ul>

      <SubTitle>6. Exemplo numérico completo</SubTitle>
      <ExemploDanoEvitado comparativo={comparativo} />

      <SubTitle>7. Como interpretar</SubTitle>
      <ul className="list-inside list-disc space-y-1">
        <li>É uma comparação entre duas simulações do mesmo modelo para o mesmo evento, não uma previsão.</li>
        <li>
          Diferenças de poucos % entre diques e diques + barragens podem estar dentro da incerteza do modelo; não há
          estimativa de incerteza.
        </li>
        <li>
          Perdas operacionais e exposição física medem coisas diferentes e não se somam; <strong>exposição evitada
          não é dano evitado</strong>.
        </li>
        <li>
          A população atingida não foi calculada para as simulações (o raster de população não está disponível e o
          método foi descartado na auditoria de 2026-11-08).
        </li>
      </ul>
      <p className="text-[12px] text-slate-600">
        As limitações desta seção estão reunidas na{" "}
        <a href="#lim-intervencoes" className="font-semibold underline underline-offset-4">
          Seção 13: Limitações (D. Cenários de intervenção)
        </a>
        .
      </p>
    </>
  )
}
