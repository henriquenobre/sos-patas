// Cadastro e edição de animal (T10, T11), adoção (RN07, RN08, RN30) e protetor (RN42).
import { z } from 'zod'
import {
  ESPECIES,
  LAR_TIPOS,
  PORTES,
  RACA_TIPOS,
  RESPONSAVEL_TIPOS,
  SEXOS,
  SIM_NAO_SEM_INFORMACAO,
} from '../dominio'
import { LIMITES, MAX_FOTOS_ANIMAL } from '../limites'
import {
  dataAteHoje,
  opcao,
  opcaoOuNulo,
  simNaoOuNulo,
  textoObrigatorio,
  textoOpcional,
  textoOuNulo,
  whatsapp,
} from './comuns'

const L = LIMITES.animais
const P = LIMITES.animais_privado

/** Bloco amarelo "Só a equipe vê" (tabela animais_privado). */
export const animalPrivadoEntrada = z.object({
  lar_nome: textoOuNulo(P.lar_nome),
  lar_tipo: opcaoOuNulo(LAR_TIPOS),
  observacoes: textoOpcional(P.observacoes),
})

export const animalEntrada = z
  .object({
    nome: textoObrigatorio(L.nome),
    especie: opcao(ESPECIES, 'Escolha cão ou gato'),
    sexo: opcao(SEXOS, 'Escolha o sexo'),
    /** Calculado no formulário a partir de "N anos/meses" (nascimentoAproximado) */
    nascimento_aprox: dataAteHoje,
    porte: opcao(PORTES, 'Escolha o porte'),
    raca: textoOuNulo(L.raca),
    raca_tipo: opcaoOuNulo(RACA_TIPOS),
    cor_pelagem: textoOuNulo(L.cor_pelagem),
    castrado: z.boolean({ error: 'Responda se é castrado' }),
    vacinado: opcao(SIM_NAO_SEM_INFORMACAO, 'Responda se é vacinado'),
    vacinas: textoOuNulo(L.vacinas),
    vermifugado: opcao(SIM_NAO_SEM_INFORMACAO, 'Responda se foi vermifugado'),
    /** null = sem problema de saúde conhecido */
    problema_saude: textoOuNulo(L.problema_saude),
    docil: simNaoOuNulo,
    convive_animais: simNaoOuNulo,
    descricao: textoOpcional(L.descricao),
    /** Sem valor, o banco usa a data de hoje */
    data_entrada: dataAteHoje.optional(),
    responsavel_tipo: opcao(RESPONSAVEL_TIPOS, 'Escolha o responsável'),
    protetor_id: z.uuid('Escolha o protetor parceiro').nullish(),
    privado: animalPrivadoEntrada.prefault({}),
  })
  .superRefine((animal, ctx) => {
    // RN42: animal de protetor precisa dizer qual protetor
    if (animal.responsavel_tipo === 'protetor' && !animal.protetor_id) {
      ctx.addIssue({
        code: 'custom',
        path: ['protetor_id'],
        message: 'Escolha o protetor parceiro',
      })
    }
  })
  .transform((animal) => ({
    ...animal,
    protetor_id: animal.responsavel_tipo === 'protetor' ? (animal.protetor_id ?? null) : null,
    // "Quais vacinas" só faz sentido se foi vacinado
    vacinas: animal.vacinado === 'sim' ? animal.vacinas : null,
  }))

export type AnimalEntrada = z.input<typeof animalEntrada>
export type AnimalDados = z.output<typeof animalEntrada>

/** "Marcar como adotado": nome e WhatsApp de quem adotou, só para a equipe (RN30). */
export const adocaoEntrada = z.object({
  adotante_nome: textoObrigatorio(P.adotante_nome),
  adotante_whatsapp: whatsapp,
})

export type AdocaoEntrada = z.input<typeof adocaoEntrada>
export type AdocaoDados = z.output<typeof adocaoEntrada>

/** Protetor parceiro, criado no cadastro do animal ou na tela T24 (RN42). */
export const protetorEntrada = z.object({
  nome: textoObrigatorio(LIMITES.protetores.nome),
  whatsapp,
})

export type ProtetorEntrada = z.input<typeof protetorEntrada>
export type ProtetorDados = z.output<typeof protetorEntrada>

/** Nova ordem das fotos: os ids de todas as fotos do animal; a primeira vira a principal (RN01). */
export const ordemFotosEntrada = z.object({
  fotos: z
    .array(z.uuid('Foto inválida'), { error: 'Informe a ordem das fotos' })
    .min(1, 'Informe a ordem das fotos')
    .max(MAX_FOTOS_ANIMAL, `Cada animal tem no máximo ${String(MAX_FOTOS_ANIMAL)} fotos`)
    .refine((ids) => new Set(ids).size === ids.length, 'Foto repetida na ordem'),
})

export type OrdemFotosEntrada = z.input<typeof ordemFotosEntrada>
