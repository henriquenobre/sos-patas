// ListaEditavel (RN33): os itens de uma lista das páginas, configurada por conteudo.ts. Cada
// card mostra o número, o título, o começo do texto e a miniatura (fotos da história); as setas
// ↑ ↓ trocam com o vizinho na hora (RN35); "Excluir" pede confirmação e fica desativado no
// último item de lista com mínimo (RN36); no máximo (RN38, RN46), o "＋" vira aviso.
import { useState } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { LISTAS, type ItemAdmin, type NomeLista } from '@sospatas/compartilhado'
import { atualizarConteudo } from '../../api/admin'
import { chamarAdmin } from '../../api/cliente'
import { listaCheia } from '../../lib/conteudo'
import { BotoesModal, Modal } from '../Modal'
import { useAreaAdmin } from './contexto'

const classeSeta =
  'flex h-11 w-11 items-center justify-center rounded-xl text-lg font-extrabold text-azul ring-2 ring-slate-200 disabled:text-slate-300 disabled:ring-slate-100'

/** Título do item na lista e no modal: o título ou, sem ele, o começo do texto. */
const nomeDoItem = (item: ItemAdmin) =>
  item.titulo ?? (item.texto.length > 60 ? `${item.texto.slice(0, 60)}…` : item.texto)

export function ListaEditavel({
  lista,
  itens,
  pagina,
  titulo,
  dica,
  adicionarFixo = false,
}: {
  lista: NomeLista
  itens: ItemAdmin[]
  /** Endereço público da página, para o "Ver no site" depois de mudar a ordem ou excluir */
  pagina: string
  /** Título do bloco (T18, T19); sem ele, a lista ocupa a tela toda (T16) */
  titulo?: string
  dica?: string
  /** T16: botão "＋" fixo no rodapé da tela */
  adicionarFixo?: boolean
}) {
  const config = LISTAS[lista]
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [movendo, setMovendo] = useState(false)
  const [excluir, setExcluir] = useState<ItemAdmin | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  const noMinimo = itens.length <= config.minimo
  const cheia = listaCheia(lista, itens.length)

  async function trocar(indice: number, vizinho: number) {
    const a = itens[indice]
    const b = itens[vizinho]
    if (!a || !b) return
    setMovendo(true)
    setFalha(null)
    try {
      await chamarAdmin('POST', '/conteudo/itens/trocar-ordem', { ids: [a.id, b.id] })
      await atualizarConteudo(queryClient)
    } catch (erro) {
      setFalha(mensagemDeErro(erro))
      await atualizarConteudo(queryClient)
    } finally {
      setMovendo(false)
    }
  }

  async function confirmarExclusao() {
    if (!excluir) return
    setEnviando(true)
    setFalha(null)
    try {
      await chamarAdmin('DELETE', `/conteudo/itens/${excluir.id}`)
      setExcluir(null)
      avisar('Excluído do site ✓', pagina)
      await atualizarConteudo(queryClient)
    } catch (erro) {
      setExcluir(null)
      setFalha(mensagemDeErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  const adicionar = cheia ? (
    <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
      Limite atingido. Exclua um item para adicionar outro.
    </p>
  ) : (
    <Link
      to={`/admin/textos/${lista}/novo`}
      className="flex min-h-11 items-center justify-center rounded-xl border-2 border-dashed border-azul/40 bg-white py-3 font-extrabold text-azul"
    >
      ＋ {config.nomes.novo}
    </Link>
  )

  return (
    <section aria-label={titulo ?? config.nomes.novo} className="space-y-3">
      {titulo && (
        <div>
          <h2 className="font-titulo text-xl font-bold text-azul">{titulo}</h2>
          {dica && <p className="text-sm text-slate-600">{dica}</p>}
        </div>
      )}
      {falha && (
        <p role="alert" className="rounded-xl bg-vermelho-claro p-3 font-bold text-vermelho">
          {falha}
        </p>
      )}
      {itens.length === 0 && (
        <p className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
          Nenhum item. Enquanto a lista estiver vazia, este bloco não aparece no site.
        </p>
      )}
      <ol className="space-y-3">
        {itens.map((item, indice) => {
          const nome = nomeDoItem(item)
          return (
            <li key={item.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-azul-claro font-extrabold text-azul-escuro"
                >
                  {indice + 1}
                </span>
                {item.foto && (
                  <img
                    src={item.foto.miniatura}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {item.titulo && <p className="font-extrabold text-slate-800">{item.titulo}</p>}
                  <p className="line-clamp-2 whitespace-pre-line text-sm text-slate-600">
                    {item.texto}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => void trocar(indice, indice - 1)}
                    disabled={indice === 0 || movendo}
                    aria-label={`Subir "${nome}"`}
                    className={classeSeta}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => void trocar(indice, indice + 1)}
                    disabled={indice === itens.length - 1 || movendo}
                    aria-label={`Descer "${nome}"`}
                    className={classeSeta}
                  >
                    ↓
                  </button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  to={`/admin/textos/${lista}/${item.id}`}
                  aria-label={`Editar "${nome}"`}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-xl font-bold text-azul ring-2 ring-azul/30"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setExcluir(item)
                  }}
                  disabled={noMinimo}
                  aria-label={`Excluir "${nome}"`}
                  className="min-h-11 flex-1 rounded-xl font-bold text-vermelho ring-2 ring-vermelho/30 disabled:text-slate-300 disabled:ring-slate-100"
                >
                  Excluir
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      {noMinimo && itens.length > 0 && (
        <p className="text-sm text-slate-500">
          A lista precisa ter ao menos{' '}
          {config.minimo === 1 ? '1 item' : `${String(config.minimo)} itens`}: para mudar o último,
          use Editar.
        </p>
      )}
      {adicionarFixo ? (
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <div className="mx-auto max-w-xl">{adicionar}</div>
        </div>
      ) : (
        adicionar
      )}

      {excluir && (
        <Modal
          titulo={`Excluir ${config.nomes.este}?`}
          corTitulo="text-vermelho"
          aoFechar={
            enviando
              ? undefined
              : () => {
                  setExcluir(null)
                }
          }
        >
          <p className="text-slate-700">
            <b>"{nomeDoItem(excluir)}"</b> some do site e não pode ser recuperado.
            {excluir.foto && ' A foto também é apagada.'}
          </p>
          <BotoesModal
            aoCancelar={() => {
              setExcluir(null)
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
