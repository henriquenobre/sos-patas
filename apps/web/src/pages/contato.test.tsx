// Fale com a ONG (T29, RN51): formulário enviado por e-mail e contato da ONG pelo e-mail.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { API_PADRAO, SITE_TESTE, renderizarEm } from '../testes/renderizar'

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

let corposEnviados: unknown[]

function simular(respostaPost: { status: number; corpo: unknown }, site = SITE_TESTE) {
  corposEnviados = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, opcoes?: RequestInit) => {
      if (opcoes?.method === 'POST') {
        corposEnviados.push(JSON.parse(opcoes.body as string))
        return Promise.resolve(Response.json(respostaPost.corpo, { status: respostaPost.status }))
      }
      const caminho = url.replace(/^.*\/api/, '')
      const respostas: Record<string, unknown> = { ...API_PADRAO, '/publico/site': site }
      return Promise.resolve(
        caminho in respostas
          ? Response.json(respostas[caminho])
          : new Response(null, { status: 404 }),
      )
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

async function preencher(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/^Seu nome/), 'Fernanda')
  await user.type(screen.getByLabelText(/^Seu e-mail/), 'fernanda@exemplo.com')
  await user.type(screen.getByLabelText(/^Mensagem/), 'Quero apadrinhar um animal.')
  await user.click(screen.getByRole('button', { name: 'Não sou um robô' }))
}

describe('Fale com a ONG (T29)', () => {
  it('envia a mensagem e mostra a confirmação; o assunto vem do link', async () => {
    simular({ status: 201, corpo: { enviado: true } })
    const user = userEvent.setup()
    renderizarEm('/contato?assunto=ajudar')
    await preencher(user)
    expect(screen.getByRole('radio', { name: 'Quero ajudar a ONG' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(await screen.findByText('Mensagem enviada!')).toBeInTheDocument()
    expect(corposEnviados[0]).toMatchObject({
      nome: 'Fernanda',
      email: 'fernanda@exemplo.com',
      assunto: 'ajudar',
      turnstile_token: 'token-de-teste',
    })
  })

  it('sem preencher, mostra o erro de cada campo e não envia', async () => {
    simular({ status: 201, corpo: { enviado: true } })
    const user = userEvent.setup()
    renderizarEm('/contato')
    await user.click(await screen.findByRole('button', { name: 'Enviar mensagem' }))
    expect(screen.getAllByText('Preencha este campo').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Escolha o assunto')).toBeInTheDocument()
    expect(corposEnviados).toHaveLength(0)
  })

  it('se o e-mail não sair, explica e mostra o e-mail da ONG', async () => {
    simular({
      status: 503,
      corpo: { erro: 'email_indisponivel', mensagem: 'Não conseguimos enviar sua mensagem agora.' },
    })
    const user = userEvent.setup()
    renderizarEm('/contato?assunto=outro')
    await preencher(user)
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não conseguimos enviar')
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'sitesospatas@gmail.com' }),
    ).toHaveAttribute('href', 'mailto:sitesospatas@gmail.com')
  })
})

describe('contato da ONG no rodapé (RN51)', () => {
  it('sem WhatsApp da ONG, mostra só o e-mail', async () => {
    simular({ status: 201, corpo: {} })
    renderizarEm('/contato')
    const rodape = within(await screen.findByRole('contentinfo'))
    expect(await rodape.findByRole('link', { name: 'sitesospatas@gmail.com' })).toBeInTheDocument()
    expect(rodape.queryByText(/\(35\)/)).not.toBeInTheDocument()
    expect(rodape.getByRole('link', { name: 'Fale com a ONG' })).toHaveAttribute('href', '/contato')
  })

  it('quando a ONG cadastrar um WhatsApp, ele volta a aparecer', async () => {
    simular(
      { status: 201, corpo: {} },
      { ...SITE_TESTE, ong: { ...SITE_TESTE.ong, whatsapp: '35988887777' } },
    )
    renderizarEm('/contato')
    const rodape = within(await screen.findByRole('contentinfo'))
    expect(await rodape.findByText('(35) 9 8888-7777')).toBeInTheDocument()
  })
})
