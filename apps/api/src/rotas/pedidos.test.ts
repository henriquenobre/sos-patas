// Pedidos de adoção: envio pelo site (RN14, RN47, RN48, RN50), análise pela equipe (RN49) e
// limpeza dos 90 dias (RN15).
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type {
  AnimalFicha,
  ListaAnimais,
  ListaPedidos,
  PedidoAdocaoEntrada,
  PedidoDetalhe,
} from '@sospatas/compartilhado'
import { animais, equipe, pedidosAdocao } from '@sospatas/db'
import type { CorpoErro } from '../erros'
import { CABECALHO_JWT_ACCESS } from '../middleware/access'
import { apagarPedidosVencidos } from '../tarefas/limpeza'
import { TOKEN_TURNSTILE_VALIDO, criarAppTeste, envTeste } from '../testes/apoio'

let teste: Awaited<ReturnType<typeof criarAppTeste>>
let tokenEquipe: string

const ID = {
  thor: '00000000-0000-4000-8000-000000000101', // cão, macho, castrado, não convive
  mel: '00000000-0000-4000-8000-000000000102', // gata
  nina: '00000000-0000-4000-8000-000000000103',
  tobias: '00000000-0000-4000-8000-000000000104',
  bolinha: '00000000-0000-4000-8000-000000000105', // adotada
}

const animalBase = {
  sexo: 'macho' as const,
  especie: 'cao' as const,
  porte: 'medio' as const,
  nascimento_aprox: '2020-01-01',
  castrado: true,
  vacinado: 'sim' as const,
  vermifugado: 'sim' as const,
}

function corpo(extra: Partial<PedidoAdocaoEntrada> = {}): PedidoAdocaoEntrada {
  return {
    nome: 'Fernanda Souza',
    maior_idade: 'sim',
    whatsapp: '(35) 9 9999-0001',
    bairro_cidade: 'Centro, Passos',
    instagram_facebook: '',
    motivo: 'Quero um companheiro para a família.',
    moradia: 'casa',
    imovel: 'proprio',
    espaco: 'grande',
    local_coberto: 'sim',
    casa_segura: 'sim',
    onde_fica: 'dentro_fora',
    moradores: '3 pessoas, sem crianças',
    todos_concordam: 'sim',
    tem_animais: 'nao',
    vacinar_vermifugar: 'sim',
    castrar: 'sim',
    arcar_custos: 'sim',
    horas_sozinho: 'menos_4',
    mudanca_viagem: 'Levo comigo ou deixo com minha mãe.',
    declaracoes: Array.from({ length: 8 }, () => true),
    ciente_termo: true,
    turnstile_token: TOKEN_TURNSTILE_VALIDO,
    ...extra,
  }
}

function enviar(animalId: string, dados: unknown, ip = '200.1.1.1') {
  return teste.app.request(
    `/api/publico/animais/${animalId}/pedidos`,
    {
      method: 'POST',
      body: JSON.stringify(dados),
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
    },
    envTeste(),
  )
}

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

async function statusAnimal(id: string) {
  const [linha] = await teste.db
    .select({ status: animais.status })
    .from(animais)
    .where(eq(animais.id, id))
  return linha?.status
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
  await teste.db.execute(sql`TRUNCATE animais, protetores, perdidos CASCADE`)
  await teste.db.insert(animais).values([
    { ...animalBase, id: ID.thor, nome: 'Thor', convive_animais: false },
    { ...animalBase, id: ID.mel, nome: 'Mel', especie: 'gato', sexo: 'femea', castrado: false },
    { ...animalBase, id: ID.nina, nome: 'Nina', sexo: 'femea' },
    { ...animalBase, id: ID.tobias, nome: 'Tobias' },
    {
      ...animalBase,
      id: ID.bolinha,
      nome: 'Bolinha',
      status: 'adotado',
      data_adocao: '2026-10-01',
    },
  ])
})

afterAll(async () => {
  await teste.encerrar()
})

describe('envio do formulário pelo site', () => {
  it('grava o pedido com a ciência do termo e tira o animal do site (RN47, RN48)', async () => {
    const resposta = await enviar(ID.thor, corpo())
    expect(resposta.status).toBe(201)

    const [pedido] = await teste.db.select().from(pedidosAdocao)
    expect(pedido).toMatchObject({
      status: 'pendente',
      nome: 'Fernanda Souza',
      whatsapp: '35999990001',
      versao_formulario: '1.1',
      versao_termo: '2026-10',
    })
    expect(pedido?.termo_ciente_em).toBeInstanceOf(Date)
    expect(pedido?.ip_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(pedido)).not.toContain('200.1.1.1')
    expect(pedido?.respostas).not.toHaveProperty('turnstile_token')
    expect(await statusAnimal(ID.thor)).toBe('em_analise')

    const vitrine = await teste.app.request('/api/publico/animais', {}, envTeste())
    const nomes = (await vitrine.json<ListaAnimais>()).animais.map((a) => a.nome)
    expect(nomes).not.toContain('Thor')
    const ficha = await teste.app.request(`/api/publico/animais/${ID.thor}`, {}, envTeste())
    const textoFicha = await ficha.text()
    expect((JSON.parse(textoFicha) as AnimalFicha).status).toBe('em_analise')
    expect(textoFicha).not.toContain('Fernanda')
  })

  it('segundo pedido do mesmo animal: 409, mesmo de outra pessoa', async () => {
    await enviar(ID.thor, corpo())
    const resposta = await enviar(ID.thor, corpo({ whatsapp: '35999990002' }), '200.2.2.2')
    expect(resposta.status).toBe(409)
    expect(await resposta.json<CorpoErro>()).toMatchObject({ erro: 'animal_em_analise' })
  })

  it('animal adotado: 409; animal que não existe: 404', async () => {
    expect((await enviar(ID.bolinha, corpo())).status).toBe(409)
    expect((await enviar('00000000-0000-4000-8000-0000000009ff', corpo())).status).toBe(404)
  })

  it('Turnstile inválido: 400 e nada é gravado', async () => {
    const resposta = await enviar(ID.thor, corpo({ turnstile_token: 'robo' }))
    expect(resposta.status).toBe(400)
    expect(await resposta.json<CorpoErro>()).toMatchObject({ erro: 'turnstile' })
    expect(await statusAnimal(ID.thor)).toBe('disponivel')
  })

  it('sem marcar o termo ou as declarações: 400 com a mensagem de cada campo', async () => {
    const declaracoes = Array.from({ length: 8 }, (_, i) => i !== 3)
    const resposta = await enviar(ID.thor, { ...corpo({ declaracoes }), ciente_termo: false })
    expect(resposta.status).toBe(400)
    const { campos } = await resposta.json<CorpoErro>()
    expect(campos).toHaveProperty('ciente_termo')
    expect(campos).toHaveProperty('declaracoes')
  })

  it('a pergunta das telas é obrigatória só para gatos', async () => {
    const semTelas = await enviar(ID.mel, corpo())
    expect(semTelas.status).toBe(400)
    expect((await semTelas.json<CorpoErro>()).campos).toHaveProperty('telas_janelas')
    expect((await enviar(ID.mel, corpo({ telas_janelas: 'vou_colocar' }))).status).toBe(201)
  })

  it('apaga respostas que não se aplicam (proprietário em imóvel próprio)', async () => {
    await enviar(ID.thor, corpo({ imovel: 'proprio', proprietario_permite: 'nao' }))
    const [pedido] = await teste.db.select().from(pedidosAdocao)
    expect(pedido?.respostas.proprietario_permite).toBeNull()
  })

  it('o mesmo WhatsApp não pode ter dois pedidos em análise (RN50)', async () => {
    await enviar(ID.thor, corpo())
    const resposta = await enviar(ID.nina, corpo(), '200.9.9.9')
    expect(resposta.status).toBe(409)
    expect(await resposta.json<CorpoErro>()).toMatchObject({ erro: 'pedido_em_andamento' })
    expect(await statusAnimal(ID.nina)).toBe('disponivel')
  })

  it('no máximo 2 pedidos por dia do mesmo IP (RN50)', async () => {
    expect((await enviar(ID.thor, corpo({ whatsapp: '35999990011' }))).status).toBe(201)
    expect((await enviar(ID.nina, corpo({ whatsapp: '35999990012' }))).status).toBe(201)
    const terceiro = await enviar(ID.tobias, corpo({ whatsapp: '35999990013' }))
    expect(terceiro.status).toBe(429)
    expect(await statusAnimal(ID.tobias)).toBe('disponivel')
  })
})

describe('análise pela equipe (RN49)', () => {
  async function pedidoDe(animalId: string, extra: Partial<PedidoAdocaoEntrada> = {}) {
    await enviar(animalId, corpo(extra), `201.0.0.${animalId.slice(-1)}`)
    const [pedido] = await teste.db
      .select({ id: pedidosAdocao.id })
      .from(pedidosAdocao)
      .where(eq(pedidosAdocao.animal_id, animalId))
    if (!pedido) throw new Error('pedido não criado')
    return pedido.id
  }

  it('sem login: 401', async () => {
    const resposta = await teste.app.request('/api/admin/pedidos', {}, envTeste())
    expect(resposta.status).toBe(401)
  })

  it('lista os pendentes com o número de alertas', async () => {
    await pedidoDe(ID.thor, {
      tem_animais: 'sim',
      animais_quantos: '1 cão',
      animais_sexo: ['macho'],
      animais_castrados_vacinados: 'todos',
    })
    const resposta = await admin('/pedidos')
    const { pedidos } = await resposta.json<ListaPedidos>()
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]).toMatchObject({ nome: 'Fernanda Souza', animal: { nome: 'Thor' } })
    // Mesmo sexo e "não convive com outros animais"
    expect(pedidos[0]?.quantidade_alertas).toBe(2)
  })

  it('mostra o pedido completo, com respostas, ciência do termo e alertas', async () => {
    const id = await pedidoDe(ID.thor, { onde_fica: 'preso' })
    const detalhe = await (await admin(`/pedidos/${id}`)).json<PedidoDetalhe>()
    expect(detalhe.whatsapp).toBe('35999990001')
    expect(detalhe.respostas.onde_fica).toBe('preso')
    expect(detalhe.versao_termo).toBe('2026-10')
    expect(detalhe.alertas.map((a) => a.codigo)).toEqual(['animal_preso'])
  })

  it('aprovar mantém o animal fora do site e registra quem aprovou', async () => {
    const id = await pedidoDe(ID.thor)
    expect((await admin(`/pedidos/${id}/aprovar`, 'POST')).status).toBe(204)
    const detalhe = await (await admin(`/pedidos/${id}`)).json<PedidoDetalhe>()
    expect(detalhe).toMatchObject({ status: 'aprovado', analisado_por: 'Gracia' })
    expect(await statusAnimal(ID.thor)).toBe('em_analise')
    expect((await admin(`/pedidos/${id}/aprovar`, 'POST')).status).toBe(409)
  })

  it('recusar devolve o animal ao site', async () => {
    const id = await pedidoDe(ID.thor)
    expect((await admin(`/pedidos/${id}/recusar`, 'POST')).status).toBe(204)
    expect(await statusAnimal(ID.thor)).toBe('disponivel')
    const recusados = await (await admin('/pedidos?status=recusado')).json<ListaPedidos>()
    expect(recusados.pedidos).toHaveLength(1)
    // Depois da recusa, o animal pode receber outro pedido
    expect((await enviar(ID.thor, corpo({ whatsapp: '35999990077' }), '202.0.0.1')).status).toBe(
      201,
    )
  })

  it('guarda a observação interna', async () => {
    const id = await pedidoDe(ID.thor)
    const resposta = await admin(`/pedidos/${id}/observacao`, 'PUT', {
      observacao: 'Ligar à tarde',
    })
    expect(resposta.status).toBe(204)
    const detalhe = await (await admin(`/pedidos/${id}`)).json<PedidoDetalhe>()
    expect(detalhe.observacao_equipe).toBe('Ligar à tarde')
  })

  it('pedido inexistente: 404', async () => {
    expect((await admin('/pedidos/00000000-0000-4000-8000-0000000009ff')).status).toBe(404)
    expect((await admin('/pedidos/nao-e-id/aprovar', 'POST')).status).toBe(404)
  })
})

describe('limpeza diária (RN15)', () => {
  it('apaga recusados há mais de 90 dias e mantém os recentes e os pendentes', async () => {
    await enviar(ID.thor, corpo({ whatsapp: '35999990021' }), '203.0.0.1')
    await enviar(ID.nina, corpo({ whatsapp: '35999990022' }), '203.0.0.2')
    await enviar(ID.tobias, corpo({ whatsapp: '35999990023' }), '203.0.0.3')
    const pedidos = await teste.db
      .select({ id: pedidosAdocao.id, animal: pedidosAdocao.animal_id })
      .from(pedidosAdocao)
    const de = (animal: string) => pedidos.find((p) => p.animal === animal)?.id ?? ''
    await teste.db.execute(sql`
      UPDATE pedidos_adocao SET status = 'recusado', analisado_em = now() - interval '91 days'
      WHERE id = ${de(ID.thor)}`)
    await teste.db.execute(sql`
      UPDATE pedidos_adocao SET status = 'recusado', analisado_em = now() - interval '10 days'
      WHERE id = ${de(ID.nina)}`)

    expect(await apagarPedidosVencidos(teste.db)).toBe(1)
    const restantes = await teste.db.select({ animal: pedidosAdocao.animal_id }).from(pedidosAdocao)
    expect(restantes.map((p) => p.animal).sort()).toEqual([ID.nina, ID.tobias].sort())
  })
})
