// T17 · Item de lista, novo e editar (/admin/textos/:lista/novo e /admin/textos/:lista/:id).
// Um formulário para qualquer lista, com os rótulos e limites de conteudo.ts; a lista de fotos
// da história tem a foto (preparada no aparelho, RN02) e o lembrete de autorização (RN38).
// Salvar publica na hora (RN37); a prévia mostra o item com o visual do site.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LISTAS,
  TIPOS_FOTO_ACEITOS,
  schemaItem,
  type ItemAdmin,
  type NomeLista,
} from '@sospatas/compartilhado'
import { atualizarConteudo, useConteudo } from '../../api/admin'
import { chamarAdmin } from '../../api/cliente'
import { Carregando, ErroAoCarregar } from '../../components/Estados'
import { BotoesModal, Modal } from '../../components/Modal'
import { TextoSimples } from '../../components/TextoSimples'
import { CaixaTexto, DICA_TEXTO_SIMPLES } from '../../components/admin/CaixaTexto'
import { AlteradoPor, BarraSalvar, TituloAdmin } from '../../components/admin/Navegacao'
import { useAreaAdmin } from '../../components/admin/contexto'
import { PAGINAS, ehNomeLista, listaCheia, paginaDaLista, telaDaPagina } from '../../lib/conteudo'
import { ErroFoto, formularioFoto, prepararFoto, type FotoPreparada } from '../../lib/fotos'

const ID_FORMULARIO = 'formulario-item'

type FotoEscolhida = { arquivos: FotoPreparada; previa: string }

function NaoEncontrado({ voltar }: { voltar: string }) {
  return (
    <section className="py-10 text-center">
      <h1 className="font-titulo text-2xl font-extrabold text-azul-escuro">
        Não encontramos este item
      </h1>
      <p className="mt-2 text-slate-600">Ele pode ter sido excluído por outra pessoa da equipe.</p>
      <Link to={voltar} className="mt-4 inline-block font-bold text-azul">
        Voltar
      </Link>
    </section>
  )
}

/** Prévia com o visual do site: a pergunta como acordeão aberto, a foto com a legenda. */
function Previa({
  lista,
  titulo,
  texto,
  foto,
}: {
  lista: NomeLista
  titulo: string
  texto: string
  foto: string | null
}) {
  if (!texto.trim() && !titulo.trim() && !foto) return null
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
        Prévia no site
      </p>
      {lista === 'inicio_fotos' ? (
        <figure className="mt-1.5 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          {foto && <img src={foto} alt="" className="aspect-[4/3] w-full object-cover" />}
          <figcaption className="p-3 text-sm text-slate-600">{texto}</figcaption>
        </figure>
      ) : lista === 'perguntas' ? (
        <div className="mt-1.5 rounded-2xl bg-white ring-1 ring-slate-200">
          <p className="flex items-center justify-between gap-3 p-4 font-extrabold text-azul-escuro">
            {titulo}
            <span aria-hidden="true" className="rotate-180 text-azul">
              ▾
            </span>
          </p>
          <TextoSimples texto={texto} className="px-4 pb-4 text-slate-700" />
        </div>
      ) : (
        <div className="mt-1.5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          {titulo.trim() && <p className="font-extrabold text-azul-escuro">{titulo}</p>}
          <TextoSimples texto={texto} className="text-slate-700" />
        </div>
      )}
    </div>
  )
}

function FormularioItem({
  lista,
  item,
  quantidade,
}: {
  lista: NomeLista
  /** null = item novo */
  item: ItemAdmin | null
  /** Itens da lista hoje (o Excluir respeita o mínimo, RN36) */
  quantidade: number
}) {
  const config = LISTAS[lista]
  const pagina = paginaDaLista(lista)
  const voltar = telaDaPagina(pagina)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()

  const [titulo, setTitulo] = useState(item?.titulo ?? '')
  const [texto, setTexto] = useState(item?.texto ?? '')
  const [foto, setFoto] = useState<FotoEscolhida | null>(null)
  const [preparando, setPreparando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)
  const [excluir, setExcluir] = useState(false)
  const previaCriada = useRef<string | null>(null)

  // Libera a memória da prévia da foto ao sair da tela
  useEffect(
    () => () => {
      if (previaCriada.current) URL.revokeObjectURL(previaCriada.current)
    },
    [],
  )

  async function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return
    setPreparando(true)
    setErros(({ foto: _removido, ...resto }) => resto)
    try {
      const arquivos = await prepararFoto(arquivo)
      if (previaCriada.current) URL.revokeObjectURL(previaCriada.current)
      const previa = URL.createObjectURL(arquivos.completa)
      previaCriada.current = previa
      setFoto({ arquivos, previa })
    } catch (erro) {
      setErros((atuais) => ({
        ...atuais,
        foto:
          erro instanceof ErroFoto
            ? erro.message
            : 'Não conseguimos preparar esta foto. Escolha outra.',
      }))
    } finally {
      setPreparando(false)
    }
  }

  async function salvar() {
    setFalha(null)
    const resultado = schemaItem(lista).safeParse({
      titulo: config.titulo ? titulo : null,
      texto,
    })
    const novos: Record<string, string> = {}
    if (!resultado.success) {
      for (const problema of resultado.error.issues) {
        novos[String(problema.path[0] ?? '_')] ??= problema.message
      }
    }
    if (config.foto && !item && !foto) novos.foto = 'Escolha a foto'
    setErros(novos)
    if (!resultado.success || Object.keys(novos).length > 0) return

    setEnviando(true)
    try {
      if (!item) {
        const dados = { lista, ...resultado.data }
        if (foto) {
          const corpo = formularioFoto(foto.arquivos)
          corpo.append('dados', JSON.stringify(dados))
          await chamarAdmin('POST', '/conteudo/itens', corpo)
        } else {
          await chamarAdmin('POST', '/conteudo/itens', dados)
        }
      } else {
        await chamarAdmin('PUT', `/conteudo/itens/${item.id}`, resultado.data)
        if (foto) {
          await chamarAdmin(
            'POST',
            `/conteudo/itens/${item.id}/foto`,
            formularioFoto(foto.arquivos),
          )
        }
      }
      avisar('Salvo e publicado ✓', PAGINAS[pagina].publica)
      void navigate(voltar)
      await atualizarConteudo(queryClient)
    } catch (erro) {
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
    }
  }

  async function confirmarExclusao() {
    if (!item) return
    setEnviando(true)
    try {
      await chamarAdmin('DELETE', `/conteudo/itens/${item.id}`)
      avisar('Excluído do site ✓', PAGINAS[pagina].publica)
      void navigate(voltar)
      await atualizarConteudo(queryClient)
    } catch (erro) {
      setExcluir(false)
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
    }
  }

  const fotoNaTela = foto?.previa ?? item?.foto?.completa ?? null
  const podeExcluir = quantidade > config.minimo

  return (
    <section className="space-y-4 pb-24">
      <title>{`${item ? config.nomes.editar : config.nomes.novo} · Área da ONG · SOS Patas`}</title>
      <div>
        <TituloAdmin
          titulo={item ? config.nomes.editar : config.nomes.novo}
          subtitulo={PAGINAS[pagina].nome}
        />
        {item && <AlteradoPor {...item.alteracao} />}
      </div>

      <form
        id={ID_FORMULARIO}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void salvar()
        }}
        className="space-y-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
      >
        {config.foto && (
          <div>
            <p className="font-extrabold text-slate-800">
              Foto
              <span className="text-vermelho" aria-hidden="true">
                {' '}
                *
              </span>
            </p>
            {fotoNaTela && (
              <img
                src={fotoNaTela}
                alt="Foto escolhida"
                className="mt-1.5 aspect-[4/3] w-full rounded-xl object-cover"
              />
            )}
            <label
              className={`mt-2 flex min-h-11 cursor-pointer items-center justify-center rounded-xl font-extrabold text-azul ring-2 ring-azul/30 ${preparando ? 'opacity-60' : ''}`}
            >
              {preparando ? 'Preparando a foto…' : fotoNaTela ? 'Trocar foto' : 'Escolher foto'}
              <input
                type="file"
                accept={TIPOS_FOTO_ACEITOS.join(',')}
                disabled={preparando}
                aria-invalid={Boolean(erros.foto)}
                className="sr-only"
                onChange={(evento) => {
                  void escolherFoto(evento.target.files?.[0])
                  evento.target.value = ''
                }}
              />
            </label>
            {erros.foto && (
              <p role="alert" className="mt-1.5 text-sm font-bold text-vermelho">
                {erros.foto}
              </p>
            )}
            <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
              Fotos com pessoas: só com autorização delas; crianças e adolescentes, só com
              autorização dos responsáveis.
            </p>
          </div>
        )}
        {config.titulo && (
          <CaixaTexto
            rotulo={config.titulo.rotulo}
            valor={titulo}
            aoMudar={(valor) => {
              setTitulo(valor)
              setErros(({ titulo: _removido, ...resto }) => resto)
            }}
            limite={config.titulo.limite}
            obrigatorio={config.titulo.obrigatorio}
            erro={erros.titulo}
          />
        )}
        <CaixaTexto
          rotulo={config.texto.rotulo}
          valor={texto}
          aoMudar={(valor) => {
            setTexto(valor)
            setErros(({ texto: _removido, ...resto }) => resto)
          }}
          limite={config.texto.limite}
          obrigatorio
          erro={erros.texto}
          linhas={config.texto.limite > 150 ? 4 : 2}
          dica={DICA_TEXTO_SIMPLES}
        />
      </form>

      <Previa lista={lista} titulo={titulo} texto={texto} foto={fotoNaTela} />

      {falha && (
        <p role="alert" className="rounded-xl bg-vermelho-claro p-3 font-bold text-vermelho">
          {falha}
        </p>
      )}

      {item && (
        <div>
          <button
            type="button"
            onClick={() => {
              setExcluir(true)
            }}
            disabled={!podeExcluir || enviando}
            className="min-h-11 w-full rounded-xl font-bold text-vermelho ring-2 ring-vermelho/30 disabled:text-slate-300 disabled:ring-slate-100"
          >
            Excluir {config.nomes.este}
          </button>
          {!podeExcluir && (
            <p className="mt-1.5 text-sm text-slate-500">
              A lista precisa ter ao menos{' '}
              {config.minimo === 1 ? '1 item' : `${String(config.minimo)} itens`}: altere este em
              vez de excluir.
            </p>
          )}
        </div>
      )}

      <BarraSalvar
        cancelar={voltar}
        rotulo="Salvar"
        formulario={ID_FORMULARIO}
        enviando={enviando}
      />

      {excluir && item && (
        <Modal
          titulo={`Excluir ${config.nomes.este}?`}
          corTitulo="text-vermelho"
          aoFechar={
            enviando
              ? undefined
              : () => {
                  setExcluir(false)
                }
          }
        >
          <p className="text-slate-700">
            Este item some do site e não pode ser recuperado.
            {item.foto && ' A foto também é apagada.'}
          </p>
          <BotoesModal
            aoCancelar={() => {
              setExcluir(false)
            }}
            rotulo="Excluir"
            aoConfirmar={() => void confirmarExclusao()}
            enviando={enviando}
            cor="bg-vermelho"
          />
        </Modal>
      )}
    </section>
  )
}

/** /admin/textos/:lista/novo e /admin/textos/:lista/:id */
export function ItemConteudo() {
  const { lista, id } = useParams()
  const conteudo = useConteudo()
  if (!ehNomeLista(lista)) return <NaoEncontrado voltar="/admin/textos" />
  if (conteudo.isPending) return <Carregando />
  if (conteudo.isError) return <ErroAoCarregar tentarDeNovo={() => void conteudo.refetch()} />

  const itens = conteudo.data.listas[lista]
  if (!id) {
    if (listaCheia(lista, itens.length)) {
      return (
        <section className="py-10 text-center">
          <h1 className="font-titulo text-2xl font-extrabold text-azul-escuro">Limite atingido</h1>
          <p className="mt-2 text-slate-600">Exclua um item para adicionar outro.</p>
          <Link
            to={telaDaPagina(paginaDaLista(lista))}
            className="mt-4 inline-block font-bold text-azul"
          >
            Voltar
          </Link>
        </section>
      )
    }
    return <FormularioItem lista={lista} item={null} quantidade={itens.length} />
  }
  const item = itens.find((atual) => atual.id === id)
  if (!item) return <NaoEncontrado voltar={telaDaPagina(paginaDaLista(lista))} />
  return <FormularioItem key={item.id} lista={lista} item={item} quantidade={itens.length} />
}
