import { brl, faturas } from '../dados'
import { StatusTag } from './grafico'

export function TabelaFaturas() {
  return (
    <div className="tabela-wrap">
      <table>
        <thead>
          <tr>
            <th>Fatura</th><th>Status</th><th>Base</th><th>Recorrente</th><th>Adicional</th><th>Total</th><th>% base</th>
          </tr>
        </thead>
        <tbody>
          {faturas.map((f) => (
            <tr key={f.vencimento}>
              <td>{f.label}</td>
              <td><StatusTag status={f.status} /></td>
              <td>{brl(f.base)}</td>
              <td>{brl(f.recorrente)}</td>
              <td>{brl(f.outros)}</td>
              <td><b>{brl(f.total)}</b></td>
              <td>{f.total ? Math.round((f.base / f.total) * 100) : 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
