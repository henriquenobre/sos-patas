// POST /api/publico/perdidos: anúncio de perdido ou encontrado enviado pelo site (T13;
// RN18–RN23, RN28; docs/ARQUITETURA.md, seção 3.1). Multipart: o campo "dados" leva o JSON do
// formulário e cada campo "fotos" um arquivo WebP já redesenhado no navegador (RN20).
import { Hono } from 'hono'
import { perdidoPublicoEntrada } from '@sospatas/compartilhado'
import type { ConfigApp } from '../../dependencias'
import { ErroApi } from '../../erros'
import {
  conferirFotosPerdido,
  conferirLimitesPerdido,
  criarPerdidoPublico,
} from '../../servicos/perdidos'
import { hashDoIp, ipDaRequisicao } from '../../servicos/seguranca'
import { validar } from '../../validacao'
import { lerDadosEFotos } from '../multipart'

export const rotasPerdidosPublicos = new Hono<ConfigApp>()

rotasPerdidosPublicos.post('/perdidos', async (c) => {
  const { json, arquivos } = await lerDadosEFotos(c)
  const dados = validar(perdidoPublicoEntrada, json)
  conferirFotosPerdido(arquivos)

  const ip = ipDaRequisicao(c.req)
  if (!(await c.var.verificarTurnstile(dados.turnstile_token, ip))) {
    throw new ErroApi(
      400,
      'turnstile',
      'Não conseguimos confirmar que você não é um robô. Tente de novo.',
    )
  }

  const ipHash = await hashDoIp(ip, c.env.IP_HASH_SECRET)
  await conferirLimitesPerdido(c.var.db, ipHash)
  await criarPerdidoPublico(c.var.db, c.var.quarentena, dados, arquivos, ipHash)

  // Pendente não aparece no site (RN18): nada a limpar no cache
  return c.json({ recebido: true }, 201)
})
