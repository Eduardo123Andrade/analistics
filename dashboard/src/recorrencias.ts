import type { Fatura } from './faturas'

export interface Recorrencia {
  nome: string
  valores: (number | null)[] // valor recorrente em cada fatura (mesmo índice de `faturas`)
  inicio: number // índice da primeira fatura
  fim: number // índice da última fatura em que apareceu
  ativa: boolean
  valorAtual: number // valor da última cobrança
}

// Variação máxima entre uma cobrança e a do mês anterior para ser "a mesma" (ex.: reajuste 20 -> 25).
const TOLERANCIA = 0.3
// Meses seguidos sem cobrança que ainda não quebram a sequência (cobrança que escorregou de ciclo).
const MAX_BURACO = 1
const MIN_MESES = 3
// Fração mínima das cobranças de um estabelecimento que precisa estar em sequências.
// Corta coisas como Uber, posto, recarga de ônibus, onde valores parecidos se repetem por acaso.
const MIN_FRACAO_RECORRENTE = 0.5

// Mesma assinatura cobrada com nomes diferentes ao longo do tempo (o intermediador de
// pagamento muda: Br1*, Sta*Lia, Malga*...), então casa por trecho do nome.
const APELIDOS: [RegExp, string][] = [
  [/rocketsea/i, 'Rocketseat'],
  [/claude/i, 'Claude'],
  [/^Ajuste a crédito$/, 'Claude'], // estorno do IOF do Claude (jan–mar/26)
]

// Repetem valor todo mês mas não são assinatura (recargas etc.).
const IGNORAR = new Set(['0002 Urbana Pe'])

// IOF de assinatura internacional entra junto com a assinatura.
function normalizar(title: string) {
  const semIof = title
    .replace(/^IOF de volta de (.*)$/, '$1')
    .replace(/^IOF de "(.*)"$/, '$1')
  return APELIDOS.find(([padrao]) => padrao.test(semIof))?.[1] ?? semIof
}

const parecido = (a: number, b: number) =>
  Math.sign(a) === Math.sign(b) && Math.abs(a - b) / Math.min(Math.abs(a), Math.abs(b)) <= TOLERANCIA

interface Sequencia {
  valores: Map<number, number>
  ultimo: number
  ultimoValor: number
}

// Só considera faturas até a atual: as abertas ainda não têm as cobranças do mês.
export function detectarRecorrencias(faturas: Fatura[]): Recorrencia[] {
  const idxAtual = faturas.findIndex((f) => f.status === 'atual')
  const ate = idxAtual === -1 ? faturas.length - 1 : idxAtual

  // nome -> cobranças por fatura
  const porNome = new Map<string, number[][]>()
  faturas.slice(0, ate + 1).forEach((f, i) => {
    for (const { title, amount } of f.lancamentos) {
      if (title === 'Pagamento recebido' || /Parcela \d+\/\d+/.test(title)) continue
      const nome = normalizar(title)
      if (IGNORAR.has(nome)) continue
      if (!porNome.has(nome)) porNome.set(nome, faturas.map(() => []))
      porNome.get(nome)![i].push(amount)
    }
  })

  const recorrencias: Recorrencia[] = []
  for (const [nome, meses] of porNome) {
    const sequencias: Sequencia[] = []
    meses.forEach((cobrancas, i) => {
      // Pareia cobranças do mês com sequências em aberto: primeiro o valor mais próximo
      // (diferenças até 10% contam como empate), depois a sequência mais longa.
      const pares = sequencias
        .filter((s) => i - s.ultimo <= MAX_BURACO + 1)
        .flatMap((s) => cobrancas.map((v, c) => ({ s, c, dif: Math.abs(v - s.ultimoValor) / Math.abs(s.ultimoValor) })))
        .filter(({ s, c }) => parecido(s.ultimoValor, cobrancas[c]))
        .sort((a, b) => (a.dif > 0.1 ? a.dif : 0) - (b.dif > 0.1 ? b.dif : 0) || b.s.valores.size - a.s.valores.size || a.dif - b.dif)
      const usadas = new Set<Sequencia>()
      const pareadas = new Set<number>()
      for (const { s, c } of pares) {
        if (usadas.has(s) || pareadas.has(c)) continue
        usadas.add(s)
        pareadas.add(c)
        s.valores.set(i, cobrancas[c])
        s.ultimo = i
        s.ultimoValor = cobrancas[c]
      }
      cobrancas.forEach((v, c) => {
        if (!pareadas.has(c)) sequencias.push({ valores: new Map([[i, v]]), ultimo: i, ultimoValor: v })
      })
    })

    const validas = sequencias.filter((s) => s.valores.size >= MIN_MESES)
    const total = meses.reduce((n, c) => n + c.length, 0)
    const recorrentes = validas.reduce((n, s) => n + s.valores.size, 0)
    if (!validas.length || recorrentes / total < MIN_FRACAO_RECORRENTE) continue

    const valores = faturas.map((_, i) => {
      const doMes = validas.filter((s) => s.valores.has(i))
      return doMes.length ? doMes.reduce((soma, s) => soma + s.valores.get(i)!, 0) : null
    })
    const inicio = valores.findIndex((v) => v !== null)
    const fim = valores.findLastIndex((v) => v !== null)
    recorrencias.push({
      nome,
      valores,
      inicio,
      fim,
      // A fatura atual ainda não fechou: quem cobrou na última fechada pode só não ter caído ainda.
      ativa: fim >= ate - 1,
      valorAtual: valores[fim]!,
    })
  }

  return recorrencias.sort((a, b) => Number(b.ativa) - Number(a.ativa) || b.valorAtual - a.valorAtual)
}
