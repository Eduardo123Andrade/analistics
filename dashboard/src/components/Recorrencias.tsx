import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { brl, faturas, faturasComRecorrencia, idxUltimaFechada, recorrencias, type FaturaDetalhada } from '../dados'
import { Card, eixos, margem, opacidade, StatusTag, tickX } from './grafico'

function DicaRecorrencia({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const f = payload[0].payload as FaturaDetalhada
  const i = faturas.findIndex((x) => x.vencimento === f.vencimento)
  const doMes = recorrencias.filter((r) => r.valores[i] !== null).sort((a, b) => b.valores[i]! - a.valores[i]!)
  return (
    <div className="tooltip">
      <div className="tooltip-titulo">{f.label} <StatusTag status={f.status} /></div>
      {doMes.map((r) => (
        <div key={r.nome} className="tooltip-linha">{r.nome}<b>{brl(r.valores[i]!)}</b></div>
      ))}
      <div className="tooltip-linha total">Total recorrente<b>{brl(f.recorrente)}</b></div>
      <div className="tooltip-linha">% da fatura<b>{Math.round((f.recorrente / f.total) * 100)}%</b></div>
    </div>
  )
}

function ResumoRecorrencias() {
  const ativas = recorrencias.filter((r) => r.ativa)
  const encerradas = recorrencias.filter((r) => !r.ativa)
  const soma = (lista: typeof recorrencias) => lista.reduce((s, r) => s + r.valorAtual, 0)
  const ultimaFechada = faturas[idxUltimaFechada]

  return (
    <div className="kpis kpis-inline">
      <div className="kpi">
        <span>Ativas ({ativas.length})</span>
        <strong>{brl(soma(ativas))}<small>/mês</small></strong>
      </div>
      <div className="kpi">
        <span>Encerradas ({encerradas.length})</span>
        <strong>{brl(soma(encerradas))}<small>/mês</small></strong>
      </div>
      <div className="kpi">
        <span>Recorrente na última fechada ({ultimaFechada.label})</span>
        <strong>{brl(ultimaFechada.recorrente)}</strong>
      </div>
    </div>
  )
}

function LinhaDoTempo() {
  const inicioLabel = (i: number) => (i === 0 ? `≤ ${faturas[0].label}` : faturas[i].label)

  return (
    <div className="tabela-wrap">
      <table className="timeline">
        <thead>
          <tr>
            <th>Recorrência</th><th>Status</th><th>Início</th><th>Fim</th><th>Valor atual</th>
            {faturasComRecorrencia.map((f) => <th key={f.vencimento} className="mes">{tickX(f.label)}</th>)}
          </tr>
        </thead>
        <tbody>
          {recorrencias.map((r) => (
            <tr key={r.nome} className={r.ativa ? '' : 'encerrada'}>
              <td className="nome">{r.nome}</td>
              <td><span className={`tag ${r.ativa ? 'tag-ativa' : ''}`}>{r.ativa ? 'Ativa' : 'Encerrada'}</span></td>
              <td>{inicioLabel(r.inicio)}</td>
              <td>{r.ativa ? '—' : faturas[r.fim].label}</td>
              <td><b>{brl(r.valorAtual)}</b></td>
              {faturasComRecorrencia.map((f, i) => {
                const v = r.valores[i]
                const dentro = i >= r.inicio && i <= r.fim
                return (
                  <td key={f.vencimento} className={`mes ${v !== null ? 'cheio' : dentro ? 'buraco' : ''}`}
                    title={v !== null ? `${r.nome} · ${f.label}: ${brl(v)}` : dentro ? `${f.label}: sem cobrança` : undefined}>
                    {v !== null ? Math.round(v) : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Recorrencias() {
  return (
    <Card
      titulo="Recorrências"
      nota="Cobranças que não são parcela e se repetem mês a mês com valor parecido (pelo menos 3 meses). IOF de assinatura internacional está somado à assinatura."
    >
      <ResumoRecorrencias />
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={faturasComRecorrencia} margin={margem} barCategoryGap="30%">
          {eixos}
          <Tooltip content={DicaRecorrencia} cursor={{ fill: 'var(--grid)', opacity: 0.5 }} />
          <Bar dataKey="recorrente" name="Recorrente" fill="var(--series-3)" radius={[4, 4, 0, 0]}>
            {faturasComRecorrencia.map((f) => <Cell key={f.vencimento} fillOpacity={opacidade(f.status)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <h3>Linha do tempo</h3>
      <LinhaDoTempo />
    </Card>
  )
}
