// "＋ Novo protetor" no cadastro do animal (RN42): nome e WhatsApp, criado ali mesmo e já
// escolhido como responsável. Fica na lista para os próximos animais.
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LIMITES, protetorEntrada, type ProtetorAdmin } from '@sospatas/compartilhado'
import { ErroApi, chamarAdmin } from '../../api/cliente'
import { CampoTexto } from '../Campos'
import { BotoesModal, Modal } from '../Modal'
import { useAreaAdmin } from './contexto'

export function ModalProtetor({
  aoFechar,
  aoCriar,
}: {
  aoFechar: () => void
  aoCriar: (protetor: ProtetorAdmin) => void
}) {
  const queryClient = useQueryClient()
  const { mensagemDeErro } = useAreaAdmin()
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [falha, setFalha] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function criar() {
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
      const protetor = await chamarAdmin<ProtetorAdmin>('POST', '/protetores', dados)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'protetores'] })
      aoCriar(protetor)
    } catch (erro) {
      if (erro instanceof ErroApi) setErros(erro.campos)
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Novo protetor parceiro" aoFechar={enviando ? undefined : aoFechar}>
      <p className="text-sm text-slate-600">
        O nome e o WhatsApp aparecem na ficha dos animais dele, para quem quer adotar.
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
        rotulo="Cadastrar protetor"
        aoConfirmar={() => void criar()}
        enviando={enviando}
      />
    </Modal>
  )
}
