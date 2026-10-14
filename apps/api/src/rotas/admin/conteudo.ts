// Textos e listas das páginas na área da ONG (T15–T20; RN33–RN38; docs/ARQUITETURA.md,
// seção 3.2). Salvar publica na hora (RN37): toda escrita apaga a cópia guardada do GET /site.
import { Hono, type Context } from 'hono'
import {
  LISTAS,
  listaEntrada,
  schemaItem,
  schemaTexto,
  trocarOrdemEntrada,
  type ConteudoAdmin,
  type ItemAdmin,
  type TextoAdmin,
} from '@sospatas/compartilhado'
import { limparCache } from '../../cache'
import type { ConfigApp } from '../../dependencias'
import { erros } from '../../erros'
import {
  buscarConteudoAdmin,
  criarItem,
  editarItem,
  ehChaveTexto,
  excluirItem,
  listaDoItem,
  salvarTexto,
  trocarFotoItem,
  trocarOrdem,
} from '../../servicos/conteudo'
import type { ArquivosFoto } from '../../servicos/fotos-animal'
import { lerCorpoJson, lerJson, validar } from '../../validacao'
import { lerArquivosFoto } from './animais'

export const rotasConteudoAdmin = new Hono<ConfigApp>()

/** O conteúdo mudou: o "Ver no site" de quem salvou já mostra a versão nova (RN37). */
const publicar = (c: Context<ConfigApp>) => limparCache(c, ['/api/publico/site'])

const ehMultipart = (c: Context<ConfigApp>) =>
  (c.req.header('Content-Type') ?? '').toLowerCase().startsWith('multipart/form-data')

rotasConteudoAdmin.get('/conteudo', async (c) =>
  c.json<ConteudoAdmin>(await buscarConteudoAdmin(c.var.db, c.env)),
)

rotasConteudoAdmin.put('/conteudo/textos/:chave', async (c) => {
  const chave = c.req.param('chave')
  if (!ehChaveTexto(chave)) throw erros.naoEncontrado('Não encontramos este texto.')
  const { valor } = await lerJson(c, schemaTexto(chave))
  const texto = await salvarTexto(c.var.db, chave, valor, c.var.usuaria)
  await publicar(c)
  return c.json<TextoAdmin>(texto)
})

/**
 * Item novo no fim da lista. JSON { lista, titulo, texto }; na lista de fotos (RN38),
 * multipart com o campo "dados" (o mesmo JSON) e as fotos "miniatura" e "completa".
 */
rotasConteudoAdmin.post('/conteudo/itens', async (c) => {
  let json: unknown
  let arquivos: ArquivosFoto | null = null
  if (ehMultipart(c)) {
    let corpo: Record<string, unknown>
    try {
      corpo = await c.req.parseBody()
    } catch {
      throw erros.requisicaoInvalida('Não foi possível ler os dados enviados.')
    }
    try {
      json = typeof corpo.dados === 'string' ? JSON.parse(corpo.dados) : undefined
    } catch {
      json = undefined
    }
    if (json === undefined) {
      throw erros.requisicaoInvalida('Não foi possível ler os dados enviados.')
    }
    arquivos = await lerArquivosFoto(c, corpo)
  } else {
    json = await lerCorpoJson(c)
  }
  const { lista } = validar(listaEntrada, json)
  const dados = validar(schemaItem(lista), json)
  if (LISTAS[lista].foto && !arquivos) throw erros.validacao({ foto: 'Escolha a foto' })
  const item = await criarItem(c.var.db, c.env, c.var.fotos, lista, dados, arquivos, c.var.usuaria)
  await publicar(c)
  return c.json<ItemAdmin>(item, 201)
})

// Antes de /conteudo/itens/:id, para "trocar-ordem" não ser lido como id
rotasConteudoAdmin.post('/conteudo/itens/trocar-ordem', async (c) => {
  const { ids } = await lerJson(c, trocarOrdemEntrada)
  await trocarOrdem(c.var.db, ids, c.var.usuaria)
  await publicar(c)
  return c.body(null, 204)
})

rotasConteudoAdmin.put('/conteudo/itens/:id', async (c) => {
  const id = c.req.param('id')
  const lista = await listaDoItem(c.var.db, id)
  const dados = validar(schemaItem(lista), await lerCorpoJson(c))
  const item = await editarItem(c.var.db, c.env, id, dados, c.var.usuaria)
  await publicar(c)
  return c.json<ItemAdmin>(item)
})

/** RN36: 409 se for o último item de uma lista com mínimo. */
rotasConteudoAdmin.delete('/conteudo/itens/:id', async (c) => {
  await excluirItem(c.var.db, c.var.fotos, c.req.param('id'))
  await publicar(c)
  return c.body(null, 204)
})

/** RN38: troca a foto de um item da história (multipart "miniatura" + "completa"). */
rotasConteudoAdmin.post('/conteudo/itens/:id/foto', async (c) => {
  const arquivos = await lerArquivosFoto(c)
  const item = await trocarFotoItem(
    c.var.db,
    c.env,
    c.var.fotos,
    c.req.param('id'),
    arquivos,
    c.var.usuaria,
  )
  await publicar(c)
  return c.json<ItemAdmin>(item)
})
