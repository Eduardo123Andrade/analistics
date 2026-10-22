import { Bar, BarChart, ErrorBar, Legend, ResponsiveContainer, Tooltip } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { brl, faturas, idxUltimaFechada } from '../dados'
import {
  adicionalMax, adicionalMedio, adicionalMin, mesMax, mesMin, projecoes, type Projecao as P,
} from '../projecao'
import { Detalhes } from './Detalhes'
import { Card, eixos, margem, StatusTag, textoLegenda } from './grafico'

const dados = projecoes.map((p) => ({
  ...p,
  // ErrorBar recebe [abaixo, acima] relativos ao topo da pilha.
  faixa: [p.total - p.totalMin, p.totalMax - p.total],
}))

const SEGMENTOS = [
  { chave: 'base', nome: 'Base', fill: 'var(--series-1)', swatch: 'swatch-base' },
  { chave: 'recorrenteLancado', nome: 'Recorrente', fill: 'var(--series-3)', swatch: 'swatch-recorrente' },
  { chave: 'recorrentePrevisto', nome: 'Recorrente previsto', fill: 'url(#hachura-3)', swatch: 'swatch-recorrente hachurado' },
  { chave: 'adicionalLancado', nome: 'Adicional', fill: 'var(--series-2)', swatch: 'swatch-adicional' },
  { chave: 'adicionalEstimado', nome: 'Adicional estimado', fill: 'url(#hachura-2)', swatch: 'swatch-adicional hachurado' },
] as const

function Linhas({ p }: { p: P }) {
  return (
    <>
      {SEGMENTOS.filter((s) => p[s.chave] !== 0).map((s) => (
        <div key={s.chave} className="tooltip-linha"><i className={`swatch ${s.swatch}`} />{s.nome}<b>{brl(p[s.chave])}</b></div>
      ))}
      <div className="tooltip-linha total">Total estimado<b>{brl(p.total)}</b></div>
      <div className="tooltip-linha">Faixa<b>{brl(p.totalMin)} – {brl(p.totalMax)}</b></div>
    </>
  )
}

function Dica({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as P
  return (
    <div className="tooltip">
      <div className="tooltip-titulo">{p.label} <StatusTag status={p.status} /></div>
      <Linhas p={p} />
    </div>
  )
}

// Só atual e aberta ganham card; os meses estimados ficam no gráfico e na tabela.
const comCsv = projecoes.filter((p) => p.status !== 'estimada')

function TabelaProjecoes() {
  return (
    <div className="tabela-wrap">
      <table>
        <thead>
          <tr>
            <th>Fatura</th><th>Status</th><th>Base</th><th>Recorrente</th><th>Adicional</th><th>Total estimado</th><th>Faixa</th>
          </tr>
        </thead>
        <tbody>
          {projecoes.map((p) => (
            <tr key={p.vencimento}>
              <td>{p.label}</td>
              <td><StatusTag status={p.status} /></td>
              <td>{brl(p.base)}</td>
              <td>{brl(p.recorrenteLancado + p.recorrentePrevisto)}</td>
              <td>{brl(p.adicionalLancado + p.adicionalEstimado)}</td>
              <td><b>{brl(p.total)}</b></td>
              <td>{brl(p.totalMin)} – {brl(p.totalMax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Explicacao() {
  const fechadas = faturas.slice(0, idxUltimaFechada + 1)
  return (
    <div className="explicacao">
      <div>
        <h3>Adicional nas faturas fechadas</h3>
        <table>
          <tbody>
            {fechadas.map((f) => (
              <tr key={f.vencimento}>
                <td>{f.label}</td>
                <td>{brl(f.outros)}</td>
                <td className="marca">{f === mesMin ? 'mínimo' : f === mesMax ? 'máximo' : ''}</td>
              </tr>
            ))}
            <tr className="destaque"><td>(mín + máx) / 2</td><td>{brl(adicionalMedio)}</td><td /></tr>
          </tbody>
        </table>
      </div>
      {comCsv.map((p, i) => (
        <div key={p.vencimento}>
          <h3>Recorrências previstas em {p.label}{i === comCsv.length - 1 && ' em diante'}</h3>
          <table>
            <tbody>
              {p.pendentes.map((r) => (
                <tr key={r.nome}><td>{r.nome}</td><td>{brl(r.valorAtual)}</td></tr>
              ))}
              <tr className="destaque"><td>Total</td><td>{brl(p.recorrentePrevisto)}</td></tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

export function Projecao() {
  return (
    <Card
      titulo="Próximas faturas"
      nota={<>
        Base e recorrências já são conhecidas. O adicional é estimado pela média entre o menor
        ({brl(adicionalMin)}) e o maior ({brl(adicionalMax)}) adicional das faturas fechadas — na fatura atual,
        só entra o que falta para chegar nela. A faixa vai do cenário mínimo ao máximo. Meses estimados (sem CSV)
        usam as parcelas que já existem e as recorrências ativas; parcelamentos novos ainda vão somar à base.
      </>}
    >
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={dados} margin={margem} barCategoryGap="25%">
          {eixos}
          <Tooltip content={Dica} cursor={{ fill: 'var(--grid)', opacity: 0.5 }} />
          {SEGMENTOS.map((s, i) => (
            <Bar key={s.chave} dataKey={s.chave} name={s.nome} stackId="p" fill={s.fill} stroke="var(--surface)"
              strokeWidth={1} radius={i === SEGMENTOS.length - 1 ? [4, 4, 0, 0] : undefined}>
              {i === SEGMENTOS.length - 1 && <ErrorBar dataKey="faixa" width={12} stroke="var(--text-2)" strokeWidth={1.5} />}
            </Bar>
          ))}
          <Legend iconType="square" itemSorter={(i) => SEGMENTOS.findIndex((s) => s.nome === i.value)} formatter={textoLegenda} wrapperStyle={{ fontSize: 12 }} />
        </BarChart>
      </ResponsiveContainer>
      <div className="projecao-cards">
        {comCsv.map((p) => (
          <div key={p.vencimento} className="kpi">
            <span>{p.label} <StatusTag status={p.status} /></span>
            <strong>{brl(p.total)}</strong>
            <p className="faixa">entre {brl(p.totalMin)} e {brl(p.totalMax)}</p>
            <Linhas p={p} />
          </div>
        ))}
      </div>
      <Detalhes>
        <h3>Mês a mês</h3>
        <TabelaProjecoes />
        <Explicacao />
      </Detalhes>
    </Card>
  )
}
