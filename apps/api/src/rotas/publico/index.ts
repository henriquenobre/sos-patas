// Rotas públicas (/api/publico/*), sem login. Leituras com cache (cache.ts); o envio de
// anúncio de perdido (POST /perdidos) entra na etapa 11.
import { Hono } from 'hono'
import {
  filtroPerdidos,
  filtroVitrine,
  type AnimalFicha,
  type ListaAnimais,
  type ListaPerdidos,
  type SitePublico,
} from '@sospatas/compartilhado'
import { SEGUNDOS_CACHE_FOTO, comCache, urlSemQuery } from '../../cache'
import type { ConfigApp } from '../../dependencias'
import { erros } from '../../erros'
import { ehCaminhoFotoPublica } from '../../servicos/fotos'
import {
  buscarDestaques,
  buscarFicha,
  buscarPerdidos,
  buscarSite,
  buscarVitrine,
} from '../../servicos/publico'
import { validar } from '../../validacao'

export const rotasPublicas = new Hono<ConfigApp>()

/** Endereço com os filtros válidos em ordem fixa: a mesma busca usa a mesma cópia do cache. */
function chaveComFiltros(base: string, filtros: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  for (const nome of Object.keys(filtros).sort()) {
    const valor = filtros[nome]
    if (valor) params.set(nome, valor)
  }
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

rotasPublicas.get('/site', (c) =>
  comCache(c, async () => c.json<SitePublico>(await buscarSite(c.var.db, c.env))),
)

rotasPublicas.get('/animais', (c) => {
  const filtro = validar(filtroVitrine, c.req.query())
  return comCache(
    c,
    async () => c.json<ListaAnimais>({ animais: await buscarVitrine(c.var.db, c.env, filtro) }),
    { chave: chaveComFiltros(urlSemQuery(c), filtro) },
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
  return comCache(
    c,
    async () => c.json<ListaPerdidos>({ perdidos: await buscarPerdidos(c.var.db, c.env, filtro) }),
    { chave: chaveComFiltros(urlSemQuery(c), filtro) },
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
