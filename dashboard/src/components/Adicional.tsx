import { useState } from 'react'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { brl, faturasComRecorrencia, type FaturaDetalhada } from '../dados'
import type { Lancamento } from '../faturas'
import { adicionalMedio } from '../projecao'
import { Card, eixos, margem, StatusTag, useEstreito } from './grafico'

const meses = faturasComRecorrencia.filter((f) => f.itensAdicionais.length)

const parcela = (title: string) => title.match(/^(.*) - Parcela (\d+)\/(\d+)$/)

const dataCurta = (date: string) => date.split('-').reverse().slice(0, 2).join('/')

interface Grupo {
  nome: string
  itens: Lancamento[] // do mais recente para o mais antigo
  total: number
  parcelas?: number // N quando é um parcelamento novo (1/N)
}

// Agrupa por estabelecimento; parcelamento novo usa o nome sem o "- Parcela 1/N".
function agrupar(itens: Lancamento[]): Grupo[] {
  const grupos = new Map<string, Grupo>()
  for (const l of [...itens].sort((a, b) => b.date.localeCompare(a.date))) {
    const m = parcela(l.title)
    const nome = m ? m[1] : l.title
    const g = grupos.get(nome) ?? { nome, itens: [], total: 0 }
    g.itens.push(l)
    g.total += l.amount
    if (m) g.parcelas = Number(m[3])
    grupos.set(nome, g)
  }
  return [...grupos.values()].sort((a, b) => b.total - a.total)
}

function TabelaGrupos({ itens, total }: { itens: Lancamento[]; total: number }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const alternar = (nome: string) =>
    setAbertos((atual) => {
      const novo = new Set(atual)
      if (!novo.delete(nome)) novo.add(nome)
      return novo
    })
  const pct = (v: number) => (total ? `${Math.round((v / total) * 100)}%` : '—')

  return (
    <div className="tabela-wrap">
      <table className="tabela-grupos">
        <thead>
          <tr><th>Data</th><th>Estabelecimento</th><th>Valor</th><th>% do adicional</th></tr>
        </thead>
        <tbody>
          {agrupar(itens).map((g) => {
            const agrupado = g.itens.length > 1
            const aberto = abertos.has(g.nome)
            return [
              <tr key={g.nome} className={aberto ? 'grupo-aberto' : ''}>
                {/* Agrupado: data do lançamento mais recente. */}
                <td>{dataCurta(g.itens[0].date)}</td>
                <td>
                  <span className="nome-adicional">
                    {agrupado ? (
                      <button type="button" className="expandir" aria-expanded={aberto} onClick={() => alternar(g.nome)}
                        aria-label={`${aberto ? 'Recolher' : 'Expandir'} ${g.nome}`}>
                        <span className="seta" aria-hidden>{aberto ? '▾' : '▸'}</span>
                        {g.nome}
                        <span className="tag">{g.itens.length}×</span>
                      </button>
                    ) : (
                      g.nome
                    )}
                    {g.parcelas && <span className="tag">parcelado {g.parcelas}×</span>}
                  </span>
                </td>
                <td><b>{brl(g.total)}</b></td>
                <td>{pct(g.total)}</td>
              </tr>,
              ...(aberto
                ? g.itens.map((l, i) => (
                    <tr key={`${g.nome}-${i}`} className="sublinha">
                      <td>{dataCurta(l.date)}</td>
                      <td>{g.nome}</td>
                      <td>{brl(l.amount)}</td>
                      <td />
                    </tr>
                  ))
                : []),
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}

function Dica({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const f = payload[0].payload as FaturaDetalhada
  return (
    <div className="tooltip">
      <div className="tooltip-titulo">{f.label} <StatusTag status={f.status} /></div>
      <div className="tooltip-linha"><i className="swatch swatch-adicional" />Adicional<b>{brl(f.outros)}</b></div>
      <div className="tooltip-linha">Lançamentos<b>{f.itensAdicionais.length}</b></div>
    </div>
  )
}

export function Adicional() {
  const estreito = useEstreito()
  const [sel, setSel] = useState(meses.length - 1)
  const mes = meses[sel]
  if (!mes) return null

  const novas = mes.itensAdicionais
    .map((l) => ({ l, m: parcela(l.title) }))
    .filter(({ m }) => m !== null && m[2] === '1')
  const primeirasParcelas = novas.reduce((s, { l }) => s + l.amount, 0)
  const comprometido = novas.reduce((s, { l, m }) => s + l.amount * (Number(m![3]) - 1), 0)
  const difMedia = mes.outros - adicionalMedio

  return (
    <Card
      titulo="Adicional"
      nota="O que entrou a mais em cada mês: tudo fora das parcelas antigas e das recorrências — compras à vista, 1ª parcela de parcelamentos novos, estornos. Toque numa barra para ver o mês."
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={meses} margin={margem} barCategoryGap="30%">
          {eixos(estreito)}
          <Tooltip content={Dica} cursor={{ fill: 'var(--grid)', opacity: 0.5 }} />
          <ReferenceLine y={adicionalMedio} stroke="var(--text-2)" strokeDasharray="4 4"
            label={{ value: 'média', position: 'insideTopRight', fill: 'var(--text-2)', fontSize: 11 }} />
          <Bar dataKey="outros" name="Adicional" fill="var(--series-2)" radius={[4, 4, 0, 0]}
            onClick={(_, i) => setSel(i)} style={{ cursor: 'pointer' }}>
            {meses.map((f, i) => <Cell key={f.vencimento} fillOpacity={i === sel ? 1 : 0.35} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <label className="campo-valor">
        Mês
        <select className="input-reais" value={sel} onChange={(e) => setSel(Number(e.target.value))}>
          {meses.map((f, i) => <option key={f.vencimento} value={i}>{f.label}</option>)}
        </select>
        <StatusTag status={mes.status} />
      </label>

      <div className="kpis kpis-inline">
        <div className="kpi">
          <span>Adicional em {mes.label}</span>
          <strong>{brl(mes.outros)}</strong>
          <p className="faixa">{difMedia >= 0 ? '+' : ''}{brl(difMedia)} vs. média ({brl(adicionalMedio)})</p>
        </div>
        <div className="kpi">
          <span>Lançamentos</span>
          <strong>{mes.itensAdicionais.length}</strong>
        </div>
        <div className="kpi">
          <span>Parcelamentos novos ({novas.length})</span>
          <strong>{brl(primeirasParcelas)}</strong>
          <p className="faixa">{comprometido ? `+${brl(comprometido)} nos próximos meses` : 'nenhum'}</p>
        </div>
      </div>

      <h3>Lançamentos de {mes.label}</h3>
      <TabelaGrupos key={mes.vencimento} itens={mes.itensAdicionais} total={mes.outros} />
    </Card>
  )
}
