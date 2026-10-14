// Respostas das rotas da área da ONG (/api/admin, docs/ARQUITETURA.md, seção 3.2).
import type { Alerta } from '../adocao/alertas'
import type { ChaveTexto, NomeLista } from '../conteudo'
import type {
  Especie,
  LarTipo,
  PedidoStatus,
  PerdidoOrigem,
  PerdidoStatus,
  PerdidoTipo,
  Porte,
  RacaTipo,
  ResponsavelTipo,
  Sexo,
  SimNaoSemInformacao,
  StatusAnimal,
} from '../dominio'
import type { RespostasAdocao } from '../schemas/pedido'
import type { FotoPublica } from './publico'

/** GET /api/admin/eu: quem está logada ("Olá, Gracia" no cabeçalho, RN43). */
export type UsuariaLogada = { id: string; nome: string; email: string }

/** Resposta de criação: o id do registro novo. */
export type Criado = { id: string }

/** "Alterado por Claudia em 07/10/2026" (RN43). */
export type Alteracao = {
  /** ISO 8601 */
  em: string
  /** Nome de quem alterou; null se ninguém da equipe alterou ainda ou a conta foi apagada */
  por: string | null
}

/** GET /api/admin/resumo: números do topo do painel (T09). */
export type ResumoAdmin = {
  disponiveis: number
  /** Adultos disponíveis esperando há mais de 90 dias (mesma regra do destaque, RN12) */
  esperando_muito: number
  /** Adoções com data no mês corrente (indicador da avaliação) */
  adotados_no_mes: number
  /** Anúncios de perdidos aguardando aprovação (card amarelo) */
  perdidos_pendentes: number
  /** Pedidos de adoção aguardando análise */
  pedidos_pendentes: number
}

export type ProtetorResumido = { id: string; nome: string }

/** Pedido de adoção em andamento de um animal em análise (RN48, RN49). */
export type PedidoDoAnimal = { id: string; status: PedidoStatus }

/** Item da lista do painel (T09). A idade e a adaptação (RN30) são calculadas no front. */
export type AnimalAdminResumo = {
  id: string
  nome: string
  especie: Especie
  sexo: Sexo
  nascimento_aprox: string
  porte: Porte
  status: StatusAnimal
  data_entrada: string
  data_adocao: string | null
  responsavel_tipo: ResponsavelTipo
  protetor: ProtetorResumido | null
  /** Lar temporário (privado) */
  lar_nome: string | null
  /** URL da miniatura da foto principal */
  foto: string | null
  /** Só em análise: o pedido pendente ou aprovado mais recente */
  pedido: PedidoDoAnimal | null
}

/** GET /api/admin/animais */
export type ListaAnimaisAdmin = { animais: AnimalAdminResumo[] }

/** Foto na edição do animal (T11): com id e posição, para remover, trocar e reordenar. */
export type FotoAdmin = FotoPublica & { id: string; ordem: number }

/** GET /api/admin/animais/:id: tudo, inclusive o bloco "Só a equipe vê" (T11). */
export type AnimalAdmin = Omit<AnimalAdminResumo, 'foto' | 'pedido' | 'protetor' | 'lar_nome'> & {
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
  protetor: (ProtetorResumido & { whatsapp: string }) | null
  /** Em ordem; a primeira é a principal (RN01) */
  fotos: FotoAdmin[]
  privado: {
    lar_nome: string | null
    lar_tipo: LarTipo | null
    observacoes: string
    adotante_nome: string | null
    adotante_whatsapp: string | null
  }
  /**
   * Pedido aprovado aguardando a entrega: "Marcar como adotado" já abre com o nome e o
   * WhatsApp de quem pediu (RN49)
   */
  pedido_aprovado: { id: string; nome: string; whatsapp: string } | null
  /**
   * Só de adotado: o pedido aprovado que levou à adoção, enquanto ele é guardado (90 dias depois
   * da adoção, RN15), para abrir e imprimir o formulário
   */
  pedido_da_adocao: { id: string } | null
  alteracao: Alteracao
}

/** Protetor parceiro na tela T24 e na lista do cadastro do animal (RN42). */
export type ProtetorAdmin = {
  id: string
  nome: string
  whatsapp: string
  /** Todos os animais dele, de qualquer situação: com algum, não pode ser excluído */
  animais: number
  /** "N animais disponíveis" na T24 */
  animais_disponiveis: number
  alteracao: Alteracao
}

/** GET /api/admin/protetores */
export type ListaProtetores = { protetores: ProtetorAdmin[] }

/** Animal de um pedido, como aparece na lista e na análise (T27, T28). */
export type AnimalDoPedidoAdmin = {
  id: string
  nome: string
  especie: Especie
  sexo: Sexo
  /** Situação do animal hoje: pedido aprovado com animal adotado = adoção concluída */
  status: StatusAnimal
  /** URL da miniatura da foto principal */
  foto: string | null
  responsavel_tipo: ResponsavelTipo
  /** Nome do protetor parceiro, se o animal for de protetor */
  protetor_nome: string | null
}

/** Item da lista de pedidos (T27). */
export type PedidoResumo = {
  id: string
  status: PedidoStatus
  /** ISO 8601 */
  created_at: string
  nome: string
  bairro_cidade: string
  animal: AnimalDoPedidoAdmin
  /** Quantos alertas automáticos o pedido tem */
  quantidade_alertas: number
}

/** GET /api/admin/pedidos */
export type ListaPedidos = { pedidos: PedidoResumo[] }

/** GET /api/admin/pedidos/:id (T28) */
export type PedidoDetalhe = Omit<PedidoResumo, 'quantidade_alertas'> & {
  whatsapp: string
  versao_formulario: string
  respostas: RespostasAdocao
  /** A "assinatura" do termo no site (RN47) */
  termo_ciente_em: string
  versao_termo: string
  consentimento_em: string
  observacao_equipe: string
  analisado_em: string | null
  /** Primeiro nome de quem aprovou ou recusou */
  analisado_por: string | null
  alertas: Alerta[]
}

/** Foto de um anúncio na moderação (T14). */
export type FotoPerdidoAdmin = {
  id: string
  /**
   * Pendente: caminho da rota da API que lê a quarentena (/api/admin/perdidos/:id/fotos/:fotoId,
   * só a equipe vê, RN19). Publicado: URL pública da foto.
   */
  url: string
}

/** Anúncio na moderação (T14): aguardando aprovação ou no ar. */
export type PerdidoAdmin = {
  id: string
  tipo: PerdidoTipo
  especie: Especie
  nome: string | null
  bairro: string
  data_ocorrido: string
  descricao: string
  contato_nome: string
  contato_whatsapp: string
  /** "site" (formulário público) ou "equipe" (T21, etapa 13) */
  origem: PerdidoOrigem
  status: PerdidoStatus
  /** ISO 8601: quando o anúncio chegou */
  created_at: string
  /** ISO 8601; null enquanto pendente */
  publicado_em: string | null
  /** ISO 8601: "Sai do ar em N dias" (RN25); null enquanto pendente */
  expira_em: string | null
  fotos: FotoPerdidoAdmin[]
}

/** GET /api/admin/perdidos?status=pendente|publicado */
export type ListaPerdidosAdmin = { perdidos: PerdidoAdmin[] }

/** Texto único de uma página (T18–T20). */
export type TextoAdmin = {
  valor: string
  /** null se o texto ainda não existe no banco (aparece vazio) */
  alteracao: Alteracao | null
}

/** Item de uma lista (ListaEditavel e T17). */
export type ItemAdmin = {
  id: string
  titulo: string | null
  texto: string
  /** Só na lista inicio_fotos (RN38) */
  foto: FotoPublica | null
  alteracao: Alteracao
}

/** GET /api/admin/conteudo: todos os textos e listas das páginas (T15–T20), sem cache. */
export type ConteudoAdmin = {
  textos: Record<ChaveTexto, TextoAdmin>
  /** Na ordem definida pela equipe (RN35) */
  listas: Record<NomeLista, ItemAdmin[]>
}
