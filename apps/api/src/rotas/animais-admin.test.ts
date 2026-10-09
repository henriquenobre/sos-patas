// Área da ONG, etapa 9: animais (RN09, RN42, RN43), adoção e devolução (RN07, RN08, RN30,
// RN49), fotos (RN01–RN06) e protetores (RN42). O armazenamento é o de memória do apoio.
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TAMANHO_MAX_FOTO_BYTES,
  hojeNoBrasil,
  somarDias,
  subtrairMeses,
  type AnimalAdmin,
  type AnimalEntrada,
  type Criado,
  type FotoAdmin,
  type ListaAnimaisAdmin,
  type ListaProtetores,
  type ProtetorAdmin,
  type ResumoAdmin,
} from '@sospatas/compartilhado'
import {
  animais,
  animaisPrivado,
  equipe,
  fotos,
  pedidosAdocao,
  perdidos,
  protetores,
} from '@sospatas/db'
import type { CorpoErro } from '../erros'
import { CABECALHO_JWT_ACCESS } from '../middleware/access'
import { criarAppTeste, envTeste } from '../testes/apoio'

let teste: Awaited<ReturnType<typeof criarAppTeste>>
let tokenEquipe: string
let idGracia: string

const HOJE = hojeNoBrasil()
const diasAtras = (dias: number) => somarDias(HOJE, -dias)
const anosAtras = (anos: number) => subtrairMeses(HOJE, anos * 12)

const ID = {
  thor: '00000000-0000-4000-8000-000000000201', // adulto, há 200 dias, com lar e 3 fotos
  mel: '00000000-0000-4000-8000-000000000202', // gata do protetor Ana, há 10 dias
  nina: '00000000-0000-4000-8000-000000000203', // adotada neste mês
  tobias: '00000000-0000-4000-8000-000000000204', // em análise, pedido pendente
  pipoca: '00000000-0000-4000-8000-000000000205', // em análise, pedido aprovado
  ana: '00000000-0000-4000-8000-0000000002a1',
  beto: '00000000-0000-4000-8000-0000000002a2', // protetor sem animais
  pedidoTobias: '00000000-0000-4000-8000-0000000002c1',
  pedidoPipoca: '00000000-0000-4000-8000-0000000002c2',
}

const animalBase = {
  especie: 'cao' as const,
  sexo: 'macho' as const,
  porte: 'medio' as const,
  nascimento_aprox: anosAtras(3),
  castrado: true,
  vacinado: 'sim' as const,
  vermifugado: 'sim' as const,
}

/** Bytes que passam pela conferência WebP (RN21): "RIFF", tamanho, "WEBP" e conteúdo. */
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

/** Envia uma foto como o navegador: multipart com a miniatura e a completa (RN02). */
function enviarFoto(
  caminho: string,
  arquivos: { miniatura?: Uint8Array; completa?: Uint8Array } = {
    miniatura: webp(64, 1),
    completa: webp(128, 2),
  },
  metodo = 'POST',
) {
  const formulario = new FormData()
  if (arquivos.miniatura) {
    formulario.append('miniatura', new Blob([arquivos.miniatura], { type: 'image/webp' }), 'm.webp')
  }
  if (arquivos.completa) {
    formulario.append('completa', new Blob([arquivos.completa], { type: 'image/webp' }), 'c.webp')
  }
  return teste.app.request(
    `/api/admin${caminho}`,
    { method: metodo, headers: { [CABECALHO_JWT_ACCESS]: tokenEquipe }, body: formulario },
    envTeste(),
  )
}

const json = async <T>(resposta: Response) => (await resposta.json()) as T

async function fotosNoBanco(animalId: string) {
  return teste.db.select().from(fotos).where(eq(fotos.animal_id, animalId)).orderBy(fotos.ordem)
}

async function animalNoBanco(id: string) {
  const [linha] = await teste.db.select().from(animais).where(eq(animais.id, id))
  return linha
}

/** Cria as 3 fotos do Thor no banco e no armazenamento. */
async function darFotosAoThor() {
  const linhas = [0, 1, 2].map((ordem) => {
    const id = `00000000-0000-4000-8000-0000000002f${String(ordem)}`
    return {
      id,
      animal_id: ID.thor,
      ordem,
      path_miniatura: `animais/${ID.thor}/${id}-thumb.webp`,
      path_completa: `animais/${ID.thor}/${id}.webp`,
    }
  })
  await teste.db.insert(fotos).values(linhas)
  for (const linha of linhas) {
    await teste.fotos.colocar(linha.path_miniatura, webp(), 'image/webp')
    await teste.fotos.colocar(linha.path_completa, webp(), 'image/webp')
  }
  return linhas
}

const novoAnimal = (extra: Partial<AnimalEntrada> = {}): AnimalEntrada => ({
  nome: 'Bidu',
  especie: 'cao',
  sexo: 'macho',
  nascimento_aprox: anosAtras(2),
  porte: 'pequeno',
  castrado: false,
  vacinado: 'sem_informacao',
  vermifugado: 'nao',
  responsavel_tipo: 'ong',
  privado: {
    lar_nome: 'Casa da Claudia',
    lar_tipo: 'provisorio',
    observacoes: 'Tem medo de fogos',
  },
  ...extra,
})

beforeAll(async () => {
  teste = await criarAppTeste()
  await teste.db
    .insert(equipe)
    .values({ email: 'gracia@exemplo.com', nome: 'Gracia' })
    .onConflictDoNothing()
  const [gracia] = await teste.db
    .select({ id: equipe.id })
    .from(equipe)
    .where(eq(equipe.email, 'gracia@exemplo.com'))
  idGracia = gracia?.id ?? ''
  tokenEquipe = await teste.token('gracia@exemplo.com')
})

beforeEach(async () => {
  vi.restoreAllMocks()
  teste.fotos.arquivos.clear()
  await teste.db.execute(sql`TRUNCATE animais, protetores, perdidos CASCADE`)
  await teste.db.insert(protetores).values([
    { id: ID.ana, nome: 'Ana Paula', whatsapp: '35988887777' },
    { id: ID.beto, nome: 'Beto', whatsapp: '35977776666' },
  ])
  await teste.db.insert(animais).values([
    { ...animalBase, id: ID.thor, nome: 'Thor', data_entrada: diasAtras(200) },
    {
      ...animalBase,
      id: ID.mel,
      nome: 'Mel',
      especie: 'gato',
      sexo: 'femea',
      data_entrada: diasAtras(10),
      responsavel_tipo: 'protetor',
      protetor_id: ID.ana,
    },
    {
      ...animalBase,
      id: ID.nina,
      nome: 'Nina',
      status: 'adotado',
      data_adocao: HOJE,
      data_entrada: diasAtras(300),
    },
    { ...animalBase, id: ID.tobias, nome: 'Tobias', status: 'em_analise' },
    { ...animalBase, id: ID.pipoca, nome: 'Pipoca', status: 'em_analise' },
  ])
  await teste.db.insert(animaisPrivado).values([
    { animal_id: ID.thor, lar_nome: 'Lar da Gracia', lar_tipo: 'provisorio' },
    { animal_id: ID.nina, adotante_nome: 'Joana', adotante_whatsapp: '35911112222' },
  ])
  const pedidoBase = {
    whatsapp: '35933334444',
    bairro_cidade: 'Centro, Passos',
    versao_formulario: '1.2',
    respostas: {} as never,
    termo_ciente_em: new Date(),
    versao_termo: '1',
    consentimento_em: new Date(),
  }
  await teste.db.insert(pedidosAdocao).values([
    { ...pedidoBase, id: ID.pedidoTobias, animal_id: ID.tobias, nome: 'Fernanda' },
    {
      ...pedidoBase,
      id: ID.pedidoPipoca,
      animal_id: ID.pipoca,
      nome: 'Rafael',
      whatsapp: '35955556666',
      status: 'aprovado',
      analisado_em: new Date(),
    },
  ])
  await teste.db.insert(perdidos).values({
    tipo: 'perdido',
    especie: 'cao',
    bairro: 'Centro',
    data_ocorrido: HOJE,
    descricao: 'Coleira azul',
    contato_nome: 'Lia',
    contato_whatsapp: '35922223333',
    consentimento_em: new Date(),
  })
})

afterAll(async () => {
  await teste.encerrar()
})

describe('resumo do painel (T09)', () => {
  it('conta disponíveis, adultos esperando muito, adotados no mês e pendências', async () => {
    const resposta = await admin('/resumo')
    expect(resposta.status).toBe(200)
    expect(await json<ResumoAdmin>(resposta)).toEqual({
      disponiveis: 2,
      esperando_muito: 1, // só o Thor: a Mel entrou há 10 dias
      adotados_no_mes: 1,
      perdidos_pendentes: 1,
      pedidos_pendentes: 1,
    })
  })
})

describe('lista de animais (T09)', () => {
  const lista = async (query: string) =>
    (await json<ListaAnimaisAdmin>(await admin(`/animais${query}`))).animais

  it('disponíveis por padrão, os que esperam há mais tempo primeiro, com o lar (privado)', async () => {
    const animaisLista = await lista('')
    expect(animaisLista.map((animal) => animal.nome)).toEqual(['Thor', 'Mel'])
    expect(animaisLista[0]).toMatchObject({ lar_nome: 'Lar da Gracia', protetor: null })
    expect(animaisLista[1]?.protetor).toEqual({ id: ID.ana, nome: 'Ana Paula' })
  })

  it('aba Em análise mostra o pedido em andamento de cada animal', async () => {
    const animaisLista = await lista('?status=em_analise')
    expect(Object.fromEntries(animaisLista.map((animal) => [animal.nome, animal.pedido]))).toEqual({
      Tobias: { id: ID.pedidoTobias, status: 'pendente' },
      Pipoca: { id: ID.pedidoPipoca, status: 'aprovado' },
    })
  })

  it('aba Adotados traz a data da adoção (adaptação calculada no front, RN30)', async () => {
    const [nina] = await lista('?status=adotado')
    expect(nina).toMatchObject({ nome: 'Nina', data_adocao: HOJE, pedido: null })
  })

  it('filtra por responsável: SOS Patas, protetores ou um protetor', async () => {
    expect((await lista('?responsavel=ong')).map((a) => a.nome)).toEqual(['Thor'])
    expect((await lista('?responsavel=protetor')).map((a) => a.nome)).toEqual(['Mel'])
    expect((await lista(`?responsavel=${ID.ana}`)).map((a) => a.nome)).toEqual(['Mel'])
    expect(await lista(`?responsavel=${ID.beto}`)).toEqual([])
  })

  it('busca por parte do nome, sem diferenciar maiúsculas; % não vira curinga', async () => {
    expect((await lista('?busca=THO')).map((a) => a.nome)).toEqual(['Thor'])
    expect(await lista('?busca=%25')).toEqual([])
  })

  it('filtro inválido: 400', async () => {
    expect((await admin('/animais?status=sumido')).status).toBe(400)
    expect((await admin('/animais?responsavel=fulano')).status).toBe(400)
  })
})

describe('cadastro e edição (T10, T11)', () => {
  it('cria o animal com o bloco privado e grava quem cadastrou (RN43)', async () => {
    const resposta = await admin('/animais', 'POST', novoAnimal())
    expect(resposta.status).toBe(201)
    const { id } = await json<Criado>(resposta)

    const ficha = await json<AnimalAdmin>(await admin(`/animais/${id}`))
    expect(ficha).toMatchObject({
      nome: 'Bidu',
      status: 'disponivel',
      data_entrada: HOJE,
      privado: {
        lar_nome: 'Casa da Claudia',
        lar_tipo: 'provisorio',
        observacoes: 'Tem medo de fogos',
      },
      fotos: [],
      pedido_aprovado: null,
      alteracao: { por: 'Gracia' },
    })
  })

  it('animal de protetor: o protetor precisa existir (RN42)', async () => {
    const sumido = '00000000-0000-4000-8000-0000000002ff'
    const resposta = await admin(
      '/animais',
      'POST',
      novoAnimal({ responsavel_tipo: 'protetor', protetor_id: sumido }),
    )
    expect(resposta.status).toBe(400)
    expect((await json<CorpoErro>(resposta)).campos).toHaveProperty('protetor_id')
    expect(await teste.db.select().from(animais).where(eq(animais.nome, 'Bidu'))).toEqual([])
  })

  it('campos inválidos: 400 com a mensagem de cada campo', async () => {
    const resposta = await admin('/animais', 'POST', { ...novoAnimal(), nome: '' })
    expect(resposta.status).toBe(400)
    expect((await json<CorpoErro>(resposta)).campos).toHaveProperty('nome')
  })

  it('edita os campos e o bloco privado; status e adoção não mudam pelo formulário', async () => {
    const resposta = await admin(
      `/animais/${ID.thor}`,
      'PUT',
      novoAnimal({
        nome: 'Thor II',
        responsavel_tipo: 'protetor',
        protetor_id: ID.beto,
        privado: { lar_nome: null, lar_tipo: null, observacoes: 'Mudou de lar' },
      }),
    )
    expect(resposta.status).toBe(204)

    const thor = await animalNoBanco(ID.thor)
    expect(thor).toMatchObject({
      nome: 'Thor II',
      protetor_id: ID.beto,
      status: 'disponivel',
      data_entrada: diasAtras(200), // sem data_entrada no corpo, fica a que estava
      updated_by: idGracia,
    })
    const [privado] = await teste.db
      .select()
      .from(animaisPrivado)
      .where(eq(animaisPrivado.animal_id, ID.thor))
    expect(privado).toMatchObject({ lar_nome: null, observacoes: 'Mudou de lar' })
  })

  it('animal que não existe: 404', async () => {
    const sumido = '00000000-0000-4000-8000-0000000002ff'
    expect((await admin(`/animais/${sumido}`)).status).toBe(404)
    expect((await admin(`/animais/${sumido}`, 'PUT', novoAnimal())).status).toBe(404)
    expect((await admin('/animais/nao-e-uuid')).status).toBe(404)
  })
})

describe('marcar como adotado (RN07, RN08, RN30)', () => {
  const adotante = { adotante_nome: 'Carla Dias', adotante_whatsapp: '(35) 9 9876-5432' }

  it('deixa só a foto principal, apaga os arquivos das outras e guarda o adotante', async () => {
    const [principal, segunda, terceira] = await darFotosAoThor()
    const resposta = await admin(`/animais/${ID.thor}/adocao`, 'POST', adotante)
    expect(resposta.status).toBe(204)

    expect(await animalNoBanco(ID.thor)).toMatchObject({
      status: 'adotado',
      data_adocao: HOJE,
      updated_by: idGracia,
    })
    expect((await fotosNoBanco(ID.thor)).map((foto) => foto.id)).toEqual([principal?.id])
    const restantes = [...teste.fotos.arquivos.keys()].sort()
    expect(restantes).toEqual([principal?.path_completa, principal?.path_miniatura].sort())
    expect(restantes).not.toContain(segunda?.path_completa)
    expect(restantes).not.toContain(terceira?.path_miniatura)

    const [privado] = await teste.db
      .select()
      .from(animaisPrivado)
      .where(eq(animaisPrivado.animal_id, ID.thor))
    expect(privado).toMatchObject({
      lar_nome: 'Lar da Gracia',
      adotante_nome: 'Carla Dias',
      adotante_whatsapp: '35998765432',
    })
  })

  it('pedido aprovado: a ficha traz quem pediu para preencher o modal, e a adoção vale (RN49)', async () => {
    const ficha = await json<AnimalAdmin>(await admin(`/animais/${ID.pipoca}`))
    expect(ficha.pedido_aprovado).toEqual({
      id: ID.pedidoPipoca,
      nome: 'Rafael',
      whatsapp: '35955556666',
    })
    const resposta = await admin(`/animais/${ID.pipoca}/adocao`, 'POST', {
      adotante_nome: 'Rafael',
      adotante_whatsapp: '35955556666',
    })
    expect(resposta.status).toBe(204)
    expect((await animalNoBanco(ID.pipoca))?.status).toBe('adotado')
  })

  it('com pedido aguardando análise: 409, nada muda', async () => {
    const resposta = await admin(`/animais/${ID.tobias}/adocao`, 'POST', adotante)
    expect(resposta.status).toBe(409)
    expect((await json<CorpoErro>(resposta)).mensagem).toContain('Aprove ou recuse')
    expect((await animalNoBanco(ID.tobias))?.status).toBe('em_analise')
  })

  it('já adotado: 409', async () => {
    expect((await admin(`/animais/${ID.nina}/adocao`, 'POST', adotante)).status).toBe(409)
  })

  it('se o armazenamento falhar, nada muda no banco (503)', async () => {
    await darFotosAoThor()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(teste.fotos, 'apagar').mockRejectedValueOnce(new Error('R2 fora do ar'))

    const resposta = await admin(`/animais/${ID.thor}/adocao`, 'POST', adotante)
    expect(resposta.status).toBe(503)
    expect((await animalNoBanco(ID.thor))?.status).toBe('disponivel')
    expect(await fotosNoBanco(ID.thor)).toHaveLength(3)
  })

  it('sem nome ou WhatsApp do adotante: 400', async () => {
    const resposta = await admin(`/animais/${ID.thor}/adocao`, 'POST', { adotante_nome: '' })
    expect(resposta.status).toBe(400)
    expect(Object.keys((await json<CorpoErro>(resposta)).campos ?? {})).toEqual(
      expect.arrayContaining(['adotante_nome', 'adotante_whatsapp']),
    )
  })
})

describe('voltar para disponível (RN30, RN49)', () => {
  it('adotado volta, sem data de adoção e sem os dados do adotante', async () => {
    expect((await admin(`/animais/${ID.nina}/devolucao`, 'POST')).status).toBe(204)
    expect(await animalNoBanco(ID.nina)).toMatchObject({
      status: 'disponivel',
      data_adocao: null,
      updated_by: idGracia,
    })
    const [privado] = await teste.db
      .select()
      .from(animaisPrivado)
      .where(eq(animaisPrivado.animal_id, ID.nina))
    expect(privado).toMatchObject({ adotante_nome: null, adotante_whatsapp: null })
  })

  it('adoção aprovada que não aconteceu: o pedido vira "não concluído"', async () => {
    expect((await admin(`/animais/${ID.pipoca}/devolucao`, 'POST')).status).toBe(204)
    expect((await animalNoBanco(ID.pipoca))?.status).toBe('disponivel')
    const [pedido] = await teste.db
      .select({ status: pedidosAdocao.status })
      .from(pedidosAdocao)
      .where(eq(pedidosAdocao.id, ID.pedidoPipoca))
    expect(pedido?.status).toBe('nao_concluido')
  })

  it('pedido aguardando análise: 409 (recusar o pedido é que devolve o animal)', async () => {
    expect((await admin(`/animais/${ID.tobias}/devolucao`, 'POST')).status).toBe(409)
    expect((await animalNoBanco(ID.tobias))?.status).toBe('em_analise')
  })

  it('já disponível: 409', async () => {
    expect((await admin(`/animais/${ID.thor}/devolucao`, 'POST')).status).toBe(409)
  })
})

describe('excluir animal (RN05, RN09)', () => {
  it('apaga todos os arquivos do animal e depois o registro (com fotos, privado e pedidos)', async () => {
    await darFotosAoThor()
    await teste.fotos.colocar(`animais/${ID.mel}/outra.webp`, webp(), 'image/webp')

    expect((await admin(`/animais/${ID.thor}`, 'DELETE')).status).toBe(204)
    expect(await animalNoBanco(ID.thor)).toBeUndefined()
    expect(await fotosNoBanco(ID.thor)).toEqual([])
    expect([...teste.fotos.arquivos.keys()]).toEqual([`animais/${ID.mel}/outra.webp`])

    expect((await admin(`/animais/${ID.tobias}`, 'DELETE')).status).toBe(204)
    expect(
      await teste.db.select().from(pedidosAdocao).where(eq(pedidosAdocao.id, ID.pedidoTobias)),
    ).toEqual([])
  })

  it('se o armazenamento falhar, NÃO apaga o registro (503)', async () => {
    await darFotosAoThor()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(teste.fotos, 'apagarPrefixo').mockRejectedValueOnce(new Error('R2 fora do ar'))

    const resposta = await admin(`/animais/${ID.thor}`, 'DELETE')
    expect(resposta.status).toBe(503)
    expect((await json<CorpoErro>(resposta)).mensagem).toContain('não foi excluído')
    expect(await animalNoBanco(ID.thor)).toBeDefined()
    expect(await fotosNoBanco(ID.thor)).toHaveLength(3)
  })

  it('animal que não existe: 404', async () => {
    expect((await admin('/animais/00000000-0000-4000-8000-0000000002ff', 'DELETE')).status).toBe(
      404,
    )
  })
})

describe('fotos (RN01–RN06)', () => {
  it('envia até 3 fotos, uma em cada posição; a 4ª é recusada', async () => {
    for (const ordem of [0, 1, 2]) {
      const resposta = await enviarFoto(`/animais/${ID.mel}/fotos`)
      expect(resposta.status).toBe(201)
      const foto = await json<FotoAdmin>(resposta)
      expect(foto.ordem).toBe(ordem)
      expect(foto.miniatura).toBe(`/api/publico/fotos/animais/${ID.mel}/${foto.id}-thumb.webp`)
    }
    expect(teste.fotos.arquivos.size).toBe(6)
    expect((await animalNoBanco(ID.mel))?.updated_by).toBe(idGracia)

    const quarta = await enviarFoto(`/animais/${ID.mel}/fotos`)
    expect(quarta.status).toBe(409)
    expect(teste.fotos.arquivos.size).toBe(6)
    expect(await fotosNoBanco(ID.mel)).toHaveLength(3)
  })

  it('duas fotos ao mesmo tempo: as duas entram, cada uma numa posição', async () => {
    const respostas = await Promise.all([
      enviarFoto(`/animais/${ID.mel}/fotos`),
      enviarFoto(`/animais/${ID.mel}/fotos`),
    ])
    expect(respostas.map((r) => r.status)).toEqual([201, 201])
    const ordens = await Promise.all(respostas.map(async (r) => (await json<FotoAdmin>(r)).ordem))
    expect(ordens.sort()).toEqual([0, 1])
    expect(teste.fotos.arquivos.size).toBe(4)
  })

  it('várias fotos ao mesmo tempo não passam do limite, e as recusadas não deixam arquivo', async () => {
    const respostas = await Promise.all(
      Array.from({ length: 5 }, async () => enviarFoto(`/animais/${ID.mel}/fotos`)),
    )
    expect(respostas.map((r) => r.status).sort()).toEqual([201, 201, 201, 409, 409])
    expect(await fotosNoBanco(ID.mel)).toHaveLength(3)
    expect(teste.fotos.arquivos.size).toBe(6)
  })

  it('arquivo que não é WebP é recusado, mesmo com o tipo image/webp (RN21)', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    const resposta = await enviarFoto(`/animais/${ID.mel}/fotos`, {
      miniatura: webp(),
      completa: png,
    })
    expect(resposta.status).toBe(400)
    expect((await json<CorpoErro>(resposta)).erro).toBe('foto_invalida')
    expect(teste.fotos.arquivos.size).toBe(0)
    expect(await fotosNoBanco(ID.mel)).toEqual([])
  })

  it('foto maior que 500 KB é recusada', async () => {
    const resposta = await enviarFoto(`/animais/${ID.mel}/fotos`, {
      miniatura: webp(),
      completa: webp(TAMANHO_MAX_FOTO_BYTES + 1),
    })
    expect(resposta.status).toBe(400)
    expect((await json<CorpoErro>(resposta)).erro).toBe('foto_grande')
  })

  it('sem a miniatura ou a completa: 400', async () => {
    const resposta = await enviarFoto(`/animais/${ID.mel}/fotos`, { completa: webp() })
    expect(resposta.status).toBe(400)
  })

  it('trocar grava arquivos novos, mantém a posição e apaga os antigos (RN06)', async () => {
    const [principal] = await darFotosAoThor()
    const resposta = await enviarFoto(
      `/animais/${ID.thor}/fotos/${principal?.id ?? ''}`,
      undefined,
      'PUT',
    )
    expect(resposta.status).toBe(200)
    const nova = await json<FotoAdmin>(resposta)
    expect(nova).toMatchObject({ id: principal?.id, ordem: 0 })

    const [linha] = await fotosNoBanco(ID.thor)
    expect(linha?.path_completa).not.toBe(principal?.path_completa)
    expect(teste.fotos.arquivos.has(linha?.path_completa ?? '')).toBe(true)
    expect(teste.fotos.arquivos.has(principal?.path_completa ?? '')).toBe(false)
    expect(teste.fotos.arquivos.has(principal?.path_miniatura ?? '')).toBe(false)
    expect(teste.fotos.arquivos.size).toBe(6)
  })

  it('remover apaga os arquivos e as seguintes sobem uma posição (a 2ª vira a principal)', async () => {
    const [principal, segunda, terceira] = await darFotosAoThor()
    const resposta = await admin(`/animais/${ID.thor}/fotos/${principal?.id ?? ''}`, 'DELETE')
    expect(resposta.status).toBe(204)

    expect((await fotosNoBanco(ID.thor)).map((foto) => [foto.id, foto.ordem])).toEqual([
      [segunda?.id, 0],
      [terceira?.id, 1],
    ])
    expect(teste.fotos.arquivos.has(principal?.path_completa ?? '')).toBe(false)
    expect(teste.fotos.arquivos.size).toBe(4)
  })

  it('remover com o armazenamento fora do ar: 503 e a foto continua', async () => {
    const [principal] = await darFotosAoThor()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(teste.fotos, 'apagar').mockRejectedValueOnce(new Error('R2 fora do ar'))
    const resposta = await admin(`/animais/${ID.thor}/fotos/${principal?.id ?? ''}`, 'DELETE')
    expect(resposta.status).toBe(503)
    expect(await fotosNoBanco(ID.thor)).toHaveLength(3)
  })

  it('reordenar troca as posições numa transação; a primeira vira a principal', async () => {
    const [principal, segunda, terceira] = await darFotosAoThor()
    const ordem = [terceira?.id, principal?.id, segunda?.id]
    const resposta = await admin(`/animais/${ID.thor}/fotos/ordem`, 'PUT', { fotos: ordem })
    expect(resposta.status).toBe(204)
    expect((await fotosNoBanco(ID.thor)).map((foto) => foto.id)).toEqual(ordem)
  })

  it('reordenar com uma lista que não é a das fotos atuais: 409', async () => {
    const [principal, segunda] = await darFotosAoThor()
    const resposta = await admin(`/animais/${ID.thor}/fotos/ordem`, 'PUT', {
      fotos: [segunda?.id, principal?.id],
    })
    expect(resposta.status).toBe(409)
    expect((await fotosNoBanco(ID.thor)).map((foto) => foto.id)).toEqual([
      principal?.id,
      segunda?.id,
      expect.any(String),
    ])
  })

  it('foto de outro animal: 404', async () => {
    const [principal] = await darFotosAoThor()
    expect((await admin(`/animais/${ID.mel}/fotos/${principal?.id ?? ''}`, 'DELETE')).status).toBe(
      404,
    )
  })
})

describe('protetores parceiros (RN42)', () => {
  it('lista em ordem alfabética, com quantos animais cada um tem', async () => {
    const { protetores: lista } = await json<ListaProtetores>(await admin('/protetores'))
    expect(lista.map((p) => [p.nome, p.animais, p.animais_disponiveis])).toEqual([
      ['Ana Paula', 1, 1],
      ['Beto', 0, 0],
    ])
  })

  it('cria (inclusive pelo cadastro do animal) e devolve o protetor pronto para a lista', async () => {
    const resposta = await admin('/protetores', 'POST', {
      nome: 'Carla',
      whatsapp: '(35) 9 9123-4567',
    })
    expect(resposta.status).toBe(201)
    expect(await json<ProtetorAdmin>(resposta)).toMatchObject({
      nome: 'Carla',
      whatsapp: '35991234567',
      animais: 0,
      alteracao: { por: 'Gracia' },
    })
  })

  it('edita o nome e o WhatsApp (vale para todos os animais dele)', async () => {
    const resposta = await admin(`/protetores/${ID.ana}`, 'PUT', {
      nome: 'Ana Paula Lima',
      whatsapp: '35900001111',
    })
    expect(resposta.status).toBe(204)
    const [ana] = await teste.db.select().from(protetores).where(eq(protetores.id, ID.ana))
    expect(ana).toMatchObject({ nome: 'Ana Paula Lima', updated_by: idGracia })
  })

  it('não exclui protetor com animais: 409 com o aviso da RN42', async () => {
    const resposta = await admin(`/protetores/${ID.ana}`, 'DELETE')
    expect(resposta.status).toBe(409)
    expect((await json<CorpoErro>(resposta)).mensagem).toBe(
      'Ana Paula tem 1 animal. Troque o responsável deles antes de excluir.',
    )
  })

  it('exclui protetor sem animais', async () => {
    expect((await admin(`/protetores/${ID.beto}`, 'DELETE')).status).toBe(204)
    expect(await teste.db.select().from(protetores).where(eq(protetores.id, ID.beto))).toEqual([])
  })

  it('protetor que não existe: 404', async () => {
    const sumido = '00000000-0000-4000-8000-0000000002ff'
    expect((await admin(`/protetores/${sumido}`, 'DELETE')).status).toBe(404)
    expect(
      (await admin(`/protetores/${sumido}`, 'PUT', { nome: 'X', whatsapp: '35900001111' })).status,
    ).toBe(404)
  })
})

describe('acesso', () => {
  it('sem o login do Access, nenhuma rota da etapa 9 responde', async () => {
    for (const caminho of ['/resumo', '/animais', `/animais/${ID.thor}`, '/protetores']) {
      const resposta = await teste.app.request(`/api/admin${caminho}`, {}, envTeste())
      expect(resposta.status).toBe(401)
    }
  })
})
