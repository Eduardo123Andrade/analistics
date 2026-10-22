import { ComposicaoChart } from './ComposicaoChart'
import { Detalhes } from './Detalhes'
import { EvolucaoChart } from './EvolucaoChart'
import { TabelaFaturas } from './TabelaFaturas'

export function VisaoGeral() {
  return (
    <div className="visao-geral">
      <div className="lado-a-lado">
        <EvolucaoChart />
        <ComposicaoChart />
      </div>
      <Detalhes>
        <section className="card">
          <h2>Por fatura</h2>
          <TabelaFaturas />
        </section>
      </Detalhes>
    </div>
  )
}
