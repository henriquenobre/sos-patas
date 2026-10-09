// T29 · Fale com a ONG (/contato), RN51. Enquanto a ONG não tem WhatsApp próprio, todo contato
// do site vai para o e-mail da tabela ong: pelo formulário (a API envia por e-mail) ou pelo
// link que abre o aplicativo de e-mail. ?assunto=ajudar já deixa o assunto escolhido.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ASSUNTOS_CONTATO,
  LIMITES,
  ROTULOS,
  contatoEntrada,
  formatarWhatsapp,
  linkWhatsApp,
  type AssuntoContato,
} from '@sospatas/compartilhado'
import { ErroApi, enviarJson } from '../api/cliente'
import { useSite } from '../api/publico'
import { CampoTexto, Escolha } from '../components/Campos'
import { Carregando, ErroAoCarregar, TituloPagina } from '../components/Estados'
import { IconeEmail, IconeWhatsApp } from '../components/Icones'
import { Pata } from '../components/Pata'
import { Turnstile } from '../components/Turnstile'
import { linkEmail } from '../lib/contato'

const L = LIMITES.contato

type Campos = { nome: string; email: string; telefone: string; mensagem: string }

const ehAssunto = (valor: string | null): valor is AssuntoContato =>
  (ASSUNTOS_CONTATO as readonly string[]).includes(valor ?? '')

/** E-mail (e WhatsApp, quando a ONG tiver um) para quem prefere escrever direto. */
function OutrasFormas({ email, whatsapp }: { email: string; whatsapp: string | null }) {
  return (
    <section className="rounded-2xl bg-azul-claro p-5 text-azul-escuro">
      <h2 className="font-titulo text-xl font-bold">Prefere escrever direto?</h2>
      <a
        href={linkEmail(email)}
        className="mt-2 flex items-center gap-2 font-bold break-all text-azul hover:underline"
      >
        <IconeEmail /> {email}
      </a>
      {whatsapp && (
        <a
          href={linkWhatsApp(whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 font-bold text-azul hover:underline"
        >
          <IconeWhatsApp /> {formatarWhatsapp(whatsapp)}
        </a>
      )}
    </section>
  )
}

function Enviado({ nome }: { nome: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
      <Pata className="mx-auto h-10 w-10 text-vermelho" />
      <h2 className="mt-3 font-titulo text-3xl font-extrabold text-azul-escuro">
        Mensagem enviada!
      </h2>
      <p className="mt-2 text-slate-700">
        Obrigado, {nome}. A equipe da SOS Patas é formada por voluntários e responde pelo e-mail que
        você informou assim que puder.
      </p>
      <Link
        to="/animais"
        className="mt-6 inline-block min-h-11 rounded-full bg-azul px-6 py-3 font-extrabold text-white"
      >
        Ver os animais para adoção
      </Link>
    </div>
  )
}

export function Contato() {
  const site = useSite()
  const [busca] = useSearchParams()
  const assuntoInicial = busca.get('assunto')
  const [campos, setCampos] = useState<Campos>({ nome: '', email: '', telefone: '', mensagem: '' })
  const [assunto, setAssunto] = useState<string | undefined>(
    ehAssunto(assuntoInicial) ? assuntoInicial : undefined,
  )
  const [token, setToken] = useState<string | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [mensagemEnvio, setMensagemEnvio] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviadoPor, setEnviadoPor] = useState<string | null>(null)

  if (site.isPending) return <Carregando />
  if (site.isError) return <ErroAoCarregar tentarDeNovo={() => void site.refetch()} />
  const { ong } = site.data

  function mudar(campo: keyof Campos, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }))
    setErros(({ [campo]: _removido, ...resto }) => resto)
  }

  async function enviar() {
    const dados = { ...campos, assunto, turnstile_token: token ?? '' }
    const resultado = contatoEntrada.safeParse(dados)
    if (!resultado.success) {
      const novos: Record<string, string> = {}
      for (const problema of resultado.error.issues) {
        novos[String(problema.path[0] ?? '_')] ??= problema.message
      }
      if (novos.turnstile_token) {
        novos.turnstile_token = 'Aguarde a confirmação de que você não é um robô'
      }
      setErros(novos)
      return
    }
    setEnviando(true)
    setMensagemEnvio(null)
    try {
      await enviarJson('/publico/contato', dados)
      setEnviadoPor(resultado.data.nome)
    } catch (erro) {
      if (erro instanceof ErroApi && Object.keys(erro.campos).length > 0) {
        setErros(erro.campos)
      } else {
        setMensagemEnvio(
          erro instanceof ErroApi
            ? erro.message
            : 'Algo deu errado. Tente de novo em alguns minutos.',
        )
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <title>Fale com a ONG · SOS Patas</title>
      <TituloPagina
        titulo="Fale com a ONG"
        subtitulo="Dúvidas, doações, adoção ou animais perdidos: escreva para a equipe."
      />
      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-6">
        {enviadoPor ? (
          <Enviado nome={enviadoPor} />
        ) : (
          <section className="space-y-5 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <CampoTexto
              rotulo="Seu nome"
              valor={campos.nome}
              aoMudar={(valor) => {
                mudar('nome', valor)
              }}
              limite={L.nome}
              erro={erros.nome}
              autoComplete="name"
            />
            <CampoTexto
              rotulo="Seu e-mail"
              dica="A resposta da ONG chega neste e-mail."
              tipo="email"
              valor={campos.email}
              aoMudar={(valor) => {
                mudar('email', valor)
              }}
              limite={L.email}
              erro={erros.email}
              autoComplete="email"
            />
            <CampoTexto
              rotulo="WhatsApp ou telefone"
              obrigatorio={false}
              tipo="tel"
              valor={campos.telefone}
              aoMudar={(valor) => {
                mudar('telefone', valor)
              }}
              limite={L.telefone}
              erro={erros.telefone}
              autoComplete="tel"
            />
            <Escolha
              rotulo="Assunto"
              opcoes={ROTULOS.assunto_contato}
              valor={assunto}
              aoMudar={(valor) => {
                setAssunto(valor)
                setErros(({ assunto: _removido, ...resto }) => resto)
              }}
              erro={erros.assunto}
            />
            <CampoTexto
              rotulo="Mensagem"
              multilinha
              valor={campos.mensagem}
              aoMudar={(valor) => {
                mudar('mensagem', valor)
              }}
              limite={L.mensagem}
              erro={erros.mensagem}
            />
            <Turnstile
              aoMudar={(novo) => {
                setToken(novo)
                setErros(({ turnstile_token: _removido, ...resto }) => resto)
              }}
            />
            {erros.turnstile_token && (
              <p className="text-sm font-bold text-vermelho">{erros.turnstile_token}</p>
            )}
            {mensagemEnvio && (
              <p role="alert" className="rounded-xl bg-vermelho-claro p-3 font-bold text-vermelho">
                {mensagemEnvio}
              </p>
            )}
            <p className="text-sm text-slate-500">
              Sua mensagem vai para o e-mail da ONG e não fica guardada no site (
              <Link to="/privacidade" className="font-bold text-azul hover:underline">
                privacidade
              </Link>
              ).
            </p>
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={enviando}
              className="min-h-11 w-full rounded-xl bg-azul py-4 text-lg font-extrabold text-white disabled:opacity-60"
            >
              {enviando ? 'Enviando…' : 'Enviar mensagem'}
            </button>
          </section>
        )}
        <OutrasFormas email={ong.email} whatsapp={ong.whatsapp} />
      </div>
    </>
  )
}
