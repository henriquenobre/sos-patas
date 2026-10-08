// Anúncios de perdidos e encontrados: envio público (T13, RN18–RN23, RN28) e pela equipe
// (T21, RN39, RN40). As fotos vão em separado, como arquivos; o limite de quantidade e de
// tamanho fica em limites.ts (MAX_FOTOS_PERDIDO, TAMANHO_MAX_FOTO_BYTES).
import { z } from 'zod'
import { ESPECIES, PERDIDO_TIPOS } from '../dominio'
import { LIMITES } from '../limites'
import { contemLink } from '../texto'
import { dataAteHoje, opcao, textoObrigatorio, textoOuNulo, whatsapp } from './comuns'

const L = LIMITES.perdidos

export const perdidoEntrada = z.object({
  tipo: opcao(PERDIDO_TIPOS, 'Escolha perdido ou encontrado'),
  especie: opcao(ESPECIES, 'Escolha cão ou gato'),
  nome: textoOuNulo(L.nome),
  /** Só o bairro: nunca o endereço completo (RN28) */
  bairro: textoObrigatorio(L.bairro),
  data_ocorrido: dataAteHoje,
  descricao: textoObrigatorio(L.descricao).refine(
    (texto) => !contemLink(texto),
    'Não coloque links na descrição',
  ),
  /** Só o primeiro nome (RN28) */
  contato_nome: textoObrigatorio(L.contato_nome),
  contato_whatsapp: whatsapp,
})

/** Formulário público: consentimento LGPD e Turnstile obrigatórios (RN22, RN28). */
export const perdidoPublicoEntrada = perdidoEntrada.extend({
  consentimento: z.literal(true, {
    error: 'Marque que você autoriza publicar seu primeiro nome, WhatsApp e fotos',
  }),
  turnstile_token: z
    .string({ error: 'Confirme que você não é um robô' })
    .min(1, 'Confirme que você não é um robô'),
})

/** Anúncio criado ou corrigido pela equipe: a pessoa autorizou pelo WhatsApp (RN39). */
export const perdidoEquipeEntrada = perdidoEntrada.extend({
  autorizacao: z.literal(true, {
    error: 'Confirme que a pessoa autorizou publicar os dados e as fotos por 30 dias',
  }),
})

export type PerdidoPublicoEntrada = z.input<typeof perdidoPublicoEntrada>
export type PerdidoEquipeEntrada = z.input<typeof perdidoEquipeEntrada>
