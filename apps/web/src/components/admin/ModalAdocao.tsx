// "Marcar como adotado" (T09, T11): pede o nome e o WhatsApp de quem adotou (só a equipe vê),
// e a API deixa só a foto principal e começa a adaptação (RN07, RN08, RN30). Com pedido
// aprovado, já abre preenchido com quem pediu (RN49).
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DIAS_ADAPTACAO,
  LIMITES,
  adocaoEntrada,
  fimDaAdaptacao,
  formatarData,
  formatarWhatsapp,
  hojeNoBrasil,
} from '@sospatas/compartilhado'
import { atualizarAdmin } from '../../api/admin'
import { ErroApi, chamarAdmin } from '../../api/cliente'
import { CampoTexto } from '../Campos'
import { BotoesModal, Modal } from '../Modal'
import { useAreaAdmin } from './contexto'

export type AnimalParaAdocao = {
  id: string
  nome: string
  /** Nome do protetor parceiro, se o animal for de protetor */
  protetor: string | null
}

function errosDosCampos(campos: Record<string, string>) {
  return { nome: campos.adotante_nome, whatsapp: campos.adotante_whatsapp }
}

export function ModalAdocao({
  animal,
  inicial,
  aoFechar,
  aoConcluir,
}: {
  animal: AnimalParaAdocao
  inicial?: { nome: string; whatsapp: string } | null
  aoFechar: () => void
  /** Depois do "Pronto" da confirmação */
  aoConcluir: () => void
}) {
  const queryClient = useQueryClient()
  const { mensagemDeErro } = useAreaAdmin()
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [whatsapp, setWhatsapp] = useState(inicial ? formatarWhatsapp(inicial.whatsapp) : '')
  const [erros, setErros] = useState<{ nome?: string; whatsapp?: string }>({})
  const [falha, setFalha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [concluida, setConcluida] = useState(false)

  async function confirmar() {
    const dados = { adotante_nome: nome, adotante_whatsapp: whatsapp }
    const conferido = adocaoEntrada.safeParse(dados)
    if (!conferido.success) {
      const campos: Record<string, string> = {}
      for (const problema of conferido.error.issues) {
        campos[String(problema.path[0])] ??= problema.message
      }
      setErros(errosDosCampos(campos))
      return
    }
    setErros({})
    setFalha('')
    setEnviando(true)
    try {
      await chamarAdmin('POST', `/animais/${animal.id}/adocao`, dados)
      await atualizarAdmin(queryClient)
      setConcluida(true)
    } catch (erro) {
      if (erro instanceof ErroApi && Object.keys(erro.campos).length > 0) {
        setErros(errosDosCampos(erro.campos))
      }
      setFalha(mensagemDeErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  if (concluida) {
    return (
      <Modal titulo="Adoção registrada! 🎉" aoFechar={aoConcluir}>
        <p className="text-slate-600">{animal.nome} saiu do site e está em adaptação.</p>
        <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          Fim da adaptação: {formatarData(fimDaAdaptacao(hojeNoBrasil()))}
        </p>
        <button
          type="button"
          onClick={aoConcluir}
          className="mt-5 min-h-11 w-full rounded-xl bg-azul py-3 font-extrabold text-white"
        >
          Pronto
        </button>
      </Modal>
    )
  }

  const fechar = enviando ? undefined : aoFechar
  return (
    <Modal titulo={`${animal.nome} foi adotado? 🎉`} aoFechar={fechar}>
      <p className="text-sm text-slate-600">
        {animal.nome} sai do site e entra em adaptação por {DIAS_ADAPTACAO} dias. Só a foto
        principal fica guardada.
      </p>
      <div className="mt-4 space-y-4">
        <CampoTexto
          rotulo="Nome de quem adotou"
          valor={nome}
          aoMudar={setNome}
          erro={erros.nome}
          limite={LIMITES.adotantes.nome}
          placeholder="Ex.: Fernanda"
        />
        <CampoTexto
          rotulo="WhatsApp de quem adotou"
          tipo="tel"
          valor={whatsapp}
          aoMudar={setWhatsapp}
          erro={erros.whatsapp}
          dica="Só a equipe vê. A pessoa entra em Mais › Quem adotou; se já estiver lá, pelo WhatsApp, a adoção vai para o histórico dela."
          placeholder="(35) 9 0000-0000"
        />
      </div>
      {animal.protetor && (
        <p className="mt-3 rounded-xl bg-amarelo-claro p-3 text-sm text-[#7A4A00]">
          Animal de protetor parceiro: a adoção é responsabilidade de {animal.protetor}.
        </p>
      )}
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
        rotulo="Confirmar adoção"
        aoConfirmar={() => void confirmar()}
        enviando={enviando}
        cor="bg-emerald-600"
      />
    </Modal>
  )
}
