// Cadastro de quem adotou (RN53): a pessoa, as observações da equipe e as adoções antigas,
// de antes do site, registradas à mão.
import { z } from 'zod'
import { LIMITES } from '../limites'
import { dataAteHoje, textoObrigatorio, textoOpcional, textoOuNulo, whatsapp } from './comuns'

const A = LIMITES.adotantes

/** WhatsApp que pode ficar em branco (adoção antiga, sem o número). */
const whatsappOuNulo = z
  .string()
  .nullish()
  .transform((valor) => (valor?.trim() ? valor : null))
  .pipe(whatsapp.nullable())

/** Cadastro e edição da pessoa (T31). */
export const adotanteEntrada = z.object({
  nome: textoObrigatorio(A.nome),
  whatsapp: whatsappOuNulo,
  bairro_cidade: textoOuNulo(A.bairro_cidade),
  observacoes: textoOpcional(A.observacoes),
})

export type AdotanteEntrada = z.input<typeof adotanteEntrada>
export type AdotanteDados = z.output<typeof adotanteEntrada>

/** Adoção de antes do site, ou de um animal que não foi cadastrado nele (T31). */
export const adocaoAntigaEntrada = z
  .object({
    animal_nome: textoObrigatorio(LIMITES.adocoes.animal_nome),
    data_adocao: dataAteHoje,
    /** Se o animal foi devolvido */
    data_devolucao: dataAteHoje.nullish().transform((valor) => valor ?? null),
  })
  .refine((adocao) => !adocao.data_devolucao || adocao.data_devolucao >= adocao.data_adocao, {
    path: ['data_devolucao'],
    message: 'A devolução não pode ser antes da adoção',
  })

export type AdocaoAntigaEntrada = z.input<typeof adocaoAntigaEntrada>
export type AdocaoAntigaDados = z.output<typeof adocaoAntigaEntrada>

/** Busca da lista (T30): parte do nome ou do WhatsApp. */
export const filtroAdotantes = z.object({
  busca: z
    .preprocess((valor) => (valor === '' ? undefined : valor), z.string().trim().max(40).optional())
    .optional(),
})

export type FiltroAdotantes = z.output<typeof filtroAdotantes>
