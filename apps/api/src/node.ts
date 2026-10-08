// Entrada em Node, para rodar a API numa VPS ou em Docker (docs/ARQUITETURA.md, seção 12).
// Os bindings do Cloudflare não existem aqui: o banco vem de DATABASE_URL, e as fotos ficam
// em memória até existir a implementação S3 da interface Armazenamento (só para testes).
import { serve } from '@hono/node-server'
import { criarApp } from './app'
import { ArmazenamentoMemoria } from './armazenamento/memoria'
import { criarDb } from './db'
import { chavesDoTime, verificarJwtAccess } from './middleware/access'

// Os tipos gerados pelo Wrangler dizem que as variáveis sempre existem; fora do Workers, podem faltar.
function lerVariavel(nome: string, padrao: string): string {
  return process.env[nome] ?? padrao
}

const env = {
  AMBIENTE: lerVariavel('AMBIENTE', 'node'),
  ACCESS_TEAM_DOMAIN: lerVariavel('ACCESS_TEAM_DOMAIN', 'https://sospatas.cloudflareaccess.com'),
  ACCESS_AUD: lerVariavel('ACCESS_AUD', ''),
  CORS_ORIGENS: lerVariavel('CORS_ORIGENS', ''),
  ACESSO_LOCAL_EMAIL: lerVariavel('ACESSO_LOCAL_EMAIL', ''),
} as Partial<Env> as Env

const urlBanco = lerVariavel('DATABASE_URL', 'postgres://sospatas:sospatas@localhost:5432/sospatas')
const fotos = new ArmazenamentoMemoria()
const quarentena = new ArmazenamentoMemoria()

const app = criarApp({
  conectarDb: () => criarDb(urlBanco),
  fotos: () => fotos,
  quarentena: () => quarentena,
  verificarTokenAccess: (envDaRequisicao, token) =>
    verificarJwtAccess(token, {
      chaves: chavesDoTime(envDaRequisicao.ACCESS_TEAM_DOMAIN),
      emissor: envDaRequisicao.ACCESS_TEAM_DOMAIN,
      aud: envDaRequisicao.ACCESS_AUD,
    }),
})

const porta = Number(lerVariavel('PORT', '8787'))
serve({ fetch: (requisicao) => app.fetch(requisicao, env), port: porta }, (info) => {
  console.log(`API em http://localhost:${String(info.port)}/api/saude`)
})
