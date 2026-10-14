// Perdidos e encontrados no site: lista (T12) e anúncio (T13, T13b), RN18–RN28.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ListaPerdidos, PerdidoPublico } from '@sospatas/compartilhado'
import {
  API_PADRAO,
  chamadas,
  renderizarEm,
  respostaDeErro,
  simularApi,
} from '../testes/renderizar'
import { diasAtras } from '../testes/admin'

// O Turnstile de verdade carrega um script do Cloudflare; aqui, um botão que entrega o token
vi.mock('../components/Turnstile', () => ({
  Turnstile: ({ aoMudar }: { aoMudar: (token: string | null) => void }) => (
    <button
      type="button"
      onClick={() => {
        aoMudar('token-de-teste')
      }}
    >
      Não sou um robô
    </button>
  ),
}))

// O canvas não roda no jsdom: a foto "preparada" é um WebP de mentira
vi.mock('../lib/fotos', async (original) => ({
  ...(await original<typeof import('../lib/fotos')>()),
  prepararFotoCompleta: vi.fn(() => Promise.resolve(new Blob(['c'], { type: 'image/webp' }))),
}))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:previa')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const emDias = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString()

const BOB: PerdidoPublico = {
  id: 'p1',
  tipo: 'perdido',
  especie: 'cao',
  nome: 'Bob',
  bairro: 'Bela Vista',
  data_ocorrido: diasAtras(4),
  descricao: 'Filhote preto com peito branco, coleira vermelha.',
  contato_nome: 'Marcos',
  contato_whatsapp: '35999991234',
  publicado_em: emDias(-3),
  expira_em: emDias(27),
  fotos: ['/api/publico/fotos/perdidos/p1/f1.webp'],
}

const GATO: PerdidoPublico = {
  ...BOB,
  id: 'p2',
  tipo: 'encontrado',
  especie: 'gato',
  nome: null,
  bairro: 'Centro',
  data_ocorrido: diasAtras(2),
  descricao: 'Gato preto adulto, olhos amarelos.',
  contato_nome: 'Juliana',
  fotos: [],
}

const LISTA: ListaPerdidos = { perdidos: [GATO, BOB] }

describe('T12 · Perdidos e encontrados', () => {
  it('mostra os anúncios com selo, prazo, WhatsApp com mensagem pronta e o aviso contra golpes', async () => {
    simularApi({ ...API_PADRAO, '/publico/perdidos': LISTA })
    renderizarEm('/perdidos')

    const bob = (await screen.findByRole('heading', { name: 'Bob' })).closest('article')
    if (!bob) throw new Error('card do Bob')
    expect(within(bob).getByText('Perdido')).toBeInTheDocument()
    expect(within(bob).getByText(/Bela Vista · Sumiu há 4 dias/)).toBeInTheDocument()
    expect(within(bob).getByText(/Anúncio de Marcos · sai do ar em 27 dias/)).toBeInTheDocument()
    const whatsapp = within(bob).getByRole('link', { name: /Vi este animal/ })
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5535999991234\?text=/)
    expect(decodeURIComponent(whatsapp.getAttribute('href') ?? '')).toContain('anúncio de Bob')
    // Foto só em <img>, nunca como link (RN24)
    expect(within(bob).getByRole('img', { name: 'Foto de Bob' }).tagName).toBe('IMG')

    const gato = screen.getByRole('heading', { name: 'Gato encontrado' }).closest('article')
    if (!gato) throw new Error('card do gato')
    expect(within(gato).getByRole('link', { name: /É meu animal/ })).toBeInTheDocument()
    expect(within(gato).getByText(/Encontrado há 2 dias/)).toBeInTheDocument()

    expect(screen.getByText('⚠️ Cuidado com golpes')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Anunciar animal perdido ou encontrado/ }),
    ).toHaveAttribute('href', '/perdidos/novo')
  })

  it('o filtro pede só os perdidos à API', async () => {
    const fetchFalso = simularApi({
      ...API_PADRAO,
      '/publico/perdidos': LISTA,
      '/publico/perdidos?tipo=perdido': { perdidos: [BOB] },
    })
    renderizarEm('/perdidos')
    await screen.findByRole('heading', { name: 'Bob' })

    await userEvent.click(screen.getByRole('button', { name: /Perdidos/ }))
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Gato encontrado' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /Perdidos/ })).toHaveAttribute('aria-pressed', 'true')
    expect(chamadas(fetchFalso, 'GET', '/publico/perdidos?tipo=perdido')).toHaveLength(1)
  })

  it('sem anúncios, avisa', async () => {
    simularApi({ ...API_PADRAO, '/publico/perdidos': { perdidos: [] } })
    renderizarEm('/perdidos')
    expect(await screen.findByText('Nenhum anúncio no ar agora.')).toBeInTheDocument()
  })
})

async function preencher() {
  await userEvent.click(screen.getByRole('radio', { name: /Perdi meu animal/ }))
  await userEvent.click(screen.getByRole('radio', { name: /Cão/ }))
  await userEvent.type(screen.getByLabelText(/Nome do animal/), 'Bob')
  await userEvent.type(screen.getByLabelText(/Bairro ou região/), 'Centro')
  await userEvent.type(screen.getByLabelText(/Características/), 'Caramelo, coleira azul.')
  await userEvent.type(screen.getByLabelText(/Seu primeiro nome/), 'Marcos')
  await userEvent.type(screen.getByLabelText(/Seu WhatsApp/), '35999991234')
}

describe('T13 · Anunciar animal', () => {
  it('envia dados e fotos em multipart e mostra a confirmação com o aviso contra golpes', async () => {
    const fetchFalso = simularApi({
      ...API_PADRAO,
      'POST /publico/perdidos': { recebido: true },
    })
    renderizarEm('/perdidos/novo')
    await screen.findByRole('heading', { name: 'Anunciar animal' })
    await preencher()
    const foto = new File(['x'], 'bob.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText(/Adicionar foto/), foto)
    expect(await screen.findByRole('img', { name: 'Foto escolhida' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /Autorizo a SOS Patas/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Não sou um robô' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar para análise' }))

    expect(
      await screen.findByRole('heading', { name: 'Recebemos seu anúncio!' }),
    ).toBeInTheDocument()
    expect(screen.getByText('⚠️ Cuidado com golpes')).toBeInTheDocument()

    const [corpo] = chamadas(fetchFalso, 'POST', '/publico/perdidos') as FormData[]
    if (!(corpo instanceof FormData)) throw new Error('envio em multipart')
    expect(JSON.parse(corpo.get('dados') as string)).toMatchObject({
      tipo: 'perdido',
      especie: 'cao',
      nome: 'Bob',
      bairro: 'Centro',
      contato_whatsapp: '35999991234',
      consentimento: true,
      turnstile_token: 'token-de-teste',
    })
    expect(corpo.getAll('fotos')).toHaveLength(1)
  })

  it('sem preencher: marca os campos e o consentimento, sem enviar', async () => {
    const fetchFalso = simularApi(API_PADRAO)
    renderizarEm('/perdidos/novo')
    await screen.findByRole('heading', { name: 'Anunciar animal' })
    await userEvent.click(screen.getByRole('button', { name: 'Enviar para análise' }))

    expect(await screen.findByText('Escolha perdido ou encontrado')).toBeInTheDocument()
    expect(
      screen.getByText('Marque que você autoriza publicar seu primeiro nome, WhatsApp e fotos'),
    ).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', '/publico/perdidos')).toHaveLength(0)
  })

  it('link na descrição é recusado já no formulário (RN21)', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/perdidos/novo')
    await screen.findByRole('heading', { name: 'Anunciar animal' })
    await userEvent.type(screen.getByLabelText(/Características/), 'Veja em www.golpe.com')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar para análise' }))
    expect(await screen.findByText('Não coloque links na descrição')).toBeInTheDocument()
  })

  it('limite de envios: mostra a mensagem da API e continua no formulário (RN23)', async () => {
    simularApi({
      ...API_PADRAO,
      'POST /publico/perdidos': respostaDeErro(
        429,
        'Recebemos muitos anúncios deste aparelho hoje. Tente de novo amanhã.',
      ),
    })
    renderizarEm('/perdidos/novo')
    await screen.findByRole('heading', { name: 'Anunciar animal' })
    await preencher()
    await userEvent.click(screen.getByRole('checkbox', { name: /Autorizo a SOS Patas/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Não sou um robô' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar para análise' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Recebemos muitos anúncios deste aparelho hoje.',
    )
    expect(screen.getByRole('button', { name: 'Enviar para análise' })).toBeInTheDocument()
  })
})
