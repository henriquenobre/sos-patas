// Limites de caracteres dos campos (RN34). Valem no formulário, na API (zod, etapa 3) e no
// banco (CHECK em db/schema.ts). Mudou aqui: gerar uma migration nova (pnpm db:gerar).
// Os limites dos textos e listas das páginas ficam em conteudo.ts.

export const LIMITES = {
  animais: {
    nome: 40,
    raca: 60,
    cor_pelagem: 60,
    vacinas: 120,
    problema_saude: 300,
    descricao: 500,
  },
  animais_privado: {
    lar_nome: 80,
    observacoes: 1000,
    adotante_nome: 80,
  },
  perdidos: {
    nome: 40,
    bairro: 60,
    descricao: 300,
    contato_nome: 30,
  },
  protetores: {
    nome: 60,
  },
  equipe: {
    nome: 40,
    email: 254,
  },
  ong: {
    nome_completo: 120,
    instagram: 30,
    facebook: 200,
    pix_chave: 100,
  },
} as const

/** WhatsApp guardado só com dígitos: DDD + número (10 ou 11 dígitos). */
export const REGEX_WHATSAPP = '^[0-9]{10,11}$'

/** Fotos por animal (RN01). A 1ª (ordem 0) é a principal. */
export const MAX_FOTOS_ANIMAL = 3
