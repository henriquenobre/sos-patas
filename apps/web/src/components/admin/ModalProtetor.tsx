// Protetor parceiro (RN42) em modal: "＋ Novo protetor" no cadastro do animal e na T24 (nome e
// WhatsApp, criado ali mesmo) e, na T24, editar e excluir. Protetor com animais não pode ser
// excluído: o modal avisa e leva para os animais dele no painel (T09 filtrado).
import { useState } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LIMITES,
  formatarWhatsapp,
  protetorEntrada,
  type ProtetorAdmin,
} from '@sospatas/compartilhado'
import { atualizarAdmin } from '../../api/admin'
import { ErroApi, chamarAdmin } from '../../api/cliente'
import { CampoTexto } from '../Campos'
import { BotoesModal, Modal } from '../Modal'
import { useAreaAdmin } from './contexto'

const animaisDele = (quantidade: number) =>
  quantidade === 1 ? '1 animal' : `${String(quantidade)} animais`

export function ModalProtetor({
  protetor,
  aoFechar,
  aoSalvar,
}: {
  /** Sem protetor: cadastro novo; com ele: editar e excluir (T24) */
  protetor?: ProtetorAdmin
  aoFechar: () => void
  /** Depois de cadastrar ou salvar (no cadastro do animal, já escolhe o protetor novo) */
  aoSalvar: (protetor: ProtetorAdmin | null, aviso: string) => void
}) {
  const queryClient = useQueryClient()
  const { mensagemDeErro } = useAreaAdmin()
  const [nome, setNome] = useState(protetor?.nome ?? '')
  const [whatsapp, setWhatsapp] = useState(protetor ? formatarWhatsapp(protetor.whatsapp) : '')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [falha, setFalha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  async function salvar() {
    const dados = { nome, whatsapp }
    const conferido = protetorEntrada.safeParse(dados)
    if (!conferido.success) {
      const campos: Record<string, string> = {}
      for (const problema of conferido.error.issues) {
        campos[String(problema.path[0])] ??= problema.message
      }
      setErros(campos)
      return
    }
    setErros({})
    setFalha('')
    setEnviando(true)
    try {
      if (protetor) {
        await chamarAdmin('PUT', `/protetores/${protetor.id}`, dados)
        await atualizarAdmin(queryClient)
        aoSalvar(null, 'Protetor salvo ✓')
      } else {
        const novo = await chamarAdmin<ProtetorAdmin>('POST', '/protetores', dados)
        await queryClient.invalidateQueries({ queryKey: ['admin', 'protetores'] })
        aoSalvar(novo, 'Protetor cadastrado ✓')
      }
    } catch (erro) {
      if (erro instanceof ErroApi) setErros(erro.campos)
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
    }
  }

  async function excluir() {
    if (!protetor) return
    setFalha('')
    setEnviando(true)
    try {
      await chamarAdmin('DELETE', `/protetores/${protetor.id}`)
      await atualizarAdmin(queryClient)
      aoSalvar(null, 'Protetor excluído')
    } catch (erro) {
      setConfirmarExclusao(false)
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
      await atualizarAdmin(queryClient)
    }
  }

  const fechar = enviando ? undefined : aoFechar

  if (protetor && confirmarExclusao) {
    return (
      <Modal titulo="Excluir protetor?" corTitulo="text-vermelho" aoFechar={fechar}>
        <p className="text-slate-700">
          <b>{protetor.nome}</b> sai da lista de protetores. Não dá para desfazer.
        </p>
        <BotoesModal
          aoCancelar={() => {
            setConfirmarExclusao(false)
          }}
          rotulo="Excluir"
          aoConfirmar={() => void excluir()}
          enviando={enviando}
          cor="bg-vermelho"
        />
      </Modal>
    )
  }

  return (
    <Modal titulo={protetor ? 'Editar protetor' : 'Novo protetor parceiro'} aoFechar={fechar}>
      <p className="text-sm text-slate-600">
        O nome e o WhatsApp aparecem na ficha dos animais dele, para quem quer adotar.
        {protetor && ' Mudar aqui vale para todos os animais dele.'}
      </p>
      <div className="mt-4 space-y-4">
        <CampoTexto
          rotulo="Nome do protetor"
          valor={nome}
          aoMudar={setNome}
          erro={erros.nome}
          limite={LIMITES.protetores.nome}
          placeholder="Ex.: Protetora Ana Paula"
        />
        <CampoTexto
          rotulo="WhatsApp do protetor"
          tipo="tel"
          valor={whatsapp}
          aoMudar={setWhatsapp}
          erro={erros.whatsapp}
          placeholder="(35) 9 0000-0000"
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
        rotulo={protetor ? 'Salvar' : 'Cadastrar protetor'}
        aoConfirmar={() => void salvar()}
        enviando={enviando}
      />
      {protetor &&
        (protetor.animais > 0 ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
            <p>
              {protetor.nome} tem {animaisDele(protetor.animais)}. Troque o responsável deles antes
              de excluir.
            </p>
            <Link
              to={`/admin?responsavel=${protetor.id}`}
              className="mt-1 inline-block font-bold text-azul underline"
            >
              Ver animais dele
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirmarExclusao(true)
            }}
            disabled={enviando}
            className="mt-3 min-h-11 w-full rounded-xl font-bold text-vermelho"
          >
            Excluir protetor
          </button>
        ))}
    </Modal>
  )
}
