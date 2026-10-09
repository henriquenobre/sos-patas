// Rotas da área da ONG (/api/admin/*). Todas passam pelo login (middleware/access.ts).
import { Hono } from 'hono'
import type { ConfigApp, Usuaria } from '../../dependencias'
import { rotasAnimaisAdmin } from './animais'
import { rotasPedidosAdmin } from './pedidos'
import { rotasProtetoresAdmin } from './protetores'

export const rotasAdmin = new Hono<ConfigApp>()

/** Quem está logada: "Olá, Gracia" no cabeçalho da área da ONG (RN43). */
rotasAdmin.get('/eu', (c) => c.json<Usuaria>(c.var.usuaria))

rotasAdmin.route('/', rotasAnimaisAdmin)
rotasAdmin.route('/', rotasProtetoresAdmin)
rotasAdmin.route('/', rotasPedidosAdmin)
