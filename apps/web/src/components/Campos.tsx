// Campos de formulário pensados para o celular: opções em botões grandes (área de toque de
// 44 px), mensagem de erro embaixo de cada campo e ligação rótulo/campo para leitores de tela.
import { useId, useRef, useState, type ReactNode } from 'react'
import { ehDataValida, formatarData } from '@sospatas/compartilhado'

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
  placeholder,
  max,
  prefixo,
}: PropsBase & {
  valor: string
  aoMudar: (valor: string) => void
  /** numero: teclado numérico, sem as setinhas do type="number" */
  tipo?: 'text' | 'tel' | 'email' | 'date' | 'numero'
  limite?: number
  multilinha?: boolean
  autoComplete?: string
  placeholder?: string
  max?: string
  /** Texto fixo à esquerda, dentro da caixa (ex.: o @ do Instagram) */
  prefixo?: string
}) {
  const id = useId()
  const comum = {
    id,
    value: valor,
    maxLength: limite,
    placeholder,
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
      {tipo === 'date' ? (
        <CaixaData
          id={id}
          valor={valor}
          aoMudar={aoMudar}
          max={max}
          invalido={Boolean(erro)}
          descricao={erro ? `${id}-erro` : undefined}
        />
      ) : multilinha ? (
        <textarea
          {...comum}
          rows={3}
          onChange={(evento) => {
            aoMudar(evento.target.value)
          }}
        />
      ) : prefixo ? (
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 mt-[3px] -translate-y-1/2 font-bold text-slate-500"
          >
            {prefixo}
          </span>
          <input
            {...comum}
            className={`${classeCaixaTexto} pl-9`}
            type="text"
            autoComplete={autoComplete}
            onChange={(evento) => {
              aoMudar(evento.target.value)
            }}
          />
        </div>
      ) : (
        <input
          {...comum}
          type={tipo === 'numero' ? 'text' : tipo}
          inputMode={
            tipo === 'numero' ? 'numeric' : tipo === 'tel' || tipo === 'email' ? tipo : undefined
          }
          max={max}
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

/** '13102026' ou '13/10/2026' → '13/10/2026', pondo as barras conforme a pessoa digita. */
function mascaraData(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8)
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join('/')
}

/** '13/10/2026' → '2026-10-13'. Data incompleta volta como digitada, e o schema acusa "Data inválida". */
function dataParaIso(texto: string): string {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)
  return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : texto
}

/**
 * Data sempre em dd/mm/aaaa. O <input type="date"> segue o idioma do navegador (em inglês vira
 * mm/dd/aaaa), então a pessoa digita num campo de texto e o calendário nativo fica no botão ao
 * lado. O valor que sai continua 'AAAA-MM-DD'.
 */
function CaixaData({
  id,
  valor,
  aoMudar,
  max,
  invalido,
  descricao,
}: {
  id: string
  valor: string
  aoMudar: (valor: string) => void
  max?: string
  invalido: boolean
  descricao?: string
}) {
  const paraTexto = (iso: string) => (ehDataValida(iso) ? formatarData(iso) : mascaraData(iso))
  const [texto, setTexto] = useState(() => paraTexto(valor))
  const [valorAnterior, setValorAnterior] = useState(valor)
  const calendario = useRef<HTMLInputElement>(null)

  // Valor trocado por fora (calendário, formulário recarregado): atualiza o que aparece
  if (valor !== valorAnterior) {
    setValorAnterior(valor)
    if (valor !== dataParaIso(texto)) setTexto(paraTexto(valor))
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        value={texto}
        aria-invalid={invalido}
        aria-describedby={descricao}
        className={`${classeCaixaTexto} pr-14`}
        onChange={(evento) => {
          const novo = mascaraData(evento.target.value)
          setTexto(novo)
          aoMudar(dataParaIso(novo))
        }}
      />
      <button
        type="button"
        aria-label="Abrir calendário"
        className="absolute right-1.5 bottom-1.5 flex h-11 w-11 items-center justify-center rounded-lg text-xl"
        onClick={() => {
          try {
            calendario.current?.showPicker()
          } catch {
            // Navegador sem showPicker: a pessoa digita a data
          }
        }}
      >
        📅
      </button>
      <input
        ref={calendario}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        max={max}
        value={ehDataValida(valor) ? valor : ''}
        className="pointer-events-none absolute right-1.5 bottom-1.5 h-11 w-11 opacity-0"
        onChange={(evento) => {
          if (evento.target.value) aoMudar(evento.target.value)
        }}
      />
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
  compacto = false,
}: PropsBase & {
  opcoes: Record<string, string>
  valor: string | undefined
  aoMudar: (valor: string) => void
  /** Opções curtas lado a lado, também no celular (Sim/Não, Macho/Fêmea…) */
  compacto?: boolean
}) {
  const nome = useId()
  return (
    <fieldset aria-invalid={Boolean(erro)} aria-describedby={erro ? `${nome}-erro` : undefined}>
      <Rotulo rotulo={rotulo} obrigatorio={obrigatorio} como="legend" />
      {dica && <p className="text-sm text-slate-500">{dica}</p>}
      <div
        className={`mt-1.5 flex gap-2 ${compacto ? 'flex-wrap' : 'flex-col sm:flex-row sm:flex-wrap'}`}
      >
        {Object.entries(opcoes).map(([chave, texto]) => (
          <label
            key={chave}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold ${compacto ? 'min-w-[28%] flex-auto justify-center whitespace-nowrap' : ''} ${
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
              className="h-5 w-5 shrink-0 accent-azul"
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
                className="h-5 w-5 shrink-0 accent-azul"
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
