// Patinhas decorativas e "chapéu" das seções (prototipo/TELAS.md, Identidade visual: tom
// acolhedor). Sempre aria-hidden e sem capturar cliques.
import type { CSSProperties, ReactNode } from 'react'
import { IconePata } from './Icones'

type PropsPata = { className?: string; rotacao?: number; style?: CSSProperties }

export function Pata({ className = '', rotacao = 0, style }: PropsPata) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block ${className}`}
      style={{ transform: `rotate(${String(rotacao)}deg)`, ...style }}
    >
      <IconePata />
    </span>
  )
}

/** Texto pequeno em maiúsculas acima do título da seção, com uma patinha. */
export function Chapeu({ children, cor = 'text-vermelho' }: { children: ReactNode; cor?: string }) {
  return (
    <p
      className={`flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide ${cor}`}
    >
      <Pata className="h-4 w-4" rotacao={-15} />
      {children}
    </p>
  )
}
