// Entrada em Node, para rodar a API numa VPS ou em Docker (docs/ARQUITETURA.md, seção 12).
// Os bindings do Cloudflare (Hyperdrive e R2) não existem aqui. Quando a API passar a
// usar banco e arquivos, este arquivo monta as implementações equivalentes
// (conexão Postgres direta e a interface Armazenamento com S3).
import { serve } from '@hono/node-server'
import { app } from './app'

// Os tipos gerados pelo Wrangler dizem que AMBIENTE sempre existe; fora do Workers, pode faltar.
function lerVariavel(nome: string, padrao: string): string {
  return process.env[nome] ?? padrao
}

const porta = Number(lerVariavel('PORT', '8787'))
const env = { AMBIENTE: lerVariavel('AMBIENTE', 'node') } as Partial<Env> as Env

serve({ fetch: (requisicao) => app.fetch(requisicao, env), port: porta }, (info) => {
  console.log(`API em http://localhost:${info.port}/api/saude`)
})
