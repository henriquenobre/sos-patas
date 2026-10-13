// Moldura da área da ONG (/admin/*). O Cloudflare Access já pediu o login antes de a página
// abrir (T08); aqui, `/eu` confirma a sessão e dá o nome do "Olá, Gracia". Se a sessão vencer
// no meio do uso (qualquer resposta 401), a tela troca por "Entre de novo", que recarrega a
// página e cai no login do Access.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Outlet, ScrollRestoration, useMatches } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useEu, useResumo } from '../api/admin'
import { ErroApi, ehSessaoExpirada } from '../api/cliente'
import { ContextoAdmin, type AreaAdmin } from '../components/admin/contexto'
import {
  BarraAdmin,
  CabecalhoAdmin,
  ENDERECO_SAIR,
  type Aba,
  type Pendencias,
} from '../components/admin/Navegacao'
import { Carregando, ErroAoCarregar } from '../components/Estados'

/** O que cada rota da área da ONG diz sobre a moldura (campo `handle` em rotas.tsx). */
export type MolduraAdmin = {
  /** Tela de aba: mostra a BarraAdmin com esta aba marcada */
  aba?: Aba
  /** Tela interna (formulário): botão "Voltar" para este endereço, sem as abas */
  voltar?: string
}

const MENSAGEM_PADRAO = 'Algo deu errado. Tente de novo em alguns minutos.'

function Tela({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-azul px-4 py-10">
      <div role="alert" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <img
          src="/logo.png"
          alt="Logo SOS Patas"
          className="mx-auto h-20 w-20 rounded-xl ring-1 ring-slate-200"
        />
        <h1 className="mt-3 font-titulo text-2xl font-extrabold text-azul-escuro">{titulo}</h1>
        <p className="mt-2 text-slate-600">{texto}</p>
        {children}
      </div>
    </main>
  )
}

/** Sessão vencida: recarregar a página passa de novo pelo Access, que pede o código. */
function SessaoEncerrada() {
  return (
    <Tela
      titulo="Sua sessão terminou"
      texto="Por segurança, entre de novo com o código que chega no seu e-mail. O que não foi salvo precisará ser preenchido outra vez."
    >
      <button
        type="button"
        onClick={() => {
          window.location.reload()
        }}
        className="mt-5 min-h-11 w-full rounded-full bg-azul py-3 text-lg font-extrabold text-white"
      >
        Entrar de novo
      </button>
    </Tela>
  )
}

function SemAcesso() {
  return (
    <Tela
      titulo="Sem acesso"
      texto="Este e-mail não tem acesso à área da ONG. Para liberar um e-mail novo, fale com o administrador do site."
    >
      <a
        href={ENDERECO_SAIR}
        className="mt-5 block min-h-11 w-full rounded-full bg-azul py-3 text-lg font-extrabold text-white"
      >
        Entrar com outro e-mail
      </a>
    </Tela>
  )
}

type Aviso = { id: number; texto: string; link?: string }

function AvisoRapido({ aviso }: { aviso: Aviso | null }) {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6 print:hidden"
    >
      {aviso && (
        <p
          key={aviso.id}
          className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white shadow-xl"
        >
          {aviso.texto}
          {aviso.link && (
            <a
              href={aviso.link}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-sm"
            >
              Ver no site ↗
            </a>
          )}
        </p>
      )}
    </div>
  )
}

export function LayoutAdmin() {
  const queryClient = useQueryClient()
  const eu = useEu()
  const resumo = useResumo()
  const matches = useMatches()
  const moldura = (matches.at(-1)?.handle ?? {}) as MolduraAdmin
  const [sessaoVencida, setSessaoVencida] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const contador = useRef(0)

  // Qualquer consulta que receba 401 (sessão vencida no meio do uso) troca a tela
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((evento) => {
        if (evento.type === 'updated' && ehSessaoExpirada(evento.query.state.error)) {
          setSessaoVencida(true)
        }
      }),
    [queryClient],
  )

  useEffect(() => {
    if (!aviso) return
    const tempo = setTimeout(() => {
      setAviso(null)
    }, 5000)
    return () => {
      clearTimeout(tempo)
    }
  }, [aviso])

  const avisar = useCallback((texto: string, link?: string) => {
    contador.current += 1
    setAviso({ id: contador.current, texto, link })
  }, [])

  const mensagemDeErro = useCallback((erro: unknown) => {
    if (ehSessaoExpirada(erro)) setSessaoVencida(true)
    return erro instanceof ErroApi ? erro.message : MENSAGEM_PADRAO
  }, [])

  const area = useMemo<AreaAdmin>(() => ({ avisar, mensagemDeErro }), [avisar, mensagemDeErro])

  const meta = <meta name="robots" content="noindex" />
  if (sessaoVencida || ehSessaoExpirada(eu.error))
    return (
      <>
        {meta}
        <SessaoEncerrada />
      </>
    )
  if (eu.error instanceof ErroApi && eu.error.status === 403)
    return (
      <>
        {meta}
        <SemAcesso />
      </>
    )
  if (eu.isError) {
    return (
      <>
        {meta}
        <ErroAoCarregar tentarDeNovo={() => void eu.refetch()} />
      </>
    )
  }
  if (eu.isPending) return <Carregando />

  const pendencias: Pendencias = {
    pedidos: resumo.data?.pedidos_pendentes,
    perdidos: resumo.data?.perdidos_pendentes,
  }
  return (
    <ContextoAdmin.Provider value={area}>
      {meta}
      <div className="min-h-dvh bg-fundo print:bg-white">
        <CabecalhoAdmin
          nome={eu.data.nome}
          aba={moldura.aba}
          voltar={moldura.voltar}
          pendencias={pendencias}
        />
        <main className="mx-auto max-w-3xl px-4 pb-32 pt-4 md:pb-16 print:max-w-none print:p-0">
          <Outlet />
        </main>
        {moldura.aba && <BarraAdmin aba={moldura.aba} pendencias={pendencias} />}
        <AvisoRapido aviso={aviso} />
      </div>
      <ScrollRestoration />
    </ContextoAdmin.Provider>
  )
}
