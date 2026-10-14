// Perdidos e encontrados na área da ONG: moderação (T14; RN18, RN19, RN25, RN26, RN41) e
// anúncio criado ou corrigido pela equipe (T21; RN39, RN40). Passam pelo login
// (middleware/access.ts).
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import {
  PERDIDO_STATUS,
  perdidoEdicaoEntrada,
  perdidoEquipeEntrada,
  type Criado,
  type ListaPerdidosAdmin,
  type PerdidoAdmin,
  type PerdidoStatus,
} from '@sospatas/compartilhado'
import { limparCache } from '../../cache'
import type { ConfigApp } from '../../dependencias'
import { erros } from '../../erros'
import {
  CAMINHO_PUBLICO_PERDIDOS,
  adicionarFotoPerdido,
  apagarPerdido,
  aprovarPerdido,
  buscarPerdidoAdmin,
  conferirFotosPerdido,
  criarPerdidoEquipe,
  editarPerdido,
  listarPerdidosAdmin,
  obterFotoPerdido,
  removerFotoPerdido,
  renovarPerdido,
} from '../../servicos/perdidos'
import { lerJson, validar } from '../../validacao'
import { lerDadosEFotos } from '../multipart'

const filtroStatus = z.object({
  status: z.enum(PERDIDO_STATUS, { error: 'Situação inválida' }).default('pendente'),
})

const buckets = (c: Context<ConfigApp>) => ({ fotos: c.var.fotos, quarentena: c.var.quarentena })

/** O que aparece em /perdidos mudou: apaga a cópia guardada da lista pública. */
const publicar = (c: Context<ConfigApp>) => limparCache(c, [CAMINHO_PUBLICO_PERDIDOS])

/** Só anúncio no ar muda o site; pendente não aparece (RN18). */
const publicarSeNoAr = async (c: Context<ConfigApp>, status: PerdidoStatus) => {
  if (status === 'publicado') await publicar(c)
}

export const rotasPerdidosAdmin = new Hono<ConfigApp>()

rotasPerdidosAdmin.get('/perdidos', async (c) => {
  const { status } = validar(filtroStatus, c.req.query())
  return c.json<ListaPerdidosAdmin>({
    perdidos: await listarPerdidosAdmin(c.var.db, c.env, status),
  })
})

/**
 * Anúncio criado pela equipe (T21, RN39): multipart como o do site ("dados" + até 2 "fotos"),
 * com a autorização da pessoa no lugar do Turnstile. Já entra no ar.
 */
rotasPerdidosAdmin.post('/perdidos', async (c) => {
  const { json, arquivos } = await lerDadosEFotos(c)
  const dados = validar(perdidoEquipeEntrada, json)
  conferirFotosPerdido(arquivos)
  const id = await criarPerdidoEquipe(c.var.db, c.var.fotos, dados, arquivos, c.var.usuaria)
  await publicar(c)
  return c.json<Criado>({ id }, 201)
})

rotasPerdidosAdmin.get('/perdidos/:id', async (c) =>
  c.json<PerdidoAdmin>(await buscarPerdidoAdmin(c.var.db, c.env, c.req.param('id'))),
)

/** Corrigir os campos (RN40). Quem anunciou não é avisado. */
rotasPerdidosAdmin.put('/perdidos/:id', async (c) => {
  const dados = await lerJson(c, perdidoEdicaoEntrada)
  const status = await editarPerdido(c.var.db, c.req.param('id'), dados, c.var.usuaria)
  await publicarSeNoAr(c, status)
  return c.body(null, 204)
})

/** Nova foto (multipart "foto"), no bucket do status atual (RN40). */
rotasPerdidosAdmin.post('/perdidos/:id/fotos', async (c) => {
  let corpo: Record<string, unknown>
  try {
    corpo = await c.req.parseBody()
  } catch {
    throw erros.requisicaoInvalida('Não foi possível ler a foto enviada.')
  }
  if (!(corpo.foto instanceof File)) throw erros.requisicaoInvalida('Envie a foto.')
  const arquivo = new Uint8Array(await corpo.foto.arrayBuffer())
  const status = await adicionarFotoPerdido(
    c.var.db,
    buckets(c),
    c.req.param('id'),
    arquivo,
    c.var.usuaria,
  )
  await publicarSeNoAr(c, status)
  return c.body(null, 201)
})

rotasPerdidosAdmin.delete('/perdidos/:id/fotos/:fotoId', async (c) => {
  const status = await removerFotoPerdido(
    c.var.db,
    buckets(c),
    c.req.param('id'),
    c.req.param('fotoId'),
    c.var.usuaria,
  )
  await publicarSeNoAr(c, status)
  return c.body(null, 204)
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
  await publicarSeNoAr(c, status)
  return c.body(null, 204)
})
