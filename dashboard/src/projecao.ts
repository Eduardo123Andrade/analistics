import { faturas, recorrencias } from './dados'
import { labelMes, somarMeses, type Status } from './faturas'
import type { Recorrencia } from './recorrencias'

export interface Projecao {
  vencimento: string
  label: string
  status: Status
  base: number
  recorrenteLancado: number
  recorrentePrevisto: number // recorrências ativas que ainda não cobraram nesta fatura
  pendentes: Recorrencia[]
  adicionalLancado: number
  adicionalEstimado: number // quanto ainda falta para o adicional chegar à estimativa
  total: number
  totalMin: number
  totalMax: number
}

// Adicional (sem recorrências) das faturas fechadas é a referência de gasto variável.
const historico = faturas.filter((f) => f.status === 'fechada')
const adicionais = historico.map((f) => f.outros)
export const adicionalMin = Math.min(...adicionais)
export const adicionalMax = Math.max(...adicionais)
export const adicionalMedio = (adicionalMin + adicionalMax) / 2
export const mesMin = historico[adicionais.indexOf(adicionalMin)]
export const mesMax = historico[adicionais.indexOf(adicionalMax)]

function projetar(
  dados: Pick<Projecao, 'vencimento' | 'label' | 'status' | 'base' | 'recorrenteLancado' | 'pendentes' | 'adicionalLancado'>,
): Projecao {
  const recorrentePrevisto = dados.pendentes.reduce((s, r) => s + r.valorAtual, 0)
  const fixo = dados.base + dados.recorrenteLancado + recorrentePrevisto
  const adicionalEstimado = Math.max(0, adicionalMedio - dados.adicionalLancado)
  return {
    ...dados,
    recorrentePrevisto,
    adicionalEstimado,
    total: fixo + dados.adicionalLancado + adicionalEstimado,
    totalMin: fixo + Math.max(dados.adicionalLancado, adicionalMin),
    totalMax: fixo + Math.max(dados.adicionalLancado, adicionalMax),
  }
}

// Faturas que já têm CSV mas ainda não fecharam (atual e aberta).
const comCsv = faturas
  .map((fatura, i) => ({ fatura, i }))
  .filter(({ fatura }) => fatura.status !== 'fechada')
  .map(({ fatura, i }) =>
    projetar({
      vencimento: fatura.vencimento,
      label: fatura.label,
      status: fatura.status,
      base: fatura.base,
      recorrenteLancado: fatura.recorrente,
      pendentes: recorrencias.filter((r) => r.ativa && r.valores[i] === null),
      adicionalLancado: fatura.outros,
    }),
  )

// Meses depois do último CSV: as parcelas dele avançam um mês por vez até acabarem.
const ultima = faturas.at(-1)!
const parcelasUltima = ultima.lancamentos
  .map((l) => ({ valor: l.amount, m: l.title.match(/Parcela (\d+)\/(\d+)$/) }))
  .filter(({ m }) => m !== null)
  .map(({ valor, m }) => ({ valor, restantesDepois: Number(m![2]) - Number(m![1]) }))
const mesesFuturos = Math.max(0, ...parcelasUltima.map((p) => p.restantesDepois))
const ativas = recorrencias.filter((r) => r.ativa)

const futuras = Array.from({ length: mesesFuturos }, (_, j) => {
  const vencimento = somarMeses(ultima.vencimento, j + 1)
  return projetar({
    vencimento,
    label: labelMes(vencimento),
    status: 'estimada',
    base: parcelasUltima.filter((p) => p.restantesDepois > j).reduce((s, p) => s + p.valor, 0),
    recorrenteLancado: 0,
    pendentes: ativas,
    adicionalLancado: 0,
  })
})

export const projecoes: Projecao[] = [...comCsv, ...futuras]
