// Rotas públicas (/api/publico/*), sem login. Leituras com cache (cache.ts); envios do
// formulário de adoção (pedidos.ts), do "Fale com a ONG" (contato.ts) e do anúncio de perdido
// ou encontrado (perdidos.ts).
import { Hono } from 'hono'
import {
  filtroPerdidos,
  filtroVitrine,
  type AnimalFicha,
  type ListaAnimais,
  type ListaPerdidos,
  type SitePublico,
} from '@sospatas/compartilhado'
import { SEGUNDOS_CACHE_FOTO, comCache, comCacheFiltrado } from '../../cache'
import type { ConfigApp } from '../../dependencias'
import { erros } from '../../erros'
import { ehCaminhoFotoPublica } from '../../servicos/fotos'
import {
  buscarDestaques,
  buscarFicha,
  buscarPerdidos,
  buscarSite,
  buscarVitrine,
  filtrarVitrine,
} from '../../servicos/publico'
import { validar } from '../../validacao'
import { rotasContato } from './contato'
import { rotasPedidosPublicos } from './pedidos'
import { rotasPerdidosPublicos } from './perdidos'

export const rotasPublicas = new Hono<ConfigApp>()

/** Algum chip de filtro ligado? Sem nenhum, a resposta é a própria lista guardada. */
const temFiltro = (filtro: Record<string, string | undefined>) =>
  Object.values(filtro).some(Boolean)

rotasPublicas.get('/site', (c) =>
  comCache(c, async () => c.json<SitePublico>(await buscarSite(c.var.db, c.env))),
)

rotasPublicas.get('/animais', (c) => {
  const filtro = validar(filtroVitrine, c.req.query())
  return comCacheFiltrado<ListaAnimais>(
    c,
    async () => c.json<ListaAnimais>({ animais: await buscarVitrine(c.var.db, c.env) }),
    temFiltro(filtro) ? ({ animais }) => ({ animais: filtrarVitrine(animais, filtro) }) : null,
  )
})

// Antes de /animais/:id, para "destaques" não ser lido como id
rotasPublicas.get('/animais/destaques', (c) =>
  comCache(c, async () =>
    c.json<ListaAnimais>({ animais: await buscarDestaques(c.var.db, c.env) }),
  ),
)

rotasPublicas.get('/animais/:id', (c) =>
  comCache(c, async () =>
    c.json<AnimalFicha>(await buscarFicha(c.var.db, c.env, c.req.param('id'))),
  ),
)

rotasPublicas.get('/perdidos', (c) => {
  const filtro = validar(filtroPerdidos, c.req.query())
  return comCacheFiltrado<ListaPerdidos>(
    c,
    async () => c.json<ListaPerdidos>({ perdidos: await buscarPerdidos(c.var.db, c.env) }),
    filtro.tipo
      ? ({ perdidos }) => ({ perdidos: perdidos.filter((anuncio) => anuncio.tipo === filtro.tipo) })
      : null,
  )
})

/**
 * Fotos do bucket público, quando não há domínio de fotos (FOTOS_URL_BASE vazio): computador
 * e prévia. Nunca lê a quarentena (RN19). Cache longo: o arquivo nunca muda (RN06).
 */
rotasPublicas.get('/fotos/*', (c) => {
  const caminho = decodeURIComponent(c.req.path.replace(/^\/api\/publico\/fotos\//, ''))
  if (!ehCaminhoFotoPublica(caminho)) throw erros.naoEncontrado('Foto não encontrada.')

  return comCache(
    c,
    async () => {
      const objeto = await c.var.fotos.obter(caminho)
      if (!objeto) throw erros.naoEncontrado('Foto não encontrada.')
      return new Response(objeto.corpo, {
        headers: {
          'Content-Type': objeto.tipo,
          'Content-Length': String(objeto.tamanho),
          'X-Content-Type-Options': 'nosniff',
        },
      })
    },
    {
      segundosNavegador: SEGUNDOS_CACHE_FOTO,
      segundosCloudflare: SEGUNDOS_CACHE_FOTO,
      imutavel: true,
    },
  )
})

// Formulário de adoção (POST /animais/:id/pedidos)
rotasPublicas.route('/', rotasPedidosPublicos)
rotasPublicas.route('/', rotasContato)
// Anúncio de perdido ou encontrado (POST /perdidos)
rotasPublicas.route('/', rotasPerdidosPublicos)
