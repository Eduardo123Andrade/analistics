# analistics

Dashboard para analisar as faturas do cartão Nubank a partir dos CSVs exportados pelo app: de onde vem o valor de cada fatura, quais cobranças se repetem e quanto as próximas faturas devem custar.

## Como rodar

Coloque os CSVs das faturas em `.csvs/` na raiz do repositório (pasta ignorada pelo git), com o nome que o Nubank usa: `Nubank_AAAA-MM-DD.csv`, onde a data é o vencimento da fatura.

```bash
cd dashboard
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # checagem de tipos + build em dist/
npm run lint     # oxlint
```

Os CSVs são lidos em tempo de build (`import.meta.glob`), então não há backend: os dados ficam embutidos no bundle.

Ao importar uma fatura nova, atualize `ULTIMA_FECHADA` em [dashboard/src/faturas.ts](dashboard/src/faturas.ts) com o vencimento da última fatura fechada. A seguinte é tratada como **atual** e as demais com CSV como **abertas**.

## Como a fatura é dividida

Cada lançamento cai em uma de três partes:

- **Base**: parcela `k/N` com `k ≥ 2`, ou seja, continuação de uma compra de meses anteriores. É o valor que já estava comprometido.
- **Recorrente**: cobranças que se repetem mês a mês com valor parecido (assinaturas). O IOF de assinatura internacional é somado à assinatura.
- **Adicional**: todo o resto (compras à vista, 1ª parcela de parcelamentos novos, estornos, IOF avulso).

`Pagamento recebido` é o pagamento da fatura anterior e fica de fora do total.

## Seções do dashboard

- **Visão geral**: KPIs, evolução da fatura e composição base × recorrente × adicional, com tabela por fatura em "Ver mais detalhes".
- **Próximas faturas**: projeção até a última parcela em aberto. Soma as parcelas já lançadas, as recorrências ativas e um adicional estimado pela média entre o mínimo e o máximo histórico. Meses sem CSV aparecem como **estimada**.
- **Recorrências**: assinaturas detectadas, com valor atual, status (ativa/encerrada) e linha do tempo.
- **Antecipar parcelas**: dado um orçamento, escolhe quais parcelamentos antecipar para reduzir ao máximo a próxima fatura aberta (mochila 0/1) e mostra o efeito mês a mês. Segue a regra do Nubank: antecipar remove as **últimas** parcelas do item.
- **Adicional**: gasto variável de cada mês comparado com a média, parcelamentos novos e o que eles comprometem nos meses seguintes, além da lista de lançamentos.

## Detecção de recorrências

Em [dashboard/src/recorrencias.ts](dashboard/src/recorrencias.ts). Os lançamentos são agrupados por nome e, dentro de cada nome, encadeados em sequências mês a mês:

- valores com até 30% de diferença do mês anterior contam como a mesma cobrança (cobre reajustes);
- tolera 1 mês sem cobrança (cobrança que escorregou de ciclo);
- precisa de pelo menos 3 meses na sequência;
- pelo menos metade das cobranças do estabelecimento precisam estar em sequências, o que descarta Uber, posto etc.

Ajustes manuais ficam no topo do arquivo: `APELIDOS` junta a mesma assinatura cobrada com nomes diferentes (o intermediador de pagamento muda) e `IGNORAR` remove o que repete valor sem ser assinatura, como recargas.

## Estrutura

```
.csvs/                      CSVs exportados do Nubank (não versionados)
dashboard/                  Vite + React + TypeScript + Recharts
  src/faturas.ts            leitura dos CSVs, base × adicional, status das faturas
  src/recorrencias.ts       detecção de recorrências
  src/dados.ts              faturas com recorrente e adicional separados
  src/projecao.ts           projeção das próximas faturas
  src/antecipacao.ts        plano ótimo de antecipação e efeito por mês
  src/components/           seções e gráficos
```
