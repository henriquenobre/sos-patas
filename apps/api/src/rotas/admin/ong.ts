// Dados da ONG na área da ONG (T23; RN43, RN51). Salvar publica na hora (RN37): apaga a cópia
// guardada das páginas (rodapé, PIX, contatos) e das fichas dos animais da ONG (WhatsApp).
import { Hono } from 'hono'
import { ongEntrada, type OngAdmin } from '@sospatas/compartilhado'
import { limparCache } from '../../cache'
import type { ConfigApp } from '../../dependencias'
import { buscarOngAdmin, salvarOng } from '../../servicos/ong'
import { lerJson } from '../../validacao'

export const rotasOngAdmin = new Hono<ConfigApp>()

rotasOngAdmin.get('/ong', async (c) => c.json<OngAdmin>(await buscarOngAdmin(c.var.db)))

rotasOngAdmin.put('/ong', async (c) => {
  const dados = await lerJson(c, ongEntrada)
  const { ong, animaisDaOng } = await salvarOng(c.var.db, dados, c.var.usuaria)
  await limparCache(c, [
    '/api/publico/site',
    ...animaisDaOng.map((id) => `/api/publico/animais/${id}`),
  ])
  return c.json<OngAdmin>(ong)
})
