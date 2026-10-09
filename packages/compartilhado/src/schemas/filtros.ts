// Filtros das rotas (query string). Valor vazio = filtro desligado.
import { z } from 'zod'
import { ESPECIES, PERDIDO_TIPOS, PORTES, RESPONSAVEL_TIPOS, STATUS_ANIMAL } from '../dominio'

/** "?especie=" (chip desligado) vale como ausente. */
const opcional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((valor) => (valor === '' ? undefined : valor), schema.optional())

export const IDADES_FILTRO = ['filhote', 'adulto'] as const

/** Vitrine (T02): um valor por grupo de chips, como no protótipo. */
export const filtroVitrine = z.object({
  especie: opcional(z.enum(ESPECIES, { error: 'Espécie inválida' })),
  porte: opcional(z.enum(PORTES, { error: 'Porte inválido' })),
  /** RN11: adulto tem 1 ano ou mais */
  idade: opcional(z.enum(IDADES_FILTRO, { error: 'Idade inválida' })),
  /** "sim" = só quem convive com outros animais */
  convive: opcional(z.literal('sim', { error: 'Use convive=sim' })),
})

export type FiltroVitrine = z.output<typeof filtroVitrine>

/** Perdidos e encontrados (T12). */
export const filtroPerdidos = z.object({
  tipo: opcional(z.enum(PERDIDO_TIPOS, { error: 'Tipo inválido' })),
})

export type FiltroPerdidos = z.output<typeof filtroPerdidos>

/** Abas, busca e filtro por responsável do painel de animais (T09). */
export const filtroAnimaisAdmin = z.object({
  status: z.preprocess(
    (valor) => (valor === '' ? undefined : valor),
    z.enum(STATUS_ANIMAL, { error: 'Situação inválida' }).default('disponivel'),
  ),
  /** "ong", "protetor" (qualquer protetor) ou o id de um protetor; vazio = todos */
  responsavel: opcional(
    z.union([z.enum(RESPONSAVEL_TIPOS), z.uuid()], { error: 'Responsável inválido' }),
  ),
  /** Parte do nome */
  busca: opcional(z.string().trim().max(40, 'Busca muito longa')),
})

export type FiltroAnimaisAdmin = z.output<typeof filtroAnimaisAdmin>
