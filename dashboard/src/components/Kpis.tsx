import { brl, faturas } from '../dados'

export function Kpis() {
  const fechadas = faturas.filter((f) => f.status === 'fechada')
  const atual = faturas.find((f) => f.status === 'atual')
  const media = (campo: 'total' | 'base') => fechadas.reduce((s, f) => s + f[campo], 0) / fechadas.length

  return (
    <section className="kpis">
      <div className="kpi">
        <span>Fatura atual ({atual?.label})</span>
        <strong>{atual ? brl(atual.total) : '—'}</strong>
      </div>
      <div className="kpi">
        <span>Última fechada ({fechadas.at(-1)!.label})</span>
        <strong>{brl(fechadas.at(-1)!.total)}</strong>
      </div>
      <div className="kpi">
        <span>Média das fechadas</span>
        <strong>{brl(media('total'))}</strong>
      </div>
      <div className="kpi">
        <span>Base média (parcelas)</span>
        <strong>{brl(media('base'))}</strong>
      </div>
    </section>
  )
}
