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
  /** Formulário "Fale com a ONG" (RN51): vai por e-mail, não fica no banco */
  contato: {
    nome: 100,
    email: 254,
    telefone: 20,
    mensagem: 2000,
  },
  pedidos_adocao: {
    nome: 100,
    bairro_cidade: 100,
    observacao_equipe: 1000,
    /** Respostas de texto curto do formulário */
    texto_curto: 200,
    /** Respostas de texto longo do formulário */
    texto_longo: 1000,
  },
  ong: {
    nome_completo: 120,
    email: 254,
    instagram: 30,
    facebook: 200,
    pix_chave: 100,
  },
} as const

/** WhatsApp guardado só com dígitos: DDD + número (10 ou 11 dígitos). */
export const REGEX_WHATSAPP = '^[0-9]{10,11}$'

// ---------------------------------------------------------------------------
// Fotos (RN01, RN02, RN19–RN21, RN38)
// ---------------------------------------------------------------------------
/** Fotos por animal (RN01). A 1ª (ordem 0) é a principal. */
export const MAX_FOTOS_ANIMAL = 3
/** Fotos por anúncio de perdido/encontrado (RN21). */
export const MAX_FOTOS_PERDIDO = 2
/** Maior dimensão das versões geradas no navegador, em pixels (RN02, RN20). */
export const LADO_MINIATURA_PX = 400
export const LADO_COMPLETA_PX = 1200
/** Arquivo escolhido no celular, antes da compressão: JPG, PNG ou WebP até 10 MB (RN20). */
export const TAMANHO_MAX_ORIGINAL_BYTES = 10 * 1024 * 1024
export const TIPOS_FOTO_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'] as const
/** Cada arquivo WebP recebido pela API, já comprimido (RN21). */
export const TAMANHO_MAX_FOTO_BYTES = 500 * 1024

// ---------------------------------------------------------------------------
// Prazos, em dias (fixos no código, RN25)
// ---------------------------------------------------------------------------
/** Anúncio publicado fica no ar por 30 dias; renovar volta a contar 30 a partir de hoje (RN25, RN41). */
export const DIAS_PUBLICACAO_PERDIDO = 30
/** Anúncio pendente há mais de 7 dias é apagado (RN27). */
export const DIAS_MAX_PENDENTE = 7
/** Período de adaptação depois da adoção (RN30). */
export const DIAS_ADAPTACAO = 15
/** Pedido de adoção é apagado 90 dias depois da recusa ou da adoção (RN15). */
export const DIAS_GUARDA_PEDIDO_ADOCAO = 90

// ---------------------------------------------------------------------------
// Vitrine e envios públicos
// ---------------------------------------------------------------------------
/** "Esperando há mais tempo": adultos com mais de 90 dias de espera, até 6 no Início (RN12). */
export const DIAS_PARA_DESTAQUE = 90
export const MAX_DESTAQUES = 6
/** Envios públicos de anúncio: 3 por dia por IP e 30 pendentes no total (RN23). */
export const MAX_ENVIOS_POR_DIA_POR_IP = 3
export const MAX_PERDIDOS_PENDENTES = 30
/** Formulário "Fale com a ONG": 3 mensagens por dia por IP (RN51). */
export const MAX_CONTATOS_POR_DIA_POR_IP = 3
/** Pedidos de adoção: 2 por dia por IP e 1 pendente por WhatsApp (RN50). */
export const MAX_PEDIDOS_POR_DIA_POR_IP = 2
/** Pedido pendente há mais tempo que isso aparece em vermelho no painel (RN50, a confirmar). */
export const DIAS_ALERTA_PEDIDO_PARADO = 3
