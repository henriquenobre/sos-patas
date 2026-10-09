// Abre a conexão com o banco e os armazenamentos para a requisição, e fecha o banco no fim.
import { createMiddleware } from 'hono/factory'
import { emSegundoPlano } from '../cache'
import type { ConfigApp, Dependencias } from '../dependencias'

export const conexoes = (dependencias: Dependencias) =>
  createMiddleware<ConfigApp>(async (c, next) => {
    const { db, encerrar } = dependencias.conectarDb(c.env)
    c.set('db', db)
    c.set('fotos', dependencias.fotos(c.env))
    c.set('quarentena', dependencias.quarentena(c.env))
    c.set('verificarTurnstile', (token, ip) => dependencias.verificarTurnstile(c.env, token, ip))
    c.set('enviarEmail', (mensagem) => dependencias.enviarEmail(c.env, mensagem))
    try {
      await next()
    } finally {
      await emSegundoPlano(c, encerrar())
    }
  })
