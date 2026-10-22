import { CartesianGrid, XAxis, YAxis } from 'recharts'
import type { ReactNode } from 'react'
import type { Status } from '../faturas'
import { faturas } from '../dados'

export const STATUS_LABEL = { fechada: 'Fechada', atual: 'Atual', aberta: 'Aberta' } as const

export const StatusTag = ({ status }: { status: Status }) => (
  <span className={`tag tag-${status}`}>{STATUS_LABEL[status]}</span>
)

export const eixoY = (v: number) => `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`

// Faturas ainda não fechadas ganham "*" no eixo.
export const tickX = (label: string) => {
  const f = faturas.find((x) => x.label === label)
  return f && f.status !== 'fechada' ? `${label}*` : label
}

// No eixo dos gráficos só cabe o mês ("Jan/26" -> "Jan").
const tickEixo = (label: string) => tickX(label).replace(/\/\d{2}/, '')

export const textoLegenda = (v: string) => <span style={{ color: 'var(--text-2)' }}>{v}</span>

export const opacidade = (status: Status) => (status === 'fechada' ? 1 : 0.5)

// Grid + eixos compartilhados. Recharts precisa dos filhos diretos, por isso é um fragmento e não um componente.
export const eixos = (
  <>
    <CartesianGrid vertical={false} stroke="var(--grid)" />
    <XAxis dataKey="label" tickFormatter={tickEixo} interval={0} padding={{ left: 12, right: 12 }} tick={{ fill: 'var(--muted)', fontSize: 11 }}
      axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
    <YAxis tickFormatter={eixoY} tick={{ fill: 'var(--muted)', fontSize: 12 }}
      axisLine={false} tickLine={false} width={64} />
  </>
)

export const margem = { top: 16, right: 16, left: 0, bottom: 0 }

export function Card({ titulo, nota, children }: { titulo: string; nota?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <h2>{titulo}</h2>
      {nota && <p className="nota">{nota}</p>}
      {children}
    </section>
  )
}
