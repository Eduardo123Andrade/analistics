import { ComposicaoChart } from './components/ComposicaoChart'
import { EvolucaoChart } from './components/EvolucaoChart'
import { Kpis } from './components/Kpis'
import { Recorrencias } from './components/Recorrencias'
import { TabelaFaturas } from './components/TabelaFaturas'
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
      <div className="lado-a-lado">
        <EvolucaoChart />
        <ComposicaoChart />
      </div>
      <Recorrencias />
      <TabelaFaturas />
    </main>
  )
}
