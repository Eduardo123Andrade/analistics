import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { brl, type FaturaDetalhada } from '../dados'
import { StatusTag } from './grafico'

export function DicaFatura({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const f = payload[0].payload as FaturaDetalhada
  return (
    <div className="tooltip">
      <div className="tooltip-titulo">{f.label} <StatusTag status={f.status} /></div>
      <div className="tooltip-linha"><i className="swatch swatch-base" />Base<b>{brl(f.base)}</b></div>
      <div className="tooltip-linha"><i className="swatch swatch-recorrente" />Recorrente<b>{brl(f.recorrente)}</b></div>
      <div className="tooltip-linha"><i className="swatch swatch-adicional" />Adicional<b>{brl(f.outros)}</b></div>
      <div className="tooltip-linha total">Total<b>{brl(f.total)}</b></div>
    </div>
  )
}
