import { Hono } from 'hono'
import type { RespostaSaude } from '@sospatas/compartilhado'

export type ConfigApp = { Bindings: Env }

// Todas as rotas ficam sob /api: em produção, o Worker atende sospatas.org.br/api/*.
export const app = new Hono<ConfigApp>().basePath('/api')

app.get('/saude', (c) =>
  c.json<RespostaSaude>({
    status: 'ok',
    servico: 'sospatas-api',
    ambiente: c.env.AMBIENTE,
    horario: new Date().toISOString(),
  }),
)
