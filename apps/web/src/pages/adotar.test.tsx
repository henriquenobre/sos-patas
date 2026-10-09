// Formulário de adoção (T26): formulário → termo → envio (fluxo da ONG, 08/10/2026).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CLAUSULAS_TERMO, DECLARACOES, PERGUNTAS, type AnimalFicha } from '@sospatas/compartilhado'
import { API_PADRAO, renderizarEm } from '../testes/renderizar'

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

const GATA: AnimalFicha = {
  id: 'a2',
  nome: 'Mel',
  especie: 'gato',
  sexo: 'femea',
  nascimento_aprox: '2023-01-01',
  porte: 'pequeno',
  data_entrada: '2025-12-01',
  raca: null,
  raca_tipo: null,
  cor_pelagem: null,
  castrado: true,
  vacinado: 'sim',
  vacinas: null,
  vermifugado: 'sim',
  problema_saude: null,
  docil: true,
  convive_animais: true,
  descricao: '',
  status: 'disponivel',
  fotos: [],
  responsavel: { tipo: 'ong', nome: 'SOS Patas', whatsapp: '35988439614' },
}

type RespostaPost = { status: number; corpo: unknown }
let respostaPost: RespostaPost
let corposEnviados: unknown[]

let leiturasDaFicha = 0

/** API simulada. Depois de um pedido aceito, a ficha passa a vir "em análise", como na real. */
function simular(ficha: AnimalFicha = GATA) {
  corposEnviados = []
  leiturasDaFicha = 0
  let fichaAtual = ficha
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, opcoes?: RequestInit) => {
      if (opcoes?.method === 'POST') {
        corposEnviados.push(JSON.parse(opcoes.body as string))
        if (respostaPost.status === 201) fichaAtual = { ...ficha, status: 'em_analise' }
        return Promise.resolve(Response.json(respostaPost.corpo, { status: respostaPost.status }))
      }
      const caminho = url.replace(/^.*\/api/, '')
      if (caminho === `/publico/animais/${ficha.id}`) leiturasDaFicha += 1
      const respostas: Record<string, unknown> = {
        ...API_PADRAO,
        [`/publico/animais/${ficha.id}`]: fichaAtual,
      }
      return Promise.resolve(
        caminho in respostas
          ? Response.json(respostas[caminho])
          : new Response(null, { status: 404 }),
      )
    }),
  )
}

beforeEach(() => {
  respostaPost = { status: 201, corpo: { recebido: true, animal: 'Mel' } }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const usuario = () => userEvent.setup()
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function escolher(user: ReturnType<typeof usuario>, pergunta: string, opcao: string) {
  const grupo = screen.getByRole('group', { name: new RegExp(`^${escapar(pergunta)}`) })
  await user.click(within(grupo).getByRole('radio', { name: opcao }))
}

async function digitar(user: ReturnType<typeof usuario>, pergunta: string, texto: string) {
  await user.type(screen.getByLabelText(new RegExp(`^${escapar(pergunta)}`)), texto)
}

async function preencherFormulario(user: ReturnType<typeof usuario>) {
  await digitar(user, PERGUNTAS.nome, 'Fernanda Souza')
  await escolher(user, PERGUNTAS.maior_idade, 'Sim')
  await digitar(user, PERGUNTAS.whatsapp, '35999990001')
  await digitar(user, PERGUNTAS.bairro_cidade, 'Centro, Passos')
  await digitar(user, PERGUNTAS.motivo, 'Quero uma companheira.')
  await escolher(user, PERGUNTAS.moradia, 'Apartamento')
  await escolher(user, PERGUNTAS.imovel, 'Próprio')
  await escolher(user, PERGUNTAS.espaco, 'Não tenho área externa, o animal ficará dentro de casa')
  await escolher(user, PERGUNTAS.local_coberto, 'Sim')
  await escolher(user, PERGUNTAS.casa_segura, 'Sim, é murada ou cercada e o portão não tem vãos')
  await escolher(user, PERGUNTAS.telas_janelas, 'Sim')
  await escolher(user, PERGUNTAS.onde_fica, 'Dentro de casa')
  await digitar(user, PERGUNTAS.moradores, '2 pessoas')
  await escolher(user, PERGUNTAS.todos_concordam, 'Sim')
  await escolher(user, PERGUNTAS.tem_animais, 'Não')
  await escolher(user, PERGUNTAS.vacinar_vermifugar, 'Sim')
  await escolher(user, PERGUNTAS.castrar, 'Sim')
  await escolher(user, PERGUNTAS.arcar_custos, 'Sim')
  await escolher(user, PERGUNTAS.horas_sozinho, 'Menos de 4 horas')
  await digitar(user, PERGUNTAS.historico_animais, 'Nunca tive.')
  await digitar(user, PERGUNTAS.mudanca_viagem, 'Levo comigo.')
  for (const declaracao of DECLARACOES) {
    await user.click(screen.getByRole('checkbox', { name: declaracao }))
  }
}

describe('Formulário de adoção (T26)', () => {
  it('sem preencher, não avança e mostra o erro de cada campo', async () => {
    simular()
    const user = usuario()
    renderizarEm('/animais/a2/adotar')
    await user.click(
      await screen.findByRole('button', { name: 'Continuar para o termo de adoção' }),
    )
    expect(screen.getByText('Confira os campos destacados.')).toBeInTheDocument()
    expect(screen.getAllByText('Escolha uma opção').length).toBeGreaterThan(5)
    expect(screen.getByText('Marque todas as declarações')).toBeInTheDocument()
    expect(screen.queryByText(CLAUSULAS_TERMO[0])).not.toBeInTheDocument()
  })

  it('perguntas condicionais: telas para gatos, proprietário só se alugado', async () => {
    simular()
    const user = usuario()
    renderizarEm('/animais/a2/adotar')
    expect(await screen.findByRole('group', { name: /^As janelas e sacadas/ })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /^O proprietário/ })).not.toBeInTheDocument()
    await escolher(user, PERGUNTAS.imovel, 'Alugado')
    expect(screen.getByRole('group', { name: /^O proprietário/ })).toBeInTheDocument()
  })

  it('formulário → termo → envio com a ciência registrada e a confirmação (RN47)', async () => {
    simular()
    const user = usuario()
    renderizarEm('/animais/a2/adotar')
    await screen.findByText('Você quer adotar')
    await preencherFormulario(user)
    await user.click(screen.getByRole('button', { name: 'Continuar para o termo de adoção' }))

    expect(await screen.findByText(CLAUSULAS_TERMO[0])).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enviar pedido de adoção' }))
    expect(screen.getByText(/Marque que leu o termo/)).toBeInTheDocument()
    expect(corposEnviados).toHaveLength(0)

    await user.click(screen.getByRole('checkbox', { name: /Li o Termo de Responsabilidade/ }))
    await user.click(screen.getByRole('button', { name: 'Não sou um robô' }))
    await user.click(screen.getByRole('button', { name: 'Enviar pedido de adoção' }))

    expect(await screen.findByText('Recebemos seu pedido para adotar Mel!')).toBeInTheDocument()
    // A ficha é recarregada (agora "em análise") e a confirmação continua na tela
    await waitFor(() => {
      expect(leiturasDaFicha).toBeGreaterThan(1)
    })
    expect(screen.getByText('Recebemos seu pedido para adotar Mel!')).toBeInTheDocument()
    expect(screen.queryByText('Mel está em processo de adoção')).not.toBeInTheDocument()
    expect(screen.getByText(/combinar onde você busca Mel/)).toBeInTheDocument()
    expect(corposEnviados[0]).toMatchObject({
      nome: 'Fernanda Souza',
      telas_janelas: 'sim',
      ciente_termo: true,
      turnstile_token: 'token-de-teste',
    })
  })

  it('se outra pessoa pediu antes, explica e leva para outros animais (RN48)', async () => {
    simular()
    respostaPost = {
      status: 409,
      corpo: {
        erro: 'animal_em_analise',
        mensagem: 'Outra pessoa acabou de pedir para adotar Mel. Veja outros animais.',
      },
    }
    const user = usuario()
    renderizarEm('/animais/a2/adotar')
    await screen.findByText('Você quer adotar')
    await preencherFormulario(user)
    await user.click(screen.getByRole('button', { name: 'Continuar para o termo de adoção' }))
    await user.click(
      await screen.findByRole('checkbox', { name: /Li o Termo de Responsabilidade/ }),
    )
    await user.click(screen.getByRole('button', { name: 'Não sou um robô' }))
    await user.click(screen.getByRole('button', { name: 'Enviar pedido de adoção' }))
    expect(await screen.findByText(/Outra pessoa acabou de pedir/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver outros animais' })).toHaveAttribute(
      'href',
      '/animais',
    )
  })

  it('animal em análise: sem formulário, com aviso', async () => {
    simular({ ...GATA, status: 'em_analise' })
    renderizarEm('/animais/a2/adotar')
    expect(
      await screen.findByRole('heading', { name: 'Mel está em processo de adoção' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Continuar/ })).not.toBeInTheDocument()
  })
})

describe('Ficha de animal em análise (RN48)', () => {
  it('mostra só o aviso, sem o botão "Quero adotar"', async () => {
    simular({ ...GATA, status: 'em_analise' })
    renderizarEm('/animais/a2')
    expect(
      await screen.findByRole('heading', { name: 'Mel está em processo de adoção' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Quero adotar/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Saúde')).not.toBeInTheDocument()
  })
})
