// Respostas das rotas da área da ONG (/api/admin, docs/ARQUITETURA.md, seção 3.2).
import type { Alerta } from '../adocao/alertas'
import type { Especie, PedidoStatus, ResponsavelTipo, Sexo } from '../dominio'
import type { RespostasAdocao } from '../schemas/pedido'

/** Animal de um pedido, como aparece na lista e na análise (T27, T28). */
export type AnimalDoPedidoAdmin = {
  id: string
  nome: string
  especie: Especie
  sexo: Sexo
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
