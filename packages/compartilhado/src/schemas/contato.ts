// Formulário "Fale com a ONG" (RN51, T29). A mensagem vai por e-mail para a ONG e não fica
// guardada no banco; a resposta sai do e-mail da ONG para o e-mail que a pessoa informou.
import { z } from 'zod'
import { ASSUNTOS_CONTATO } from '../dominio'
import { LIMITES } from '../limites'
import { email, opcao, textoObrigatorio, textoOuNulo, turnstileToken } from './comuns'

const L = LIMITES.contato

export const contatoEntrada = z.object({
  nome: textoObrigatorio(L.nome),
  email: email(L.email),
  /** Opcional: WhatsApp ou telefone, se a pessoa preferir */
  telefone: textoOuNulo(L.telefone),
  assunto: opcao(ASSUNTOS_CONTATO, 'Escolha o assunto'),
  mensagem: textoObrigatorio(L.mensagem),
  turnstile_token: turnstileToken,
})

export type ContatoEntrada = z.input<typeof contatoEntrada>
export type ContatoDados = z.output<typeof contatoEntrada>
