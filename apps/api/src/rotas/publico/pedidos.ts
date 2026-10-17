// POST /api/publico/animais/:id/pedidos: formulário de adoção enviado pelo site (RN14, RN15,
// RN47, RN48, RN50, RN52; docs/ARQUITETURA.md, seção 3.1).
import { Hono } from 'hono'
import { pedidoAdocaoEntrada } from '@sospatas/compartilhado'
import { emSegundoPlano, limparCache } from '../../cache'
import type { ConfigApp } from '../../dependencias'
import { ErroApi, erros } from '../../erros'
import { mensagemDoPedido } from '../../servicos/email'
import {
  animalParaPedido,
  caminhosPublicosDoAnimal,
  conferirLimites,
  criarPedido,
} from '../../servicos/pedidos'
import { hashDoIp, ipDaRequisicao } from '../../servicos/seguranca'
import { validar } from '../../validacao'

export const rotasPedidosPublicos = new Hono<ConfigApp>()

rotasPedidosPublicos.post('/animais/:id/pedidos', async (c) => {
  let corpo: unknown
  try {
    corpo = await c.req.json()
  } catch {
    throw erros.requisicaoInvalida('Não foi possível ler os dados enviados.')
  }

  // A pergunta das telas só vale para gatos: o schema depende da espécie do animal
  const animal = await animalParaPedido(c.var.db, c.req.param('id'))
  const dados = validar(pedidoAdocaoEntrada(animal.especie), corpo)

  const ip = ipDaRequisicao(c.req)
  if (!(await c.var.verificarTurnstile(dados.turnstile_token, ip))) {
    throw new ErroApi(
      400,
      'turnstile',
      'Não conseguimos confirmar que você não é um robô. Tente de novo.',
    )
  }

  const ipHash = await hashDoIp(ip, c.env.IP_HASH_SECRET)
  await conferirLimites(c.var.db, dados.whatsapp, ipHash)
  const pedidoId = await criarPedido(c.var.db, animal.id, dados, ipHash, animal.nome)

  // O animal saiu do site: some da vitrine, dos destaques e da ficha guardada (RN48)
  await limparCache(c, caminhosPublicosDoAnimal(animal.id))

  // Aviso à ONG por e-mail, depois da resposta. Se falhar (ou na prévia, sem envio de e-mail),
  // o pedido continua gravado e aparece na área da ONG
  const aviso = mensagemDoPedido(animal.nome, pedidoId, new URL(c.req.url).origin)
  await emSegundoPlano(
    c,
    c.var.enviarEmail(aviso).catch((erro: unknown) => {
      console.error('Falha ao avisar o pedido de adoção por e-mail', erro)
    }),
  )
  return c.json({ recebido: true, animal: animal.nome }, 201)
})
