// Aba "Mais" da área da ONG: T22 (lista de atalhos, com "Quem adotou", T30), T23 Dados da ONG
// (contatos e PIX, RN51) e T24 Protetores parceiros (RN42). "Alterado por… em…" nas edições (RN43).
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LIMITES,
  PIX_TIPOS,
  ROTULOS,
  formatarWhatsapp,
  ongEntrada,
  type OngAdmin,
  type ProtetorAdmin,
} from '@sospatas/compartilhado'
import { atualizarConteudo, useOng, useProtetores } from '../../api/admin'
import { ErroApi, chamarAdmin } from '../../api/cliente'
import { BlocoPix } from '../../components/BlocoPix'
import { CampoTexto, Escolha } from '../../components/Campos'
import { Carregando, ErroAoCarregar } from '../../components/Estados'
import { ModalProtetor } from '../../components/admin/ModalProtetor'
import {
  AlteradoPor,
  BarraSalvar,
  ENDERECO_SAIR,
  TituloAdmin,
} from '../../components/admin/Navegacao'
import { useAreaAdmin } from '../../components/admin/contexto'

function Atalho({
  icone,
  titulo,
  detalhe,
  para,
  externo = false,
}: {
  icone: string
  titulo: string
  detalhe?: string
  para: string
  /** Link comum (abre o site em outra aba ou sai pelo Access), fora das rotas do app */
  externo?: boolean
}) {
  const conteudo: ReactNode = (
    <>
      <span className="text-2xl" aria-hidden="true">
        {icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-titulo text-lg font-bold text-azul-escuro">{titulo}</span>
        {detalhe && <span className="block text-sm text-slate-600">{detalhe}</span>}
      </span>
      <span className="text-2xl text-slate-400" aria-hidden="true">
        ›
      </span>
    </>
  )
  const classe =
    'flex min-h-16 items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 hover:ring-azul'
  return (
    <li>
      {externo ? (
        <a
          href={para}
          className={classe}
          {...(para.startsWith('/cdn-cgi') ? {} : { target: '_blank', rel: 'noreferrer' })}
        >
          {conteudo}
        </a>
      ) : (
        <Link to={para} className={classe}>
          {conteudo}
        </Link>
      )}
    </li>
  )
}

/** T22 · Mais. */
export function Mais() {
  const protetores = useProtetores()
  const quantidade = protetores.data?.protetores.length
  return (
    <section className="space-y-4">
      <title>Mais · Área da ONG · SOS Patas</title>
      <TituloAdmin titulo="Mais" />
      <ul className="space-y-3">
        <Atalho
          icone="🏢"
          titulo="Dados da ONG"
          detalhe="E-mail, WhatsApp, Instagram, Facebook e PIX"
          para="/admin/ong"
        />
        <Atalho
          icone="🏠"
          titulo="Quem adotou"
          detalhe="Cadastro de quem já adotou, com o histórico e as observações da equipe"
          para="/admin/adotantes"
        />
        <Atalho
          icone="🤝"
          titulo={`Protetores parceiros${quantidade === undefined ? '' : ` (${String(quantidade)})`}`}
          detalhe="Nome e WhatsApp de quem cuida dos animais de protetores"
          para="/admin/protetores"
        />
        <Atalho icone="🌐" titulo="Ver o site ↗" para="/" externo />
        <Atalho icone="🚪" titulo="Sair" para={ENDERECO_SAIR} externo />
      </ul>
      <p className="text-center text-sm text-slate-500">
        Precisa liberar o acesso de outra pessoa? Fale com o administrador do site.
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// T23 · Dados da ONG
// ---------------------------------------------------------------------------
const ID_FORMULARIO_ONG = 'formulario-ong'

type CamposOng = {
  nome_completo: string
  email: string
  whatsapp: string
  instagram: string
  facebook: string
  pix_tipo: string
  pix_chave: string
}

const camposDaOng = (ong: OngAdmin): CamposOng => ({
  nome_completo: ong.nome_completo,
  email: ong.email,
  whatsapp: ong.whatsapp ? formatarWhatsapp(ong.whatsapp) : '',
  instagram: ong.instagram,
  facebook: ong.facebook ?? '',
  pix_tipo: ong.pix_tipo,
  pix_chave: ong.pix_chave,
})

function FormularioOng({ ong }: { ong: OngAdmin }) {
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [campos, setCampos] = useState(() => camposDaOng(ong))
  const [alteracao, setAlteracao] = useState(ong.alteracao)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [falha, setFalha] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const mudar = (campo: keyof CamposOng) => (valor: string) => {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }))
    if (erros[campo]) setErros(({ [campo]: _removido, ...resto }) => resto)
  }

  async function salvar() {
    setFalha(null)
    const resultado = ongEntrada.safeParse(campos)
    if (!resultado.success) {
      const novos: Record<string, string> = {}
      for (const problema of resultado.error.issues) {
        novos[String(problema.path[0] ?? '_')] ??= problema.message
      }
      setErros(novos)
      return
    }
    setEnviando(true)
    try {
      const salva = await chamarAdmin<OngAdmin>('PUT', '/ong', campos)
      setCampos(camposDaOng(salva))
      setAlteracao(salva.alteracao)
      queryClient.setQueryData(['admin', 'ong'], salva)
      avisar('Salvo e publicado ✓', '/')
      await atualizarConteudo(queryClient)
    } catch (erro) {
      if (erro instanceof ErroApi) setErros(erro.campos)
      setFalha(mensagemDeErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  // Prévia do card do PIX com o que está digitado
  const previaPix = {
    ...ong,
    pix_tipo: (PIX_TIPOS as readonly string[]).includes(campos.pix_tipo)
      ? (campos.pix_tipo as OngAdmin['pix_tipo'])
      : ong.pix_tipo,
    pix_chave: campos.pix_chave,
  }

  return (
    <section className="space-y-4 pb-24">
      <div>
        <TituloAdmin titulo="Dados da ONG" subtitulo="Aparecem no rodapé e nas páginas do site." />
        <AlteradoPor {...alteracao} />
      </div>
      <form
        id={ID_FORMULARIO_ONG}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void salvar()
        }}
        className="space-y-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
      >
        <CampoTexto
          rotulo="E-mail da ONG"
          tipo="email"
          valor={campos.email}
          aoMudar={mudar('email')}
          erro={erros.email}
          limite={LIMITES.ong.email}
          dica="Usado no rodapé, nas perguntas frequentes, na privacidade e no Fale com a ONG. As mensagens do formulário chegam no e-mail configurado no Cloudflare: se trocar o e-mail, avise o administrador do site."
        />
        <CampoTexto
          rotulo="WhatsApp da ONG"
          tipo="tel"
          obrigatorio={false}
          valor={campos.whatsapp}
          aoMudar={mudar('whatsapp')}
          erro={erros.whatsapp}
          limite={20}
          placeholder="(35) 9 9999-9999"
          dica="Deixe vazio enquanto a ONG não tiver um número próprio para o site. Preenchido, aparece no rodapé e no Fale com a ONG."
        />
        <CampoTexto
          rotulo="Instagram"
          prefixo="@"
          valor={campos.instagram.replace(/^@/, '')}
          aoMudar={mudar('instagram')}
          erro={erros.instagram}
          limite={LIMITES.ong.instagram}
          placeholder="sospatas.ong"
        />
        <CampoTexto
          rotulo="Facebook"
          obrigatorio={false}
          valor={campos.facebook}
          aoMudar={mudar('facebook')}
          erro={erros.facebook}
          limite={LIMITES.ong.facebook}
          placeholder="facebook.com/sospatasmg"
          dica="Cole o endereço da página."
        />
        <Escolha
          rotulo="Tipo da chave PIX"
          compacto
          opcoes={ROTULOS.pix_tipo}
          valor={campos.pix_tipo}
          aoMudar={mudar('pix_tipo')}
          erro={erros.pix_tipo}
        />
        <CampoTexto
          rotulo="Chave PIX"
          valor={campos.pix_chave}
          aoMudar={mudar('pix_chave')}
          erro={erros.pix_chave}
          limite={LIMITES.ong.pix_chave}
        />
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
            Prévia do PIX no site
          </p>
          <div className="mt-1.5">
            <BlocoPix ong={previaPix} variante="destaque" />
          </div>
        </div>
        <CampoTexto
          rotulo="Nome completo da ONG"
          valor={campos.nome_completo}
          aoMudar={mudar('nome_completo')}
          erro={erros.nome_completo}
          limite={LIMITES.ong.nome_completo}
        />
      </form>
      {falha && (
        <p role="alert" className="rounded-xl bg-vermelho-claro p-3 font-bold text-vermelho">
          {falha}
        </p>
      )}
      <BarraSalvar
        cancelar="/admin/mais"
        rotulo="Salvar"
        formulario={ID_FORMULARIO_ONG}
        enviando={enviando}
      />
    </section>
  )
}

/** T23 · Dados da ONG. */
export function DadosDaOng() {
  const ong = useOng()
  return (
    <>
      <title>Dados da ONG · Área da ONG · SOS Patas</title>
      {ong.isPending ? (
        <Carregando />
      ) : ong.isError ? (
        <ErroAoCarregar tentarDeNovo={() => void ong.refetch()} />
      ) : (
        <FormularioOng ong={ong.data} />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// T24 · Protetores parceiros
// ---------------------------------------------------------------------------
const disponiveis = (quantidade: number) =>
  quantidade === 1 ? '1 animal disponível' : `${String(quantidade)} animais disponíveis`

/** T24 · Protetores parceiros. */
export function Protetores() {
  const protetores = useProtetores()
  const { avisar } = useAreaAdmin()
  const [aberto, setAberto] = useState<ProtetorAdmin | 'novo' | null>(null)

  return (
    <section className="space-y-4 pb-24">
      <title>Protetores parceiros · Área da ONG · SOS Patas</title>
      <TituloAdmin
        titulo="Protetores parceiros"
        subtitulo="O WhatsApp aparece na ficha dos animais de cada protetor."
      />
      {protetores.isPending ? (
        <Carregando />
      ) : protetores.isError ? (
        <ErroAoCarregar tentarDeNovo={() => void protetores.refetch()} />
      ) : protetores.data.protetores.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-slate-600 ring-1 ring-slate-200">
          Nenhum protetor cadastrado ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {protetores.data.protetores.map((protetor) => (
            <li key={protetor.id}>
              <button
                type="button"
                onClick={() => {
                  setAberto(protetor)
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 hover:ring-azul"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-azul-escuro">{protetor.nome}</span>
                  <span className="block text-sm text-slate-600">
                    {formatarWhatsapp(protetor.whatsapp)} ·{' '}
                    {disponiveis(protetor.animais_disponiveis)}
                  </span>
                  <AlteradoPor {...protetor.alteracao} />
                </span>
                <span className="text-2xl text-slate-400" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={() => {
              setAberto('novo')
            }}
            className="min-h-11 w-full rounded-xl bg-azul py-3 text-lg font-extrabold text-white"
          >
            ＋ Novo protetor
          </button>
        </div>
      </div>
      {aberto && (
        <ModalProtetor
          protetor={aberto === 'novo' ? undefined : aberto}
          aoFechar={() => {
            setAberto(null)
          }}
          aoSalvar={(_protetor, aviso) => {
            setAberto(null)
            avisar(aviso)
          }}
        />
      )}
    </section>
  )
}
