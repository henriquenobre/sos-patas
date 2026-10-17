// Área da ONG, etapa 12: textos e listas das páginas (RN33–RN38, RN43, RN46). Parte do
// conteúdo inicial (seed_conteudo.sql) e confere o resultado também no GET /site público.
import { asc, eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConteudoAdmin, ItemAdmin, SitePublico, TextoAdmin } from '@sospatas/compartilhado'
import { animais, conteudoItens, equipe, fotos } from '@sospatas/db'
import { aplicarSeed } from '@sospatas/db/seed'
import type { CorpoErro } from '../erros'
import { CABECALHO_JWT_ACCESS } from '../middleware/access'
import { URL_TESTE, criarAppTeste, envTeste } from '../testes/apoio'

let teste: Awaited<ReturnType<typeof criarAppTeste>>
let tokenEquipe: string

/** Bytes que passam pela conferência WebP (RN21). */
function webp(tamanho = 64, marca = 0): Uint8Array {
  const bytes = new Uint8Array(tamanho).fill(marca)
  bytes.set(new TextEncoder().encode('RIFF'), 0)
  bytes.set(new TextEncoder().encode('WEBP'), 8)
  return bytes
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

/** Multipart como o navegador: "dados" (JSON, só no item novo) + miniatura + completa. */
function enviarFoto(caminho: string, dados?: unknown, arquivos = true) {
  const formulario = new FormData()
  if (dados !== undefined) formulario.append('dados', JSON.stringify(dados))
  if (arquivos) {
    formulario.append('miniatura', new Blob([webp(64, 1)], { type: 'image/webp' }), 'm.webp')
    formulario.append('completa', new Blob([webp(128, 2)], { type: 'image/webp' }), 'c.webp')
  }
  return teste.app.request(
    `/api/admin${caminho}`,
    { method: 'POST', headers: { [CABECALHO_JWT_ACCESS]: tokenEquipe }, body: formulario },
    envTeste(),
  )
}

const json = async <T>(resposta: Response) => (await resposta.json()) as T

async function site(): Promise<SitePublico> {
  return json<SitePublico>(await teste.app.request('/api/publico/site', {}, envTeste()))
}

async function itensNoBanco(lista: string) {
  return teste.db
    .select()
    .from(conteudoItens)
    .where(sql`${conteudoItens.lista} = ${lista}`)
    .orderBy(asc(conteudoItens.ordem))
}

/** Deixa a lista só com os itens dados (para testar mínimo e máximo). */
async function listaCom(lista: 'perguntas' | 'inicio_numeros', quantidade: number) {
  await teste.db.execute(sql`DELETE FROM conteudo_itens WHERE lista = ${lista}`)
  for (let ordem = 0; ordem < quantidade; ordem += 1) {
    await teste.db.insert(conteudoItens).values({
      lista,
      titulo: `Título ${String(ordem)}`,
      texto: `Texto ${String(ordem)}`,
      ordem,
    })
  }
}

beforeAll(async () => {
  teste = await criarAppTeste()
  await teste.db
    .insert(equipe)
    .values({ email: 'claudia@exemplo.com', nome: 'Claudia' })
    .onConflictDoNothing()
  tokenEquipe = await teste.token('claudia@exemplo.com')
})

beforeEach(async () => {
  vi.restoreAllMocks()
  teste.fotos.arquivos.clear()
  await teste.db.execute(sql`TRUNCATE animais, conteudo_itens, conteudo_textos, ong CASCADE`)
  await aplicarSeed(URL_TESTE, ['seed_conteudo.sql'])
})

afterAll(async () => {
  await teste.encerrar()
})

describe('leitura (T15–T20)', () => {
  it('traz todos os textos e as listas na ordem, com "Alterado em"', async () => {
    const resposta = await admin('/conteudo')
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get('Cache-Control')).toBeNull()
    const conteudo = await json<ConteudoAdmin>(resposta)
    expect(conteudo.textos['inicio.chamada_titulo'].valor).not.toBe('')
    expect(conteudo.textos['inicio.chamada_titulo'].alteracao?.em).toBeTruthy()
    const perguntas = await itensNoBanco('perguntas')
    expect(conteudo.listas.perguntas.map((item) => item.id)).toEqual(perguntas.map((p) => p.id))
    expect(conteudo.listas.inicio_fotos[0]?.foto?.completa).toMatch(/site\/historia\/.+\.webp$/)
  })

  it('sem login: 401', async () => {
    const resposta = await teste.app.request('/api/admin/conteudo', {}, envTeste())
    expect(resposta.status).toBe(401)
  })
})

describe('textos (CampoTextoEditavel, RN34, RN37, RN43)', () => {
  it('salva, grava quem alterou e aparece no site', async () => {
    const resposta = await admin('/conteudo/textos/inicio.chamada_titulo', 'PUT', {
      valor: '  Adote um amigo  ',
    })
    expect(resposta.status).toBe(200)
    const texto = await json<TextoAdmin>(resposta)
    expect(texto).toMatchObject({ valor: 'Adote um amigo', alteracao: { por: 'Claudia' } })
    expect((await site()).textos['inicio.chamada_titulo']).toBe('Adote um amigo')
  })

  it('texto obrigatório vazio e acima do limite: 400 com a mensagem', async () => {
    const vazio = await admin('/conteudo/textos/inicio.missao', 'PUT', { valor: '   ' })
    expect(vazio.status).toBe(400)
    expect((await json<CorpoErro>(vazio)).campos?.valor).toBe('Preencha este campo')

    const longo = await admin('/conteudo/textos/inicio.chamada_titulo', 'PUT', {
      valor: 'x'.repeat(61),
    })
    expect(longo.status).toBe(400)
    expect((await json<CorpoErro>(longo)).campos?.valor).toBe('Use até 60 caracteres')
  })

  it('texto opcional vazio esconde o bloco no site', async () => {
    const resposta = await admin('/conteudo/textos/ajude.introducao', 'PUT', { valor: '' })
    expect(resposta.status).toBe(200)
    expect((await site()).textos['ajude.introducao']).toBe('')
  })

  it('chave que não existe: 404', async () => {
    const resposta = await admin('/conteudo/textos/inicio.inventada', 'PUT', { valor: 'x' })
    expect(resposta.status).toBe(404)
  })
})

describe('animais da chamada do Início (T19, RN54)', () => {
  const ID = {
    thor: '00000000-0000-4000-8000-000000000001',
    mel: '00000000-0000-4000-8000-000000000002',
    semFoto: '00000000-0000-4000-8000-000000000003',
    adotado: '00000000-0000-4000-8000-000000000004',
  }

  beforeEach(async () => {
    const base = {
      sexo: 'macho' as const,
      castrado: true,
      vacinado: 'sim' as const,
      vermifugado: 'sim' as const,
      porte: 'medio' as const,
      nascimento_aprox: '2020-01-01',
    }
    await teste.db.insert(animais).values([
      { ...base, id: ID.thor, nome: 'Thor', especie: 'cao' },
      { ...base, id: ID.mel, nome: 'Mel', especie: 'gato' },
      { ...base, id: ID.semFoto, nome: 'Bob', especie: 'cao' },
      {
        ...base,
        id: ID.adotado,
        nome: 'Luna',
        especie: 'gato',
        status: 'adotado',
        data_adocao: '2026-10-01',
      },
    ])
    await teste.db.insert(fotos).values(
      [ID.thor, ID.mel, ID.adotado].map((id) => ({
        animal_id: id,
        ordem: 0,
        path_miniatura: `animais/${id}/f1-thumb.webp`,
        path_completa: `animais/${id}/f1.webp`,
      })),
    )
  })

  const salvar = (ids: (string | null)[]) => admin('/conteudo/chamada', 'PUT', { animais: ids })

  it('começa automático; salva, troca de posição e aparece no /site', async () => {
    expect((await json<ConteudoAdmin>(await admin('/conteudo'))).chamada).toEqual([null, null])
    expect((await site()).chamada).toEqual([null, null])

    const primeira = await salvar([ID.thor, ID.mel])
    expect(primeira.status).toBe(200)
    expect(await json<Pick<ConteudoAdmin, 'chamada'>>(primeira)).toEqual({
      chamada: [ID.thor, ID.mel],
    })
    expect((await site()).chamada).toEqual([ID.thor, ID.mel])

    // Trocar as posições não bate no índice único
    expect((await salvar([ID.mel, ID.thor])).status).toBe(200)
    expect((await site()).chamada).toEqual([ID.mel, ID.thor])

    expect((await salvar([null, ID.thor])).status).toBe(200)
    expect((await json<ConteudoAdmin>(await admin('/conteudo'))).chamada).toEqual([null, ID.thor])
  })

  it('escolhido que deixa de estar disponível some da chamada (volta a ser automático)', async () => {
    await salvar([ID.thor, ID.mel])
    await teste.db.execute(sql`UPDATE animais SET status = 'em_analise' WHERE id = ${ID.thor}`)
    expect((await site()).chamada).toEqual([null, ID.mel])
  })

  it('recusa animal adotado, sem foto, que não existe ou repetido, sem mudar nada', async () => {
    await salvar([ID.thor, null])

    const adotado = await salvar([ID.adotado, null])
    expect(adotado.status).toBe(409)
    expect((await json<CorpoErro>(adotado)).mensagem).toMatch(/Luna não está mais disponível/)

    const semFoto = await salvar([null, ID.semFoto])
    expect(semFoto.status).toBe(409)
    expect((await json<CorpoErro>(semFoto)).mensagem).toMatch(/Bob ainda não tem foto/)

    const sumiu = await salvar(['00000000-0000-4000-8000-000000000099', null])
    expect(sumiu.status).toBe(409)

    const repetido = await salvar([ID.mel, ID.mel])
    expect(repetido.status).toBe(400)

    expect((await salvar([ID.mel])).status).toBe(400)
    expect((await site()).chamada).toEqual([ID.thor, null])
  })
})

describe('itens de lista (ListaEditavel, T17)', () => {
  it('item novo entra no fim da lista e aparece no site (RN35)', async () => {
    const antes = await itensNoBanco('perguntas')
    const resposta = await admin('/conteudo/itens', 'POST', {
      lista: 'perguntas',
      titulo: 'Posso adotar mais de um?',
      texto: 'Sim, conversamos sobre cada caso.',
    })
    expect(resposta.status).toBe(201)
    const item = await json<ItemAdmin>(resposta)
    expect(item.alteracao.por).toBe('Claudia')
    const depois = await itensNoBanco('perguntas')
    expect(depois.at(-1)).toMatchObject({ id: item.id, ordem: antes.length })
    expect((await site()).listas.perguntas.at(-1)?.titulo).toBe('Posso adotar mais de um?')
  })

  it('campos conforme a lista: título obrigatório, lista sem título e limites', async () => {
    const semTitulo = await admin('/conteudo/itens', 'POST', { lista: 'perguntas', texto: 'Só' })
    expect(semTitulo.status).toBe(400)
    expect((await json<CorpoErro>(semTitulo)).campos?.titulo).toBe('Preencha este campo')

    const cuidado = await admin('/conteudo/itens', 'POST', {
      lista: 'como_adotar_antes',
      titulo: null,
      texto: 'Ter tempo para passear.',
    })
    expect(cuidado.status).toBe(201)
    expect((await json<ItemAdmin>(cuidado)).titulo).toBeNull()

    const longo = await admin('/conteudo/itens', 'POST', {
      lista: 'inicio_numeros',
      titulo: '+100',
      texto: 'x'.repeat(81),
    })
    expect(longo.status).toBe(400)

    const listaInvalida = await admin('/conteudo/itens', 'POST', { lista: 'nada', texto: 'x' })
    expect(listaInvalida.status).toBe(400)
  })

  it('edita o item com as regras da lista dele', async () => {
    const [primeiro] = await itensNoBanco('ajude_formas')
    const resposta = await admin(`/conteudo/itens/${primeiro?.id ?? ''}`, 'PUT', {
      titulo: 'Seja mensalista',
      texto: 'Com R$ 20 por mês você ajuda.',
    })
    expect(resposta.status).toBe(200)
    expect(await json<ItemAdmin>(resposta)).toMatchObject({ titulo: 'Seja mensalista' })
    expect((await site()).listas.ajude_formas[0]?.titulo).toBe('Seja mensalista')

    const semTitulo = await admin(`/conteudo/itens/${primeiro?.id ?? ''}`, 'PUT', {
      texto: 'Sem título',
    })
    expect(semTitulo.status).toBe(400)
  })

  it('máximo de 4 números (RN46): o 5º é recusado', async () => {
    await listaCom('inicio_numeros', 4)
    const resposta = await admin('/conteudo/itens', 'POST', {
      lista: 'inicio_numeros',
      titulo: '+50',
      texto: 'voluntários',
    })
    expect(resposta.status).toBe(409)
    expect((await json<CorpoErro>(resposta)).mensagem).toMatch(/até 4 itens/)
    expect(await itensNoBanco('inicio_numeros')).toHaveLength(4)
  })

  it('números adicionados ao mesmo tempo não passam de 4', async () => {
    await listaCom('inicio_numeros', 2)
    const respostas = await Promise.all(
      [1, 2, 3, 4].map(async (n) =>
        admin('/conteudo/itens', 'POST', {
          lista: 'inicio_numeros',
          titulo: `+${String(n)}`,
          texto: 'ao mesmo tempo',
        }),
      ),
    )
    expect(respostas.map((r) => r.status).sort()).toEqual([201, 201, 409, 409])
    const itens = await itensNoBanco('inicio_numeros')
    expect(itens.map((item) => item.ordem)).toEqual([0, 1, 2, 3])
  })

  it('não exclui a última pergunta (RN36); as seguintes sobem uma posição', async () => {
    await listaCom('perguntas', 2)
    const [primeira, segunda] = await itensNoBanco('perguntas')
    expect((await admin(`/conteudo/itens/${primeira?.id ?? ''}`, 'DELETE')).status).toBe(204)
    expect(await itensNoBanco('perguntas')).toMatchObject([{ id: segunda?.id, ordem: 0 }])

    const ultima = await admin(`/conteudo/itens/${segunda?.id ?? ''}`, 'DELETE')
    expect(ultima.status).toBe(409)
    expect((await json<CorpoErro>(ultima)).mensagem).toMatch(/ao menos 1 item/)
    expect(await itensNoBanco('perguntas')).toHaveLength(1)
  })

  it('lista sem mínimo pode ficar vazia (o bloco some do site)', async () => {
    for (const item of await itensNoBanco('inicio_marcos')) {
      expect((await admin(`/conteudo/itens/${item.id}`, 'DELETE')).status).toBe(204)
    }
    expect((await site()).listas.inicio_marcos).toEqual([])
  })

  it('item que não existe: 404', async () => {
    const id = '00000000-0000-4000-8000-000000000999'
    expect((await admin(`/conteudo/itens/${id}`, 'DELETE')).status).toBe(404)
    expect((await admin(`/conteudo/itens/${id}`, 'PUT', { texto: 'x' })).status).toBe(404)
    expect((await admin('/conteudo/itens/nao-e-id', 'DELETE')).status).toBe(404)
  })
})

describe('trocar a ordem com as setas (RN35)', () => {
  it('troca dois vizinhos numa transação e o site segue a nova ordem', async () => {
    const [a, b, c] = await itensNoBanco('perguntas')
    const resposta = await admin('/conteudo/itens/trocar-ordem', 'POST', {
      ids: [b?.id, c?.id],
    })
    expect(resposta.status).toBe(204)
    const ids = (await itensNoBanco('perguntas')).map((item) => item.id)
    expect(ids.slice(0, 3)).toEqual([a?.id, c?.id, b?.id])
    expect((await site()).listas.perguntas.slice(0, 3).map((item) => item.id)).toEqual(
      ids.slice(0, 3),
    )
  })

  it('itens que não são vizinhos ou de listas diferentes: 409, nada muda', async () => {
    const [a, , c] = await itensNoBanco('perguntas')
    const [passo] = await itensNoBanco('como_adotar_passos')
    const antes = await itensNoBanco('perguntas')

    const longe = await admin('/conteudo/itens/trocar-ordem', 'POST', { ids: [a?.id, c?.id] })
    expect(longe.status).toBe(409)
    const outraLista = await admin('/conteudo/itens/trocar-ordem', 'POST', {
      ids: [a?.id, passo?.id],
    })
    expect(outraLista.status).toBe(409)
    expect(await itensNoBanco('perguntas')).toEqual(antes)
  })
})

describe('fotos da história (RN38)', () => {
  it('foto nova: grava as duas versões e entra no fim, com a legenda', async () => {
    const resposta = await enviarFoto('/conteudo/itens', {
      lista: 'inicio_fotos',
      texto: 'Feira de adoção de 2024',
    })
    expect(resposta.status).toBe(201)
    const item = await json<ItemAdmin>(resposta)
    const [linha] = await teste.db.select().from(conteudoItens).where(eq(conteudoItens.id, item.id))
    expect(linha?.foto_path).toMatch(/^site\/historia\/[0-9a-f-]+\.webp$/)
    const caminho = linha?.foto_path ?? ''
    expect(teste.fotos.arquivos.has(caminho)).toBe(true)
    expect(teste.fotos.arquivos.has(caminho.replace('.webp', '-thumb.webp'))).toBe(true)
    expect((await site()).listas.inicio_fotos.at(-1)?.texto).toBe('Feira de adoção de 2024')
  })

  it('sem a foto, sem legenda ou com arquivo que não é WebP: recusado, nada gravado', async () => {
    const semFoto = await admin('/conteudo/itens', 'POST', { lista: 'inicio_fotos', texto: 'x' })
    expect(semFoto.status).toBe(400)
    expect((await json<CorpoErro>(semFoto)).campos?.foto).toBe('Escolha a foto')

    const semLegenda = await enviarFoto('/conteudo/itens', { lista: 'inicio_fotos', texto: '' })
    expect(semLegenda.status).toBe(400)

    const formulario = new FormData()
    formulario.append('dados', JSON.stringify({ lista: 'inicio_fotos', texto: 'Falsa' }))
    formulario.append('miniatura', new Blob([new Uint8Array(64)]), 'm.webp')
    formulario.append('completa', new Blob([new Uint8Array(64)]), 'c.webp')
    const falsa = await teste.app.request(
      '/api/admin/conteudo/itens',
      { method: 'POST', headers: { [CABECALHO_JWT_ACCESS]: tokenEquipe }, body: formulario },
      envTeste(),
    )
    expect(falsa.status).toBe(400)
    expect(teste.fotos.arquivos.size).toBe(0)
  })

  it('no máximo 8 fotos: a 9ª é recusada e não deixa arquivo', async () => {
    const atuais = (await itensNoBanco('inicio_fotos')).length
    for (let n = atuais; n < 8; n += 1) {
      const resposta = await enviarFoto('/conteudo/itens', { lista: 'inicio_fotos', texto: 'ok' })
      expect(resposta.status).toBe(201)
    }
    const arquivosAntes = teste.fotos.arquivos.size
    const nona = await enviarFoto('/conteudo/itens', { lista: 'inicio_fotos', texto: 'nona' })
    expect(nona.status).toBe(409)
    expect(teste.fotos.arquivos.size).toBe(arquivosAntes)
    expect(await itensNoBanco('inicio_fotos')).toHaveLength(8)
  })

  it('trocar a foto grava a nova e só então apaga a antiga', async () => {
    const [primeira] = await itensNoBanco('inicio_fotos')
    const antiga = primeira?.foto_path ?? ''
    await teste.fotos.colocar(antiga, webp(), 'image/webp')
    await teste.fotos.colocar(antiga.replace('.webp', '-thumb.webp'), webp(), 'image/webp')

    const resposta = await enviarFoto(`/conteudo/itens/${primeira?.id ?? ''}/foto`)
    expect(resposta.status).toBe(200)
    const [depois] = await itensNoBanco('inicio_fotos')
    expect(depois?.foto_path).not.toBe(antiga)
    expect(teste.fotos.arquivos.has(depois?.foto_path ?? '')).toBe(true)
    expect(teste.fotos.arquivos.has(antiga)).toBe(false)
    expect(teste.fotos.arquivos.has(antiga.replace('.webp', '-thumb.webp'))).toBe(false)
  })

  it('trocar a foto de item que não é da lista de fotos: 400', async () => {
    const [pergunta] = await itensNoBanco('perguntas')
    const resposta = await enviarFoto(`/conteudo/itens/${pergunta?.id ?? ''}/foto`)
    expect(resposta.status).toBe(400)
    expect(teste.fotos.arquivos.size).toBe(0)
  })

  it('excluir apaga os arquivos; se o armazenamento falhar, nada muda', async () => {
    const fotosAntes = await itensNoBanco('inicio_fotos')
    const [primeira, segunda] = fotosAntes
    const caminho = primeira?.foto_path ?? ''
    await teste.fotos.colocar(caminho, webp(), 'image/webp')

    vi.spyOn(teste.fotos, 'apagar').mockRejectedValueOnce(new Error('R2 fora do ar'))
    const falhou = await admin(`/conteudo/itens/${primeira?.id ?? ''}`, 'DELETE')
    expect(falhou.status).toBe(503)
    expect(await itensNoBanco('inicio_fotos')).toHaveLength(fotosAntes.length)

    const resposta = await admin(`/conteudo/itens/${primeira?.id ?? ''}`, 'DELETE')
    expect(resposta.status).toBe(204)
    expect(teste.fotos.arquivos.has(caminho)).toBe(false)
    expect((await itensNoBanco('inicio_fotos'))[0]).toMatchObject({ id: segunda?.id, ordem: 0 })
  })
})
