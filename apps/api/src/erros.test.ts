// Formato padrão de erro e validação de entrada, testados num app mínimo.
import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import { protetorEntrada } from '@sospatas/compartilhado'
import { codigoPostgres, erros, tratarErro, type CorpoErro } from './erros'
import { lerJson } from './validacao'

const app = new Hono()
app.onError(tratarErro)
app.post('/protetores', async (c) => c.json(await lerJson(c, protetorEntrada), 201))
app.get('/conflito', () => {
  throw erros.conflito('Ana Paula tem 2 animais. Troque o responsável deles antes de excluir.')
})
app.get('/quebrou', () => {
  throw new Error('detalhe interno que não pode vazar')
})

const postar = (corpo: string) =>
  app.request('/protetores', {
    method: 'POST',
    body: corpo,
    headers: { 'Content-Type': 'application/json' },
  })

describe('validação da entrada', () => {
  it('dados válidos passam já normalizados', async () => {
    const resposta = await postar(
      JSON.stringify({ nome: ' Ana Paula ', whatsapp: '(35) 9 9999-0000' }),
    )
    expect(resposta.status).toBe(201)
    expect(await resposta.json()).toEqual({ nome: 'Ana Paula', whatsapp: '35999990000' })
  })

  it('dados inválidos: 400 com a mensagem de cada campo', async () => {
    const resposta = await postar(JSON.stringify({ nome: '', whatsapp: '123' }))
    expect(resposta.status).toBe(400)
    expect(await resposta.json<CorpoErro>()).toEqual({
      erro: 'validacao',
      mensagem: 'Confira os campos destacados.',
      campos: {
        nome: 'Preencha este campo',
        whatsapp: 'Informe o WhatsApp com DDD (10 ou 11 números)',
      },
    })
  })

  it('corpo que não é JSON: 400', async () => {
    const resposta = await postar('isto não é json')
    expect(resposta.status).toBe(400)
    expect(await resposta.json<CorpoErro>()).toMatchObject({ erro: 'requisicao_invalida' })
  })
})

describe('erros da API', () => {
  it('erro conhecido sai com status e mensagem para a tela', async () => {
    const resposta = await app.request('/conflito')
    expect(resposta.status).toBe(409)
    expect(await resposta.json<CorpoErro>()).toEqual({
      erro: 'conflito',
      mensagem: 'Ana Paula tem 2 animais. Troque o responsável deles antes de excluir.',
    })
  })

  it('erro inesperado: 500 com mensagem genérica, sem vazar detalhes', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const resposta = await app.request('/quebrou')
    expect(resposta.status).toBe(500)
    const corpo = await resposta.text()
    expect(corpo).not.toContain('detalhe interno')
    expect(JSON.parse(corpo)).toMatchObject({ erro: 'erro_interno' })
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('codigoPostgres', () => {
  it('lê o código do erro do driver, direto ou embrulhado pelo Drizzle (cause)', () => {
    expect(codigoPostgres({ code: '23505' })).toBe('23505')
    expect(codigoPostgres(new Error('Failed query', { cause: { code: '23503' } }))).toBe('23503')
    expect(codigoPostgres(new Error('outro'))).toBeUndefined()
    expect(codigoPostgres(null)).toBeUndefined()
  })
})
