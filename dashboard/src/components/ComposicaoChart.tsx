import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts'
import { faturas } from '../dados'
import { DicaFatura } from './DicaFatura'
import { Card, eixos, margem, opacidade, textoLegenda, useEstreito } from './grafico'

const ORDEM_LEGENDA = ['Base', 'Recorrente', 'Adicional']

export function ComposicaoChart() {
  const estreito = useEstreito()
  return (
    <Card
      titulo="Base × recorrente × adicional"
      nota={<>
        <b>Base</b>: parcelas 2/N em diante. <b>Recorrente</b>: assinaturas e contas fixas.{' '}
        <b>Adicional</b>: o resto do ciclo (à vista, parcela 1/N, estornos).
      </>}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={faturas} margin={margem} barCategoryGap="30%">
          {eixos(estreito)}
          <Tooltip content={DicaFatura} cursor={{ fill: 'var(--grid)', opacity: 0.5 }} />
          <Bar dataKey="base" name="Base" stackId="f" fill="var(--series-1)" stroke="var(--surface)" strokeWidth={1}>
            {faturas.map((f) => <Cell key={f.vencimento} fillOpacity={opacidade(f.status)} />)}
          </Bar>
          <Bar dataKey="recorrente" name="Recorrente" stackId="f" fill="var(--series-3)" stroke="var(--surface)" strokeWidth={1}>
            {faturas.map((f) => <Cell key={f.vencimento} fillOpacity={opacidade(f.status)} />)}
          </Bar>
          <Bar dataKey="outros" name="Adicional" stackId="f" fill="var(--series-2)" stroke="var(--surface)"
            strokeWidth={1} radius={[4, 4, 0, 0]}>
            {faturas.map((f) => <Cell key={f.vencimento} fillOpacity={opacidade(f.status)} />)}
          </Bar>
          <Legend iconType="square" itemSorter={(i) => ORDEM_LEGENDA.indexOf(String(i.value))}
            formatter={textoLegenda} wrapperStyle={{ fontSize: 12 }} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
