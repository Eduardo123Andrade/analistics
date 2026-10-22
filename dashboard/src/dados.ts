import { faturas as faturasBrutas, type Fatura } from './faturas'
import { detectarRecorrencias } from './recorrencias'

export interface FaturaDetalhada extends Fatura {
  recorrente: number
  outros: number // adicional sem as recorrências
}

export const recorrencias = detectarRecorrencias(faturasBrutas)

export const faturas: FaturaDetalhada[] = faturasBrutas.map((f, i) => {
  const recorrente = recorrencias.reduce((soma, r) => soma + (r.valores[i] ?? 0), 0)
  return { ...f, recorrente, outros: f.adicional - recorrente }
})

export const idxUltimaFechada = faturas.findLastIndex((f) => f.status === 'fechada')
export const idxAtual = faturas.findIndex((f) => f.status === 'atual')
// Faturas abertas ainda não têm as cobranças recorrentes do mês.
export const faturasComRecorrencia = faturas.slice(0, idxAtual === -1 ? faturas.length : idxAtual + 1)

export { brl } from './faturas'
