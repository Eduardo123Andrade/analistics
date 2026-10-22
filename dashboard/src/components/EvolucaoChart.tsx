import { Legend, Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import { faturas, idxUltimaFechada } from '../dados'
import { DicaFatura } from './DicaFatura'
import { Card, eixos, margem, textoLegenda } from './grafico'

// Linha sólida para faturas fechadas; tracejada da última fechada em diante (ainda vão mudar).
const dados = faturas.map((f, i) => ({
  ...f,
  fechada: i <= idxUltimaFechada ? f.total : null,
  emAberto: i >= idxUltimaFechada ? f.total : null,
}))

export function EvolucaoChart() {
  return (
    <Card titulo="Evolução da fatura">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={dados} margin={margem}>
          {eixos}
          <Tooltip content={DicaFatura} cursor={{ stroke: 'var(--baseline)' }} />
          <Line dataKey="fechada" name="Fechada" stroke="var(--series-1)" strokeWidth={2}
            dot={{ r: 4, fill: 'var(--series-1)', stroke: 'var(--surface)', strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: 'var(--surface)', strokeWidth: 2 }} connectNulls={false} />
          <Line dataKey="emAberto" name="Em aberto" stroke="var(--series-1)" strokeWidth={2}
            strokeDasharray="5 5" dot={(p: { cx?: number; cy?: number; index: number }) =>
              p.index > idxUltimaFechada ? (
                <circle key={p.index} cx={p.cx} cy={p.cy} r={4} fill="var(--surface)" stroke="var(--series-1)" strokeWidth={2} />
              ) : <g key={p.index} />}
            activeDot={{ r: 6 }} connectNulls={false} />
          <Legend iconType="plainline" formatter={textoLegenda} wrapperStyle={{ fontSize: 12 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
