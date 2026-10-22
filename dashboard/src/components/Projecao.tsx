import { Bar, BarChart, Cell, ErrorBar, Legend, ResponsiveContainer, Tooltip } from 'recharts'
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
  label: p.fatura.label,
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
      <div className="tooltip-titulo">{p.fatura.label} <StatusTag status={p.fatura.status} /></div>
      <Linhas p={p} />
    </div>
  )
}

// Padrões hachurados para as partes estimadas; ficam num SVG à parte e são referenciados por id.
function Hachuras() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {[2, 3].map((n) => (
          <pattern key={n} id={`hachura-${n}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={`var(--series-${n})`} fillOpacity={0.2} />
            <line x1="0" y1="0" x2="0" y2="6" stroke={`var(--series-${n})`} strokeWidth="3" />
          </pattern>
        ))}
      </defs>
    </svg>
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
      {projecoes.map((p) => (
        <div key={p.fatura.vencimento}>
          <h3>Recorrências previstas em {p.fatura.label}</h3>
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
        só entra o que falta para chegar nela. A faixa vai do cenário mínimo ao máximo.
      </>}
    >
      <Hachuras />
      <div className="projecao">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={dados} margin={margem} barSize={72}>
            {eixos}
            <Tooltip content={Dica} cursor={{ fill: 'var(--grid)', opacity: 0.5 }} />
            {SEGMENTOS.map((s, i) => (
              <Bar key={s.chave} dataKey={s.chave} name={s.nome} stackId="p" fill={s.fill} stroke="var(--surface)"
                strokeWidth={1} radius={i === SEGMENTOS.length - 1 ? [4, 4, 0, 0] : undefined}>
                {i === SEGMENTOS.length - 1 && <ErrorBar dataKey="faixa" width={16} stroke="var(--text-2)" strokeWidth={1.5} />}
                {dados.map((d) => <Cell key={d.fatura.vencimento} />)}
              </Bar>
            ))}
            <Legend iconType="square" itemSorter={(i) => SEGMENTOS.findIndex((s) => s.nome === i.value)} formatter={textoLegenda} wrapperStyle={{ fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
        <div className="projecao-cards">
          {projecoes.map((p) => (
            <div key={p.fatura.vencimento} className="kpi">
              <span>{p.fatura.label} <StatusTag status={p.fatura.status} /></span>
              <strong>{brl(p.total)}</strong>
              <p className="faixa">entre {brl(p.totalMin)} e {brl(p.totalMax)}</p>
              <Linhas p={p} />
            </div>
          ))}
        </div>
      </div>
      <Detalhes>
        <Explicacao />
      </Detalhes>
    </Card>
  )
}
