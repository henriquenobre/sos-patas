import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import type { RespostaSaude } from '@sospatas/compartilhado'
import type { ConfigApp, Dependencias } from './dependencias'
import { rotaNaoEncontrada, tratarErro } from './erros'
import { exigirEquipe } from './middleware/access'
import { conexoes } from './middleware/conexoes'
import { rotasAdmin } from './rotas/admin'
import { rotasPublicas } from './rotas/publico'

/** CORS só para as origens listadas em CORS_ORIGENS (antes do domínio próprio). */
const corsConfiguravel = createMiddleware<ConfigApp>(async (c, next) => {
  const origens = c.env.CORS_ORIGENS.split(',')
    .map((origem) => origem.trim())
    .filter(Boolean)
  if (origens.length === 0) {
    await next()
    return
  }
  return cors({
    origin: origens,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  })(c, next)
})

export function criarApp(dependencias: Dependencias) {
  // Todas as rotas ficam sob /api: em produção, o Worker atende sospatas.org.br/api/*.
  const app = new Hono<ConfigApp>().basePath('/api')

  app.onError(tratarErro)
  app.notFound(rotaNaoEncontrada)
  app.use('*', corsConfiguravel)

  app.get('/saude', (c) =>
    c.json<RespostaSaude>({
      status: 'ok',
      servico: 'sospatas-api',
      ambiente: c.env.AMBIENTE,
      horario: new Date().toISOString(),
    }),
  )

  app.use('/publico/*', conexoes(dependencias))
  app.route('/publico', rotasPublicas)

  app.use('/admin/*', conexoes(dependencias), exigirEquipe(dependencias))
  app.route('/admin', rotasAdmin)

  return app
}

export type App = ReturnType<typeof criarApp>
