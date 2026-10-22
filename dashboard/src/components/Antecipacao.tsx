import { useMemo, useState } from 'react'
import { Bar, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { alvo, candidatos, efeitoDoPlano, melhorPlano, projecaoAlvo, type Candidato, type Efeito } from '../antecipacao'
import { brl, faturas } from '../dados'
import { Detalhes } from './Detalhes'
import { Card, eixos, margem, textoLegenda } from './grafico'

const atual = faturas.find((f) => f.status === 'atual')

// Composição da fatura depois do plano, de baixo para cima.
const SEGMENTOS = [
  { chave: 'base', nome: 'Parcelas restantes', fill: 'var(--series-1)', swatch: 'swatch-base' },
  { chave: 'recorrente', nome: 'Recorrente', fill: 'var(--series-3)', swatch: 'swatch-recorrente' },
  { chave: 'adicional', nome: 'Adicional', fill: 'var(--series-2)', swatch: 'swatch-adicional' },
  { chave: 'adicionalEstimado', nome: 'Adicional estimado', fill: 'url(#hachura-2)', swatch: 'swatch-adicional hachurado' },
  { chave: 'antecipacao', nome: 'Valor antecipado', fill: 'var(--series-4)', swatch: 'swatch-antecipacao' },
] as const
const ORDEM_LEGENDA: string[] = [...SEGMENTOS.map((s) => s.nome), 'Sem antecipar']

const diferenca = (e: Efeito) => {
  const dif = e.depois - e.antes
  return Math.abs(dif) < 0.005 ? '—' : `${dif > 0 ? '+' : ''}${brl(dif)}`
}

function Dica({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const e = payload[0].payload as Efeito
  return (
    <div className="tooltip">
      <div className="tooltip-titulo">{e.label}</div>
      {SEGMENTOS.filter((s) => e[s.chave] !== 0).map((s) => (
        <div key={s.chave} className="tooltip-linha"><i className={`swatch ${s.swatch}`} />{s.nome}<b>{brl(e[s.chave])}</b></div>
      ))}
      <div className="tooltip-linha total">Com antecipação<b>{brl(e.depois)}</b></div>
      <div className="tooltip-linha"><i className="swatch swatch-antes" />Sem antecipar<b>{brl(e.antes)}</b></div>
      <div className="tooltip-linha">Diferença<b>{diferenca(e)}</b></div>
    </div>
  )
}

function TabelaEfeito({ efeito }: { efeito: Efeito[] }) {
  return (
    <div className="tabela-wrap">
      <table className="tabela-efeito">
        <thead>
          <tr>
            <th>Fatura</th><th>Parcelas restantes</th><th>Recorrente</th><th>Adicional</th><th>Antecipado</th>
            <th>Com antecipação</th><th>Sem antecipar</th><th>Diferença</th>
          </tr>
        </thead>
        <tbody>
          {efeito.map((e) => (
            <tr key={e.vencimento}>
              <td>{e.label}</td>
              <td>{brl(e.base)}</td>
              <td>{brl(e.recorrente)}</td>
              <td>{brl(e.adicional + e.adicionalEstimado)}</td>
              <td>{e.antecipacao ? brl(e.antecipacao) : '—'}</td>
              <td><b>{brl(e.depois)}</b></td>
              <td>{brl(e.antes)}</td>
              <td>{diferenca(e)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// "1.234,56" -> 1234.56
const lerValor = (s: string) => Number(s.replace(/[^\d,]/g, '').replace(',', '.')) || 0

const faixaParcelas = (c: Candidato) => (c.restantes === 1 ? `${c.total}/${c.total}` : `${c.atual}–${c.total}/${c.total}`)

function TabelaCandidatos({ itens, escolhidos }: { itens: Candidato[]; escolhidos?: Set<number> }) {
  return (
    <div className="tabela-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th><th>Parcelas a antecipar</th><th>Custo</th><th>Reduz {alvo?.label}</th>
            <th>Terminava em</th><th>R$ reduzido / R$ 100</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((c) => (
            <tr key={c.id} className={escolhidos?.has(c.id) ? 'escolhido' : ''}>
              <td>{c.nome}</td>
              <td>{faixaParcelas(c)}</td>
              <td>{brl(c.custo)}</td>
              <td><b>{brl(c.parcela)}</b></td>
              <td>{c.terminaEm}</td>
              <td>{brl((c.parcela / c.custo) * 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Antecipacao() {
  const [texto, setTexto] = useState('1.000')
  const orcamento = lerValor(texto)
  const [cobrarNaAtual, setCobrarNaAtual] = useState(true)
  const [comEstimativa, setComEstimativa] = useState(true)
  const plano = useMemo(() => melhorPlano(orcamento), [orcamento])
  const efeito = useMemo(() => efeitoDoPlano(plano, cobrarNaAtual, comEstimativa), [plano, cobrarNaAtual, comEstimativa])

  if (!alvo || !projecaoAlvo) return null

  const custo = plano.reduce((s, c) => s + c.custo, 0)
  const reducao = plano.reduce((s, c) => s + c.parcela, 0)
  const escolhidos = new Set(plano.map((c) => c.id))
  const vencimentoAlvo = alvo.vencimento
  const efeitoAlvo = efeito.find((e) => e.vencimento === vencimentoAlvo)!

  return (
    <Card
      titulo="Antecipar parcelas"
      nota={<>
        Antecipar remove as <b>últimas</b> parcelas do item, então para tirar uma parcela de {alvo.label} é
        preciso antecipar ela e todas as seguintes. O plano escolhe a combinação de itens que mais reduz{' '}
        {alvo.label} sem passar do valor. Valores nominais — se o Nubank der desconto na antecipação, o custo real é menor.
      </>}
    >
      <label className="campo-valor">
        Quanto você quer antecipar?
        <span className="input-reais">
          R$
          <input inputMode="decimal" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Valor a antecipar em reais" />
        </span>
      </label>

      <div className="kpis kpis-inline">
        <div className="kpi">
          <span>{alvo.label} estimada</span>
          <strong>{brl(efeitoAlvo.depois)}</strong>
          <p className="faixa">antes: {brl(efeitoAlvo.antes)}</p>
        </div>
        <div className="kpi">
          <span>Redução em {alvo.label}</span>
          <strong>{brl(reducao)}</strong>
          <p className="faixa">{custo ? `${Math.round((reducao / custo) * 100)}% do valor antecipado` : '—'}</p>
        </div>
        <div className="kpi">
          <span>Valor antecipado</span>
          <strong>{brl(custo)}</strong>
          <p className="faixa">sobra {brl(Math.max(0, orcamento - custo))}</p>
        </div>
      </div>

      <h3>Faturas com e sem antecipação</h3>
      <div className="opcoes">
        {atual && (
          <label className="opcao">
            <input type="checkbox" checked={cobrarNaAtual} onChange={(e) => setCobrarNaAtual(e.target.checked)} />
            Valor antecipado cobrado na fatura atual ({atual.label})
          </label>
        )}
        <label className="opcao">
          <input type="checkbox" checked={comEstimativa} onChange={(e) => setComEstimativa(e.target.checked)} />
          Incluir adicional estimado (gasto variável médio)
        </label>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={efeito} margin={margem} barCategoryGap="25%">
          {eixos}
          <Tooltip content={Dica} cursor={{ fill: 'var(--grid)', opacity: 0.5 }} />
          {SEGMENTOS.map((s, i) => (
            <Bar key={s.chave} dataKey={s.chave} name={s.nome} stackId="e" legendType="square" fill={s.fill} stroke="var(--surface)"
              strokeWidth={1} radius={i === SEGMENTOS.length - 1 ? [4, 4, 0, 0] : undefined} />
          ))}
          <Line dataKey="antes" name="Sem antecipar" legendType="plainline" stroke="var(--text-2)" strokeWidth={2} strokeDasharray="5 4"
            dot={{ r: 3, fill: 'var(--surface)', stroke: 'var(--text-2)', strokeWidth: 2 }} activeDot={{ r: 5 }} />
          <Legend itemSorter={(i) => ORDEM_LEGENDA.indexOf(String(i.value))}
            formatter={textoLegenda} wrapperStyle={{ fontSize: 12 }} />
        </ComposedChart>
      </ResponsiveContainer>

      {plano.length ? (
        <>
          <h3>Antecipar</h3>
          <TabelaCandidatos itens={plano} />
        </>
      ) : (
        <p className="nota">
          Nenhum item cabe nesse valor. O mais barato para tirar de {alvo.label} custa{' '}
          {brl(Math.min(...candidatos.map((c) => c.custo)))}.
        </p>
      )}

      <Detalhes>
        <h3>Mês a mês</h3>
        <TabelaEfeito efeito={efeito} />
        <h3>Todas as parcelas de {alvo.label}</h3>
        <TabelaCandidatos itens={candidatos} escolhidos={escolhidos} />
      </Detalhes>
    </Card>
  )
}
