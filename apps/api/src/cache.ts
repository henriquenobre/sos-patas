// Cache das leituras públicas no próprio Cloudflare (Cache API), para poupar o Neon: numa
// rajada de visitas, o banco recebe uma consulta por rota a cada SEGUNDOS_CACHE_PUBLICO, e não
// uma por visitante (docs/ARQUITETURA.md, seção 11.2). Só funciona no domínio próprio; no
// *.workers.dev e nos testes (Node), a resposta é gerada sempre.
import type { Context } from 'hono'

/** Quanto tempo o Cloudflare guarda a resposta. Maior que os 5 min em que o Neon dorme. */
export const SEGUNDOS_CACHE_PUBLICO = 15 * 60
/** Quanto tempo o navegador do visitante guarda. */
export const SEGUNDOS_CACHE_NAVEGADOR = 60
/** Fotos nunca mudam de conteúdo (trocar a foto cria outro arquivo, RN06): 1 ano. */
export const SEGUNDOS_CACHE_FOTO = 365 * 24 * 60 * 60

type OpcoesCache = {
  segundosNavegador?: number
  segundosCloudflare?: number
  imutavel?: boolean
}

function ehAmbienteLocal(c: Context): boolean {
  const env: unknown = c.env
  return typeof env === 'object' && env !== null && Reflect.get(env, 'AMBIENTE') === 'local'
}

function cachePadrao(): Cache | null {
  return 'caches' in globalThis ? caches.default : null
}

/** Executa em segundo plano depois da resposta (no Workers) ou espera (nos testes). */
export async function emSegundoPlano(c: Context, tarefa: Promise<unknown>): Promise<void> {
  try {
    c.executionCtx.waitUntil(tarefa)
  } catch {
    await tarefa
  }
}

/** Endereço da requisição sem a query string. */
export function urlSemQuery(c: Context): string {
  const url = new URL(c.req.url)
  return `${url.origin}${url.pathname}`
}

/**
 * GET público com cache: devolve a cópia guardada ou gera, guarda e devolve. A cópia é
 * identificada pelo caminho sem a query string, para que "?qualquer=coisa" não fure o cache.
 */
export async function comCache(
  c: Context,
  gerar: () => Promise<Response>,
  opcoes: OpcoesCache = {},
): Promise<Response> {
  const chave = urlSemQuery(c)
  const {
    segundosNavegador = SEGUNDOS_CACHE_NAVEGADOR,
    segundosCloudflare = SEGUNDOS_CACHE_PUBLICO,
    imutavel = false,
  } = opcoes
  // No computador (AMBIENTE=local), sem cache: o que muda no banco aparece na hora
  if (ehAmbienteLocal(c)) {
    const resposta = await gerar()
    resposta.headers.set('Cache-Control', 'no-store')
    return resposta
  }

  const cache = cachePadrao()
  const requisicaoChave = new Request(chave, { method: 'GET' })
  if (cache) {
    const guardada = await cache.match(requisicaoChave)
    if (guardada) return guardada
  }

  const resposta = await gerar()
  if (resposta.status === 200) {
    resposta.headers.set(
      'Cache-Control',
      `public, max-age=${String(segundosNavegador)}, s-maxage=${String(segundosCloudflare)}` +
        (imutavel ? ', immutable' : ''),
    )
    if (cache) await emSegundoPlano(c, cache.put(requisicaoChave, resposta.clone()))
  }
  return resposta
}

/**
 * Lista pública com filtros (vitrine, perdidos): o cache guarda só a lista inteira, que é a
 * cópia que limparCache apaga ao salvar, e o filtro é aplicado sobre ela, sem ir ao banco.
 * Uma cópia por combinação de filtros ficaria desatualizada até vencer, porque limparCache
 * não conhece todas as combinações. `filtrar` null = sem filtro, a lista inteira.
 */
export async function comCacheFiltrado<T>(
  c: Context,
  gerar: () => Promise<Response>,
  filtrar: ((dados: T) => T) | null,
): Promise<Response> {
  const completa = await comCache(c, gerar)
  if (!filtrar || completa.status !== 200) return completa
  const filtrados = filtrar(await completa.json<T>())
  return c.json(filtrados, 200, {
    'Cache-Control': completa.headers.get('Cache-Control') ?? 'no-store',
  })
}

/**
 * Depois de salvar algo na área da ONG: apaga as cópias guardadas das rotas públicas afetadas
 * (caminhos como '/api/publico/site'), para "salvar publica na hora" (RN37).
 *
 * Limite: a Cache API apaga só no datacenter que atendeu a requisição (o mesmo da voluntária,
 * então o "Ver no site" já mostra a mudança). Nos outros, a cópia vale até
 * SEGUNDOS_CACHE_PUBLICO. Com o domínio próprio (etapa 14), somar a limpeza global pela API
 * de purge do Cloudflare. As buscas com filtros saem da lista inteira (comCacheFiltrado), então
 * apagar o caminho da lista também atualiza todas elas.
 */
export async function limparCache(c: Context, caminhos: string[]): Promise<void> {
  const cache = cachePadrao()
  if (!cache) return
  await Promise.all(caminhos.map((caminho) => cache.delete(new URL(caminho, c.req.url).toString())))
}
