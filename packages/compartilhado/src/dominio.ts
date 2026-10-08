// Valores fixos do domínio (docs/DESENVOLVIMENTO.md, seção 5). Os enums do banco e, a partir da
// etapa 3, os schemas zod são montados a partir destas listas.

export const ESPECIES = ['cao', 'gato'] as const
export const SEXOS = ['macho', 'femea'] as const
export const PORTES = ['mini', 'pequeno', 'medio', 'grande', 'gigante'] as const
export const RACA_TIPOS = ['puro', 'mestico'] as const
/** Vacinado e vermifugado: "sem informação" aparece em cinza na ficha. */
export const SIM_NAO_SEM_INFORMACAO = ['sim', 'nao', 'sem_informacao'] as const
export const STATUS_ANIMAL = ['disponivel', 'adotado'] as const
export const RESPONSAVEL_TIPOS = ['ong', 'protetor'] as const
export const LAR_TIPOS = ['provisorio', 'remunerado'] as const

export const PERDIDO_TIPOS = ['perdido', 'encontrado'] as const
export const PERDIDO_ORIGENS = ['site', 'equipe'] as const
/** Recusado, resolvido e expirado não existem: o anúncio é apagado (RN26). */
export const PERDIDO_STATUS = ['pendente', 'publicado'] as const

export const PIX_TIPOS = ['cnpj', 'cpf', 'email', 'telefone', 'aleatoria'] as const

/** Textos exibidos para cada valor (iguais aos do protótipo). */
export const ROTULOS = {
  especie: { cao: 'Cão', gato: 'Gato' },
  sexo: { macho: 'Macho', femea: 'Fêmea' },
  porte: { mini: 'Mini', pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande', gigante: 'Gigante' },
  raca_tipo: { puro: 'Raça pura', mestico: 'Mestiço' },
  sim_nao_sem_informacao: { sim: 'Sim', nao: 'Não', sem_informacao: 'Sem informação' },
  status_animal: { disponivel: 'Disponível', adotado: 'Adotado' },
  responsavel_tipo: { ong: 'SOS Patas', protetor: 'Protetor parceiro' },
  lar_tipo: { provisorio: 'Lar provisório', remunerado: 'Lar remunerado' },
  perdido_tipo: { perdido: 'Perdido', encontrado: 'Encontrado' },
  pix_tipo: {
    cnpj: 'CNPJ',
    cpf: 'CPF',
    email: 'E-mail',
    telefone: 'Telefone',
    aleatoria: 'Aleatória',
  },
} as const

export type Especie = (typeof ESPECIES)[number]
export type Sexo = (typeof SEXOS)[number]
export type Porte = (typeof PORTES)[number]
export type RacaTipo = (typeof RACA_TIPOS)[number]
export type SimNaoSemInformacao = (typeof SIM_NAO_SEM_INFORMACAO)[number]
export type StatusAnimal = (typeof STATUS_ANIMAL)[number]
export type ResponsavelTipo = (typeof RESPONSAVEL_TIPOS)[number]
export type LarTipo = (typeof LAR_TIPOS)[number]
export type PerdidoTipo = (typeof PERDIDO_TIPOS)[number]
export type PerdidoOrigem = (typeof PERDIDO_ORIGENS)[number]
export type PerdidoStatus = (typeof PERDIDO_STATUS)[number]
export type PixTipo = (typeof PIX_TIPOS)[number]
