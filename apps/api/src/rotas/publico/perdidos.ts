// POST /api/publico/perdidos: anúncio de perdido ou encontrado enviado pelo site (T13;
// RN18–RN23, RN28; docs/ARQUITETURA.md, seção 3.1). Multipart: o campo "dados" leva o JSON do
// formulário e cada campo "fotos" um arquivo WebP já redesenhado no navegador (RN20).
import { Hono } from 'hono'
import { perdidoPublicoEntrada } from '@sospatas/compartilhado'
import type { ConfigApp } from '../../dependencias'
import { ErroApi, erros } from '../../erros'
import {
  conferirFotosPerdido,
  conferirLimitesPerdido,
  criarPerdidoPublico,
} from '../../servicos/perdidos'
import { hashDoIp, ipDaRequisicao } from '../../servicos/seguranca'
import { validar } from '../../validacao'

export const rotasPerdidosPublicos = new Hono<ConfigApp>()

rotasPerdidosPublicos.post('/perdidos', async (c) => {
  let corpo: Record<string, unknown>
  try {
    corpo = await c.req.parseBody({ all: true })
  } catch {
    throw erros.requisicaoInvalida('Não foi possível ler os dados enviados.')
  }

  let json: unknown
  try {
    json = typeof corpo.dados === 'string' ? JSON.parse(corpo.dados) : undefined
  } catch {
    json = undefined
  }
  if (json === undefined) throw erros.requisicaoInvalida('Não foi possível ler os dados enviados.')
  const dados = validar(perdidoPublicoEntrada, json)

  const campoFotos = corpo.fotos === undefined ? [] : [corpo.fotos].flat()
  if (!campoFotos.every((foto) => foto instanceof File)) {
    throw erros.requisicaoInvalida('Não foi possível ler as fotos enviadas.')
  }
  const arquivos = await Promise.all(
    campoFotos.map(async (foto) => new Uint8Array(await foto.arrayBuffer())),
  )
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
