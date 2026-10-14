// Moderação de perdidos e encontrados na área da ONG (T14; RN18, RN19, RN25, RN26, RN41).
// Passam pelo login (middleware/access.ts). O anúncio criado ou editado pela equipe (T21,
// POST e PUT) entra na etapa 13.
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { PERDIDO_STATUS, type ListaPerdidosAdmin } from '@sospatas/compartilhado'
import { limparCache } from '../../cache'
import type { ConfigApp } from '../../dependencias'
import {
  CAMINHO_PUBLICO_PERDIDOS,
  apagarPerdido,
  aprovarPerdido,
  listarPerdidosAdmin,
  obterFotoPerdido,
  renovarPerdido,
} from '../../servicos/perdidos'
import { validar } from '../../validacao'

const filtroStatus = z.object({
  status: z.enum(PERDIDO_STATUS, { error: 'Situação inválida' }).default('pendente'),
})

const buckets = (c: Context<ConfigApp>) => ({ fotos: c.var.fotos, quarentena: c.var.quarentena })

/** O que aparece em /perdidos mudou: apaga a cópia guardada da lista pública. */
const publicar = (c: Context<ConfigApp>) => limparCache(c, [CAMINHO_PUBLICO_PERDIDOS])

export const rotasPerdidosAdmin = new Hono<ConfigApp>()

rotasPerdidosAdmin.get('/perdidos', async (c) => {
  const { status } = validar(filtroStatus, c.req.query())
  return c.json<ListaPerdidosAdmin>({
    perdidos: await listarPerdidosAdmin(c.var.db, c.env, status),
  })
})

/** Foto do anúncio para a equipe (a do pendente vem da quarentena, RN19). */
rotasPerdidosAdmin.get('/perdidos/:id/fotos/:fotoId', async (c) => {
  const objeto = await obterFotoPerdido(
    c.var.db,
    buckets(c),
    c.req.param('id'),
    c.req.param('fotoId'),
  )
  return new Response(objeto.corpo, {
    headers: {
      'Content-Type': objeto.tipo,
      'Content-Length': String(objeto.tamanho),
      'X-Content-Type-Options': 'nosniff',
      // Só no navegador de quem está logada; nunca na borda do Cloudflare
      'Cache-Control': 'private, max-age=3600',
    },
  })
})

/** Aprovar e publicar: copia as fotos para o bucket público e põe no ar por 30 dias. */
rotasPerdidosAdmin.post('/perdidos/:id/aprovar', async (c) => {
  await aprovarPerdido(c.var.db, buckets(c), c.req.param('id'), c.var.usuaria)
  await publicar(c)
  return c.body(null, 204)
})

/** Renovar por mais 30 dias a partir de hoje (RN41). */
rotasPerdidosAdmin.post('/perdidos/:id/renovar', async (c) => {
  const expiraEm = await renovarPerdido(c.var.db, c.req.param('id'), c.var.usuaria)
  await publicar(c)
  return c.json({ expira_em: expiraEm })
})

/** Recusar, tirar do ar ou "voltou para casa": apaga o anúncio e as fotos (RN26). */
rotasPerdidosAdmin.delete('/perdidos/:id', async (c) => {
  const status = await apagarPerdido(c.var.db, buckets(c), c.req.param('id'))
  if (status === 'publicado') await publicar(c)
  return c.body(null, 204)
})
