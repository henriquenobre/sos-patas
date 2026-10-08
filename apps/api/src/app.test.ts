import { describe, expect, it } from 'vitest'
import type { RespostaSaude } from '@sospatas/compartilhado'
import { app } from './app'

const env = { AMBIENTE: 'teste' } as Partial<Env> as Env

describe('GET /api/saude', () => {
  it('responde que a API está no ar, com o ambiente', async () => {
    const resposta = await app.request('/api/saude', {}, env)

    expect(resposta.status).toBe(200)
    const corpo = await resposta.json<RespostaSaude>()
    expect(corpo).toMatchObject({ status: 'ok', servico: 'sospatas-api', ambiente: 'teste' })
    expect(Date.parse(corpo.horario)).not.toBeNaN()
  })

  it('devolve 404 fora das rotas da API', async () => {
    const resposta = await app.request('/saude', {}, env)
    expect(resposta.status).toBe(404)
  })
})
