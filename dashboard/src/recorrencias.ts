import type { Fatura, Lancamento } from './faturas'

export interface Recorrencia {
  nome: string
  valores: (number | null)[] // valor recorrente em cada fatura (mesmo índice de `faturas`)
  inicio: number // índice da primeira fatura
  fim: number // índice da última fatura em que apareceu
  ativa: boolean
  valorAtual: number // valor da última cobrança
  cobrancas: Lancamento[] // lançamentos que fazem parte da recorrência (o resto do estabelecimento é adicional)
  parcelado?: number // N quando a recorrência é um parcelamento em N× renovado a cada ciclo
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
  [/spotify/i, 'Spotify'],
  [/^Ajuste a crédito$/, 'Claude'], // estorno do IOF do Claude (jan–mar/26)
]

// Repetem valor todo mês mas não são assinatura (recargas, estacionamento etc.).
const IGNORAR = new Set(['0002 Urbana Pe', 'Paulista North Way Ser'])

// IOF de assinatura internacional entra junto com a assinatura.
function normalizar(title: string) {
  const semIof = title
    .replace(/^IOF de volta de (.*)$/, '$1')
    .replace(/^IOF de "(.*)"$/, '$1')
  return APELIDOS.find(([padrao]) => padrao.test(semIof))?.[1] ?? semIof
}

const parecido = (a: number, b: number) =>
  Math.sign(a) === Math.sign(b) && Math.abs(a - b) / Math.min(Math.abs(a), Math.abs(b)) <= TOLERANCIA

// Cobrança extra só conta como a mesma recorrência com valor praticamente igual (mais apertado que
// TOLERANCIA, que cobre reajustes): evita puxar compras avulsas no mesmo estabelecimento.
const TOLERANCIA_EXTRA = 0.1
const mesmoValor = (a: number, b: number) =>
  Math.sign(a) === Math.sign(b) && Math.abs(a - b) / Math.min(Math.abs(a), Math.abs(b)) <= TOLERANCIA_EXTRA

// Último valor da sequência antes da fatura `i` (para meses em que ela não cobrou).
function ultimoAntes(s: Sequencia, i: number) {
  for (let j = i - 1; j >= 0; j--) if (s.valores.has(j)) return s.valores.get(j)
  return undefined
}

interface Sequencia {
  valores: Map<number, number>
  itens: Lancamento[]
  ultimo: number
  ultimoValor: number
}

// Só considera faturas até a atual: as abertas ainda não têm as cobranças do mês.
export function detectarRecorrencias(faturas: Fatura[]): Recorrencia[] {
  const idxAtual = faturas.findIndex((f) => f.status === 'atual')
  const ate = idxAtual === -1 ? faturas.length - 1 : idxAtual

  // nome -> lançamentos por fatura
  const porNome = new Map<string, Lancamento[][]>()
  faturas.slice(0, ate + 1).forEach((f, i) => {
    for (const l of f.lancamentos) {
      if (l.title === 'Pagamento recebido' || /Parcela \d+\/\d+/.test(l.title)) continue
      const nome = normalizar(l.title)
      if (IGNORAR.has(nome)) continue
      if (!porNome.has(nome)) porNome.set(nome, faturas.map(() => []))
      porNome.get(nome)![i].push(l)
    }
  })

  const recorrencias: Recorrencia[] = []
  for (const [nome, meses] of porNome) {
    const sequencias: Sequencia[] = []
    meses.forEach((lancamentos, i) => {
      const cobrancas = lancamentos.map((l) => l.amount)
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
        s.itens.push(lancamentos[c])
        s.ultimo = i
        s.ultimoValor = cobrancas[c]
      }
      cobrancas.forEach((v, c) => {
        if (!pareadas.has(c)) sequencias.push({ valores: new Map([[i, v]]), itens: [lancamentos[c]], ultimo: i, ultimoValor: v })
      })
    })

    const validas = sequencias.filter((s) => s.valores.size >= MIN_MESES)
    const total = meses.reduce((n, c) => n + c.length, 0)
    const recorrentes = validas.reduce((n, s) => n + s.valores.size, 0)
    if (!validas.length || recorrentes / total < MIN_FRACAO_RECORRENTE) continue

    const mensal = faturas.map((_, i) => {
      const doMes = validas.filter((s) => s.valores.has(i))
      return doMes.length ? doMes.reduce((soma, s) => soma + s.valores.get(i)!, 0) : null
    })
    const inicio = mensal.findIndex((v) => v !== null)
    const fim = mensal.findLastIndex((v) => v !== null)

    // Cobrança extra do mesmo serviço no mês (conta atrasada cobrada junto, cobrança dobrada): valor
    // quase igual ao da recorrência conta como recorrente, não como adicional.
    const usadas = new Set(validas.flatMap((s) => s.itens))
    const extras: Lancamento[] = []
    const valores = mensal.map((v, i) => {
      if (i < inicio || i > fim) return v
      const referencias = validas.map((s) => s.valores.get(i) ?? ultimoAntes(s, i)).filter((r) => r !== undefined)
      const doMes = meses[i].filter((l) => !usadas.has(l) && referencias.some((r) => mesmoValor(l.amount, r)))
      extras.push(...doMes)
      const somaExtras = doMes.reduce((s, l) => s + l.amount, 0)
      return doMes.length ? (v ?? 0) + somaExtras : v
    })

    recorrencias.push({
      nome,
      valores,
      inicio,
      fim,
      // A fatura atual ainda não fechou: quem cobrou na última fechada pode só não ter caído ainda.
      ativa: fim >= ate - 1,
      // Valor de um mês normal, sem as cobranças extras.
      valorAtual: mensal[fim]!,
      cobrancas: [...usadas, ...extras],
    })
  }

  recorrencias.push(...detectarParceladosRenovados(faturas, ate))
  return recorrencias.sort((a, b) => Number(b.ativa) - Number(a.ativa) || b.valorAtual - a.valorAtual)
}

interface Compra {
  inicio: number // índice da fatura da parcela 1/N (pode ser antes da primeira fatura)
  n: number
  valor: number
  parcelas: { i: number; l: Lancamento }[]
}

// Plano pago parcelado e renovado quando acaba (ex.: 3× de 183, de novo 3× de 183...). Cada parcela k/N
// diz em que fatura a compra começou; compras do mesmo nome, mesmo N e valor parecido, cada uma começando
// quando a anterior termina, formam a recorrência. Olha todas as faturas: as parcelas futuras já são conhecidas.
function detectarParceladosRenovados(faturas: Fatura[], ate: number): Recorrencia[] {
  const porNome = new Map<string, Map<string, Compra>>()
  faturas.forEach((f, i) => {
    for (const l of f.lancamentos) {
      const m = l.title.match(/^(.*) - Parcela (\d+)\/(\d+)$/)
      if (!m || l.amount <= 0) continue
      const [nome, k, n] = [m[1], Number(m[2]), Number(m[3])]
      const inicio = i - (k - 1)
      const compras = porNome.get(nome) ?? new Map<string, Compra>()
      porNome.set(nome, compras)
      const chave = `${inicio}/${n}/${l.amount}`
      const compra = compras.get(chave) ?? { inicio, n, valor: l.amount, parcelas: [] }
      compra.parcelas.push({ i, l })
      compras.set(chave, compra)
    }
  })

  const recorrencias: Recorrencia[] = []
  for (const [nome, compras] of porNome) {
    const ordenadas = [...compras.values()].sort((a, b) => a.inicio - b.inicio)
    let cadeia: Compra[] = []
    const fechar = () => {
      if (cadeia.length >= 2) recorrencias.push(montar(nome, cadeia, faturas.length, ate))
      cadeia = []
    }
    for (const c of ordenadas) {
      const ant = cadeia.at(-1)
      const renova = ant && c.n === ant.n && parecido(c.valor, ant.valor) &&
        c.inicio - ant.inicio >= ant.n && c.inicio - ant.inicio <= ant.n + MAX_BURACO
      if (!renova) fechar()
      cadeia.push(c)
    }
    fechar()
  }
  return recorrencias
}

function montar(nome: string, cadeia: Compra[], total: number, ate: number): Recorrencia {
  const valores: (number | null)[] = Array.from({ length: total }, () => null)
  const cobrancas: Lancamento[] = []
  for (const { parcelas } of cadeia) {
    for (const { i, l } of parcelas) {
      valores[i] = (valores[i] ?? 0) + l.amount
      cobrancas.push(l)
    }
  }
  const inicio = valores.findIndex((v) => v !== null)
  const fim = valores.findLastIndex((v) => v !== null)
  return {
    nome,
    valores,
    inicio,
    fim,
    // Terminou na atual ou na última fechada: a renovação ainda pode cair.
    ativa: fim >= ate - 1,
    valorAtual: valores[fim]!,
    cobrancas,
    parcelado: cadeia[0].n,
  }
}
