// Janela de confirmação (TELAS.md, "Modal"): sempre com um jeito de cancelar. No celular, sobe
// do rodapé; no computador, fica no centro. Esc ou toque fora fecham (menos durante o envio).
import { useEffect, useId, useRef, type ReactNode } from 'react'

export function Modal({
  titulo,
  children,
  aoFechar,
  corTitulo = 'text-azul-escuro',
}: {
  titulo: string
  children: ReactNode
  /** undefined: não deixa fechar (ex.: enquanto envia) */
  aoFechar?: () => void
  corTitulo?: string
}) {
  const idTitulo = useId()
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    caixa.current?.focus()
  }, [])

  useEffect(() => {
    if (!aoFechar) return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aoFechar])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar?.()
      }}
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl outline-none sm:rounded-3xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
      >
        <h2 id={idTitulo} className={`font-titulo text-2xl font-bold ${corTitulo}`}>
          {titulo}
        </h2>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  )
}

/** Par de botões do rodapé do modal: "Cancelar" e a ação. */
export function BotoesModal({
  aoCancelar,
  rotulo,
  aoConfirmar,
  enviando = false,
  cor = 'bg-azul',
}: {
  aoCancelar: () => void
  rotulo: string
  aoConfirmar: () => void
  enviando?: boolean
  cor?: string
}) {
  return (
    <div className="mt-5 flex gap-2">
      <button
        type="button"
        onClick={aoCancelar}
        disabled={enviando}
        className="min-h-11 flex-1 rounded-xl px-3 py-3 font-bold text-slate-700 ring-2 ring-slate-200 disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={aoConfirmar}
        disabled={enviando}
        className={`min-h-11 flex-1 rounded-xl px-3 py-3 font-extrabold leading-tight text-white disabled:opacity-60 ${cor}`}
      >
        {enviando ? 'Enviando…' : rotulo}
      </button>
    </div>
  )
}
