// Peças reutilizadas pelos schemas. As mensagens são as que a voluntária ou o visitante leem
// embaixo do campo, por isso em linguagem simples.
import { z } from 'zod'
import { ehDataValida, hojeNoBrasil } from '../datas'
import { ehWhatsappValido, normalizarWhatsapp } from '../whatsapp'

export const MENSAGEM_OBRIGATORIO = 'Preencha este campo'
export const mensagemLimite = (limite: number): string => `Use até ${String(limite)} caracteres`

/** Texto obrigatório: tira espaços das pontas e não aceita vazio. */
export const textoObrigatorio = (limite: number) =>
  z
    .string({ error: MENSAGEM_OBRIGATORIO })
    .trim()
    .min(1, MENSAGEM_OBRIGATORIO)
    .max(limite, mensagemLimite(limite))

/** Texto opcional que o banco guarda como '' quando vazio. */
export const textoOpcional = (limite: number) =>
  z.string().trim().max(limite, mensagemLimite(limite)).default('')

/** Texto opcional que o banco guarda como null quando vazio. */
export const textoOuNulo = (limite: number) =>
  z
    .string()
    .trim()
    .max(limite, mensagemLimite(limite))
    .nullish()
    .transform((valor) => (valor ? valor : null))

/** Aceita "(35) 9 8843-9614", "+55 35 98843-9614"… e entrega só os dígitos. */
export const whatsapp = z
  .string({ error: 'Informe o WhatsApp' })
  .transform(normalizarWhatsapp)
  .refine(ehWhatsappValido, 'Informe o WhatsApp com DDD (10 ou 11 números)')

/** E-mail: sem espaços, guardado em minúsculas. */
export const email = (limite: number) =>
  z
    .string({ error: 'Informe o e-mail' })
    .trim()
    .toLowerCase()
    .min(1, 'Informe o e-mail')
    .max(limite, mensagemLimite(limite))
    .pipe(z.email({ error: 'Confira o e-mail (exemplo: nome@gmail.com)' }))

/** Token do Turnstile (antirrobô dos formulários públicos). */
export const turnstileToken = z
  .string({ error: 'Confirme que você não é um robô' })
  .min(1, 'Confirme que você não é um robô')

/** Data 'AAAA-MM-DD'. */
export const data = z.string({ error: 'Informe a data' }).refine(ehDataValida, 'Data inválida')

/** Data que não pode ser depois de hoje (no fuso de Brasília). */
export const dataAteHoje = data.refine(
  (valor) => valor <= hojeNoBrasil(),
  'A data não pode ser no futuro',
)

/** Uma das opções da lista. */
export const opcao = <const T extends readonly [string, ...string[]]>(
  valores: T,
  mensagem = 'Escolha uma opção',
) => z.enum(valores, { error: mensagem })

/** Opção que pode ficar sem resposta (null). */
export const opcaoOuNulo = <const T extends readonly [string, ...string[]]>(valores: T) =>
  z
    .enum(valores, { error: 'Escolha uma opção' })
    .nullish()
    .transform((valor) => valor ?? null)

/** Sim / Não / Não sei (null). */
export const simNaoOuNulo = z
  .boolean({ error: 'Escolha uma opção' })
  .nullish()
  .transform((valor) => valor ?? null)
