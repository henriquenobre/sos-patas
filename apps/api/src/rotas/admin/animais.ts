// Animais, adoção e fotos na área da ONG (T09–T11; docs/ARQUITETURA.md, seção 3.2).
// Toda escrita que muda o que o site mostra apaga a cópia guardada das rotas públicas.
import { Hono, type Context } from 'hono'
import {
  adocaoEntrada,
  animalEntrada,
  filtroAnimaisAdmin,
  ordemFotosEntrada,
  type AnimalAdmin,
  type Criado,
  type FotoAdmin,
  type ListaAnimaisAdmin,
  type ResumoAdmin,
} from '@sospatas/compartilhado'
import { limparCache } from '../../cache'
import type { ConfigApp } from '../../dependencias'
import { erros } from '../../erros'
import {
  buscarAnimalAdmin,
  buscarResumo,
  criarAnimal,
  devolver,
  editarAnimal,
  excluirAnimal,
  listarAnimaisAdmin,
  marcarAdotado,
} from '../../servicos/animais'
import {
  adicionarFoto,
  removerFoto,
  reordenarFotos,
  trocarFoto,
  type ArquivosFoto,
} from '../../servicos/fotos-animal'
import { caminhosPublicosDoAnimal } from '../../servicos/pedidos'
import { lerJson, validar } from '../../validacao'

export const rotasAnimaisAdmin = new Hono<ConfigApp>()

/** O animal mudou no site: apaga a cópia guardada da vitrine, dos destaques e da ficha. */
const publicar = (c: Context<ConfigApp>, animalId: string) =>
  limparCache(c, caminhosPublicosDoAnimal(animalId))

/** Lê a miniatura e a completa do formulário multipart (RN02). */
async function lerArquivosFoto(c: Context<ConfigApp>): Promise<ArquivosFoto> {
  let corpo: Record<string, unknown>
  try {
    corpo = await c.req.parseBody()
  } catch {
    throw erros.requisicaoInvalida('Não foi possível ler a foto enviada.')
  }
  const { miniatura, completa } = corpo
  if (!(miniatura instanceof File) || !(completa instanceof File)) {
    throw erros.requisicaoInvalida('Envie a miniatura e a foto completa.')
  }
  return {
    miniatura: new Uint8Array(await miniatura.arrayBuffer()),
    completa: new Uint8Array(await completa.arrayBuffer()),
  }
}

rotasAnimaisAdmin.get('/resumo', async (c) => c.json<ResumoAdmin>(await buscarResumo(c.var.db)))

rotasAnimaisAdmin.get('/animais', async (c) => {
  const filtro = validar(filtroAnimaisAdmin, c.req.query())
  return c.json<ListaAnimaisAdmin>({
    animais: await listarAnimaisAdmin(c.var.db, c.env, filtro),
  })
})

rotasAnimaisAdmin.post('/animais', async (c) => {
  const dados = await lerJson(c, animalEntrada)
  const id = await criarAnimal(c.var.db, dados, c.var.usuaria)
  await publicar(c, id)
  return c.json<Criado>({ id }, 201)
})

rotasAnimaisAdmin.get('/animais/:id', async (c) =>
  c.json<AnimalAdmin>(await buscarAnimalAdmin(c.var.db, c.env, c.req.param('id'))),
)

rotasAnimaisAdmin.put('/animais/:id', async (c) => {
  const id = c.req.param('id')
  const dados = await lerJson(c, animalEntrada)
  await editarAnimal(c.var.db, id, dados, c.var.usuaria)
  await publicar(c, id)
  return c.body(null, 204)
})

/** RN05, RN09: apaga as fotos e depois o cadastro. */
rotasAnimaisAdmin.delete('/animais/:id', async (c) => {
  const id = c.req.param('id')
  await excluirAnimal(c.var.db, c.var.fotos, id)
  await publicar(c, id)
  return c.body(null, 204)
})

/** "Marcar como adotado" (RN07, RN08, RN30). */
rotasAnimaisAdmin.post('/animais/:id/adocao', async (c) => {
  const id = c.req.param('id')
  const adotante = await lerJson(c, adocaoEntrada)
  await marcarAdotado(c.var.db, c.var.fotos, id, adotante, c.var.usuaria)
  await publicar(c, id)
  return c.body(null, 204)
})

/** "Voltar para disponível" (RN30, RN49). */
rotasAnimaisAdmin.post('/animais/:id/devolucao', async (c) => {
  const id = c.req.param('id')
  await devolver(c.var.db, id, c.var.usuaria)
  await publicar(c, id)
  return c.body(null, 204)
})

// ---------------------------------------------------------------------------
// Fotos (RN01–RN06). A rota da ordem vem antes de /fotos/:fotoId.
// ---------------------------------------------------------------------------
rotasAnimaisAdmin.put('/animais/:id/fotos/ordem', async (c) => {
  const id = c.req.param('id')
  const { fotos } = await lerJson(c, ordemFotosEntrada)
  await reordenarFotos(c.var.db, id, fotos, c.var.usuaria)
  await publicar(c, id)
  return c.body(null, 204)
})

rotasAnimaisAdmin.post('/animais/:id/fotos', async (c) => {
  const id = c.req.param('id')
  const arquivos = await lerArquivosFoto(c)
  const foto = await adicionarFoto(c.var.db, c.env, c.var.fotos, id, arquivos, c.var.usuaria)
  await publicar(c, id)
  return c.json<FotoAdmin>(foto, 201)
})

rotasAnimaisAdmin.put('/animais/:id/fotos/:fotoId', async (c) => {
  const id = c.req.param('id')
  const arquivos = await lerArquivosFoto(c)
  const foto = await trocarFoto(
    c.var.db,
    c.env,
    c.var.fotos,
    id,
    c.req.param('fotoId'),
    arquivos,
    c.var.usuaria,
  )
  await publicar(c, id)
  return c.json<FotoAdmin>(foto)
})

rotasAnimaisAdmin.delete('/animais/:id/fotos/:fotoId', async (c) => {
  const id = c.req.param('id')
  await removerFoto(c.var.db, c.var.fotos, id, c.req.param('fotoId'), c.var.usuaria)
  await publicar(c, id)
  return c.body(null, 204)
})
