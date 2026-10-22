import { faturas, recorrencias, type FaturaDetalhada } from './dados'
import type { Recorrencia } from './recorrencias'

export interface Projecao {
  fatura: FaturaDetalhada
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

export const projecoes: Projecao[] = faturas
  .map((fatura, i) => ({ fatura, i }))
  .filter(({ fatura }) => fatura.status !== 'fechada')
  .map(({ fatura, i }) => {
    const pendentes = recorrencias.filter((r) => r.ativa && r.valores[i] === null)
    const recorrentePrevisto = pendentes.reduce((s, r) => s + r.valorAtual, 0)
    const fixo = fatura.base + fatura.recorrente + recorrentePrevisto
    const adicionalLancado = fatura.outros
    const adicionalEstimado = Math.max(0, adicionalMedio - adicionalLancado)
    return {
      fatura,
      base: fatura.base,
      recorrenteLancado: fatura.recorrente,
      recorrentePrevisto,
      pendentes,
      adicionalLancado,
      adicionalEstimado,
      total: fixo + adicionalLancado + adicionalEstimado,
      totalMin: fixo + Math.max(adicionalLancado, adicionalMin),
      totalMax: fixo + Math.max(adicionalLancado, adicionalMax),
    }
  })
