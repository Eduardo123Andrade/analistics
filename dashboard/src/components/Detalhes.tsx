import { useState, type ReactNode } from 'react'

export function Detalhes({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button type="button" className="ver-mais" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        {aberto ? 'Ocultar detalhes' : 'Ver mais detalhes'}
      </button>
      {aberto && children}
    </>
  )
}
