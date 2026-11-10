import Link from "next/link"
import { SubTitle, MathBlock, DataTable, Note } from "@/components/doc-kit"
import type { Comparativo } from "@/lib/comparativo"
import { ExemploDanoEvitado } from "./ExemploDanoEvitado"

/**
 * Conteúdo da Seção 12 da Metodologia: as 12 simulações com intervenção e o cálculo do dano evitado, do raster ao R$.
 * O número, o título e a âncora (#dano-evitado) ficam em MetodologiaContent.tsx.
 */
export function ConteudoDanoEvitado({
  comparativo,
}: {
  comparativo: Comparativo | null
}) {
  return (
    <>
      <p>
        Esta seção descreve as 12 simulações com intervenção (4 eventos × 3
        variantes) e como se calcula o dano evitado : quanto uma intervenção
        reduz a área atingida, os ativos expostos e as perdas, em relação à
        situação sem a intervenção. Os resultados estão em{" "}
        <Link
          href="/perdas-operacionais"
          className="font-semibold underline underline-offset-4"
        >
          Perdas Operacionais
        </Link>{" "}
        e{" "}
        <Link
          href="/danos-fisicos"
          className="font-semibold underline underline-offset-4"
        >
          Danos Físicos
        </Link>{" "}
        e, para a simulação escolhida, na aba <em>Dano Evitado</em> do Painel.
      </p>

      <SubTitle>1. O que é comparado</SubTitle>
      <DataTable
        rows={[
          ["Variante", "Origem dos rasters", "Papel"],
          [
            "Sem intervenção",
            "cenario1",
            "Base de comparação: a situação sem a intervenção proposta",
          ],
          ["Diques", "cenario6, diques", "Intervenção"],
          ["Diques + barragens", "cenario6, diques e barragens", "Intervenção"],
        ]}
      />
      <p>
        Os quatro eventos aparecem no seletor de cenários como Simulação de
        Setembro de 2023, Simulação de Novembro de 2023, Simulação de Maio de
        2024 e Simulação de Junho de 2025 (eventos de 29/09/2023, 29/11/2023,
        21/05/2024 e 28/06/2025); a intervenção é escolhida no seletor ao lado,
        no cabeçalho, e a Simulação de Maio de 2024 sem intervenção é o cenário
        inicial. A fonte são rasters de profundidade da lâmina d&rsquo;água (em
        cm, grade de ~1 m, EPSG:31982) por bacia hidrográfica (bacias 1, 2, 3,
        4, 5 e 7), produzidos com o modelo hidrodinâmico TELEMAC.
      </p>
      <Note type="warning">
        <strong>Não são comparáveis aos cenários de outra modelagem.</strong> As
        simulações usam outro modelo que as manchas de Maio de 2024 + 50% e do
        16/05/2024: a sobreposição espacial entre elas é de cerca de 50% e os
        totais diferem muito. Compare sempre uma intervenção com a base{" "}
        <em>do mesmo evento</em>, nunca com os outros cenários. Também não são
        previsão nem dado observado.
      </Note>

      <SubTitle>2. Do raster ao cenário</SubTitle>
      <ul className="list-inside list-disc space-y-1">
        <li>
          <strong>Mosaico.</strong> As 6 bacias são reunidas numa grade comum.
          Onde duas bacias se sobrepõem vale a maior profundidade: somar
          contaria a mesma água duas vezes (em 21/05/2024 com diques, a soma por
          bacia dá 465,7 ha e o mosaico 333 ha).
        </li>
        <li>
          <strong>Atingido = profundidade ≥ 10 cm</strong> (pixel sem dado é
          seco). O cenário combinado do 16/05 usa 45 cm para o nível da lagoa;
          aqui o corte é o do estilo entregue com os rasters e o mesmo da mancha
          binária da Seção 1. Os dois limiares não são equivalentes.
        </li>
        <li>
          <strong>Mancha.</strong> A máscara é suavizada por voto de maioria,
          vetorizada, dissolvida e simplificada (mesmo tratamento do 16/05), e
          serve ao cruzamento espacial.
        </li>
        <li>
          <strong>Profundidade.</strong> O mapa mostra a profundidade em 7
          faixas de cor (10–44, 45–64, 65–84, 85–104, 105–124, 125–144 e ≥ 145
          cm); a faixa de 10–44 cm é lâmina rasa.
        </li>
      </ul>

      <SubTitle>3. Do cenário aos indicadores</SubTitle>
      <p>
        Cada mancha passa pelo mesmo cruzamento espacial das Seções 2 a 8:
        empresas (Seção 3), agricultura e cobertura (Seção 4), educação (Seção
        5), saúde (Seção 6), patrimônio (Seção 7) e infraestrutura (Seção 8, com
        ruas, quadras e terrenos). Ou seja, os 12 cenários têm os mesmos
        indicadores que os outros cenários, mais três medidas por simulação:
      </p>
      <ul className="list-inside list-disc space-y-1">
        <li>
          <strong>População atingida</strong>: soma do raster WorldPop 2024 de
          100 m dentro da mancha e do limite municipal (Seção 9).
        </li>
        <li>
          <strong>Área de cobertura da terra atingida</strong> (ha, MapBiomas),
          medida nos polígonos das classes sob a água.
        </li>
        <li>
          <strong>Área agrícola atingida</strong> (ha), depois do filtro de
          ruído de 0,5 ha: nas simulações nenhum fragmento passa do filtro e o
          valor é zero.
        </li>
      </ul>

      <SubTitle>4. Dos indicadores aos R$</SubTitle>
      <p>Há duas medidas em R$, que não se somam:</p>
      <ul className="list-inside list-disc space-y-1">
        <li>
          <strong>Perdas operacionais</strong> (Seção 10, método DaLA): produção
          e serviços interrompidos, por componente (empresas, educação, saúde e
          agricultura). Usam os parâmetros do evento: Setembro de 2023 usa os de
          setembro/2023 e Maio de 2024 os de maio/2024; Novembro de 2023 e Junho
          de 2025 usam dias interpolados pela área atingida (32 e 23 dias
          efetivos; estimativa, pois não há parâmetros próprios).
        </li>
        <li>
          <strong>Exposição física</strong> (Seção 11): valor de reposição de
          tudo o que molha, com 100% de cada ponto, um teto do dano. Sem a curva
          de dano por profundidade não há R$ de dano físico.
        </li>
      </ul>
      <DataTable
        rows={[
          [
            "Setor",
            "Área considerada",
            "Custo unitário (CUB/RS)",
            "Multiplicador de conteúdo",
          ],
          [
            "Empresas",
            "9 m² por vínculo",
            "R$ 2.604,24/m² (indústria CNAE 05–39: R$ 1.301,56/m²)",
            "2,0 (indústria: 2,5)",
          ],
          [
            "Educação",
            "salas equivalentes × 142,2 m², com piso de 1 sala; a educação especial é somada ao fundamental",
            "R$ 2.995,52/m²",
            "1,5",
          ],
          [
            "Saúde",
            "9 m² por pessoa (profissionais + leitos), com piso de 1 pessoa",
            "R$ 2.995,52/m²",
            "2,25",
          ],
        ]}
      />
      <p>
        As salas equivalentes de uma escola são: infantil ÷ (20 × 2) +
        (fundamental + especial) ÷ (32,2 × 2) + (médio + profissional + EJA) ÷
        (50 × 2), com 2 turnos. Aplicada às camadas base, essa regra reproduz os
        totais de exposição de Danos Físicos (empresas ao centavo; educação e
        saúde com razão 1,0000), o que valida o cálculo para as simulações.
      </p>

      <SubTitle>5. O dano evitado</SubTitle>
      <p>
        Para um indicador <em>X</em> (área, número de empresas, R$ de perdas, R$
        de exposição...) e uma intervenção <em>k</em>:
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
          Valor positivo = evitado; negativo = a intervenção piora o indicador,
          e o valor é mostrado como está, sem truncar (acontece, por exemplo,
          com diques + barragens em Setembro de 2023).
        </li>
        <li>
          Com baseline zero o percentual fica indefinido e aparece como
          &ldquo;—&rdquo;, nunca como 0% nem como infinito.
        </li>
        <li>
          Ao escolher outra duração (30, 45 ou 60 dias), as perdas de empresas,
          educação e saúde são proporcionais aos dias efetivos; a agricultura é
          custo fixo (como na Seção 10).
        </li>
      </ul>

      <SubTitle>6. Exemplo numérico completo</SubTitle>
      <ExemploDanoEvitado comparativo={comparativo} />

      <SubTitle>7. Como interpretar</SubTitle>
      <ul className="list-inside list-disc space-y-1">
        <li>
          É uma comparação entre duas simulações do mesmo modelo para o mesmo
          evento, não uma previsão.
        </li>
        <li>
          Diferenças de poucos % entre diques e diques + barragens podem estar
          dentro da incerteza do modelo; não há estimativa de incerteza.
        </li>
        <li>
          Perdas operacionais e exposição física medem coisas diferentes e não
          se somam; exposição evitada não é dano evitado.
        </li>
        <li>
          A população atingida das simulações vem do raster WorldPop 2024 de 100
          m (população residente modelada, não contagem do Censo); use-a para
          comparar simulações entre si.
        </li>
      </ul>
      <SubTitle>8. Onde aparece no painel</SubTitle>
      <ul className="list-inside list-disc space-y-1">
        <li>
          <strong>Cabeçalho.</strong> O seletor <em>Intervenção</em> (ativo só
          nas quatro simulações), o botão de camadas <em>População</em> (mapa de
          calor, começa desligado) e o botão de reiniciar, que devolve o painel
          ao estado de abertura: Simulação de Maio de 2024 sem intervenção,
          camadas e filtros padrão e câmera na posição inicial das simulações.
        </li>
        <li>
          <strong>Sem intervenção.</strong> O Resumo mostra os cartões de{" "}
          <em>Perdas Operacionais</em> (DaLA, 30 dias efetivos, por componente)
          e de <em>Danos Físicos</em> (exposição, um teto), no lugar da área
          agrícola.
        </li>
        <li>
          <strong>Com diques ou diques + barragens.</strong> A aba{" "}
          <em>Dano Evitado</em> substitui o Resumo. Cada cartão mostra o valor
          evitado, o percentual evitado (o mesmo da barra) e os valores sem e
          com a intervenção. As demais abas (Empresas, Saúde, Educação,
          Patrimônio, Infraestrutura, Agricultura e Cobertura) ganham, no topo,
          um bloco de diferença com os indicadores da própria aba.
        </li>
        <li>
          <strong>Rodapé.</strong> A defasagem das bases, os parâmetros DaLA do
          evento e os atalhos para Perdas Operacionais, Danos Físicos e esta
          Metodologia aparecem no fim do Resumo e do Dano Evitado.
        </li>
        <li>
          <strong>Mapa.</strong> As simulações abrem na mesma posição, qualquer
          que seja a intervenção; trocar só a intervenção não move a câmera.
        </li>
      </ul>

      <p className="text-[12px] text-slate-600">
        As limitações desta seção estão reunidas na{" "}
        <a
          href="#lim-intervencoes"
          className="font-semibold underline underline-offset-4"
        >
          Seção 13: Limitações (D. Cenários de intervenção)
        </a>
        .
      </p>
    </>
  )
}
