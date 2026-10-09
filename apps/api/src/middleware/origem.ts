// Proteção contra CSRF nas rotas da área da ONG. O login do Cloudflare Access é um cookie, que
// o navegador manda junto até quando outro site dispara o envio (um formulário escondido, por
// exemplo). O CORS não impede isso: só impede o outro site de ler a resposta. Por isso, toda
// escrita (POST, PUT, DELETE) precisa vir de uma página do próprio site.
import { createMiddleware } from 'hono/factory'
import type { ConfigApp } from '../dependencias'
import { ErroApi } from '../erros'

const METODOS_DE_LEITURA = new Set(['GET', 'HEAD', 'OPTIONS'])

const origemRecusada = () =>
  new ErroApi(
    403,
    'origem_nao_permitida',
    'Esta ação só pode ser feita pelas páginas da área da ONG.',
  )

/**
 * A origem da página que fez a requisição é permitida quando:
 * - é o mesmo endereço que o navegador chamou (cabeçalho Host): produção, no mesmo domínio, e o
 *   computador, onde o Vite repassa /api sem trocar o Host (inclusive pelo IP, no celular);
 * - está em CORS_ORIGENS: prévia, com o site no pages.dev e a API no workers.dev.
 */
function origemPermitida(origem: string, host: string | undefined, env: Env): boolean {
  let url: URL
  try {
    url = new URL(origem)
  } catch {
    return false // inclui Origin "null" (página sem origem, como um arquivo ou iframe isolado)
  }
  if (host && url.host === host) return true
  return env.CORS_ORIGENS.split(',')
    .map((permitida) => permitida.trim())
    .includes(url.origin)
}

/**
 * Navegadores sempre mandam Origin em POST, PUT e DELETE (e os atuais também Sec-Fetch-Site).
 * Sem nenhum dos dois, quem chama não é um navegador (curl, testes) e, portanto, não carrega o
 * cookie de login de outra pessoa: não há CSRF possível.
 */
export const exigirMesmaOrigem = createMiddleware<ConfigApp>(async (c, next) => {
  if (METODOS_DE_LEITURA.has(c.req.method)) {
    await next()
    return
  }
  const origem = c.req.header('Origin')
  const site = c.req.header('Sec-Fetch-Site')
  if (origem !== undefined) {
    if (!origemPermitida(origem, c.req.header('Host'), c.env)) throw origemRecusada()
  } else if (site !== undefined && site !== 'same-origin' && site !== 'none') {
    throw origemRecusada()
  }
  await next()
})
