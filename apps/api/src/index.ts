// Entrada do Cloudflare Workers: requisições (fetch) e tarefa diária (scheduled, RN16).
import { criarApp } from './app'
import { ArmazenamentoR2 } from './armazenamento/r2'
import { dbDoEnv } from './db'
import { enviarEmailCloudflare } from './email/cloudflare'
import type { Dependencias } from './dependencias'
import { chavesDoTime, verificarJwtAccess } from './middleware/access'
import { verificarTurnstileCloudflare } from './servicos/seguranca'
import { executarTarefasDiarias } from './tarefas/limpeza'

const dependenciasWorkers: Dependencias = {
  conectarDb: dbDoEnv,
  fotos: (env) => new ArmazenamentoR2(env.FOTOS),
  quarentena: (env) => new ArmazenamentoR2(env.QUARENTENA),
  verificarTokenAccess: (env, token) =>
    verificarJwtAccess(token, {
      chaves: chavesDoTime(env.ACCESS_TEAM_DOMAIN),
      emissor: env.ACCESS_TEAM_DOMAIN,
      aud: env.ACCESS_AUD,
    }),
  verificarTurnstile: (env, token, ip) =>
    verificarTurnstileCloudflare(env.TURNSTILE_SECRET, token, ip),
  enviarEmail: enviarEmailCloudflare,
}

const app = criarApp(dependenciasWorkers)

export default {
  fetch: app.fetch,
  /** Cron Trigger diário, 03:00 de Brasília (wrangler.toml, [triggers]) */
  async scheduled(_evento, env, ctx) {
    const { db, encerrar } = dbDoEnv(env)
    ctx.waitUntil(
      executarTarefasDiarias(db)
        .then((resultado) => {
          console.log('Tarefa diária concluída', resultado)
        })
        .finally(encerrar),
    )
    return Promise.resolve()
  },
} satisfies ExportedHandler<Env>
