import { Kpis } from './components/Kpis'
import { Projecao } from './components/Projecao'
import { Recorrencias } from './components/Recorrencias'
import { VisaoGeral } from './components/VisaoGeral'
import { faturas } from './dados'

export default function App() {
  return (
    <main>
      <header>
        <h1>Faturas Nubank</h1>
        <p className="sub">
          {faturas[0].label} – {faturas.at(-1)!.label} · * fatura ainda não fechada (valores podem mudar)
        </p>
      </header>
      <Kpis />
      <VisaoGeral />
      <Projecao />
      <Recorrencias />
    </main>
  )
}
