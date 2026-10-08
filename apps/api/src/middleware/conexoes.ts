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
    try {
      await next()
    } finally {
      await emSegundoPlano(c, encerrar())
    }
  })
