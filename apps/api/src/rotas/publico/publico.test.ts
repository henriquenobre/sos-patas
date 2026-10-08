// Rotas públicas: regras da vitrine (RN10–RN12), ficha (RN31), perdidos (RN18, RN25) e,
// principalmente, que NENHUM dado interno vaza (docs/DESENVOLVIMENTO.md, seção 5).
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  NOMES_LISTA,
  TEXTOS,
  hojeNoBrasil,
  somarDias,
  subtrairMeses,
  type AnimalFicha,
  type ListaAnimais,
  type ListaPerdidos,
  type SitePublico,
} from '@sospatas/compartilhado'
import {
  animais,
  animaisPrivado,
  equipe,
  fotos,
  perdidos,
  perdidosFotos,
  protetores,
} from '@sospatas/db'
import { aplicarSeed } from '@sospatas/db/seed'
import type { CorpoErro } from '../../erros'
import { URL_TESTE, criarAppTeste, envTeste } from '../../testes/apoio'

let teste: Awaited<ReturnType<typeof criarAppTeste>>

const HOJE = hojeNoBrasil()
const diasAtras = (dias: number) => somarDias(HOJE, -dias)
const anosAtras = (anos: number) => subtrairMeses(HOJE, anos * 12)
const agora = Date.now()
const horasAtras = (horas: number) => new Date(agora - horas * 3_600_000)

/** Marcadores colocados em campos internos: nenhum pode aparecer numa resposta pública. */
const SEGREDOS = [
  'LAR-SECRETO',
  'OBS-SECRETA',
  'ADOTANTE-SECRETO',
  '35900009999', // WhatsApp do adotante
  'HASH-SECRETO',
  'PENDENTE-SECRETO',
  'VENCIDO-SECRETO',
  'equipe-secreta@exemplo.com',
]

const ID = {
  thor: '00000000-0000-4000-8000-000000000001', // adulto, cão grande, esperando há 400 dias
  mel: '00000000-0000-4000-8000-000000000002', // adulta, gata, de protetor, há 200 dias
  nina: '00000000-0000-4000-8000-000000000003', // adulta, cão, exatamente 90 dias
  pipoca: '00000000-0000-4000-8000-000000000004', // filhote, gata, convive
  bolinha: '00000000-0000-4000-8000-000000000005', // adotada
  protetor: '00000000-0000-4000-8000-0000000000aa',
  bob: '00000000-0000-4000-8000-0000000000b1', // perdido publicado
  gato: '00000000-0000-4000-8000-0000000000b2', // encontrado publicado
  vencido: '00000000-0000-4000-8000-0000000000b3',
  pendente: '00000000-0000-4000-8000-0000000000b4',
}

const base = {
  sexo: 'macho' as const,
  castrado: true,
  vacinado: 'sim' as const,
  vermifugado: 'sim' as const,
}

beforeAll(async () => {
  teste = await criarAppTeste()
  const { db } = teste
  await db.execute(
    sql`TRUNCATE animais, protetores, perdidos, conteudo_itens, conteudo_textos, ong CASCADE`,
  )
  await aplicarSeed(URL_TESTE, ['seed_conteudo.sql'])

  const [alguem] = await db
    .insert(equipe)
    .values({ email: 'equipe-secreta@exemplo.com', nome: 'Secreta' })
    .onConflictDoUpdate({ target: equipe.email, set: { nome: 'Secreta' } })
    .returning({ id: equipe.id })

  await db.insert(protetores).values({
    id: ID.protetor,
    nome: 'Protetora Ana Paula',
    whatsapp: '35900000000',
    updated_by: alguem?.id,
  })

  await db.insert(animais).values([
    {
      ...base,
      id: ID.thor,
      nome: 'Thor',
      especie: 'cao',
      porte: 'grande',
      nascimento_aprox: anosAtras(5),
      data_entrada: diasAtras(400),
      convive_animais: false,
      updated_by: alguem?.id,
    },
    {
      ...base,
      id: ID.mel,
      nome: 'Mel',
      sexo: 'femea',
      especie: 'gato',
      porte: 'pequeno',
      nascimento_aprox: anosAtras(3),
      data_entrada: diasAtras(200),
      convive_animais: true,
      responsavel_tipo: 'protetor',
      protetor_id: ID.protetor,
    },
    {
      ...base,
      id: ID.nina,
      nome: 'Nina',
      sexo: 'femea',
      especie: 'cao',
      porte: 'medio',
      nascimento_aprox: anosAtras(2),
      data_entrada: diasAtras(90),
    },
    {
      ...base,
      id: ID.pipoca,
      nome: 'Pipoca',
      sexo: 'femea',
      especie: 'gato',
      porte: 'mini',
      nascimento_aprox: subtrairMeses(HOJE, 3),
      data_entrada: diasAtras(500),
      convive_animais: true,
      castrado: false,
    },
    {
      ...base,
      id: ID.bolinha,
      nome: 'Bolinha',
      sexo: 'femea',
      especie: 'cao',
      porte: 'mini',
      nascimento_aprox: anosAtras(4),
      data_entrada: diasAtras(600),
      status: 'adotado',
      data_adocao: diasAtras(3),
    },
  ])

  await db.insert(animaisPrivado).values([
    {
      animal_id: ID.thor,
      lar_nome: 'LAR-SECRETO',
      lar_tipo: 'remunerado',
      observacoes: 'OBS-SECRETA',
    },
    {
      animal_id: ID.bolinha,
      lar_nome: 'LAR-SECRETO',
      observacoes: 'OBS-SECRETA',
      adotante_nome: 'ADOTANTE-SECRETO',
      adotante_whatsapp: '35900009999',
    },
  ])

  await db.insert(fotos).values([
    {
      animal_id: ID.thor,
      ordem: 1,
      path_miniatura: `animais/${ID.thor}/f2-thumb.webp`,
      path_completa: `animais/${ID.thor}/f2.webp`,
    },
    {
      animal_id: ID.thor,
      ordem: 0,
      path_miniatura: `animais/${ID.thor}/f1-thumb.webp`,
      path_completa: `animais/${ID.thor}/f1.webp`,
    },
  ])

  const anuncio = {
    especie: 'cao' as const,
    bairro: 'Centro',
    data_ocorrido: diasAtras(2),
    descricao: 'Caramelo de coleira vermelha',
    contato_nome: 'Marcos',
    contato_whatsapp: '35900000001',
    consentimento_em: horasAtras(50),
  }
  await db.insert(perdidos).values([
    {
      ...anuncio,
      id: ID.bob,
      tipo: 'perdido',
      nome: 'Bob',
      status: 'publicado',
      publicado_em: horasAtras(48),
      expira_em: somarHoras(30 * 24 - 48),
      ip_hash: 'HASH-SECRETO',
      updated_by: alguem?.id,
    },
    {
      ...anuncio,
      id: ID.gato,
      tipo: 'encontrado',
      especie: 'gato',
      origem: 'equipe',
      status: 'publicado',
      publicado_em: horasAtras(5),
      expira_em: somarHoras(30 * 24 - 5),
    },
    {
      ...anuncio,
      id: ID.vencido,
      tipo: 'perdido',
      contato_nome: 'VENCIDO-SECRETO',
      status: 'publicado',
      publicado_em: horasAtras(31 * 24),
      expira_em: horasAtras(24),
    },
    {
      ...anuncio,
      id: ID.pendente,
      tipo: 'perdido',
      contato_nome: 'PENDENTE-SECRETO',
      status: 'pendente',
    },
  ])
  await db.insert(perdidosFotos).values([
    { perdido_id: ID.bob, path: `perdidos/${ID.bob}/f1.webp` },
    { perdido_id: ID.pendente, path: `perdidos/${ID.pendente}/f1.webp` },
  ])
})

function somarHoras(horas: number) {
  return new Date(agora + horas * 3_600_000)
}

afterAll(async () => {
  await teste.encerrar()
})

// O tipo do corpo é informado por quem chama, como num cliente HTTP
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
async function get<T>(caminho: string, env = envTeste()) {
  const resposta = await teste.app.request(`/api/publico${caminho}`, {}, env)
  const texto = await resposta.text()
  return { status: resposta.status, texto, corpo: JSON.parse(texto) as T, resposta }
}

function semSegredos(texto: string) {
  for (const segredo of SEGREDOS) expect(texto, `vazou "${segredo}"`).not.toContain(segredo)
  for (const campo of [
    'lar_nome',
    'observacoes',
    'adotante',
    'ip_hash',
    'updated_by',
    'consentimento_em',
    'origem',
    'created_at',
  ]) {
    expect(texto, `campo interno "${campo}"`).not.toContain(`"${campo}`)
  }
}

describe('GET /site', () => {
  it('traz a ONG, todos os textos e as listas na ordem', async () => {
    const { status, corpo } = await get<SitePublico>('/site')
    expect(status).toBe(200)
    expect(corpo.ong).toMatchObject({ instagram: 'sospatas.ong', pix_tipo: 'cnpj' })
    expect(Object.keys(corpo.textos).sort()).toEqual(Object.keys(TEXTOS).sort())
    expect(Object.keys(corpo.listas).sort()).toEqual([...NOMES_LISTA].sort())
    expect(corpo.listas.inicio_numeros.map((item) => item.titulo)).toEqual([
      'Desde 2015',
      '+100',
      '+1.000',
    ])
  })

  it('fotos da história com miniatura e completa', async () => {
    const { corpo } = await get<SitePublico>('/site')
    const [primeira] = corpo.listas.inicio_fotos
    expect(primeira?.foto?.completa).toMatch(/^\/api\/publico\/fotos\/site\/historia\/.+\.webp$/)
    expect(primeira?.foto?.miniatura).toMatch(/-thumb\.webp$/)
    expect(corpo.listas.perguntas[0]?.foto).toBeNull()
  })

  it('não expõe quem alterou', async () => {
    semSegredos((await get('/site')).texto)
  })
})

describe('GET /animais (vitrine)', () => {
  const nomes = (lista: ListaAnimais) => lista.animais.map((animal) => animal.nome)

  it('só disponíveis, mais antigos primeiro (RN10)', async () => {
    const { corpo } = await get<ListaAnimais>('/animais')
    expect(nomes(corpo)).toEqual(['Pipoca', 'Thor', 'Mel', 'Nina'])
  })

  it('card com a miniatura da foto principal (RN03)', async () => {
    const { corpo } = await get<ListaAnimais>('/animais')
    const thor = corpo.animais.find((animal) => animal.nome === 'Thor')
    expect(thor?.foto).toBe(`/api/publico/fotos/animais/${ID.thor}/f1-thumb.webp`)
    expect(corpo.animais.find((animal) => animal.nome === 'Nina')?.foto).toBeNull()
  })

  it.each([
    ['?especie=gato', ['Pipoca', 'Mel']],
    ['?porte=grande', ['Thor']],
    ['?idade=filhote', ['Pipoca']],
    ['?idade=adulto', ['Thor', 'Mel', 'Nina']],
    ['?convive=sim', ['Pipoca', 'Mel']],
    ['?especie=gato&idade=adulto&convive=sim', ['Mel']],
    ['?especie=&porte=', ['Pipoca', 'Thor', 'Mel', 'Nina']],
  ])('filtro %s', async (query, esperado) => {
    expect(nomes((await get<ListaAnimais>(`/animais${query}`)).corpo)).toEqual(esperado)
  })

  it('filtro inválido: 400', async () => {
    const { status, corpo } = await get<CorpoErro>('/animais?porte=enorme')
    expect(status).toBe(400)
    expect(corpo.campos).toHaveProperty('porte')
  })

  it('sem nenhum dado interno', async () => {
    semSegredos((await get('/animais')).texto)
  })
})

describe('GET /animais/destaques (RN12)', () => {
  it('só adultos com MAIS de 90 dias de espera: nem filhote, nem quem tem exatamente 90', async () => {
    const { corpo } = await get<ListaAnimais>('/animais/destaques')
    expect(corpo.animais.map((animal) => animal.nome)).toEqual(['Thor', 'Mel'])
  })
})

describe('GET /animais/:id (ficha)', () => {
  it('traz os dados públicos, as fotos em ordem e a ONG como responsável', async () => {
    const { status, corpo } = await get<AnimalFicha>(`/animais/${ID.thor}`)
    expect(status).toBe(200)
    expect(corpo).toMatchObject({ nome: 'Thor', status: 'disponivel', convive_animais: false })
    expect(corpo.fotos.map((foto) => foto.completa)).toEqual([
      `/api/publico/fotos/animais/${ID.thor}/f1.webp`,
      `/api/publico/fotos/animais/${ID.thor}/f2.webp`,
    ])
    expect(corpo.responsavel).toEqual({ tipo: 'ong', nome: 'SOS Patas', whatsapp: '35988439614' })
  })

  it('animal de protetor mostra o nome e o WhatsApp do protetor (RN31)', async () => {
    const { corpo } = await get<AnimalFicha>(`/animais/${ID.mel}`)
    expect(corpo.responsavel).toEqual({
      tipo: 'protetor',
      nome: 'Protetora Ana Paula',
      whatsapp: '35900000000',
    })
  })

  it('animal adotado ainda abre a ficha, sem os dados de quem adotou', async () => {
    const { status, corpo, texto } = await get<AnimalFicha>(`/animais/${ID.bolinha}`)
    expect(status).toBe(200)
    expect(corpo.status).toBe('adotado')
    semSegredos(texto)
  })

  it('nenhum dado interno na ficha', async () => {
    semSegredos((await get(`/animais/${ID.thor}`)).texto)
  })

  it.each(['00000000-0000-4000-8000-0000000000ff', 'nao-e-um-id'])('id %s: 404', async (id) => {
    const { status, corpo } = await get<CorpoErro>(`/animais/${id}`)
    expect(status).toBe(404)
    expect(corpo.erro).toBe('nao_encontrado')
  })
})

describe('GET /perdidos', () => {
  it('só publicados e no prazo, mais recentes primeiro (RN18, RN25)', async () => {
    const { corpo } = await get<ListaPerdidos>('/perdidos')
    expect(corpo.perdidos.map((anuncio) => anuncio.id)).toEqual([ID.gato, ID.bob])
  })

  it('filtra por tipo', async () => {
    const { corpo } = await get<ListaPerdidos>('/perdidos?tipo=encontrado')
    expect(corpo.perdidos.map((anuncio) => anuncio.id)).toEqual([ID.gato])
  })

  it('traz contato, prazo e fotos do anúncio', async () => {
    const { corpo } = await get<ListaPerdidos>('/perdidos?tipo=perdido')
    expect(corpo.perdidos[0]).toMatchObject({
      nome: 'Bob',
      contato_nome: 'Marcos',
      contato_whatsapp: '35900000001',
      fotos: [`/api/publico/fotos/perdidos/${ID.bob}/f1.webp`],
    })
    expect(Date.parse(corpo.perdidos[0]?.expira_em ?? '')).toBeGreaterThan(agora)
  })

  it('nada de pendente, vencido, hash de IP ou origem', async () => {
    semSegredos((await get('/perdidos')).texto)
  })
})

describe('URLs das fotos', () => {
  it('com FOTOS_URL_BASE (produção), apontam para o domínio de fotos', async () => {
    const env = envTeste({ FOTOS_URL_BASE: 'https://fotos.sospatas.org.br' })
    const { corpo } = await get<AnimalFicha>(`/animais/${ID.thor}`, env)
    expect(corpo.fotos[0]?.miniatura).toBe(
      `https://fotos.sospatas.org.br/animais/${ID.thor}/f1-thumb.webp`,
    )
  })
})

describe('GET /fotos/* (sem domínio de fotos)', () => {
  const webp = new Uint8Array([
    ...new TextEncoder().encode('RIFF'),
    0,
    0,
    0,
    0,
    ...new TextEncoder().encode('WEBP'),
    1,
    2,
  ])

  it('entrega a foto do bucket público com cache longo', async () => {
    await teste.fotos.colocar(`animais/${ID.thor}/f1.webp`, webp, 'image/webp')
    const resposta = await teste.app.request(
      `/api/publico/fotos/animais/${ID.thor}/f1.webp`,
      {},
      envTeste(),
    )
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get('Content-Type')).toBe('image/webp')
    expect(resposta.headers.get('Cache-Control')).toContain('immutable')
    expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(webp)
  })

  it('nunca lê a quarentena (RN19)', async () => {
    await teste.quarentena.colocar(`perdidos/${ID.pendente}/f1.webp`, webp, 'image/webp')
    const resposta = await teste.app.request(
      `/api/publico/fotos/perdidos/${ID.pendente}/f1.webp`,
      {},
      envTeste(),
    )
    expect(resposta.status).toBe(404)
  })

  it.each([
    '../segredo.webp',
    'backups/2026-10-08.sql.gz',
    'animais/x/f1.jpg',
    'outra-pasta/f.webp',
  ])('recusa caminho fora das fotos públicas: %s', async (caminho) => {
    const resposta = await teste.app.request(`/api/publico/fotos/${caminho}`, {}, envTeste())
    expect(resposta.status).toBe(404)
  })
})
