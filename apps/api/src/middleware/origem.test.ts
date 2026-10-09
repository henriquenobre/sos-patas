// CSRF: escritas na área da ONG só valem vindas de páginas do próprio site (middleware/origem.ts)
// e com o corpo declarado como JSON (validacao.ts, lerJson).
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { equipe, protetores } from '@sospatas/db'
import type { CorpoErro } from '../erros'
import { criarAppTeste, envTeste } from '../testes/apoio'
import { CABECALHO_JWT_ACCESS } from './access'

let teste: Awaited<ReturnType<typeof criarAppTeste>>
let tokenEquipe: string

const PROTETOR = '00000000-0000-4000-8000-0000000003a1'
const corpo = JSON.stringify({ nome: 'Carla', whatsapp: '35991234567' })

/** Cria um protetor como se viesse de um navegador, com os cabeçalhos dados. */
function criarProtetor(cabecalhos: Record<string, string>, env = envTeste()) {
  return teste.app.request(
    '/api/admin/protetores',
    {
      method: 'POST',
      headers: {
        [CABECALHO_JWT_ACCESS]: tokenEquipe,
        'Content-Type': 'application/json',
        ...cabecalhos,
      },
      body: corpo,
    },
    env,
  )
}

const quantosProtetores = async () => (await teste.db.select().from(protetores)).length

beforeAll(async () => {
  teste = await criarAppTeste()
  await teste.db
    .insert(equipe)
    .values({ email: 'gracia@exemplo.com', nome: 'Gracia' })
    .onConflictDoNothing()
  tokenEquipe = await teste.token('gracia@exemplo.com')
})

beforeEach(async () => {
  await teste.db.execute(sql`TRUNCATE animais, protetores CASCADE`)
  await teste.db.insert(protetores).values({ id: PROTETOR, nome: 'Beto', whatsapp: '35977776666' })
})

afterAll(async () => {
  await teste.encerrar()
})

describe('origem das escritas na área da ONG (CSRF)', () => {
  it('página de outro site: 403 e nada muda, mesmo com o login válido', async () => {
    const resposta = await criarProtetor({
      Origin: 'https://site-malicioso.com',
      Host: 'sospatas.org.br',
    })
    expect(resposta.status).toBe(403)
    expect((await resposta.json<CorpoErro>()).erro).toBe('origem_nao_permitida')
    expect(await quantosProtetores()).toBe(1)
  })

  it('exclusão disparada por outro site também é recusada', async () => {
    const resposta = await teste.app.request(
      `/api/admin/protetores/${PROTETOR}`,
      {
        method: 'DELETE',
        headers: {
          [CABECALHO_JWT_ACCESS]: tokenEquipe,
          Origin: 'https://site-malicioso.com',
          Host: 'sospatas.org.br',
        },
      },
      envTeste(),
    )
    expect(resposta.status).toBe(403)
    expect(
      await teste.db.select().from(protetores).where(eq(protetores.id, PROTETOR)),
    ).toHaveLength(1)
  })

  it('Origin "null" (página sem origem): 403', async () => {
    expect((await criarProtetor({ Origin: 'null', Host: 'sospatas.org.br' })).status).toBe(403)
  })

  it('sem Origin, mas o navegador diz que veio de outro site (Sec-Fetch-Site): 403', async () => {
    expect((await criarProtetor({ 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403)
  })

  it('página do próprio site (mesmo endereço que o navegador chamou): permitido', async () => {
    const producao = await criarProtetor({
      Origin: 'https://sospatas.org.br',
      Host: 'sospatas.org.br',
    })
    expect(producao.status).toBe(201)
    // Computador e celular: o Vite repassa /api sem trocar o Host
    const celular = await criarProtetor({
      Origin: 'http://192.168.0.10:5173',
      Host: '192.168.0.10:5173',
      'Sec-Fetch-Site': 'same-origin',
    })
    expect(celular.status).toBe(201)
  })

  it('prévia: o site no pages.dev, listado em CORS_ORIGENS, pode escrever na API do workers.dev', async () => {
    const resposta = await criarProtetor(
      { Origin: 'https://sospatas.pages.dev', Host: 'sospatas-api-previa.sospatas.workers.dev' },
      envTeste({ CORS_ORIGENS: 'https://sospatas.pages.dev' }),
    )
    expect(resposta.status).toBe(201)
  })

  it('sem Origin nem Sec-Fetch-Site (não é navegador, como o curl): permitido', async () => {
    expect((await criarProtetor({})).status).toBe(201)
  })

  it('leituras não são bloqueadas (o CORS já impede outro site de ler a resposta)', async () => {
    const resposta = await teste.app.request(
      '/api/admin/protetores',
      {
        headers: {
          [CABECALHO_JWT_ACCESS]: tokenEquipe,
          Origin: 'https://site-malicioso.com',
          Host: 'sospatas.org.br',
        },
      },
      envTeste(),
    )
    expect(resposta.status).toBe(200)
  })
})

describe('corpo declarado como JSON', () => {
  it('JSON enviado como text/plain (o truque do formulário de outro site): 415', async () => {
    const resposta = await criarProtetor({ 'Content-Type': 'text/plain' })
    expect(resposta.status).toBe(415)
    expect(await quantosProtetores()).toBe(1)
  })

  it('application/json com charset: aceito', async () => {
    const resposta = await criarProtetor({ 'Content-Type': 'application/json; charset=utf-8' })
    expect(resposta.status).toBe(201)
  })
})
