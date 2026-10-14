// T21 · Anúncio pela equipe (/admin/perdidos/novo e /admin/perdidos/:id). Novo: para quem
// pediu pelo WhatsApp, com a autorização da pessoa; entra direto no ar (RN39). Editar: corrige
// os campos e as fotos de um anúncio pendente ou no ar (RN40); quem anunciou não é avisado.
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LIMITES,
  formatarWhatsapp,
  hojeNoBrasil,
  perdidoEdicaoEntrada,
  perdidoEquipeEntrada,
  type Criado,
  type PerdidoAdmin,
} from '@sospatas/compartilhado'
import { atualizarAdmin, usePerdidoAdmin } from '../../api/admin'
import { ErroApi, chamarAdmin, urlDaApi } from '../../api/cliente'
import { Caixa, CampoTexto, Escolha } from '../../components/Campos'
import { Carregando, ErroAoCarregar } from '../../components/Estados'
import { FotosAnuncio, type FotoDoAnuncio } from '../../components/FotosAnuncio'
import { BotoesModal, Modal } from '../../components/Modal'
import { AlteradoPor, BarraSalvar, TituloAdmin } from '../../components/admin/Navegacao'
import { useAreaAdmin } from '../../components/admin/contexto'
import { diasAteSairDoAr, textoSaiDoAr } from '../../lib/perdidos'

const L = LIMITES.perdidos
const ID_FORMULARIO = 'formulario-anuncio'
const VOLTAR = '/admin/perdidos'

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

const camposDoAnuncio = (anuncio: PerdidoAdmin): Campos => ({
  tipo: anuncio.tipo,
  especie: anuncio.especie,
  nome: anuncio.nome ?? '',
  bairro: anuncio.bairro,
  data_ocorrido: anuncio.data_ocorrido,
  descricao: anuncio.descricao,
  contato_nome: anuncio.contato_nome,
  contato_whatsapp: formatarWhatsapp(anuncio.contato_whatsapp),
})

/** Foto pendente vem da quarentena pela API (só a equipe vê); a publicada, do site. */
const enderecoFoto = (url: string) => (url.startsWith('/api/') ? urlDaApi(url) : url)

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

function FormularioAnuncio({ anuncio }: { anuncio: PerdidoAdmin | null }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [campos, setCampos] = useState<Campos>(() =>
    anuncio
      ? camposDoAnuncio(anuncio)
      : {
          tipo: '',
          especie: '',
          nome: '',
          bairro: '',
          data_ocorrido: hojeNoBrasil(),
          descricao: '',
          contato_nome: '',
          contato_whatsapp: '',
        },
  )
  const [fotos, setFotos] = useState<FotoDoAnuncio[]>(
    () => anuncio?.fotos.map((foto) => ({ id: foto.id, url: enderecoFoto(foto.url) })) ?? [],
  )
  const [autorizacao, setAutorizacao] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)
  const [recusar, setRecusar] = useState(false)

  const pendente = anuncio?.status === 'pendente'
  const destino = !anuncio || anuncio.status === 'publicado' ? `${VOLTAR}?aba=publicado` : VOLTAR

  const mudar = (campo: keyof Campos) => (valor: string) => {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }))
    if (erros[campo]) setErros(({ [campo]: _removido, ...resto }) => resto)
  }

  /** Confere os campos; com erro, mostra na tela e devolve false. */
  function conferir(): boolean {
    const resultado = anuncio
      ? perdidoEdicaoEntrada.safeParse(campos)
      : perdidoEquipeEntrada.safeParse({ ...campos, autorizacao })
    if (resultado.success) return true
    const novos: Record<string, string> = {}
    for (const problema of resultado.error.issues) {
      novos[String(problema.path[0] ?? '_')] ??= problema.message
    }
    setErros(novos)
    mostrarPrimeiroErro()
    return false
  }

  /** Grava os campos e acerta as fotos: tira as removidas e envia as novas (RN40). */
  async function gravarAlteracoes(atual: PerdidoAdmin) {
    await chamarAdmin('PUT', `/perdidos/${atual.id}`, campos)
    const mantidas = new Set(fotos.map((foto) => foto.id))
    for (const foto of atual.fotos) {
      if (!mantidas.has(foto.id))
        await chamarAdmin('DELETE', `/perdidos/${atual.id}/fotos/${foto.id}`)
    }
    for (const foto of fotos) {
      if (!('arquivo' in foto)) continue
      const corpo = new FormData()
      corpo.append('foto', foto.arquivo, 'foto.webp')
      await chamarAdmin('POST', `/perdidos/${atual.id}/fotos`, corpo)
    }
  }

  async function executar(acao: () => Promise<void>, aviso: string, link?: string) {
    setFalha(null)
    setEnviando(true)
    try {
      await acao()
      avisar(aviso, link)
      void navigate(destino)
      await atualizarAdmin(queryClient)
    } catch (erro) {
      if (erro instanceof ErroApi && Object.keys(erro.campos).length > 0) {
        setErros(erro.campos)
        mostrarPrimeiroErro()
      }
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
      // Parte das alterações pode ter sido gravada: a próxima tela já mostra o estado real
      await atualizarAdmin(queryClient)
    }
  }

  function salvar() {
    if (!conferir()) return
    if (!anuncio) {
      const corpo = new FormData()
      corpo.append('dados', JSON.stringify({ ...campos, autorizacao: true }))
      for (const foto of fotos) {
        if ('arquivo' in foto) corpo.append('fotos', foto.arquivo, 'foto.webp')
      }
      void executar(
        async () => {
          await chamarAdmin<Criado>('POST', '/perdidos', corpo)
        },
        'Publicado no site ✓',
        '/perdidos',
      )
      return
    }
    void executar(
      () => gravarAlteracoes(anuncio),
      'Salvo ✓',
      anuncio.status === 'publicado' ? '/perdidos' : undefined,
    )
  }

  function aprovar() {
    if (!anuncio || !conferir()) return
    void executar(
      async () => {
        await gravarAlteracoes(anuncio)
        await chamarAdmin('POST', `/perdidos/${anuncio.id}/aprovar`)
      },
      'Publicado no site ✓',
      '/perdidos',
    )
  }

  const situacao =
    anuncio &&
    (anuncio.status === 'pendente'
      ? 'Aguardando aprovação'
      : `No ar, ${textoSaiDoAr(diasAteSairDoAr(anuncio.expira_em ?? '', hojeNoBrasil()))}`)

  return (
    <section className="space-y-4 pb-24">
      <title>{`${anuncio ? 'Editar anúncio' : 'Novo anúncio'} · Área da ONG · SOS Patas`}</title>
      <div>
        <TituloAdmin
          titulo={anuncio ? 'Editar anúncio' : 'Novo anúncio'}
          subtitulo={
            anuncio
              ? (situacao ?? undefined)
              : 'Para quem pediu pelo WhatsApp. Entra no site na hora, por 30 dias.'
          }
        />
        {anuncio && <AlteradoPor {...anuncio.alteracao} />}
      </div>
      {anuncio && (
        <p className="rounded-xl bg-azul-claro p-3 text-sm text-azul-escuro">
          Quem anunciou não é avisado das alterações.
        </p>
      )}

      <form
        id={ID_FORMULARIO}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          salvar()
        }}
        className="space-y-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
      >
        <Escolha
          rotulo="O que aconteceu?"
          compacto
          opcoes={{ perdido: '🔎 Perdido', encontrado: '🏠 Encontrado' }}
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
        />
        <CampoTexto
          rotulo="Bairro ou região"
          valor={campos.bairro}
          aoMudar={mudar('bairro')}
          erro={erros.bairro}
          limite={L.bairro}
          dica="Só o bairro, nunca o endereço completo."
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
          dica={`Até ${String(L.descricao)} caracteres. Sem links.`}
        />
        <div>
          <p className="font-extrabold text-slate-800">
            Fotos <span className="font-semibold text-slate-400">(até 2)</span>
          </p>
          <div className="mt-1.5">
            <FotosAnuncio fotos={fotos} aoMudar={setFotos} />
          </div>
        </div>
        <CampoTexto
          rotulo="Primeiro nome do contato"
          valor={campos.contato_nome}
          aoMudar={mudar('contato_nome')}
          erro={erros.contato_nome}
          limite={L.contato_nome}
        />
        <CampoTexto
          rotulo="WhatsApp do contato"
          tipo="tel"
          valor={campos.contato_whatsapp}
          aoMudar={mudar('contato_whatsapp')}
          erro={erros.contato_whatsapp}
          limite={20}
          placeholder="(35) 9 0000-0000"
        />
        {!anuncio && (
          <div aria-invalid={Boolean(erros.autorizacao)}>
            <Caixa
              marcado={autorizacao}
              erro={Boolean(erros.autorizacao)}
              aoMudar={(marcado) => {
                setAutorizacao(marcado)
                if (erros.autorizacao) setErros(({ autorizacao: _removido, ...resto }) => resto)
              }}
            >
              A pessoa autorizou publicar o primeiro nome, o WhatsApp e as fotos por 30 dias.
            </Caixa>
            {erros.autorizacao && (
              <p className="mt-1.5 text-sm font-bold text-vermelho">{erros.autorizacao}</p>
            )}
          </div>
        )}
      </form>

      {falha && (
        <p role="alert" className="rounded-xl bg-vermelho-claro p-3 font-bold text-vermelho">
          {falha}
        </p>
      )}

      {pendente && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setRecusar(true)
            }}
            disabled={enviando}
            className="min-h-11 rounded-xl px-3 py-2.5 font-bold text-vermelho ring-2 ring-vermelho-claro"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={aprovar}
            disabled={enviando}
            className="min-h-11 rounded-xl bg-emerald-600 px-3 py-2.5 font-extrabold leading-tight text-white disabled:opacity-60"
          >
            Aprovar e publicar
          </button>
        </div>
      )}

      <BarraSalvar
        cancelar={destino}
        rotulo={anuncio ? 'Salvar alterações' : 'Publicar'}
        formulario={ID_FORMULARIO}
        enviando={enviando}
      />

      {recusar && anuncio && (
        <Modal
          titulo="Recusar o anúncio?"
          corTitulo="text-vermelho"
          aoFechar={
            enviando
              ? undefined
              : () => {
                  setRecusar(false)
                }
          }
        >
          <p className="text-slate-700">
            O anúncio e as fotos são apagados na hora. Quem anunciou não é avisado.
          </p>
          <BotoesModal
            aoCancelar={() => {
              setRecusar(false)
            }}
            rotulo="Recusar e apagar"
            aoConfirmar={() =>
              void executar(async () => {
                await chamarAdmin('DELETE', `/perdidos/${anuncio.id}`)
              }, 'Anúncio recusado e apagado')
            }
            enviando={enviando}
            cor="bg-vermelho"
          />
        </Modal>
      )}
    </section>
  )
}

/** /admin/perdidos/novo */
export function NovoAnuncio() {
  return <FormularioAnuncio anuncio={null} />
}

/** /admin/perdidos/:id */
export function EditarAnuncio() {
  const { id } = useParams()
  const anuncio = usePerdidoAdmin(id)
  if (anuncio.isPending) return <Carregando />
  if (anuncio.error instanceof ErroApi && anuncio.error.status === 404) {
    return (
      <section className="py-10 text-center">
        <h1 className="font-titulo text-2xl font-extrabold text-azul-escuro">
          Não encontramos este anúncio
        </h1>
        <p className="mt-2 text-slate-600">Ele pode ter sido apagado ou saído do ar.</p>
      </section>
    )
  }
  if (anuncio.isError) return <ErroAoCarregar tentarDeNovo={() => void anuncio.refetch()} />
  return <FormularioAnuncio key={anuncio.data.id} anuncio={anuncio.data} />
}
