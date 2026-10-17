// Cadastro de quem adotou (RN53): T30 lista com busca por nome ou WhatsApp, para conferir numa
// feira ou num pedido novo se a pessoa já adotou ou tem observação; T31 ficha da pessoa, com
// observações, histórico de adoções, adoção antiga registrada à mão e exclusão (LGPD).
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LIMITES,
  adocaoAntigaEntrada,
  adotanteEntrada,
  formatarData,
  formatarWhatsapp,
  hojeNoBrasil,
  type AdocaoDoAdotante,
  type AdotanteDetalhe,
  type AdotanteResumo,
  type Criado,
} from '@sospatas/compartilhado'
import { atualizarAdmin, useAdotante, useAdotantes } from '../../api/admin'
import { ErroApi, chamarAdmin } from '../../api/cliente'
import { CampoTexto } from '../../components/Campos'
import { Carregando, ErroAoCarregar } from '../../components/Estados'
import { BotoesModal, Modal } from '../../components/Modal'
import { AlteradoPor, BarraSalvar, TituloAdmin } from '../../components/admin/Navegacao'
import { useAreaAdmin } from '../../components/admin/contexto'

/** Erros do zod por campo, como o formulário mostra. */
function errosPorCampo(issues: { path: PropertyKey[]; message: string }[]) {
  const campos: Record<string, string> = {}
  for (const problema of issues) campos[String(problema.path[0] ?? '_')] ??= problema.message
  return campos
}

const plural = (quantidade: number, um: string, varios: string) =>
  `${String(quantidade)} ${quantidade === 1 ? um : varios}`

/** "2 adoções · 1 devolução": o que a equipe precisa ver de relance. */
function Contagem({ adotante }: { adotante: AdotanteResumo }) {
  return (
    <span className="block text-sm text-slate-600">
      {plural(adotante.adocoes, 'adoção', 'adoções')}
      {adotante.devolucoes > 0 && (
        <span className="font-bold text-vermelho">
          {' '}
          · {plural(adotante.devolucoes, 'devolução', 'devoluções')}
        </span>
      )}
      {adotante.ultima_adocao && <> · última em {formatarData(adotante.ultima_adocao)}</>}
    </span>
  )
}

/** Aviso amarelo com as observações da equipe (também na análise do pedido, T28). */
export function ObservacaoAdotante({ texto }: { texto: string }) {
  if (!texto) return null
  return (
    <span className="mt-1.5 block whitespace-pre-line rounded-lg bg-amarelo-claro px-2.5 py-1.5 text-sm text-[#7A4A00]">
      📝 {texto}
    </span>
  )
}

// ---------------------------------------------------------------------------
// T30 · Quem adotou
// ---------------------------------------------------------------------------
export function Adotantes() {
  const [busca, setBusca] = useState('')
  const lista = useAdotantes(busca.trim())
  const adotantes = lista.data?.adotantes ?? []

  return (
    <section className="space-y-4 pb-24">
      <title>Quem adotou · Área da ONG · SOS Patas</title>
      <TituloAdmin
        titulo="Quem adotou"
        subtitulo="Antes de entregar um animal, confira se a pessoa já adotou ou tem alguma observação."
      />
      <label className="block">
        <span className="sr-only">Buscar pelo nome ou WhatsApp</span>
        <input
          type="search"
          value={busca}
          onChange={(evento) => {
            setBusca(evento.target.value)
          }}
          placeholder="Buscar pelo nome ou WhatsApp…"
          maxLength={40}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base focus:border-azul focus:outline-none"
        />
      </label>

      {lista.isPending ? (
        <Carregando />
      ) : lista.isError ? (
        <ErroAoCarregar tentarDeNovo={() => void lista.refetch()} />
      ) : adotantes.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-slate-600 ring-1 ring-slate-200">
          {busca.trim()
            ? 'Ninguém com esse nome ou WhatsApp no cadastro.'
            : 'Ninguém no cadastro ainda. Quem adotar pelo site entra aqui sozinho.'}
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-500">{plural(adotantes.length, 'pessoa', 'pessoas')}</p>
          <ul className="space-y-3">
            {adotantes.map((adotante) => (
              <li key={adotante.id}>
                <Link
                  to={`/admin/adotantes/${adotante.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 hover:ring-azul"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold text-azul-escuro">{adotante.nome}</span>
                    <span className="block text-sm text-slate-600">
                      {adotante.whatsapp ? formatarWhatsapp(adotante.whatsapp) : 'Sem WhatsApp'}
                      {adotante.bairro_cidade && <> · {adotante.bairro_cidade}</>}
                    </span>
                    <Contagem adotante={adotante} />
                    <ObservacaoAdotante texto={adotante.observacoes} />
                  </span>
                  <span className="text-2xl text-slate-400" aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="mx-auto max-w-xl">
          <Link
            to="/admin/adotantes/nova"
            className="block min-h-11 w-full rounded-xl bg-azul py-3 text-center text-lg font-extrabold text-white"
          >
            ＋ Cadastrar quem adotou antes
          </Link>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// T31 · Ficha de quem adotou
// ---------------------------------------------------------------------------
const ID_FORMULARIO = 'formulario-adotante'

type Campos = { nome: string; whatsapp: string; bairro_cidade: string; observacoes: string }

const camposDe = (adotante?: AdotanteDetalhe): Campos => ({
  nome: adotante?.nome ?? '',
  whatsapp: adotante?.whatsapp ? formatarWhatsapp(adotante.whatsapp) : '',
  bairro_cidade: adotante?.bairro_cidade ?? '',
  observacoes: adotante?.observacoes ?? '',
})

function FormularioAdotante({ adotante }: { adotante?: AdotanteDetalhe }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [campos, setCampos] = useState(() => camposDe(adotante))
  const [erros, setErros] = useState<Record<string, string>>({})
  const [falha, setFalha] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const mudar = (campo: keyof Campos) => (valor: string) => {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }))
    if (erros[campo]) setErros(({ [campo]: _removido, ...resto }) => resto)
  }

  async function salvar() {
    setFalha(null)
    const conferido = adotanteEntrada.safeParse(campos)
    if (!conferido.success) {
      setErros(errosPorCampo(conferido.error.issues))
      return
    }
    setEnviando(true)
    try {
      if (adotante) {
        await chamarAdmin('PUT', `/adotantes/${adotante.id}`, campos)
        await atualizarAdmin(queryClient)
        avisar('Salvo ✓')
        setEnviando(false)
      } else {
        const { id } = await chamarAdmin<Criado>('POST', '/adotantes', campos)
        await atualizarAdmin(queryClient)
        avisar('Pessoa cadastrada ✓')
        void navigate(`/admin/adotantes/${id}`, { replace: true })
      }
    } catch (erro) {
      if (erro instanceof ErroApi) setErros(erro.campos)
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
    }
  }

  return (
    <>
      <form
        id={ID_FORMULARIO}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void salvar()
        }}
        className="space-y-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
      >
        <CampoTexto
          rotulo="Nome completo"
          valor={campos.nome}
          aoMudar={mudar('nome')}
          erro={erros.nome}
          limite={LIMITES.adotantes.nome}
        />
        <CampoTexto
          rotulo="WhatsApp"
          tipo="tel"
          obrigatorio={false}
          valor={campos.whatsapp}
          aoMudar={mudar('whatsapp')}
          erro={erros.whatsapp}
          limite={20}
          placeholder="(35) 9 9999-9999"
          dica="É por ele que o site reconhece a pessoa num pedido novo."
        />
        <CampoTexto
          rotulo="Bairro e cidade"
          obrigatorio={false}
          valor={campos.bairro_cidade}
          aoMudar={mudar('bairro_cidade')}
          erro={erros.bairro_cidade}
          limite={LIMITES.adotantes.bairro_cidade}
          placeholder="Ex.: Centro, Passos"
        />
        <CampoTexto
          rotulo="Observações da equipe"
          multilinha
          obrigatorio={false}
          valor={campos.observacoes}
          aoMudar={mudar('observacoes')}
          erro={erros.observacoes}
          limite={LIMITES.adotantes.observacoes}
          dica="Só a equipe vê. Aparecem na lista e na análise de um pedido novo desta pessoa."
        />
      </form>
      {falha && (
        <p role="alert" className="rounded-xl bg-vermelho-claro p-3 font-bold text-vermelho">
          {falha}
        </p>
      )}
      <BarraSalvar
        cancelar="/admin/adotantes"
        rotulo={adotante ? 'Salvar' : 'Cadastrar'}
        formulario={ID_FORMULARIO}
        enviando={enviando}
      />
    </>
  )
}

function ItemAdocao({ adotanteId, adocao }: { adotanteId: string; adocao: AdocaoDoAdotante }) {
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [confirmar, setConfirmar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState('')
  const registradaAMao = !adocao.animal_id && !adocao.pedido_id

  async function excluir() {
    setEnviando(true)
    setFalha('')
    try {
      await chamarAdmin('DELETE', `/adotantes/${adotanteId}/adocoes/${adocao.id}`)
      await atualizarAdmin(queryClient)
      avisar('Adoção apagada')
    } catch (erro) {
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
    }
  }

  return (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="font-extrabold text-azul-escuro">
        {adocao.animal_id ? (
          <Link to={`/admin/animais/${adocao.animal_id}`} className="underline">
            {adocao.animal_nome}
          </Link>
        ) : (
          adocao.animal_nome
        )}
      </p>
      <p className="text-sm text-slate-600">Adotado em {formatarData(adocao.data_adocao)}</p>
      {adocao.data_devolucao && (
        <p className="text-sm font-bold text-vermelho">
          Devolvido em {formatarData(adocao.data_devolucao)}
        </p>
      )}
      {adocao.pedido_id && (
        <Link
          to={`/admin/pedidos/${adocao.pedido_id}`}
          className="mt-1 inline-block text-sm font-bold text-azul underline"
        >
          📋 Ver o formulário de adoção
        </Link>
      )}
      {registradaAMao && (
        <p className="mt-1 text-xs text-slate-500">
          Registrada à mão.{' '}
          <button
            type="button"
            onClick={() => {
              setConfirmar(true)
            }}
            className="font-bold text-vermelho underline"
          >
            Apagar
          </button>
        </p>
      )}
      {falha && <p className="mt-1 text-sm font-bold text-vermelho">{falha}</p>}
      {confirmar && (
        <Modal
          titulo="Apagar esta adoção?"
          corTitulo="text-vermelho"
          aoFechar={
            enviando
              ? undefined
              : () => {
                  setConfirmar(false)
                }
          }
        >
          <p className="text-slate-700">
            A adoção de <b>{adocao.animal_nome}</b> sai do histórico. Use só para corrigir um
            registro errado.
          </p>
          <BotoesModal
            aoCancelar={() => {
              setConfirmar(false)
            }}
            rotulo="Apagar"
            aoConfirmar={() => void excluir()}
            enviando={enviando}
            cor="bg-vermelho"
          />
        </Modal>
      )}
    </li>
  )
}

function ModalAdocaoAntiga({
  adotante,
  aoFechar,
}: {
  adotante: AdotanteDetalhe
  aoFechar: () => void
}) {
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [campos, setCampos] = useState({ animal_nome: '', data_adocao: '', data_devolucao: '' })
  const [erros, setErros] = useState<Record<string, string>>({})
  const [falha, setFalha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const hoje = hojeNoBrasil()

  const mudar = (campo: keyof typeof campos) => (valor: string) => {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }))
  }

  async function salvar() {
    const dados = { ...campos, data_devolucao: campos.data_devolucao || null }
    const conferido = adocaoAntigaEntrada.safeParse(dados)
    if (!conferido.success) {
      setErros(errosPorCampo(conferido.error.issues))
      return
    }
    setErros({})
    setFalha('')
    setEnviando(true)
    try {
      await chamarAdmin('POST', `/adotantes/${adotante.id}/adocoes`, dados)
      await atualizarAdmin(queryClient)
      avisar('Adoção registrada ✓')
      aoFechar()
    } catch (erro) {
      if (erro instanceof ErroApi) setErros(erro.campos)
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Adoção de antes do site" aoFechar={enviando ? undefined : aoFechar}>
      <p className="text-sm text-slate-600">
        Para registrar um animal que {adotante.nome} adotou antes do site, numa feira ou sem
        cadastro aqui.
      </p>
      <div className="mt-4 space-y-4">
        <CampoTexto
          rotulo="Nome do animal"
          valor={campos.animal_nome}
          aoMudar={mudar('animal_nome')}
          erro={erros.animal_nome}
          limite={LIMITES.adocoes.animal_nome}
        />
        <CampoTexto
          rotulo="Data da adoção"
          tipo="date"
          max={hoje}
          valor={campos.data_adocao}
          aoMudar={mudar('data_adocao')}
          erro={erros.data_adocao}
          dica="Não sabe o dia? Use o primeiro dia do mês."
        />
        <CampoTexto
          rotulo="Data da devolução"
          tipo="date"
          max={hoje}
          obrigatorio={false}
          valor={campos.data_devolucao}
          aoMudar={mudar('data_devolucao')}
          erro={erros.data_devolucao}
          dica="Só se o animal voltou para a ONG."
        />
      </div>
      {falha && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-vermelho-claro p-3 text-sm font-bold text-vermelho"
        >
          {falha}
        </p>
      )}
      <BotoesModal
        aoCancelar={aoFechar}
        rotulo="Registrar adoção"
        aoConfirmar={() => void salvar()}
        enviando={enviando}
      />
    </Modal>
  )
}

function ExcluirAdotante({ adotante }: { adotante: AdotanteDetalhe }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState('')

  async function excluir() {
    setEnviando(true)
    setFalha('')
    try {
      await chamarAdmin('DELETE', `/adotantes/${adotante.id}`)
      await atualizarAdmin(queryClient)
      avisar('Cadastro excluído')
      void navigate('/admin/adotantes', { replace: true })
    } catch (erro) {
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAberto(true)
        }}
        className="min-h-11 w-full rounded-xl font-bold text-vermelho"
      >
        Excluir cadastro
      </button>
      {aberto && (
        <Modal
          titulo="Excluir cadastro?"
          corTitulo="text-vermelho"
          aoFechar={
            enviando
              ? undefined
              : () => {
                  setAberto(false)
                }
          }
        >
          <p className="text-slate-700">
            <b>{adotante.nome}</b> sai do cadastro, com o histórico de adoções e as observações. Use
            quando a pessoa pedir para apagar os dados dela. Não dá para desfazer.
          </p>
          {falha && <p className="mt-2 text-sm font-bold text-vermelho">{falha}</p>}
          <BotoesModal
            aoCancelar={() => {
              setAberto(false)
            }}
            rotulo="Excluir"
            aoConfirmar={() => void excluir()}
            enviando={enviando}
            cor="bg-vermelho"
          />
        </Modal>
      )}
    </>
  )
}

function Ficha({ adotante }: { adotante: AdotanteDetalhe }) {
  const [adocaoAntiga, setAdocaoAntiga] = useState(false)
  return (
    <section className="space-y-4 pb-24">
      <div>
        <TituloAdmin titulo={adotante.nome} />
        <AlteradoPor {...adotante.alteracao} />
      </div>
      <FormularioAdotante key={adotante.alteracao.em} adotante={adotante} />

      <h2 className="pt-2 font-titulo text-2xl font-bold text-azul-escuro">Adoções</h2>
      {adotante.adocoes.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-slate-600 ring-1 ring-slate-200">
          Nenhuma adoção registrada.
        </p>
      ) : (
        <ul className="space-y-3">
          {adotante.adocoes.map((adocao) => (
            <ItemAdocao key={adocao.id} adotanteId={adotante.id} adocao={adocao} />
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => {
          setAdocaoAntiga(true)
        }}
        className="min-h-11 w-full rounded-xl bg-white py-3 font-bold text-azul ring-2 ring-azul"
      >
        ＋ Registrar adoção de antes do site
      </button>
      <ExcluirAdotante adotante={adotante} />
      {adocaoAntiga && (
        <ModalAdocaoAntiga
          adotante={adotante}
          aoFechar={() => {
            setAdocaoAntiga(false)
          }}
        />
      )}
    </section>
  )
}

/** T31 · Ficha (endereço /admin/adotantes/:id). */
export function FichaAdotante() {
  const { id } = useParams()
  const adotante = useAdotante(id)
  return (
    <>
      <title>Quem adotou · Área da ONG · SOS Patas</title>
      {adotante.isPending ? (
        <Carregando />
      ) : adotante.error instanceof ErroApi && adotante.error.status === 404 ? (
        <p className="rounded-2xl bg-white p-4 text-slate-600 ring-1 ring-slate-200">
          Não encontramos esta pessoa no cadastro.{' '}
          <Link to="/admin/adotantes" className="font-bold text-azul underline">
            Voltar para a lista
          </Link>
        </p>
      ) : adotante.isError ? (
        <ErroAoCarregar tentarDeNovo={() => void adotante.refetch()} />
      ) : (
        <Ficha adotante={adotante.data} />
      )}
    </>
  )
}

/** Cadastro à mão de quem adotou antes do site (endereço /admin/adotantes/nova). */
export function NovoAdotante() {
  return (
    <section className="space-y-4 pb-24">
      <title>Cadastrar quem adotou · Área da ONG · SOS Patas</title>
      <TituloAdmin
        titulo="Cadastrar quem adotou"
        subtitulo="Para quem adotou antes do site. Quem adota pelo site entra no cadastro sozinho."
      />
      <FormularioAdotante />
    </section>
  )
}
