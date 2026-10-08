// Respostas das rotas públicas da API (docs/ARQUITETURA.md, seção 3.1). O front usa estes
// mesmos tipos. Nenhum deles tem dados internos: lar temporário, observações, adotante,
// hash de IP, quem alterou (docs/DESENVOLVIMENTO.md, seção 5, "Segurança e permissões").
import type { ChaveTexto, NomeLista } from '../conteudo'
import type {
  Especie,
  PerdidoTipo,
  PixTipo,
  Porte,
  RacaTipo,
  ResponsavelTipo,
  Sexo,
  SimNaoSemInformacao,
  StatusAnimal,
} from '../dominio'

/** URLs prontas para o <img>: miniatura (cards, galeria) e completa (ficha, RN03). */
export type FotoPublica = { miniatura: string; completa: string }

export type OngPublica = {
  nome_completo: string
  whatsapp: string
  instagram: string
  facebook: string | null
  pix_tipo: PixTipo
  pix_chave: string
}

export type ItemPublico = {
  id: string
  titulo: string | null
  texto: string
  /** Só na lista inicio_fotos */
  foto: FotoPublica | null
}

/** GET /api/publico/site: tudo o que as páginas de conteúdo precisam, numa chamada (RN33). */
export type SitePublico = {
  ong: OngPublica
  textos: Record<ChaveTexto, string>
  /** Itens de cada lista, já na ordem definida pela equipe (RN35) */
  listas: Record<NomeLista, ItemPublico[]>
}

/** Card da vitrine e do "Esperando há mais tempo". A idade é calculada no front (RN13). */
export type AnimalResumo = {
  id: string
  nome: string
  especie: Especie
  sexo: Sexo
  nascimento_aprox: string
  porte: Porte
  data_entrada: string
  /** URL da miniatura da foto principal, ou null se ainda não tem foto */
  foto: string | null
}

/** GET /api/publico/animais e /animais/destaques */
export type ListaAnimais = { animais: AnimalResumo[] }

export type Responsavel = {
  tipo: ResponsavelTipo
  /** "SOS Patas" ou o nome do protetor parceiro (RN31, RN42) */
  nome: string
  whatsapp: string
}

/** GET /api/publico/animais/:id */
export type AnimalFicha = Omit<AnimalResumo, 'foto'> & {
  raca: string | null
  raca_tipo: RacaTipo | null
  cor_pelagem: string | null
  castrado: boolean
  vacinado: SimNaoSemInformacao
  vacinas: string | null
  vermifugado: SimNaoSemInformacao
  problema_saude: string | null
  docil: boolean | null
  convive_animais: boolean | null
  descricao: string
  status: StatusAnimal
  /** Em ordem; a primeira é a principal (RN01) */
  fotos: FotoPublica[]
  responsavel: Responsavel
}

/** Anúncio aprovado e no ar (RN18, RN25). */
export type PerdidoPublico = {
  id: string
  tipo: PerdidoTipo
  especie: Especie
  nome: string | null
  bairro: string
  data_ocorrido: string
  descricao: string
  contato_nome: string
  contato_whatsapp: string
  /** ISO 8601 */
  publicado_em: string
  /** ISO 8601: o card mostra "sai do ar em N dias" */
  expira_em: string
  /** URLs das fotos (até 2) */
  fotos: string[]
}

/** GET /api/publico/perdidos */
export type ListaPerdidos = { perdidos: PerdidoPublico[] }
