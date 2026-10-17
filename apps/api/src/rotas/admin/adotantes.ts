// Cadastro de quem adotou na área da ONG (T30, T31; RN53). Só a equipe: nada aqui é público.
import { Hono } from 'hono'
import {
  adocaoAntigaEntrada,
  adotanteEntrada,
  filtroAdotantes,
  type AdotanteDetalhe,
  type Criado,
  type ListaAdotantes,
} from '@sospatas/compartilhado'
import type { ConfigApp } from '../../dependencias'
import {
  adicionarAdocaoAntiga,
  buscarAdotante,
  criarAdotante,
  editarAdotante,
  excluirAdocaoAntiga,
  excluirAdotante,
  listarAdotantes,
} from '../../servicos/adotantes'
import { lerJson, validar } from '../../validacao'

export const rotasAdotantesAdmin = new Hono<ConfigApp>()

rotasAdotantesAdmin.get('/adotantes', async (c) => {
  const { busca } = validar(filtroAdotantes, c.req.query())
  return c.json<ListaAdotantes>({ adotantes: await listarAdotantes(c.var.db, busca) })
})

/** Cadastro à mão: quem adotou antes do site. */
rotasAdotantesAdmin.post('/adotantes', async (c) => {
  const dados = await lerJson(c, adotanteEntrada)
  return c.json<Criado>({ id: await criarAdotante(c.var.db, dados, c.var.usuaria) }, 201)
})

rotasAdotantesAdmin.get('/adotantes/:id', async (c) =>
  c.json<AdotanteDetalhe>(await buscarAdotante(c.var.db, c.req.param('id'))),
)

rotasAdotantesAdmin.put('/adotantes/:id', async (c) => {
  const dados = await lerJson(c, adotanteEntrada)
  await editarAdotante(c.var.db, c.req.param('id'), dados, c.var.usuaria)
  return c.body(null, 204)
})

/** A pessoa pediu para apagar os dados (LGPD): sai com o histórico de adoções. */
rotasAdotantesAdmin.delete('/adotantes/:id', async (c) => {
  await excluirAdotante(c.var.db, c.req.param('id'))
  return c.body(null, 204)
})

rotasAdotantesAdmin.post('/adotantes/:id/adocoes', async (c) => {
  const dados = await lerJson(c, adocaoAntigaEntrada)
  await adicionarAdocaoAntiga(c.var.db, c.req.param('id'), dados, c.var.usuaria)
  return c.body(null, 201)
})

/** Só a adoção registrada à mão; as do site têm o caminho pelo animal. */
rotasAdotantesAdmin.delete('/adotantes/:id/adocoes/:adocaoId', async (c) => {
  await excluirAdocaoAntiga(c.var.db, c.req.param('id'), c.req.param('adocaoId'))
  return c.body(null, 204)
})
