// Cache das leituras públicas, com uma Cache API falsa (no Node ela não existe).
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { comCache, comCacheFiltrado, limparCache } from './cache'

class CacheFalso {
  readonly guardadas = new Map<string, Response>()
  match(requisicao: Request | string) {
    const url = typeof requisicao === 'string' ? requisicao : requisicao.url
    return Promise.resolve(this.guardadas.get(url)?.clone())
  }
  put(requisicao: Request, resposta: Response) {
    this.guardadas.set(requisicao.url, resposta)
    return Promise.resolve()
  }
  delete(url: string) {
    return Promise.resolve(this.guardadas.delete(url))
  }
}

let cache: CacheFalso
let consultasAoBanco: number

const app = new Hono()
app.get('/api/publico/site', (c) =>
  comCache(c, () => {
    consultasAoBanco += 1
    return Promise.resolve(c.json({ versao: consultasAoBanco }))
  }),
)
app.put('/api/admin/textos', async (c) => {
  await limparCache(c, ['/api/publico/site'])
  return c.body(null, 204)
})

// Vitrine com filtro: um animal novo a cada consulta ao banco (cão nas ímpares, gato nas pares)
type Lista = { animais: { nome: string; especie: string }[] }
app.get('/api/publico/animais', (c) => {
  const especie = c.req.query('especie')
  return comCacheFiltrado<Lista>(
    c,
    () => {
      consultasAoBanco += 1
      const animais = Array.from({ length: consultasAoBanco }, (_, i) => ({
        nome: `animal ${String(i + 1)}`,
        especie: i % 2 === 0 ? 'cao' : 'gato',
      }))
      return Promise.resolve(c.json<Lista>({ animais }))
    },
    especie ? (lista) => ({ animais: lista.animais.filter((a) => a.especie === especie) }) : null,
  )
})
app.post('/api/admin/animais', async (c) => {
  await limparCache(c, ['/api/publico/animais'])
  return c.body(null, 204)
})

beforeEach(() => {
  cache = new CacheFalso()
  consultasAoBanco = 0
  vi.stubGlobal('caches', { default: cache })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const url = 'https://sospatas.org.br/api/publico/site'

describe('comCache', () => {
  it('a segunda visita usa a cópia guardada, sem ir ao banco', async () => {
    const primeira = await app.request(url)
    const segunda = await app.request(url)
    expect(await primeira.json()).toEqual({ versao: 1 })
    expect(await segunda.json()).toEqual({ versao: 1 })
    expect(consultasAoBanco).toBe(1)
  })

  it('"?qualquer=coisa" não fura o cache (não acorda o banco)', async () => {
    await app.request(`${url}?x=1`)
    await app.request(`${url}?x=2`)
    await app.request(url)
    expect(consultasAoBanco).toBe(1)
  })

  it('o navegador guarda por 1 minuto e o Cloudflare por mais tempo', async () => {
    const resposta = await app.request(url)
    expect(resposta.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=900')
  })

  it('salvar na área da ONG limpa a cópia, e a próxima visita já vê a mudança (RN37)', async () => {
    await app.request(url)
    await app.request('https://sospatas.org.br/api/admin/textos', { method: 'PUT' })
    const depois = await app.request(url)
    expect(await depois.json()).toEqual({ versao: 2 })
  })

  it('no computador (AMBIENTE=local), não guarda: mudanças no banco aparecem na hora', async () => {
    await app.request(url, {}, { AMBIENTE: 'local' })
    const segunda = await app.request(url, {}, { AMBIENTE: 'local' })
    expect(consultasAoBanco).toBe(2)
    expect(segunda.headers.get('Cache-Control')).toBe('no-store')
  })

  it('sem Cache API (Node, testes), gera a resposta sempre', async () => {
    vi.unstubAllGlobals()
    await app.request(url)
    await app.request(url)
    expect(consultasAoBanco).toBe(2)
  })
})

describe('comCacheFiltrado', () => {
  const vitrine = 'https://sospatas.org.br/api/publico/animais'
  const nomes = async (resposta: Response) =>
    (await resposta.json<Lista>()).animais.map((animal) => animal.nome)

  it('todas as buscas com filtro saem da mesma cópia: uma consulta ao banco', async () => {
    await app.request(vitrine)
    expect(await nomes(await app.request(`${vitrine}?especie=cao`))).toEqual(['animal 1'])
    expect(await nomes(await app.request(`${vitrine}?especie=gato`))).toEqual([])
    expect(consultasAoBanco).toBe(1)
  })

  it('salvar na área da ONG atualiza também a busca filtrada (RN37)', async () => {
    await app.request(`${vitrine}?especie=cao`)
    await app.request('https://sospatas.org.br/api/admin/animais', { method: 'POST' })
    await app.request(vitrine) // consulta 2: animal 2 (gato)
    await app.request('https://sospatas.org.br/api/admin/animais', { method: 'POST' })
    const caes = await app.request(`${vitrine}?especie=cao`) // consulta 3: animal 3 (cão)
    expect(await nomes(caes)).toEqual(['animal 1', 'animal 3'])
  })

  it('a busca filtrada mantém o tempo de cache do navegador', async () => {
    const resposta = await app.request(`${vitrine}?especie=cao`)
    expect(resposta.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=900')
  })
})
