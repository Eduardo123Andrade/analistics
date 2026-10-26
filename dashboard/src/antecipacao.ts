import { faturas, lancamentosRecorrentes } from './dados'
import { labelMes } from './faturas'
import { projecoes } from './projecao'

// No Nubank, antecipar parcelas remove as ÚLTIMAS parcelas do item. Para a parcela sumir da
// fatura alvo é preciso antecipar ela e todas as seguintes.

export interface Candidato {
  id: number
  nome: string
  parcela: number
  atual: number // número da parcela na fatura alvo (k de k/N)
  total: number
  restantes: number // parcelas a antecipar, incluindo a da fatura alvo
  custo: number
  terminaEm: string
}

// Fatura alvo: a primeira ainda aberta (a seguinte à atual).
export const alvo = faturas.find((f) => f.status === 'aberta')
export const projecaoAlvo = projecoes.find((p) => p.vencimento === alvo?.vencimento)

export const candidatos: Candidato[] = (alvo?.lancamentos ?? [])
  .map((l, id) => ({ l, id, m: l.title.match(/^(.*) - Parcela (\d+)\/(\d+)$/) }))
  // Plano parcelado renovado conta como recorrência, não como parcela a antecipar.
  .filter(({ m, l }) => m !== null && l.amount > 0 && !lancamentosRecorrentes.has(l))
  .map(({ l, id, m }) => {
    const atual = Number(m![2])
    const total = Number(m![3])
    const restantes = total - atual + 1
    return {
      id,
      nome: m![1],
      parcela: l.amount,
      atual,
      total,
      restantes,
      custo: l.amount * restantes,
      terminaEm: labelMes(alvo!.vencimento, restantes - 1),
    }
  })
  .sort((a, b) => a.restantes - b.restantes || b.parcela - a.parcela)

// Mochila 0/1: maximiza a redução na fatura alvo com custo <= orçamento.
// Custos arredondados para cima em reais, então o plano nunca passa do orçamento.
export function melhorPlano(orcamento: number): Candidato[] {
  const cap = Math.floor(orcamento)
  if (cap <= 0 || !candidatos.length) return []
  const n = candidatos.length
  const melhor = new Float64Array(cap + 1)
  const pegou = Array.from({ length: n }, () => new Uint8Array(cap + 1))
  candidatos.forEach((c, i) => {
    const peso = Math.ceil(c.custo - 1e-9)
    for (let w = cap; w >= peso; w--) {
      const com = melhor[w - peso] + c.parcela
      // Empate: fica com o que já tinha (itens anteriores têm menos parcelas restantes).
      if (com > melhor[w] + 1e-9) {
        melhor[w] = com
        pegou[i][w] = 1
      }
    }
  })
  const plano: Candidato[] = []
  let w = cap
  for (let i = n - 1; i >= 0; i--) {
    if (pegou[i][w]) {
      plano.push(candidatos[i])
      w -= Math.ceil(candidatos[i].custo - 1e-9)
    }
  }
  return plano.reverse()
}

export interface Efeito {
  vencimento: string
  label: string
  antes: number // total sem antecipar
  base: number // parcelas que sobram depois do plano
  recorrente: number
  adicional: number // já lançado
  adicionalEstimado: number
  antecipacao: number // valor antecipado cobrado nesta fatura
  depois: number
}

// Fatura a fatura (projeções), como fica com o plano. Cada item do plano some da fatura alvo
// até a sua última parcela; o valor antecipado pode ser cobrado na fatura atual.
export function efeitoDoPlano(plano: Candidato[], cobrarNaAtual: boolean, comEstimativa: boolean): Efeito[] {
  const iAlvo = projecoes.findIndex((p) => p.vencimento === alvo?.vencimento)
  const custo = plano.reduce((s, c) => s + c.custo, 0)
  return projecoes.map((p, i) => {
    const j = i - iAlvo // meses depois da fatura alvo
    const reducao = j < 0 ? 0 : plano.filter((c) => j < c.restantes).reduce((s, c) => s + c.parcela, 0)
    const adicionalEstimado = comEstimativa ? p.adicionalEstimado : 0
    const antes = p.total - p.adicionalEstimado + adicionalEstimado
    const partes = {
      base: p.base - reducao,
      recorrente: p.recorrenteLancado + p.recorrentePrevisto,
      adicional: p.adicionalLancado,
      adicionalEstimado,
      antecipacao: cobrarNaAtual && p.status === 'atual' ? custo : 0,
    }
    const depois = Object.values(partes).reduce((s, v) => s + v, 0)
    return { vencimento: p.vencimento, label: p.label, antes, ...partes, depois }
  })
}
