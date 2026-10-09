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
  /**
   * Endereço que identifica a cópia guardada. Padrão: o caminho sem a query string, para
   * que "?qualquer=coisa" não fure o cache. Rotas com filtros passam a URL normalizada.
   */
  chave?: string
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

/** GET público com cache: devolve a cópia guardada ou gera, guarda e devolve. */
export async function comCache(
  c: Context,
  gerar: () => Promise<Response>,
  opcoes: OpcoesCache = {},
): Promise<Response> {
  const {
    chave = urlSemQuery(c),
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
 * Depois de salvar algo na área da ONG: apaga as cópias guardadas das rotas públicas afetadas
 * (caminhos como '/api/publico/site'), para "salvar publica na hora" (RN37).
 *
 * Limite: a Cache API apaga só no datacenter que atendeu a requisição (o mesmo da voluntária,
 * então o "Ver no site" já mostra a mudança). Nos outros, a cópia vale até
 * SEGUNDOS_CACHE_PUBLICO. Com o domínio próprio (etapa 14), somar a limpeza global pela API
 * de purge do Cloudflare. Rotas com filtros (vitrine) também expiram sozinhas nesse prazo.
 */
export async function limparCache(c: Context, caminhos: string[]): Promise<void> {
  const cache = cachePadrao()
  if (!cache) return
  await Promise.all(caminhos.map((caminho) => cache.delete(new URL(caminho, c.req.url).toString())))
}
