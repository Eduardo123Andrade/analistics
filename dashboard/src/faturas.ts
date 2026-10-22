// Faturas fechadas até esta data (inclusive). A seguinte é a atual; as demais estão abertas.
const ULTIMA_FECHADA = '2026-10-07'

const arquivos = import.meta.glob('../../.csvs/Nubank_*.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export type Status = 'fechada' | 'atual' | 'aberta'

export interface Lancamento {
  title: string
  amount: number
}

export interface Fatura {
  vencimento: string // YYYY-MM-DD
  label: string
  status: Status
  total: number
  base: number
  adicional: number
  lancamentos: Lancamento[]
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// "1.234,56" / "- 90,23" -> number
const parseValor = (s: string) => Number(s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))

function parseCsv(texto: string): Lancamento[] {
  const linhas = texto.trim().split(/\r?\n/).slice(1)
  return linhas.map((linha) => {
    const campos: string[] = []
    let atual = ''
    let aspas = false
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i]
      if (aspas) {
        if (c === '"' && linha[i + 1] === '"') { atual += '"'; i++ }
        else if (c === '"') aspas = false
        else atual += c
      } else if (c === '"') aspas = true
      else if (c === ',') { campos.push(atual); atual = '' }
      else atual += c
    }
    campos.push(atual)
    return { title: campos[1], amount: parseValor(campos[2]) }
  })
}

// Parcela k/N com k >= 2 é continuação de uma compra anterior -> valor base.
// Todo o resto (compras à vista, parcela 1/N, estornos, IOF...) -> valor adicional.
// "Pagamento recebido" é o pagamento da fatura anterior e não entra no total.
function ehBase(title: string) {
  const m = title.match(/Parcela (\d+)\/(\d+)/)
  return m !== null && Number(m[1]) >= 2
}

export const faturas: Fatura[] = Object.entries(arquivos)
  .map(([caminho, texto]) => {
    const vencimento = caminho.match(/(\d{4}-\d{2}-\d{2})\.csv$/)![1]
    let base = 0
    let adicional = 0
    const lancamentos = parseCsv(texto)
    for (const { title, amount } of lancamentos) {
      if (title === 'Pagamento recebido') continue
      if (ehBase(title)) base += amount
      else adicional += amount
    }
    const [ano, mes] = vencimento.split('-').map(Number)
    return { vencimento, base, adicional, total: base + adicional, lancamentos, label: `${MESES[mes - 1]}/${String(ano).slice(2)}` }
  })
  .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  .map((f, i, todas) => {
    const idxAtual = todas.findIndex((x) => x.vencimento > ULTIMA_FECHADA)
    const status: Status = f.vencimento <= ULTIMA_FECHADA ? 'fechada' : i === idxAtual ? 'atual' : 'aberta'
    return { ...f, status }
  })

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
