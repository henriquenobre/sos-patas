// Pedidos de adoção na área da ONG (T27, T28; RN49). Passam pelo login (middleware/access.ts).
import { Hono } from 'hono'
import { z } from 'zod'
import {
  PEDIDO_STATUS,
  observacaoPedidoEntrada,
  type ListaPedidos,
  type PedidoDetalhe,
} from '@sospatas/compartilhado'
import { limparCache } from '../../cache'
import type { ConfigApp } from '../../dependencias'
import {
  anotarPedido,
  aprovarPedido,
  buscarPedido,
  caminhosPublicosDoAnimal,
  listarPedidos,
  recusarPedido,
} from '../../servicos/pedidos'
import { lerJson, validar } from '../../validacao'

const filtroStatus = z.object({
  status: z.enum(PEDIDO_STATUS, { error: 'Situação inválida' }).default('pendente'),
})

export const rotasPedidosAdmin = new Hono<ConfigApp>()

rotasPedidosAdmin.get('/pedidos', async (c) => {
  const { status } = validar(filtroStatus, c.req.query())
  return c.json<ListaPedidos>({ pedidos: await listarPedidos(c.var.db, c.env, status) })
})

rotasPedidosAdmin.get('/pedidos/:id', async (c) =>
  c.json<PedidoDetalhe>(await buscarPedido(c.var.db, c.env, c.req.param('id'))),
)

rotasPedidosAdmin.put('/pedidos/:id/observacao', async (c) => {
  const { observacao } = await lerJson(c, observacaoPedidoEntrada)
  await anotarPedido(c.var.db, c.req.param('id'), observacao, c.var.usuaria)
  return c.body(null, 204)
})

/** Aprovar: o animal continua fora do site até "Marcar como adotado". */
rotasPedidosAdmin.post('/pedidos/:id/aprovar', async (c) => {
  await aprovarPedido(c.var.db, c.req.param('id'), c.var.usuaria)
  return c.body(null, 204)
})

/** Recusar: o animal volta para o site na hora. */
rotasPedidosAdmin.post('/pedidos/:id/recusar', async (c) => {
  const animalId = await recusarPedido(c.var.db, c.req.param('id'), c.var.usuaria)
  await limparCache(c, caminhosPublicosDoAnimal(animalId))
  return c.body(null, 204)
})
