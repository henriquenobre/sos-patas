// Campos de formulário pensados para o celular: opções em botões grandes (área de toque de
// 44 px), mensagem de erro embaixo de cada campo e ligação rótulo/campo para leitores de tela.
import { useId, type ReactNode } from 'react'

const classeCaixaTexto =
  'mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base focus:border-azul focus:outline-none aria-[invalid=true]:border-vermelho'

function Erro({ id, mensagem }: { id: string; mensagem?: string }) {
  if (!mensagem) return null
  return (
    <p id={id} className="mt-1.5 text-sm font-bold text-vermelho">
      {mensagem}
    </p>
  )
}

type PropsBase = { rotulo: string; erro?: string; dica?: string; obrigatorio?: boolean }

function Rotulo({
  rotulo,
  obrigatorio,
  como: Elemento = 'span',
}: {
  rotulo: string
  obrigatorio?: boolean
  como?: 'span' | 'legend'
}) {
  return (
    <Elemento className="font-extrabold text-slate-800">
      {rotulo}
      {obrigatorio ? (
        <span className="text-vermelho" aria-hidden="true">
          {' '}
          *
        </span>
      ) : (
        <span className="font-semibold text-slate-400"> (opcional)</span>
      )}
    </Elemento>
  )
}

export function CampoTexto({
  rotulo,
  erro,
  dica,
  obrigatorio = true,
  valor,
  aoMudar,
  tipo = 'text',
  limite,
  multilinha = false,
  autoComplete,
}: PropsBase & {
  valor: string
  aoMudar: (valor: string) => void
  tipo?: 'text' | 'tel' | 'email'
  limite?: number
  multilinha?: boolean
  autoComplete?: string
}) {
  const id = useId()
  const comum = {
    id,
    value: valor,
    maxLength: limite,
    'aria-invalid': Boolean(erro),
    'aria-describedby': erro ? `${id}-erro` : undefined,
    className: classeCaixaTexto,
  }
  return (
    <div>
      <label htmlFor={id}>
        <Rotulo rotulo={rotulo} obrigatorio={obrigatorio} />
      </label>
      {dica && <p className="text-sm text-slate-500">{dica}</p>}
      {multilinha ? (
        <textarea
          {...comum}
          rows={3}
          onChange={(evento) => {
            aoMudar(evento.target.value)
          }}
        />
      ) : (
        <input
          {...comum}
          type={tipo}
          inputMode={tipo === 'text' ? undefined : tipo}
          autoComplete={autoComplete}
          onChange={(evento) => {
            aoMudar(evento.target.value)
          }}
        />
      )}
      <Erro id={`${id}-erro`} mensagem={erro} />
    </div>
  )
}

/** Escolha única em botões grandes (radio). */
export function Escolha({
  rotulo,
  erro,
  dica,
  obrigatorio = true,
  opcoes,
  valor,
  aoMudar,
}: PropsBase & {
  opcoes: Record<string, string>
  valor: string | undefined
  aoMudar: (valor: string) => void
}) {
  const nome = useId()
  return (
    <fieldset aria-invalid={Boolean(erro)} aria-describedby={erro ? `${nome}-erro` : undefined}>
      <Rotulo rotulo={rotulo} obrigatorio={obrigatorio} como="legend" />
      {dica && <p className="text-sm text-slate-500">{dica}</p>}
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {Object.entries(opcoes).map(([chave, texto]) => (
          <label
            key={chave}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold ${
              valor === chave
                ? 'border-azul bg-azul-claro text-azul-escuro'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <input
              type="radio"
              name={nome}
              value={chave}
              checked={valor === chave}
              onChange={() => {
                aoMudar(chave)
              }}
              className="h-5 w-5 accent-azul"
            />
            {texto}
          </label>
        ))}
      </div>
      <Erro id={`${nome}-erro`} mensagem={erro} />
    </fieldset>
  )
}

/** Várias escolhas (checkbox). */
export function MultiEscolha({
  rotulo,
  erro,
  obrigatorio = true,
  opcoes,
  valor,
  aoMudar,
}: PropsBase & {
  opcoes: Record<string, string>
  valor: string[]
  aoMudar: (valor: string[]) => void
}) {
  const id = useId()
  return (
    <fieldset aria-invalid={Boolean(erro)} aria-describedby={erro ? `${id}-erro` : undefined}>
      <Rotulo rotulo={rotulo} obrigatorio={obrigatorio} como="legend" />
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        {Object.entries(opcoes).map(([chave, texto]) => {
          const marcado = valor.includes(chave)
          return (
            <label
              key={chave}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold ${
                marcado
                  ? 'border-azul bg-azul-claro text-azul-escuro'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={marcado}
                onChange={() => {
                  aoMudar(marcado ? valor.filter((v) => v !== chave) : [...valor, chave])
                }}
                className="h-5 w-5 accent-azul"
              />
              {texto}
            </label>
          )
        })}
      </div>
      <Erro id={`${id}-erro`} mensagem={erro} />
    </fieldset>
  )
}

/** Caixa de confirmação (declarações, ciência do termo). */
export function Caixa({
  children,
  marcado,
  aoMudar,
  erro,
}: {
  children: ReactNode
  marcado: boolean
  aoMudar: (marcado: boolean) => void
  erro?: boolean
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${
        erro && !marcado
          ? 'border-vermelho bg-vermelho-claro'
          : marcado
            ? 'border-azul bg-azul-claro'
            : 'border-slate-200 bg-white'
      }`}
    >
      <input
        type="checkbox"
        checked={marcado}
        onChange={(evento) => {
          aoMudar(evento.target.checked)
        }}
        className="mt-0.5 h-5 w-5 shrink-0 accent-azul"
      />
      <span className="text-slate-800">{children}</span>
    </label>
  )
}
