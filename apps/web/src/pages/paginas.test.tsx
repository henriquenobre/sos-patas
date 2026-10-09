// Páginas públicas da etapa 6, com a API simulada e as rotas reais.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { API_PADRAO, renderizarEm, simularApi } from '../testes/renderizar'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Início (T01)', () => {
  it('mostra a chamada, os números, a história e o PIX vindos da API', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: /Toda patinha merece um lar\./ }),
    ).toBeInTheDocument()
    expect(screen.getByText('+1.000')).toBeInTheDocument()
    expect(screen.getByText(/Nossa história começou em 2015/)).toBeInTheDocument()
    // No conteúdo da página (o rodapé também mostra a chave)
    expect(within(screen.getByRole('main')).getByText('26.515.895/0001-90')).toBeInTheDocument()
  })

  it('"Esperando há mais tempo" mostra os cards com o tempo de espera e o protetor (RN12)', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/')
    const tobias = await screen.findByRole('link', { name: /Tobias/ })
    expect(tobias).toHaveAttribute('href', '/animais/a1')
    expect(within(tobias).getByText(/^⏳/)).toBeInTheDocument()
    const mel = screen.getByRole('link', { name: /Mel/ })
    expect(within(mel).getByText('Protetor parceiro')).toBeInTheDocument()
    expect(within(mel).getByRole('img', { name: 'Foto da Mel' })).toHaveAttribute(
      'src',
      '/api/publico/fotos/animais/a2/f1-thumb.webp',
    )
  })

  it('o resumo de como adotar usa os títulos dos passos', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/')
    expect(await screen.findByText('Escolha o animal')).toBeInTheDocument()
    expect(screen.queryByText('Use a vitrine.')).not.toBeInTheDocument()
  })

  it('com a API fora do ar, mostra a mensagem amigável e tenta de novo', async () => {
    const fetchFalso = simularApi({ ...API_PADRAO, '/publico/site': null })
    renderizarEm('/')
    expect(await screen.findByText('Não conseguimos carregar agora')).toBeInTheDocument()
    const chamadasAntes = fetchFalso.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(fetchFalso.mock.calls.length).toBeGreaterThan(chamadasAntes)
  })
})

describe('Como adotar (T04)', () => {
  it('mostra passos, cuidados, vantagens e o aviso de protetores; sem nota vazia', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/como-adotar')
    expect(await screen.findByText('Simples e responsável')).toBeInTheDocument()
    expect(screen.getByText('A equipe analisa.')).toBeInTheDocument()
    expect(screen.getByText('Um animal vive de 10 a 15 anos.')).toBeInTheDocument()
    expect(screen.getByText('Prioridade na castração')).toBeInTheDocument()
    expect(screen.getByText('A SOS Patas só divulga animais de protetores.')).toBeInTheDocument()
  })
})

describe('Perguntas frequentes (T05)', () => {
  it('lista as perguntas, a primeira aberta, e o contato da ONG', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/perguntas-frequentes')
    const primeira = (await screen.findByText('Vocês recebem animais?')).closest('details')
    expect(primeira).toHaveAttribute('open')
    expect(screen.getByText('E se não se adaptar?').closest('details')).not.toHaveAttribute('open')
    const principal = within(screen.getByRole('main'))
    expect(principal.getByRole('link', { name: 'sitesospatas@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:sitesospatas@gmail.com',
    )
    expect(principal.getByRole('link', { name: 'Fale com a ONG' })).toHaveAttribute(
      'href',
      '/contato',
    )
  })
})

describe('Como ajudar (T06) e /sobre', () => {
  it('a antiga /sobre leva para Como ajudar, com o PIX e as formas de ajudar', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/sobre')
    expect(await screen.findByRole('heading', { name: 'Como ajudar' })).toBeInTheDocument()
    expect(screen.getByText('Doe pelo PIX')).toBeInTheDocument()
    expect(screen.getByText('Seja lar temporário')).toBeInTheDocument()
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: /Fale com a ONG/ }),
    ).toHaveAttribute('href', '/contato?assunto=ajudar')
  })
})

describe('Privacidade (T07) e páginas especiais', () => {
  it('privacidade abre mesmo sem a API, sem dado da ONG inventado', async () => {
    simularApi({})
    renderizarEm('/privacidade')
    expect(
      await screen.findByRole('heading', { name: 'Política de privacidade' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/pelo e-mail da ONG\./)).toBeInTheDocument()
  })

  it('endereço inexistente mostra a página 404', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/endereco-errado')
    expect(
      await screen.findByRole('heading', { name: 'Página não encontrada' }),
    ).toBeInTheDocument()
  })

  it('perdidos ainda em construção mostra "Em breve" (etapa 11)', async () => {
    simularApi(API_PADRAO)
    renderizarEm('/perdidos')
    expect(await screen.findByRole('heading', { name: 'Em breve' })).toBeInTheDocument()
  })
})
