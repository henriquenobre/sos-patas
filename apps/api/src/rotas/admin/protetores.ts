// Protetores parceiros na área da ONG (T24, cadastro do animal; RN42).
import { Hono } from 'hono'
import { protetorEntrada, type ListaProtetores, type ProtetorAdmin } from '@sospatas/compartilhado'
import { limparCache } from '../../cache'
import type { ConfigApp } from '../../dependencias'
import {
  criarProtetor,
  editarProtetor,
  excluirProtetor,
  listarProtetores,
} from '../../servicos/protetores'
import { lerJson } from '../../validacao'

export const rotasProtetoresAdmin = new Hono<ConfigApp>()

rotasProtetoresAdmin.get('/protetores', async (c) =>
  c.json<ListaProtetores>({ protetores: await listarProtetores(c.var.db) }),
)

rotasProtetoresAdmin.post('/protetores', async (c) => {
  const dados = await lerJson(c, protetorEntrada)
  return c.json<ProtetorAdmin>(await criarProtetor(c.var.db, dados, c.var.usuaria), 201)
})

/** O nome e o WhatsApp aparecem na ficha dos animais dele: apaga a cópia guardada delas. */
rotasProtetoresAdmin.put('/protetores/:id', async (c) => {
  const dados = await lerJson(c, protetorEntrada)
  const animais = await editarProtetor(c.var.db, c.req.param('id'), dados, c.var.usuaria)
  await limparCache(
    c,
    animais.map((id) => `/api/publico/animais/${id}`),
  )
  return c.body(null, 204)
})

/** 409 se ainda houver animais dele (RN42). */
rotasProtetoresAdmin.delete('/protetores/:id', async (c) => {
  await excluirProtetor(c.var.db, c.req.param('id'))
  return c.body(null, 204)
})
