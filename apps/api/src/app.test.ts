import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { RespostaSaude } from '@sospatas/compartilhado'
import type { CorpoErro } from './erros'
import { criarAppTeste, envTeste } from './testes/apoio'

let teste: Awaited<ReturnType<typeof criarAppTeste>>

beforeAll(async () => {
  teste = await criarAppTeste()
})

afterAll(async () => {
  await teste.encerrar()
})

describe('GET /api/saude', () => {
  it('responde que a API está no ar, com o ambiente', async () => {
    const resposta = await teste.app.request('/api/saude', {}, envTeste())

    expect(resposta.status).toBe(200)
    const corpo = await resposta.json<RespostaSaude>()
    expect(corpo).toMatchObject({ status: 'ok', servico: 'sospatas-api', ambiente: 'teste' })
    expect(Date.parse(corpo.horario)).not.toBeNaN()
  })
})

describe('rotas inexistentes', () => {
  it('respondem 404 no formato padrão de erro', async () => {
    const resposta = await teste.app.request('/api/nao-existe', {}, envTeste())
    expect(resposta.status).toBe(404)
    expect(await resposta.json<CorpoErro>()).toEqual({
      erro: 'nao_encontrado',
      mensagem: 'Endereço não encontrado.',
    })
  })

  it('fora de /api também', async () => {
    const resposta = await teste.app.request('/saude', {}, envTeste())
    expect(resposta.status).toBe(404)
  })
})

describe('CORS', () => {
  const comOrigem = { headers: { Origin: 'https://sospatas.pages.dev' } }

  it('sem CORS_ORIGENS, não libera nenhuma origem', async () => {
    const resposta = await teste.app.request('/api/saude', comOrigem, envTeste())
    expect(resposta.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('libera só as origens configuradas', async () => {
    const env = envTeste({ CORS_ORIGENS: 'https://sospatas.pages.dev' })
    const liberada = await teste.app.request('/api/saude', comOrigem, env)
    expect(liberada.headers.get('Access-Control-Allow-Origin')).toBe('https://sospatas.pages.dev')

    const outra = await teste.app.request(
      '/api/saude',
      { headers: { Origin: 'https://site-estranho.com' } },
      env,
    )
    expect(outra.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})
