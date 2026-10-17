// Textos e itens de lista das páginas (T15–T20, RN33–RN38) e dados da ONG (T23).
import { z } from 'zod'
import { PIX_TIPOS } from '../dominio'
import {
  LISTAS,
  NOMES_LISTA,
  TEXTOS,
  type ChaveTexto,
  type ConfigLista,
  type NomeLista,
} from '../conteudo'
import { LIMITES, MAX_DESTAQUES_INICIO } from '../limites'
import { email, opcao, textoObrigatorio, textoOpcional, textoOuNulo, whatsapp } from './comuns'

/** Schema do texto de uma chave, com o limite e a obrigatoriedade dela. */
export function schemaTexto(chave: ChaveTexto) {
  const config = TEXTOS[chave]
  return z.object({
    valor: config.obrigatorio ? textoObrigatorio(config.limite) : textoOpcional(config.limite),
  })
}

/** Lista sem título: aceita o campo ausente, nulo ou vazio, e guarda null. */
const semTitulo = z
  .union([z.null(), z.literal('')])
  .optional()
  .transform(() => null)

/** Schema de um item da lista (a foto da lista inicio_fotos vai em separado, como arquivo). */
export function schemaItem(lista: NomeLista) {
  const config: ConfigLista = LISTAS[lista]
  const titulo =
    config.titulo === null
      ? semTitulo
      : config.titulo.obrigatorio
        ? textoObrigatorio(config.titulo.limite)
        : textoOuNulo(config.titulo.limite)
  return z.object({ titulo, texto: textoObrigatorio(config.texto.limite) })
}

/** Lista do item novo (POST /conteudo/itens); os campos dependem dela (schemaItem). */
export const listaEntrada = z.object({ lista: opcao(NOMES_LISTA, 'Escolha a lista') })

/** RN35: as setas ↑ ↓ trocam a posição de dois itens vizinhos da mesma lista. */
export const trocarOrdemEntrada = z.object({
  ids: z.tuple([z.uuid('Item inválido'), z.uuid('Item inválido')], {
    error: 'Informe os dois itens',
  }),
})

/** RN54: animal das fotos 1 e 2 da chamada do Início; null = automático. */
export const chamadaEntrada = z.object({
  animais: z
    .array(z.uuid('Animal inválido').nullable(), { error: 'Escolha os animais' })
    .length(MAX_DESTAQUES_INICIO, 'Informe as duas fotos')
    .refine(
      (ids) => {
        const escolhidos = ids.filter((id) => id !== null)
        return new Set(escolhidos).size === escolhidos.length
      },
      { message: 'Escolha um animal diferente para cada foto' },
    ),
})

export type ChamadaEntrada = z.input<typeof chamadaEntrada>

const L = LIMITES.ong

/** Aceita "@sospatas.ong" ou "sospatas.ong" e guarda sem o @. */
const instagram = z
  .string({ error: 'Informe o Instagram' })
  .trim()
  .transform((valor) => valor.replace(/^@/, ''))
  .pipe(
    z
      .string()
      .min(1, 'Informe o Instagram')
      .max(L.instagram, 'Use só o nome de usuário')
      .regex(/^[A-Za-z0-9._]+$/, 'Use só o nome de usuário, sem espaços'),
  )

/** Aceita "facebook.com/sospatasmg" e completa com https://. Vazio = sem Facebook. */
const facebook = z
  .string()
  .trim()
  .max(L.facebook, 'Endereço muito longo')
  .nullish()
  .transform((valor) => {
    if (!valor) return null
    return /^https?:\/\//i.test(valor) ? valor.replace(/^http:/i, 'https:') : `https://${valor}`
  })
  .refine(
    (valor) => valor === null || /^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/i.test(valor),
    'Cole o endereço da página do Facebook',
  )

/** Dados da ONG (T23). Sem WhatsApp próprio, o contato do site é o e-mail (RN51). */
export const ongEntrada = z.object({
  nome_completo: textoObrigatorio(L.nome_completo),
  email: email(L.email),
  whatsapp: z
    .string()
    .nullish()
    .transform((valor) => (valor?.trim() ? valor : null))
    .pipe(whatsapp.nullable()),
  instagram,
  facebook,
  pix_tipo: opcao(PIX_TIPOS, 'Escolha o tipo da chave PIX'),
  pix_chave: textoObrigatorio(L.pix_chave),
})

export type OngEntrada = z.input<typeof ongEntrada>
