// Caixa de texto dos editores de conteúdo (T16–T20): contador "120/400", cresce conforme o
// texto e mostra a dica de texto simples (RN34). Usada pelo CampoTextoEditavel e pela T17.
import { useId, useLayoutEffect, useRef } from 'react'

export const DICA_TEXTO_SIMPLES =
  'Para pular linha, use Enter. Links começando com https:// viram clicáveis.'

export function CaixaTexto({
  rotulo,
  ajuda,
  valor,
  aoMudar,
  limite,
  obrigatorio,
  erro,
  linhas = 1,
  dica,
}: {
  rotulo: string
  /** Onde aparece no site, abaixo do rótulo */
  ajuda?: string
  valor: string
  aoMudar: (valor: string) => void
  limite: number
  obrigatorio: boolean
  erro?: string
  /** 1 = campo curto (título); mais = texto que cresce */
  linhas?: number
  dica?: string
}) {
  const id = useId()
  const caixa = useRef<HTMLTextAreaElement>(null)

  // Cresce conforme o texto, para a voluntária ver tudo o que escreveu sem rolar a caixa
  useLayoutEffect(() => {
    const elemento = caixa.current
    if (!elemento) return
    elemento.style.height = 'auto'
    elemento.style.height = `${String(elemento.scrollHeight + 4)}px`
  }, [valor])

  const passou = valor.length > limite
  const descricoes = [erro ? `${id}-erro` : null, `${id}-contador`].filter(Boolean).join(' ')
  return (
    <div>
      <label htmlFor={id} className="font-extrabold text-slate-800">
        {rotulo}
        {obrigatorio ? (
          <span className="text-vermelho" aria-hidden="true">
            {' '}
            *
          </span>
        ) : (
          <span className="font-semibold text-slate-400"> (opcional)</span>
        )}
      </label>
      {ajuda && <p className="text-sm text-slate-500">{ajuda}</p>}
      <textarea
        ref={caixa}
        id={id}
        value={valor}
        rows={linhas}
        aria-invalid={Boolean(erro) || passou}
        aria-describedby={descricoes}
        onChange={(evento) => {
          aoMudar(evento.target.value)
        }}
        className="mt-1.5 w-full resize-none rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base focus:border-azul focus:outline-none aria-[invalid=true]:border-vermelho"
      />
      <div className="mt-1 flex justify-between gap-3 text-xs text-slate-500">
        <span>{dica}</span>
        <span
          id={`${id}-contador`}
          className={`shrink-0 tabular-nums ${passou ? 'font-bold text-vermelho' : ''}`}
        >
          {valor.length}/{limite}
          <span className="sr-only"> caracteres</span>
        </span>
      </div>
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-sm font-bold text-vermelho">
          {erro}
        </p>
      )}
    </div>
  )
}
