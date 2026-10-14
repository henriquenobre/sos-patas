// Área da ONG, etapa 13: Dados da ONG (T23; RN43, RN51). Parte do conteúdo inicial
// (seed_conteudo.sql) e confere o resultado no GET /site público.
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { OngAdmin, OngEntrada, SitePublico } from '@sospatas/compartilhado'
import { equipe } from '@sospatas/db'
import { aplicarSeed } from '@sospatas/db/seed'
import type { CorpoErro } from '../erros'
import { CABECALHO_JWT_ACCESS } from '../middleware/access'
import { URL_TESTE, criarAppTeste, envTeste } from '../testes/apoio'

let teste: Awaited<ReturnType<typeof criarAppTeste>>
let tokenEquipe: string

function admin(caminho: string, metodo = 'GET', dados?: unknown) {
  return teste.app.request(
    `/api/admin${caminho}`,
    {
      method: metodo,
      headers: { [CABECALHO_JWT_ACCESS]: tokenEquipe, 'Content-Type': 'application/json' },
      ...(dados === undefined ? {} : { body: JSON.stringify(dados) }),
    },
    envTeste(),
  )
}

const json = async <T>(resposta: Response) => (await resposta.json()) as T

const dadosOng = (extra: Partial<OngEntrada> = {}): OngEntrada => ({
  nome_completo: 'Associação SOS Patas de Passos',
  email: 'sitesospatas@gmail.com',
  whatsapp: '(35) 9 8843-9614',
  instagram: '@sospatas.ong',
  facebook: 'facebook.com/sospatasmg',
  pix_tipo: 'cnpj',
  pix_chave: '26.515.895/0001-90',
  ...extra,
})

beforeAll(async () => {
  teste = await criarAppTeste()
  await teste.db
    .insert(equipe)
    .values({ email: 'claudia@exemplo.com', nome: 'Claudia' })
    .onConflictDoNothing()
  tokenEquipe = await teste.token('claudia@exemplo.com')
})

beforeEach(async () => {
  await teste.db.execute(sql`TRUNCATE conteudo_itens, conteudo_textos, ong CASCADE`)
  await aplicarSeed(URL_TESTE, ['seed_conteudo.sql'])
})

afterAll(async () => {
  await teste.encerrar()
})

describe('Dados da ONG (T23)', () => {
  it('lê os dados com "Alterado em"', async () => {
    const resposta = await admin('/ong')
    expect(resposta.status).toBe(200)
    const ong = await json<OngAdmin>(resposta)
    expect(ong.email).toBe('sitesospatas@gmail.com')
    expect(ong.alteracao.em).toBeTruthy()
  })

  it('salva, grava quem alterou e aparece no site (RN43, RN51)', async () => {
    const resposta = await admin('/ong', 'PUT', dadosOng())
    expect(resposta.status).toBe(200)
    expect(await json<OngAdmin>(resposta)).toMatchObject({
      whatsapp: '35988439614',
      instagram: 'sospatas.ong',
      facebook: 'https://facebook.com/sospatasmg',
      alteracao: { por: 'Claudia' },
    })
    const site = await json<SitePublico>(
      await teste.app.request('/api/publico/site', {}, envTeste()),
    )
    expect(site.ong).toMatchObject({
      nome_completo: 'Associação SOS Patas de Passos',
      whatsapp: '35988439614',
    })
  })

  it('WhatsApp vazio volta a deixar só o e-mail como contato (RN51)', async () => {
    const resposta = await admin('/ong', 'PUT', dadosOng({ whatsapp: '' }))
    expect((await json<OngAdmin>(resposta)).whatsapp).toBeNull()
  })

  it('campos inválidos: 400 com a mensagem de cada um, nada muda', async () => {
    const antes = await json<OngAdmin>(await admin('/ong'))
    const resposta = await admin(
      '/ong',
      'PUT',
      dadosOng({ email: 'sospatas', instagram: 'sos patas', pix_chave: '' }),
    )
    expect(resposta.status).toBe(400)
    const { campos } = await json<CorpoErro>(resposta)
    expect(Object.keys(campos ?? {}).sort()).toEqual(['email', 'instagram', 'pix_chave'])
    expect(await json<OngAdmin>(await admin('/ong'))).toEqual(antes)
  })

  it('sem login: 401', async () => {
    expect((await teste.app.request('/api/admin/ong', {}, envTeste())).status).toBe(401)
  })
})
