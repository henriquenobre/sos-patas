// Cadastro de quem adotou (RN53): busca, cadastro à mão, observações, adoções antigas e exclusão.
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  hojeNoBrasil,
  somarDias,
  type AdotanteDetalhe,
  type Criado,
  type ListaAdotantes,
} from '@sospatas/compartilhado'
import { adocoes, adotantes, animais, equipe } from '@sospatas/db'
import type { CorpoErro } from '../erros'
import { CABECALHO_JWT_ACCESS } from '../middleware/access'
import { criarAppTeste, envTeste } from '../testes/apoio'

let teste: Awaited<ReturnType<typeof criarAppTeste>>
let tokenEquipe: string

const HOJE = hojeNoBrasil()
const ID = {
  joana: '00000000-0000-4000-8000-000000000301',
  marcos: '00000000-0000-4000-8000-000000000302',
  nina: '00000000-0000-4000-8000-000000000311',
}

beforeAll(async () => {
  teste = await criarAppTeste()
  await teste.db
    .insert(equipe)
    .values({ email: 'gracia@exemplo.com', nome: 'Gracia' })
    .onConflictDoNothing()
  tokenEquipe = await teste.token('gracia@exemplo.com')
})

beforeEach(async () => {
  await teste.db.execute(sql`TRUNCATE animais, protetores, perdidos, adotantes CASCADE`)
  await teste.db.insert(animais).values({
    id: ID.nina,
    nome: 'Nina',
    especie: 'cao',
    sexo: 'femea',
    nascimento_aprox: '2022-01-01',
    porte: 'medio',
    castrado: true,
    vacinado: 'sim',
    vermifugado: 'sim',
    status: 'adotado',
    data_adocao: HOJE,
    responsavel_tipo: 'ong',
  })
  await teste.db.insert(adotantes).values([
    { id: ID.joana, nome: 'Joana Pereira', whatsapp: '35988439614', bairro_cidade: 'Centro' },
    { id: ID.marcos, nome: 'Marcos Lima', whatsapp: null, observacoes: 'Devolveu o Rex.' },
  ])
  await teste.db.insert(adocoes).values([
    { adotante_id: ID.joana, animal_id: ID.nina, animal_nome: 'Nina', data_adocao: HOJE },
    {
      adotante_id: ID.marcos,
      animal_nome: 'Rex',
      data_adocao: '2024-03-01',
      data_devolucao: '2024-05-01',
    },
  ])
})

afterAll(async () => {
  await teste.encerrar()
})

function admin(caminho: string, metodo = 'GET', dados?: unknown, token = tokenEquipe) {
  return teste.app.request(
    `/api/admin${caminho}`,
    {
      method: metodo,
      headers: { [CABECALHO_JWT_ACCESS]: token, 'Content-Type': 'application/json' },
      ...(dados === undefined ? {} : { body: JSON.stringify(dados) }),
    },
    envTeste(),
  )
}

const lista = async (busca = '') =>
  (await (await admin(`/adotantes?busca=${encodeURIComponent(busca)}`)).json<ListaAdotantes>())
    .adotantes

describe('lista e busca (T30)', () => {
  it('sem login: 401', async () => {
    expect((await admin('/adotantes', 'GET', undefined, '')).status).toBe(401)
  })

  it('em ordem alfabética, com o número de adoções e devoluções', async () => {
    expect(await lista()).toEqual([
      expect.objectContaining({
        nome: 'Joana Pereira',
        adocoes: 1,
        devolucoes: 0,
        ultima_adocao: HOJE,
      }),
      expect.objectContaining({ nome: 'Marcos Lima', adocoes: 1, devolucoes: 1 }),
    ])
  })

  it.each([
    ['marcos', ['Marcos Lima']],
    ['JOANA', ['Joana Pereira']],
    ['(35) 9 8843', ['Joana Pereira']],
    ['9614', ['Joana Pereira']],
    ['ninguém', []],
  ])('busca "%s"', async (busca, nomes) => {
    expect((await lista(busca)).map((a) => a.nome)).toEqual(nomes)
  })
})

describe('ficha (T31)', () => {
  it('traz os dados e o histórico, a adoção mais recente primeiro', async () => {
    const resposta = await admin(`/adotantes/${ID.joana}`)
    expect(resposta.status).toBe(200)
    const joana = await resposta.json<AdotanteDetalhe>()
    expect(joana).toMatchObject({ nome: 'Joana Pereira', whatsapp: '35988439614' })
    expect(joana.adocoes).toEqual([
      expect.objectContaining({ animal_id: ID.nina, animal_nome: 'Nina', data_devolucao: null }),
    ])
  })

  it.each(['00000000-0000-4000-8000-0000000003ff', 'nao-e-id'])('id %s: 404', async (id) => {
    expect((await admin(`/adotantes/${id}`)).status).toBe(404)
  })
})

describe('cadastro e edição', () => {
  it('cadastra à mão quem adotou antes do site, com WhatsApp opcional', async () => {
    const resposta = await admin('/adotantes', 'POST', {
      nome: ' Ana Souza ',
      whatsapp: '',
      bairro_cidade: 'São José, Passos',
      observacoes: '',
    })
    expect(resposta.status).toBe(201)
    const { id } = await resposta.json<Criado>()
    const ana = await (await admin(`/adotantes/${id}`)).json<AdotanteDetalhe>()
    expect(ana).toMatchObject({ nome: 'Ana Souza', whatsapp: null, adocoes: [] })
  })

  it('um cadastro por WhatsApp: avisa de quem é o número', async () => {
    const resposta = await admin('/adotantes', 'POST', {
      nome: 'Outra Joana',
      whatsapp: '35 98843-9614',
    })
    expect(resposta.status).toBe(400)
    expect((await resposta.json<CorpoErro>()).campos?.whatsapp).toContain('Joana Pereira')
  })

  it('edita as observações e grava quem alterou', async () => {
    const resposta = await admin(`/adotantes/${ID.joana}`, 'PUT', {
      nome: 'Joana Pereira',
      whatsapp: '35988439614',
      bairro_cidade: 'Centro',
      observacoes: 'Ótima adotante, manda fotos sempre.',
    })
    expect(resposta.status).toBe(204)
    const joana = await (await admin(`/adotantes/${ID.joana}`)).json<AdotanteDetalhe>()
    expect(joana.observacoes).toBe('Ótima adotante, manda fotos sempre.')
    expect(joana.alteracao.por).toBe('Gracia')
  })

  it('edição para o WhatsApp de outra pessoa: 400', async () => {
    await admin(`/adotantes/${ID.marcos}`, 'PUT', { nome: 'Marcos Lima', whatsapp: '35988439614' })
    const resposta = await admin(`/adotantes/${ID.marcos}`, 'PUT', {
      nome: 'Marcos Lima',
      whatsapp: '35988439614',
    })
    expect(resposta.status).toBe(400)
  })
})

describe('adoções antigas', () => {
  it('registra uma adoção de antes do site', async () => {
    const resposta = await admin(`/adotantes/${ID.joana}/adocoes`, 'POST', {
      animal_nome: 'Pingo',
      data_adocao: '2023-06-10',
    })
    expect(resposta.status).toBe(201)
    const joana = await (await admin(`/adotantes/${ID.joana}`)).json<AdotanteDetalhe>()
    expect(joana.adocoes.map((a) => a.animal_nome)).toEqual(['Nina', 'Pingo'])
  })

  it('devolução antes da adoção ou data futura: 400', async () => {
    const antes = await admin(`/adotantes/${ID.joana}/adocoes`, 'POST', {
      animal_nome: 'Pingo',
      data_adocao: '2023-06-10',
      data_devolucao: '2023-01-01',
    })
    expect(antes.status).toBe(400)
    const futura = await admin(`/adotantes/${ID.joana}/adocoes`, 'POST', {
      animal_nome: 'Pingo',
      data_adocao: somarDias(HOJE, 5),
    })
    expect(futura.status).toBe(400)
  })

  it('apaga a adoção registrada à mão, mas não a feita pelo site (409)', async () => {
    const marcos = await (await admin(`/adotantes/${ID.marcos}`)).json<AdotanteDetalhe>()
    const rex = marcos.adocoes[0]?.id ?? ''
    expect((await admin(`/adotantes/${ID.marcos}/adocoes/${rex}`, 'DELETE')).status).toBe(204)

    const joana = await (await admin(`/adotantes/${ID.joana}`)).json<AdotanteDetalhe>()
    const nina = joana.adocoes[0]?.id ?? ''
    expect((await admin(`/adotantes/${ID.joana}/adocoes/${nina}`, 'DELETE')).status).toBe(409)
  })
})

describe('exclusão a pedido da pessoa (LGPD)', () => {
  it('apaga o cadastro e o histórico; o animal continua adotado', async () => {
    expect((await admin(`/adotantes/${ID.joana}`, 'DELETE')).status).toBe(204)
    expect((await admin(`/adotantes/${ID.joana}`)).status).toBe(404)
    expect(await teste.db.select().from(adocoes)).toHaveLength(1)
    const [nina] = await teste.db.select({ status: animais.status }).from(animais)
    expect(nina?.status).toBe('adotado')
  })
})
