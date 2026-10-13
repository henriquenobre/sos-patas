// Perdidos e encontrados, etapa 11: envio pelo site (RN18–RN23, RN28), moderação pela equipe
// (RN19, RN25, RN26, RN41) e limpeza diária (RN25, RN27). Armazenamentos em memória do apoio.
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_PERDIDOS_PENDENTES,
  TAMANHO_MAX_FOTO_BYTES,
  hojeNoBrasil,
  type ListaPerdidos,
  type ListaPerdidosAdmin,
  type PerdidoPublicoEntrada,
} from '@sospatas/compartilhado'
import { equipe, perdidos, perdidosFotos } from '@sospatas/db'
import type { CorpoErro } from '../erros'
import { CABECALHO_JWT_ACCESS } from '../middleware/access'
import { executarTarefasDiarias } from '../tarefas/limpeza'
import { TOKEN_TURNSTILE_VALIDO, criarAppTeste, envTeste } from '../testes/apoio'

let teste: Awaited<ReturnType<typeof criarAppTeste>>
let tokenEquipe: string

/** Bytes que passam pela conferência WebP (RN21): "RIFF", tamanho, "WEBP" e conteúdo. */
function webp(tamanho = 64, marca = 0): Uint8Array {
  const bytes = new Uint8Array(tamanho).fill(marca)
  bytes.set(new TextEncoder().encode('RIFF'), 0)
  bytes.set(new TextEncoder().encode('WEBP'), 8)
  return bytes
}

function dados(extra: Partial<PerdidoPublicoEntrada> = {}): PerdidoPublicoEntrada {
  return {
    tipo: 'perdido',
    especie: 'cao',
    nome: 'Bob',
    bairro: 'Centro',
    data_ocorrido: hojeNoBrasil(),
    descricao: 'Caramelo, coleira azul, atende pelo nome.',
    contato_nome: 'Marcos',
    contato_whatsapp: '(35) 9 9999-1234',
    consentimento: true,
    turnstile_token: TOKEN_TURNSTILE_VALIDO,
    ...extra,
  }
}

/** Envia como o navegador: multipart com o JSON em "dados" e cada foto em "fotos". */
function enviar(corpo: unknown = dados(), fotos: Uint8Array[] = [webp(64, 1)], ip = '200.2.2.2') {
  const formulario = new FormData()
  formulario.append('dados', JSON.stringify(corpo))
  fotos.forEach((foto, i) => {
    formulario.append('fotos', new Blob([foto], { type: 'image/webp' }), `foto${String(i)}.webp`)
  })
  return teste.app.request(
    '/api/publico/perdidos',
    { method: 'POST', body: formulario, headers: { 'CF-Connecting-IP': ip } },
    envTeste(),
  )
}

function admin(caminho: string, metodo = 'GET') {
  return teste.app.request(
    `/api/admin${caminho}`,
    { method: metodo, headers: { [CABECALHO_JWT_ACCESS]: tokenEquipe } },
    envTeste(),
  )
}

const json = async <T>(resposta: Response) => (await resposta.json()) as T

async function listaAdmin(status: 'pendente' | 'publicado') {
  return (await json<ListaPerdidosAdmin>(await admin(`/perdidos?status=${status}`))).perdidos
}

async function listaPublica() {
  const resposta = await teste.app.request('/api/publico/perdidos', {}, envTeste())
  return (await json<ListaPerdidos>(resposta)).perdidos
}

/** Envia um anúncio e devolve o id gravado. */
async function enviarERetornarId(corpo = dados(), fotos = [webp(64, 1)], ip = '200.2.2.2') {
  expect((await enviar(corpo, fotos, ip)).status).toBe(201)
  const [ultimo] = await teste.db
    .select({ id: perdidos.id })
    .from(perdidos)
    .orderBy(sql`${perdidos.created_at} DESC`)
    .limit(1)
  return ultimo?.id ?? ''
}

const chavesQuarentena = () => [...teste.quarentena.arquivos.keys()]
const chavesPublicas = () =>
  [...teste.fotos.arquivos.keys()].filter((k) => k.startsWith('perdidos/'))

beforeAll(async () => {
  teste = await criarAppTeste()
  await teste.db
    .insert(equipe)
    .values({ email: 'gracia@exemplo.com', nome: 'Gracia' })
    .onConflictDoNothing()
  tokenEquipe = await teste.token('gracia@exemplo.com')
})

beforeEach(async () => {
  await teste.db.execute(sql`TRUNCATE perdidos CASCADE`)
  teste.quarentena.arquivos.clear()
  teste.fotos.arquivos.clear()
  vi.restoreAllMocks()
})

afterAll(async () => {
  await teste.encerrar()
})

describe('POST /api/publico/perdidos (T13)', () => {
  it('grava como pendente, com as fotos na quarentena e fora do site (RN18, RN19)', async () => {
    const resposta = await enviar(dados(), [webp(64, 1), webp(80, 2)])
    expect(resposta.status).toBe(201)

    const [anuncio] = await teste.db.select().from(perdidos)
    expect(anuncio).toMatchObject({
      status: 'pendente',
      origem: 'site',
      nome: 'Bob',
      contato_whatsapp: '35999991234',
      publicado_em: null,
      expira_em: null,
    })
    expect(anuncio?.ip_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(anuncio?.consentimento_em).toBeInstanceOf(Date)

    const fotosDoAnuncio = await teste.db.select().from(perdidosFotos)
    expect(fotosDoAnuncio).toHaveLength(2)
    expect(chavesQuarentena().sort()).toEqual(fotosDoAnuncio.map((f) => f.path).sort())
    for (const foto of fotosDoAnuncio) {
      expect(foto.path).toBe(`perdidos/${anuncio?.id ?? ''}/${foto.id}.webp`)
      expect(teste.quarentena.arquivos.get(foto.path)?.tipo).toBe('image/webp')
    }
    expect(chavesPublicas()).toEqual([])
    expect(await listaPublica()).toEqual([])
  })

  it('aceita anúncio sem foto', async () => {
    expect((await enviar(dados(), [])).status).toBe(201)
    expect(await teste.db.select().from(perdidosFotos)).toEqual([])
  })

  it('token do Turnstile inválido: 400 e nada gravado (RN21, RN22)', async () => {
    const resposta = await enviar(dados({ turnstile_token: 'robo' }))
    expect(resposta.status).toBe(400)
    expect((await json<CorpoErro>(resposta)).erro).toBe('turnstile')
    expect(await teste.db.select().from(perdidos)).toEqual([])
    expect(chavesQuarentena()).toEqual([])
  })

  it('3ª foto: 400 (RN21)', async () => {
    const resposta = await enviar(dados(), [webp(), webp(), webp()])
    expect(resposta.status).toBe(400)
    expect((await json<CorpoErro>(resposta)).erro).toBe('fotos_demais')
    expect(await teste.db.select().from(perdidos)).toEqual([])
    expect(chavesQuarentena()).toEqual([])
  })

  it('foto acima de 500 KB: 400 (RN21)', async () => {
    const resposta = await enviar(dados(), [webp(TAMANHO_MAX_FOTO_BYTES + 1)])
    expect(resposta.status).toBe(400)
    expect((await json<CorpoErro>(resposta)).erro).toBe('foto_grande')
    expect(chavesQuarentena()).toEqual([])
  })

  it('arquivo falso com extensão .webp: 400 (RN21)', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0])
    const resposta = await enviar(dados(), [png])
    expect(resposta.status).toBe(400)
    expect((await json<CorpoErro>(resposta)).erro).toBe('foto_invalida')
    expect(chavesQuarentena()).toEqual([])
  })

  it('descrição com link: 400 com a mensagem no campo (RN21)', async () => {
    const resposta = await enviar(dados({ descricao: 'Veja fotos em www.golpe.com' }))
    expect(resposta.status).toBe(400)
    const erro = await json<CorpoErro>(resposta)
    expect(erro.campos?.descricao).toBe('Não coloque links na descrição')
  })

  it('sem o consentimento: 400 (RN28)', async () => {
    const resposta = await enviar({ ...dados(), consentimento: false })
    expect(resposta.status).toBe(400)
    expect((await json<CorpoErro>(resposta)).campos?.consentimento).toBeDefined()
  })

  it('sem o campo "dados" ou com JSON quebrado: 400', async () => {
    const formulario = new FormData()
    formulario.append('dados', '{quebrado')
    const resposta = await teste.app.request(
      '/api/publico/perdidos',
      { method: 'POST', body: formulario },
      envTeste(),
    )
    expect(resposta.status).toBe(400)
    expect((await json<CorpoErro>(resposta)).erro).toBe('requisicao_invalida')
  })

  it('4º envio do mesmo IP no dia: 429; outro IP continua podendo (RN23)', async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await enviar(dados(), [], '201.0.0.1')).status).toBe(201)
    }
    const quarta = await enviar(dados(), [], '201.0.0.1')
    expect(quarta.status).toBe(429)
    expect((await json<CorpoErro>(quarta)).erro).toBe('limite')
    expect((await enviar(dados(), [], '201.0.0.2')).status).toBe(201)
  })

  it(`com ${String(MAX_PERDIDOS_PENDENTES)} pendentes, recusa o próximo (RN23)`, async () => {
    await teste.db.execute(sql`
      INSERT INTO perdidos (tipo, especie, bairro, data_ocorrido, descricao, contato_nome,
                            contato_whatsapp, consentimento_em)
      SELECT 'encontrado', 'gato', 'Centro', CURRENT_DATE, 'Gato cinza', 'Ana', '35999990000', now()
      FROM generate_series(1, ${MAX_PERDIDOS_PENDENTES})`)
    const resposta = await enviar(dados(), [webp()])
    expect(resposta.status).toBe(429)
    expect(chavesQuarentena()).toEqual([])
  })

  it('se o armazenamento falhar, responde 503 e não grava o anúncio', async () => {
    vi.spyOn(teste.quarentena, 'colocar').mockRejectedValueOnce(new Error('R2 fora do ar'))
    const resposta = await enviar()
    expect(resposta.status).toBe(503)
    expect(await teste.db.select().from(perdidos)).toEqual([])
  })
})

describe('moderação na área da ONG (T14)', () => {
  it('lista os aguardando com a foto pela rota da quarentena, só para a equipe', async () => {
    const id = await enviarERetornarId()
    const [anuncio] = await listaAdmin('pendente')
    expect(anuncio).toMatchObject({ id, status: 'pendente', origem: 'site', expira_em: null })
    const foto = anuncio?.fotos[0]
    expect(foto?.url).toBe(`/api/admin/perdidos/${id}/fotos/${foto?.id ?? ''}`)

    const imagem = await admin(`/perdidos/${id}/fotos/${foto?.id ?? ''}`)
    expect(imagem.status).toBe(200)
    expect(imagem.headers.get('Content-Type')).toBe('image/webp')
    expect(imagem.headers.get('Cache-Control')).toBe('private, max-age=3600')
    expect(new Uint8Array(await imagem.arrayBuffer())).toEqual(webp(64, 1))

    // Sem login, não passa; e a rota pública de fotos nunca lê a quarentena
    const semLogin = await teste.app.request(
      `/api/admin/perdidos/${id}/fotos/${foto?.id ?? ''}`,
      {},
      envTeste(),
    )
    expect(semLogin.status).toBe(401)
    const caminho = chavesQuarentena()[0] ?? ''
    expect((await teste.app.request(`/api/publico/fotos/${caminho}`, {}, envTeste())).status).toBe(
      404,
    )
  })

  it('aprovar copia as fotos para o bucket público, apaga da quarentena e põe no ar por 30 dias', async () => {
    const id = await enviarERetornarId(dados(), [webp(64, 1), webp(64, 2)])
    const caminhos = chavesQuarentena().sort()

    expect((await admin(`/perdidos/${id}/aprovar`, 'POST')).status).toBe(204)

    expect(chavesQuarentena()).toEqual([])
    expect(chavesPublicas().sort()).toEqual(caminhos)
    const [anuncio] = await teste.db.select().from(perdidos).where(eq(perdidos.id, id))
    expect(anuncio?.status).toBe('publicado')
    const dias =
      ((anuncio?.expira_em?.getTime() ?? 0) - (anuncio?.publicado_em?.getTime() ?? 0)) / 86_400_000
    expect(dias).toBe(30)

    const [publico] = await listaPublica()
    expect(publico?.id).toBe(id)
    expect(publico?.fotos).toHaveLength(2)
    expect(publico?.fotos[0]).toMatch(/\/api\/publico\/fotos\/perdidos\//)
    expect((await listaAdmin('publicado'))[0]?.fotos[0]?.url).toBe(publico?.fotos[0])
  })

  it('aprovar de novo: 409; se a cópia falhar, nada muda (503)', async () => {
    const id = await enviarERetornarId()
    vi.spyOn(teste.quarentena, 'copiar').mockRejectedValueOnce(new Error('R2 fora do ar'))
    expect((await admin(`/perdidos/${id}/aprovar`, 'POST')).status).toBe(503)
    expect((await listaAdmin('pendente'))[0]?.id).toBe(id)
    expect(chavesQuarentena()).toHaveLength(1)
    expect(chavesPublicas()).toEqual([])

    expect((await admin(`/perdidos/${id}/aprovar`, 'POST')).status).toBe(204)
    expect((await admin(`/perdidos/${id}/aprovar`, 'POST')).status).toBe(409)
  })

  it('recusar apaga o anúncio e as fotos da quarentena (RN26)', async () => {
    const id = await enviarERetornarId()
    expect((await admin(`/perdidos/${id}`, 'DELETE')).status).toBe(204)
    expect(await teste.db.select().from(perdidos)).toEqual([])
    expect(await teste.db.select().from(perdidosFotos)).toEqual([])
    expect(chavesQuarentena()).toEqual([])
  })

  it('tirar do ar / voltou para casa apaga o anúncio, as fotos públicas e sai do site (RN26)', async () => {
    const id = await enviarERetornarId()
    await admin(`/perdidos/${id}/aprovar`, 'POST')
    expect(await listaPublica()).toHaveLength(1)

    expect((await admin(`/perdidos/${id}`, 'DELETE')).status).toBe(204)
    expect(chavesPublicas()).toEqual([])
    expect(await listaPublica()).toEqual([])
  })

  it('se o armazenamento falhar ao apagar, o anúncio continua (503)', async () => {
    const id = await enviarERetornarId()
    vi.spyOn(teste.quarentena, 'apagarPrefixo').mockRejectedValueOnce(new Error('R2 fora do ar'))
    expect((await admin(`/perdidos/${id}`, 'DELETE')).status).toBe(503)
    expect(await listaAdmin('pendente')).toHaveLength(1)
  })

  it('renovar volta a contar 30 dias a partir de hoje, sem acumular (RN41)', async () => {
    const id = await enviarERetornarId()
    expect((await admin(`/perdidos/${id}/renovar`, 'POST')).status).toBe(409)
    await admin(`/perdidos/${id}/aprovar`, 'POST')
    await teste.db.execute(sql`UPDATE perdidos SET expira_em = now() + interval '2 days'`)

    const resposta = await admin(`/perdidos/${id}/renovar`, 'POST')
    expect(resposta.status).toBe(200)
    const { expira_em } = await json<{ expira_em: string }>(resposta)
    const dias = (new Date(expira_em).getTime() - Date.now()) / 86_400_000
    expect(dias).toBeGreaterThan(29.9)
    expect(dias).toBeLessThanOrEqual(30)
  })

  it('anúncio inexistente ou id malformado: 404', async () => {
    expect((await admin('/perdidos/00000000-0000-4000-8000-0000000009ff', 'DELETE')).status).toBe(
      404,
    )
    expect((await admin('/perdidos/nao-e-id/aprovar', 'POST')).status).toBe(404)
    expect((await admin('/perdidos/nao-e-id/fotos/nem-este')).status).toBe(404)
  })

  it('status inválido na lista: 400', async () => {
    expect((await admin('/perdidos?status=recusado')).status).toBe(400)
  })
})

describe('limpeza diária (RN25, RN27)', () => {
  it('apaga vencidos e pendentes esquecidos, com os arquivos; mantém os demais', async () => {
    const vencido = await enviarERetornarId(dados({ nome: 'Vencido' }), [webp()], '202.0.0.1')
    const noAr = await enviarERetornarId(dados({ nome: 'No ar' }), [webp()], '202.0.0.2')
    const esquecido = await enviarERetornarId(dados({ nome: 'Esquecido' }), [webp()], '202.0.0.3')
    const recente = await enviarERetornarId(dados({ nome: 'Recente' }), [webp()], '202.0.0.4')
    await admin(`/perdidos/${vencido}/aprovar`, 'POST')
    await admin(`/perdidos/${noAr}/aprovar`, 'POST')
    await teste.db.execute(sql`
      UPDATE perdidos SET publicado_em = now() - interval '31 days', expira_em = now() - interval '1 day'
      WHERE id = ${vencido}`)
    await teste.db.execute(sql`
      UPDATE perdidos SET created_at = now() - interval '8 days' WHERE id = ${esquecido}`)

    const resultado = await executarTarefasDiarias(teste.db, {
      fotos: teste.fotos,
      quarentena: teste.quarentena,
    })
    expect(resultado).toMatchObject({ perdidosVencidosApagados: 1, perdidosPendentesApagados: 1 })

    const restantes = await teste.db.select({ id: perdidos.id }).from(perdidos)
    expect(restantes.map((r) => r.id).sort()).toEqual([noAr, recente].sort())
    const comPrefixo = (id: string) => (k: string) => k.startsWith(`perdidos/${id}/`)
    expect(chavesPublicas().some(comPrefixo(vencido))).toBe(false)
    expect(chavesPublicas().some(comPrefixo(noAr))).toBe(true)
    expect(chavesQuarentena().some(comPrefixo(esquecido))).toBe(false)
    expect(chavesQuarentena().some(comPrefixo(recente))).toBe(true)
  })

  it('se os arquivos de um anúncio não puderem ser apagados, ele fica para a próxima noite', async () => {
    const esquecido = await enviarERetornarId()
    await teste.db.execute(sql`UPDATE perdidos SET created_at = now() - interval '8 days'`)
    vi.spyOn(teste.quarentena, 'apagarPrefixo').mockRejectedValueOnce(new Error('R2 fora do ar'))

    const resultado = await executarTarefasDiarias(teste.db, {
      fotos: teste.fotos,
      quarentena: teste.quarentena,
    })
    expect(resultado.perdidosPendentesApagados).toBe(0)
    expect((await teste.db.select({ id: perdidos.id }).from(perdidos))[0]?.id).toBe(esquecido)
  })
})
