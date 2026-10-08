// Vitrine (T02) e ficha (T03), com a API simulada e as rotas reais.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnimalFicha } from '@sospatas/compartilhado'
import { API_PADRAO, DESTAQUES_TESTE, renderizarEm, simularApi } from '../testes/renderizar'

afterEach(() => {
  vi.unstubAllGlobals()
})

const FICHA: AnimalFicha = {
  id: 'a2',
  nome: 'Mel',
  especie: 'gato',
  sexo: 'femea',
  nascimento_aprox: '2023-01-01',
  porte: 'pequeno',
  data_entrada: '2025-12-01',
  raca: 'SRD',
  raca_tipo: 'mestico',
  cor_pelagem: 'Branca',
  castrado: true,
  vacinado: 'sim',
  vacinas: 'V4 e antirrábica',
  vermifugado: 'sem_informacao',
  problema_saude: null,
  docil: true,
  convive_animais: null,
  descricao: 'Gata tranquila.',
  status: 'disponivel',
  fotos: [
    { miniatura: '/f/1-thumb.webp', completa: '/f/1.webp' },
    { miniatura: '/f/2-thumb.webp', completa: '/f/2.webp' },
  ],
  responsavel: { tipo: 'protetor', nome: 'Protetora Ana Paula', whatsapp: '35900000000' },
}

const consultasVitrine = (fetchFalso: ReturnType<typeof simularApi>) =>
  fetchFalso.mock.calls.map(([url]) => url).filter((url) => url.includes('/publico/animais?'))

describe('Vitrine (T02)', () => {
  it('lista os animais com o total no subtítulo e "mais antigos primeiro"', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/animais')
    expect(
      await screen.findByText('2 animais encontrados · mais antigos primeiro'),
    ).toBeInTheDocument()
    expect(screen.getByText('2 cães e gatos esperando uma família')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tobias/ })).toHaveAttribute('href', '/animais/a1')
  })

  it('filtros da URL vão para a API e os chips aparecem marcados', async () => {
    const fetchFalso = simularApi({
      ...API_PADRAO,
      '/publico/animais?especie=gato&idade=adulto': { animais: [DESTAQUES_TESTE.animais[1]] },
    })
    renderizarEm('/animais?especie=gato&idade=adulto')
    expect(
      await screen.findByText('1 animal encontrado · mais antigos primeiro'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '🐱 Gatos' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Adultos' })).toHaveAttribute('aria-pressed', 'true')
    expect(consultasVitrine(fetchFalso)).toContain('/api/publico/animais?especie=gato&idade=adulto')
  })

  it('tocar num chip liga o filtro; tocar de novo desliga', async () => {
    const fetchFalso = simularApi({
      ...API_PADRAO,
      '/publico/animais?porte=grande': { animais: [] },
    })
    renderizarEm('/animais')
    const grande = await screen.findByRole('button', { name: 'Grande' })
    await userEvent.click(grande)
    expect(await screen.findByText('Nenhum animal com esses filtros.')).toBeInTheDocument()
    expect(consultasVitrine(fetchFalso)).toContain('/api/publico/animais?porte=grande')
    await userEvent.click(screen.getByRole('button', { name: 'Grande' }))
    expect(
      await screen.findByText('2 animais encontrados · mais antigos primeiro'),
    ).toBeInTheDocument()
  })

  it('"Limpar filtros" volta para a lista completa', async () => {
    simularApi({ ...API_PADRAO, '/publico/animais?convive=sim': { animais: [] } })
    renderizarEm('/animais?convive=sim')
    await userEvent.click(await screen.findByRole('button', { name: 'Limpar filtros' }))
    expect(
      await screen.findByText('2 animais encontrados · mais antigos primeiro'),
    ).toBeInTheDocument()
  })

  it('valor inválido na URL é ignorado, sem erro', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/animais?porte=enorme&especie=dragao')
    expect(
      await screen.findByText('2 animais encontrados · mais antigos primeiro'),
    ).toBeInTheDocument()
  })
})

describe('Ficha (T03)', () => {
  it('mostra dados, saúde no feminino, "sem informação" e "não informado"', async () => {
    simularApi({ ...API_PADRAO, '/publico/animais/a2': FICHA })
    renderizarEm('/animais/a2')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mel' })).toBeInTheDocument()
    expect(screen.getByText('Castrada')).toBeInTheDocument()
    expect(screen.getByText('Vacinada (V4 e antirrábica)')).toBeInTheDocument()
    expect(screen.getByText('Vermífugo: sem informação')).toBeInTheDocument()
    expect(screen.getByText('Sem problema de saúde conhecido')).toBeInTheDocument()
    expect(screen.getByText('Convive com outros animais: não informado')).toBeInTheDocument()
    expect(screen.getByText(/Raça:/).parentElement).toHaveTextContent('Raça: SRD · Pelagem: Branca')
  })

  it('animal de protetor: nome do protetor e aviso de que a ONG só divulga (RN31)', async () => {
    simularApi({ ...API_PADRAO, '/publico/animais/a2': FICHA })
    renderizarEm('/animais/a2')
    expect(await screen.findByText(/a SOS Patas apenas divulga/)).toHaveTextContent(
      'Protetora Ana Paula',
    )
  })

  it('galeria: tocar na miniatura troca a foto grande (RN01)', async () => {
    simularApi({ ...API_PADRAO, '/publico/animais/a2': FICHA })
    renderizarEm('/animais/a2')
    const fotoGrande = await screen.findByRole('img', { name: 'Foto da Mel' })
    expect(fotoGrande).toHaveAttribute('src', '/f/1.webp')
    await userEvent.click(screen.getByRole('button', { name: 'Ver foto 2 de 2' }))
    expect(screen.getByRole('img', { name: 'Foto da Mel' })).toHaveAttribute('src', '/f/2.webp')
  })

  it('"Quero adotar" leva ao formulário de adoção (RN14)', async () => {
    simularApi({ ...API_PADRAO, '/publico/animais/a2': FICHA })
    renderizarEm('/animais/a2')
    const botao = await screen.findByRole('link', { name: /Quero adotar Mel/ })
    expect(botao).toHaveAttribute('href', '/animais/a2/adotar')
    await userEvent.click(botao)
    expect(await screen.findByRole('heading', { name: 'Em breve' })).toBeInTheDocument()
  })

  it('animal adotado abre a ficha, com o selo e sem o botão de adotar', async () => {
    simularApi({ ...API_PADRAO, '/publico/animais/a2': { ...FICHA, status: 'adotado' } })
    renderizarEm('/animais/a2')
    expect(await screen.findByText('Adotado 💙')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Quero adotar/ })).not.toBeInTheDocument()
  })

  it('animal que não existe: página "não encontrado" com link para a vitrine', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/animais/nao-existe')
    expect(
      await screen.findByRole('heading', { name: 'Animal não encontrado' }),
    ).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(within(main).getByRole('link', { name: 'Ver os animais para adoção' })).toHaveAttribute(
      'href',
      '/animais',
    )
  })
})
