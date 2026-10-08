// Entrada do Cloudflare Workers.
import { criarApp } from './app'
import { ArmazenamentoR2 } from './armazenamento/r2'
import { dbDoEnv } from './db'
import type { Dependencias } from './dependencias'
import { chavesDoTime, verificarJwtAccess } from './middleware/access'

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
}

export default criarApp(dependenciasWorkers)
