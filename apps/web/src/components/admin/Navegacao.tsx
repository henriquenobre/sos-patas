// Moldura da área da ONG (TELAS.md, "Navegação"): CabecalhoAdmin em azul-escuro, para
// diferenciar do site público; BarraAdmin fixa no rodapé do celular, que vira abas no cabeçalho
// do computador; BarraSalvar ("Cancelar / Salvar") nas telas de formulário, no lugar das abas.
import { Link } from 'react-router'
import { FUSO_ONG } from '@sospatas/compartilhado'
import { IconeVoltar } from '../Icones'

export type Aba = 'animais' | 'pedidos' | 'perdidos' | 'textos' | 'mais'

/** "Sair" encerra a sessão do Cloudflare Access (docs/ARQUITETURA.md, seção 4). */
export const ENDERECO_SAIR = '/cdn-cgi/access/logout'

const ABAS: { id: Aba; para: string; icone: string; nome: string }[] = [
  { id: 'animais', para: '/admin', icone: '🐾', nome: 'Animais' },
  { id: 'pedidos', para: '/admin/pedidos', icone: '📋', nome: 'Pedidos' },
  { id: 'perdidos', para: '/admin/perdidos', icone: '🔎', nome: 'Perdidos' },
  { id: 'textos', para: '/admin/textos', icone: '📝', nome: 'Textos' },
  { id: 'mais', para: '/admin/mais', icone: '☰', nome: 'Mais' },
]

/** Números vermelhos das abas: pedidos e anúncios aguardando a equipe. */
export type Pendencias = Partial<Record<Aba, number>>

function Selo({ numero, className = '' }: { numero: number | undefined; className?: string }) {
  if (!numero) return null
  return (
    <span
      className={`rounded-full bg-vermelho px-1.5 text-[10px] font-extrabold leading-4 text-white ${className}`}
    >
      <span className="sr-only">, </span>
      {numero}
      <span className="sr-only"> aguardando</span>
    </span>
  )
}

export function CabecalhoAdmin({
  nome,
  aba,
  voltar,
  pendencias,
}: {
  nome: string | undefined
  aba: Aba | undefined
  voltar: string | undefined
  pendencias: Pendencias
}) {
  return (
    <header
      className="sticky top-0 z-30 bg-azul-escuro text-white"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        {voltar ? (
          <Link to={voltar} className="flex min-h-11 items-center gap-1 font-bold">
            <IconeVoltar /> Voltar
          </Link>
        ) : (
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded bg-white" />
            <span className="font-titulo text-lg font-bold">Área da ONG</span>
          </Link>
        )}
        {aba && (
          <nav aria-label="Área da ONG" className="hidden flex-1 justify-center gap-1 md:flex">
            {ABAS.map((item) => (
              <Link
                key={item.id}
                to={item.para}
                aria-current={item.id === aba ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 font-bold ${
                  item.id === aba ? 'bg-white text-azul-escuro' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {item.icone} {item.nome}
                <Selo numero={pendencias[item.id]} className="ml-1" />
              </Link>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3 text-sm">
          {nome && <span className="hidden text-white/70 sm:inline">Olá, {nome}</span>}
          <a href={ENDERECO_SAIR} className="rounded-lg bg-white/10 px-3 py-2 font-bold">
            Sair
          </a>
        </div>
      </div>
    </header>
  )
}

export function BarraAdmin({ aba, pendencias }: { aba: Aba; pendencias: Pendencias }) {
  return (
    <nav
      aria-label="Área da ONG"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,.05)] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto grid max-w-3xl grid-cols-5">
        {ABAS.map((item) => (
          <Link
            key={item.id}
            to={item.para}
            aria-current={item.id === aba ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-xs font-extrabold ${
              item.id === aba ? 'text-azul' : 'text-slate-500'
            }`}
          >
            {item.id === aba && (
              <span className="absolute inset-x-4 top-0 h-1 rounded-b bg-azul" aria-hidden="true" />
            )}
            <span className="text-xl leading-6" aria-hidden="true">
              {item.icone}
            </span>
            {item.nome}
            <Selo numero={pendencias[item.id]} className="absolute right-[18%] top-1" />
          </Link>
        ))}
      </div>
    </nav>
  )
}

/** Barra fixa "Cancelar / Salvar" das telas de formulário (o botão envia o <form> do id). */
export function BarraSalvar({
  cancelar,
  rotulo,
  formulario,
  enviando,
}: {
  cancelar: string
  rotulo: string
  formulario: string
  enviando: boolean
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="mx-auto flex max-w-xl gap-2">
        <Link
          to={cancelar}
          className="flex min-h-11 items-center rounded-xl px-5 py-3 font-bold text-slate-600 ring-2 ring-slate-200"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          form={formulario}
          disabled={enviando}
          className="min-h-11 flex-1 rounded-xl bg-azul py-3 text-lg font-extrabold text-white disabled:opacity-60"
        >
          {enviando ? 'Salvando…' : rotulo}
        </button>
      </div>
    </div>
  )
}

/** "Alterado por Claudia em 07/10/2026" (RN43). */
export function AlteradoPor({ em, por }: { em: string; por: string | null }) {
  const data = new Date(em).toLocaleDateString('pt-BR', { timeZone: FUSO_ONG })
  return (
    <p className="mt-1 text-sm text-slate-500">
      {por ? `Alterado por ${por} em ${data}` : `Alterado em ${data}`}
    </p>
  )
}

export function TituloAdmin({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <div>
      <h1 className="font-titulo text-3xl font-extrabold leading-tight text-azul-escuro">
        {titulo}
      </h1>
      {subtitulo && <p className="text-sm text-slate-600">{subtitulo}</p>}
    </div>
  )
}
