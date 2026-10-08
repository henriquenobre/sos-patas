// Rotas públicas (/api/publico/*): leituras do site e o envio de anúncio de perdido.
// As rotas entram na etapa 5 (leituras, com cache.ts) e na etapa 11 (envio de anúncio).
import { Hono } from 'hono'
import type { ConfigApp } from '../../dependencias'

export const rotasPublicas = new Hono<ConfigApp>()
