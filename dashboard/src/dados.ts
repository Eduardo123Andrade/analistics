import { faturas as faturasBrutas, type Fatura, type Lancamento } from './faturas'
import { detectarRecorrencias } from './recorrencias'

export interface FaturaDetalhada extends Fatura {
  recorrente: number
  outros: number // adicional sem as recorrências
  itensAdicionais: Lancamento[] // lançamentos que compõem `outros`
}

export const recorrencias = detectarRecorrencias(faturasBrutas)

const lancamentosRecorrentes = new Set(recorrencias.flatMap((r) => r.cobrancas))

// Parcela k/N com k >= 2 é base (ver faturas.ts); parcela 1/N é compra nova, entra no adicional.
const ehParcelaAntiga = (title: string) => Number(title.match(/Parcela (\d+)\/\d+/)?.[1] ?? 1) >= 2

const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.amount, 0)

// Recorrência tem prioridade: parcela de plano renovado sai da base (2/N+) ou do adicional (1/N).
export const faturas: FaturaDetalhada[] = faturasBrutas.map((f) => {
  const lancamentos = f.lancamentos.filter((l) => l.title !== 'Pagamento recebido')
  const recorrentes = lancamentos.filter((l) => lancamentosRecorrentes.has(l))
  const itensAdicionais = lancamentos.filter((l) => !ehParcelaAntiga(l.title) && !lancamentosRecorrentes.has(l))
  const base = soma(lancamentos.filter((l) => ehParcelaAntiga(l.title) && !lancamentosRecorrentes.has(l)))
  return { ...f, base, recorrente: soma(recorrentes), outros: soma(itensAdicionais), itensAdicionais }
})

export { lancamentosRecorrentes }

export const idxUltimaFechada = faturas.findLastIndex((f) => f.status === 'fechada')
export const idxAtual = faturas.findIndex((f) => f.status === 'atual')
// Faturas abertas ainda não têm as cobranças recorrentes do mês.
export const faturasComRecorrencia = faturas.slice(0, idxAtual === -1 ? faturas.length : idxAtual + 1)

export { brl } from './faturas'
