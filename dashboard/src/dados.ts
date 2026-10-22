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

export const faturas: FaturaDetalhada[] = faturasBrutas.map((f, i) => {
  const recorrente = recorrencias.reduce((soma, r) => soma + (r.valores[i] ?? 0), 0)
  const itensAdicionais = f.lancamentos.filter(
    (l) => l.title !== 'Pagamento recebido' && !ehParcelaAntiga(l.title) && !lancamentosRecorrentes.has(l),
  )
  return { ...f, recorrente, outros: f.adicional - recorrente, itensAdicionais }
})

export const idxUltimaFechada = faturas.findLastIndex((f) => f.status === 'fechada')
export const idxAtual = faturas.findIndex((f) => f.status === 'atual')
// Faturas abertas ainda não têm as cobranças recorrentes do mês.
export const faturasComRecorrencia = faturas.slice(0, idxAtual === -1 ? faturas.length : idxAtual + 1)

export { brl } from './faturas'
