// T13 · Anunciar animal (/perdidos/novo) e T13b · confirmação. Formulário público com segurança
// em camadas (RN19–RN23): só primeiro nome, WhatsApp e bairro, com consentimento (RN28), fotos
// redesenhadas no aparelho (RN20) e Turnstile (RN22). O anúncio vai para a análise da equipe e só
// aparece no site depois de aprovado (RN18).
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { LIMITES, hojeNoBrasil, perdidoEntrada } from '@sospatas/compartilhado'
import { ErroApi, enviarFormulario } from '../api/cliente'
import { AvisoGolpes } from '../components/AvisoGolpes'
import { Caixa, CampoTexto, Escolha } from '../components/Campos'
import { TituloPagina } from '../components/Estados'
import { FotosAnuncio, type FotoDoAnuncio } from '../components/FotosAnuncio'
import { Turnstile } from '../components/Turnstile'

const L = LIMITES.perdidos

type Campos = {
  tipo: string
  especie: string
  nome: string
  bairro: string
  data_ocorrido: string
  descricao: string
  contato_nome: string
  contato_whatsapp: string
}

function Bloco({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      {titulo && <h2 className="font-titulo text-xl font-bold text-azul">{titulo}</h2>}
      <div className={`space-y-5 ${titulo ? 'mt-4' : ''}`}>{children}</div>
    </section>
  )
}

/** Rola até o primeiro campo com erro, depois que a tela atualizar. */
function mostrarPrimeiroErro() {
  setTimeout(() => {
    try {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: 'center' })
    } catch {
      // Ambiente sem rolagem (testes): segue sem rolar
    }
  }, 0)
}

/** T13b · Recebemos seu anúncio. */
function Confirmacao() {
  return (
    <section className="mx-auto max-w-xl px-4 py-10 text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl text-emerald-700"
      >
        ✓
      </span>
      <h1 className="mt-4 font-titulo text-3xl font-extrabold text-azul-escuro">
        Recebemos seu anúncio!
      </h1>
      <p className="mt-2 text-slate-600">
        A equipe da SOS Patas vai conferir e publicar em breve. Como somos voluntários, pode levar
        até 1 dia.
      </p>
      <p className="mt-2 text-slate-600">
        Enquanto isso, compartilhe nas redes sociais e avise vizinhos e clínicas veterinárias do
        bairro.
      </p>
      <div className="mt-6">
        <AvisoGolpes centralizado />
      </div>
      <Link
        to="/perdidos"
        className="mt-6 block min-h-11 rounded-xl bg-azul px-6 py-3 font-extrabold text-white"
      >
        Ver perdidos e encontrados
      </Link>
    </section>
  )
}

function Formulario({ aoEnviar }: { aoEnviar: () => void }) {
  const [campos, setCampos] = useState<Campos>({
    tipo: '',
    especie: '',
    nome: '',
    bairro: '',
    data_ocorrido: hojeNoBrasil(),
    descricao: '',
    contato_nome: '',
    contato_whatsapp: '',
  })
  const [fotos, setFotos] = useState<FotoDoAnuncio[]>([])
  const [consentimento, setConsentimento] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [mensagemEnvio, setMensagemEnvio] = useState<string | null>(null)

  const mudar = (campo: keyof Campos) => (valor: string) => {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }))
    if (erros[campo]) setErros(({ [campo]: _removido, ...resto }) => resto)
  }

  async function enviar() {
    setMensagemEnvio(null)
    const resultado = perdidoEntrada.safeParse(campos)
    const novos: Record<string, string> = {}
    if (!resultado.success) {
      for (const problema of resultado.error.issues) {
        novos[String(problema.path[0] ?? '_')] ??= problema.message
      }
    }
    if (!consentimento) {
      novos.consentimento = 'Marque que você autoriza publicar seu primeiro nome, WhatsApp e fotos'
    }
    if (Object.keys(novos).length > 0) {
      setErros(novos)
      mostrarPrimeiroErro()
      return
    }
    if (!token) {
      setErros({ turnstile_token: 'Aguarde a confirmação de que você não é um robô' })
      return
    }

    const corpo = new FormData()
    corpo.append(
      'dados',
      JSON.stringify({ ...campos, consentimento: true, turnstile_token: token }),
    )
    for (const foto of fotos) {
      if ('arquivo' in foto) corpo.append('fotos', foto.arquivo, 'foto.webp')
    }

    setEnviando(true)
    try {
      await enviarFormulario('/publico/perdidos', corpo)
      aoEnviar()
      window.scrollTo({ top: 0 })
    } catch (erro) {
      if (erro instanceof ErroApi && Object.keys(erro.campos).length > 0) {
        setErros(erro.campos)
        mostrarPrimeiroErro()
      }
      setMensagemEnvio(
        erro instanceof ErroApi
          ? erro.message
          : 'Algo deu errado. Tente de novo em alguns minutos.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pt-5">
      <Bloco>
        <Escolha
          rotulo="O que aconteceu?"
          compacto
          opcoes={{ perdido: '🔎 Perdi meu animal', encontrado: '🏠 Encontrei um animal' }}
          valor={campos.tipo || undefined}
          aoMudar={mudar('tipo')}
          erro={erros.tipo}
        />
        <Escolha
          rotulo="Espécie"
          compacto
          opcoes={{ cao: '🐶 Cão', gato: '🐱 Gato' }}
          valor={campos.especie || undefined}
          aoMudar={mudar('especie')}
          erro={erros.especie}
        />
        <CampoTexto
          rotulo="Nome do animal"
          obrigatorio={false}
          valor={campos.nome}
          aoMudar={mudar('nome')}
          erro={erros.nome}
          limite={L.nome}
          placeholder="Se souber"
        />
        <CampoTexto
          rotulo="Bairro ou região"
          valor={campos.bairro}
          aoMudar={mudar('bairro')}
          erro={erros.bairro}
          limite={L.bairro}
          placeholder="Ex.: Centro, perto da praça"
          dica="Não coloque seu endereço completo."
        />
        <CampoTexto
          rotulo="Quando aconteceu?"
          tipo="date"
          valor={campos.data_ocorrido}
          aoMudar={mudar('data_ocorrido')}
          erro={erros.data_ocorrido}
          max={hojeNoBrasil()}
        />
        <CampoTexto
          rotulo="Características"
          multilinha
          valor={campos.descricao}
          aoMudar={mudar('descricao')}
          erro={erros.descricao}
          limite={L.descricao}
          placeholder="Cor, porte, coleira, sinais…"
          dica={`Até ${String(L.descricao)} caracteres. Não coloque links.`}
        />
      </Bloco>

      <Bloco titulo="📷 Fotos (até 2)">
        <FotosAnuncio fotos={fotos} aoMudar={setFotos} />
      </Bloco>

      <Bloco titulo="📞 Seu contato">
        <CampoTexto
          rotulo="Seu primeiro nome"
          valor={campos.contato_nome}
          aoMudar={mudar('contato_nome')}
          erro={erros.contato_nome}
          limite={L.contato_nome}
          autoComplete="given-name"
          placeholder="Ex.: Maria"
        />
        <CampoTexto
          rotulo="Seu WhatsApp"
          tipo="tel"
          valor={campos.contato_whatsapp}
          aoMudar={mudar('contato_whatsapp')}
          erro={erros.contato_whatsapp}
          limite={20}
          autoComplete="tel"
          placeholder="(35) 9 0000-0000"
          dica="Quem vir o anúncio fala direto com você."
        />
        <div aria-invalid={Boolean(erros.consentimento)}>
          <Caixa
            marcado={consentimento}
            erro={Boolean(erros.consentimento)}
            aoMudar={(marcado) => {
              setConsentimento(marcado)
              if (erros.consentimento) setErros(({ consentimento: _removido, ...resto }) => resto)
            }}
          >
            Autorizo a SOS Patas a publicar este anúncio, <b>com meu primeiro nome e WhatsApp</b>,
            por até 30 dias. Depois disso, ele e as fotos são apagados.{' '}
            <Link to="/privacidade" className="font-bold text-azul underline">
              Privacidade
            </Link>
          </Caixa>
          {erros.consentimento && (
            <p className="mt-1.5 text-sm font-bold text-vermelho">{erros.consentimento}</p>
          )}
        </div>
      </Bloco>

      <Turnstile
        aoMudar={(novo) => {
          setToken(novo)
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

      <button
        type="button"
        onClick={() => void enviar()}
        disabled={enviando}
        className="min-h-11 w-full rounded-xl bg-azul py-4 text-lg font-extrabold text-white disabled:opacity-60"
      >
        {enviando ? 'Enviando…' : 'Enviar para análise'}
      </button>
      <p className="text-center text-xs text-slate-500">
        O anúncio só aparece no site depois de aprovado pela equipe da ONG.
      </p>
    </div>
  )
}

export function AnunciarPerdido() {
  const [enviado, setEnviado] = useState(false)
  return (
    <>
      <title>Anunciar animal perdido ou encontrado · SOS Patas</title>
      {enviado ? (
        <Confirmacao />
      ) : (
        <>
          <TituloPagina
            titulo="Anunciar animal"
            subtitulo="Perdeu ou encontrou um animal? A gente ajuda a divulgar."
          />
          <Formulario
            aoEnviar={() => {
              setEnviado(true)
            }}
          />
        </>
      )}
    </>
  )
}
