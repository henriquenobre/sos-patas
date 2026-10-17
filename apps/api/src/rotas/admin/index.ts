// Rotas da área da ONG (/api/admin/*). Todas passam pelo login (middleware/access.ts).
import { Hono } from 'hono'
import type { UsuariaLogada } from '@sospatas/compartilhado'
import type { ConfigApp } from '../../dependencias'
import { emailSemLogin } from '../../middleware/access'
import { rotasAdotantesAdmin } from './adotantes'
import { rotasAnimaisAdmin } from './animais'
import { rotasConteudoAdmin } from './conteudo'
import { rotasOngAdmin } from './ong'
import { rotasPedidosAdmin } from './pedidos'
import { rotasPerdidosAdmin } from './perdidos'
import { rotasProtetoresAdmin } from './protetores'

export const rotasAdmin = new Hono<ConfigApp>()

/**
 * Quem está logada: "Olá, Gracia" no cabeçalho da área da ONG (RN43). `sem_login` avisa o
 * front que é o computador ou a prévia, abertos sem o Access (middleware/access.ts).
 */
rotasAdmin.get('/eu', (c) =>
  c.json<UsuariaLogada>({ ...c.var.usuaria, sem_login: emailSemLogin(c.env) !== undefined }),
)

rotasAdmin.route('/', rotasAnimaisAdmin)
rotasAdmin.route('/', rotasProtetoresAdmin)
rotasAdmin.route('/', rotasPedidosAdmin)
rotasAdmin.route('/', rotasPerdidosAdmin)
rotasAdmin.route('/', rotasConteudoAdmin)
rotasAdmin.route('/', rotasOngAdmin)
rotasAdmin.route('/', rotasAdotantesAdmin)
