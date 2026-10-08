// Cache das leituras públicas no próprio Cloudflare (Cache API), para poupar o Neon: numa
// rajada de visitas, o banco recebe uma consulta por rota a cada SEGUNDOS_CACHE_PUBLICO, e não
// uma por visitante (docs/ARQUITETURA.md, seção 11.2). Só funciona no domínio próprio; no
// *.workers.dev e nos testes (Node), a resposta é gerada sempre.
import type { Context } from 'hono'

/** Quanto tempo o Cloudflare guarda a resposta. Maior que os 5 min em que o Neon dorme. */
export const SEGUNDOS_CACHE_PUBLICO = 15 * 60
/** Quanto tempo o navegador do visitante guarda. */
export const SEGUNDOS_CACHE_NAVEGADOR = 60

function cachePadrao(): Cache | null {
  return 'caches' in globalThis ? caches.default : null
}

/** Executa em segundo plano depois da resposta (no Workers) ou espera (nos testes). */
async function emSegundoPlano(c: Context, tarefa: Promise<unknown>): Promise<void> {
  try {
    c.executionCtx.waitUntil(tarefa)
  } catch {
    await tarefa
  }
}

/** GET público com cache: devolve a cópia guardada ou gera, guarda e devolve. */
export async function comCache(c: Context, gerar: () => Promise<Response>): Promise<Response> {
  const cache = cachePadrao()
  const chave = new Request(c.req.url, { method: 'GET' })
  if (cache) {
    const guardada = await cache.match(chave)
    if (guardada) return guardada
  }

  const resposta = await gerar()
  if (resposta.status === 200) {
    resposta.headers.set(
      'Cache-Control',
      `public, max-age=${String(SEGUNDOS_CACHE_NAVEGADOR)}, s-maxage=${String(SEGUNDOS_CACHE_PUBLICO)}`,
    )
    if (cache) await emSegundoPlano(c, cache.put(chave, resposta.clone()))
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
 * de purge do Cloudflare.
 */
export async function limparCache(c: Context, caminhos: string[]): Promise<void> {
  const cache = cachePadrao()
  if (!cache) return
  await Promise.all(caminhos.map((caminho) => cache.delete(new URL(caminho, c.req.url).toString())))
}

export { emSegundoPlano }
