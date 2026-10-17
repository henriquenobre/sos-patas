// Editor de textos da área da ONG (T15–T20): RN33–RN38, RN43, RN46.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  CHAVES_TEXTO,
  NOMES_LISTA,
  type ChaveTexto,
  type ConteudoAdmin,
  type ItemAdmin,
  type NomeLista,
  type TextoAdmin,
} from '@sospatas/compartilhado'
import { marcarConteudoAlterado } from '../../api/publico'
import { API_ADMIN } from '../../testes/admin'
import {
  SITE_TESTE,
  chamadas,
  renderizarEm,
  respostaDeErro,
  simularApi,
} from '../../testes/renderizar'

vi.mock('../../lib/fotos', async (original) => ({
  ...(await original<typeof import('../../lib/fotos')>()),
  prepararFoto: vi.fn(() =>
    Promise.resolve({
      miniatura: new Blob(['m'], { type: 'image/webp' }),
      completa: new Blob(['c'], { type: 'image/webp' }),
    }),
  ),
}))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:previa')
  URL.revokeObjectURL = vi.fn()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const ALTERACAO = { em: '2026-10-07T15:00:00Z', por: 'Claudia' }

const item = (id: string, titulo: string | null, texto: string): ItemAdmin => ({
  id,
  titulo,
  texto,
  foto: null,
  alteracao: ALTERACAO,
})

function conteudo(listas: Partial<Record<NomeLista, ItemAdmin[]>> = {}): ConteudoAdmin {
  const textos = Object.fromEntries(
    CHAVES_TEXTO.map((chave): [ChaveTexto, TextoAdmin] => [
      chave,
      { valor: `Texto de ${chave}`, alteracao: ALTERACAO },
    ]),
  ) as Record<ChaveTexto, TextoAdmin>
  textos['inicio.chamada_titulo'] = {
    valor: 'Adote um amigo',
    alteracao: { em: '2026-10-12T15:00:00Z', por: 'Gracia' },
  }
  const todas = Object.fromEntries(NOMES_LISTA.map((nome) => [nome, [] as ItemAdmin[]])) as Record<
    NomeLista,
    ItemAdmin[]
  >
  return {
    textos,
    listas: {
      ...todas,
      perguntas: [
        item('p1', 'Como adotar?', 'Preencha o formulário.'),
        item('p2', 'Tem taxa?', 'Converse com a equipe.'),
      ],
      inicio_marcos: [item('m1', '2015', 'Grupo de WhatsApp')],
      ...listas,
    },
  }
}

const api = (dados = conteudo(), extra: Record<string, unknown> = {}) => ({
  ...API_ADMIN,
  '/admin/conteudo': dados,
  ...extra,
})

describe('T15 · Textos do site', () => {
  it('um card por página, com o resumo e a alteração mais recente', async () => {
    simularApi(api())
    renderizarEm('/admin/textos')

    const inicio = await screen.findByRole('link', { name: /Página inicial/ })
    expect(inicio).toHaveAttribute('href', '/admin/textos/inicio')
    expect(within(inicio).getByText('Alterado por Gracia em 12/10/2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Perguntas frequentes/ })).toHaveTextContent(
      '2 perguntas',
    )
    expect(screen.getByRole('link', { name: /Como adotar/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Como ajudar/ })).toBeInTheDocument()
    expect(screen.getByText(/Contatos e PIX ficam em ☰ Mais/)).toBeInTheDocument()
  })
})

describe('T16 · Perguntas frequentes (ListaEditavel)', () => {
  it('setas trocam com o vizinho na hora; a primeira não sobe e a última não desce (RN35)', async () => {
    const fetchFalso = simularApi(
      api(conteudo(), { 'POST /admin/conteudo/itens/trocar-ordem': undefined }),
    )
    renderizarEm('/admin/textos/perguntas')

    expect(await screen.findByText('Como adotar?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir "Como adotar?"' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer "Tem taxa?"' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Descer "Como adotar?"' }))
    expect(chamadas(fetchFalso, 'POST', '/admin/conteudo/itens/trocar-ordem')).toEqual([
      { ids: ['p1', 'p2'] },
    ])
  })

  it('excluir pede confirmação e avisa com o link da página (RN36, RN37)', async () => {
    const fetchFalso = simularApi(api(conteudo(), { 'DELETE /admin/conteudo/itens/p2': undefined }))
    renderizarEm('/admin/textos/perguntas')

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir "Tem taxa?"' }))
    const modal = screen.getByRole('dialog', { name: 'Excluir esta pergunta?' })
    expect(within(modal).getByText(/some do site e não pode ser recuperado/)).toBeInTheDocument()
    await userEvent.click(within(modal).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByText('Excluído do site ✓')).toBeInTheDocument()
    expect(
      within(screen.getByRole('status')).getByRole('link', { name: /Ver no site/ }),
    ).toHaveAttribute('href', '/perguntas-frequentes')
    expect(chamadas(fetchFalso, 'DELETE', '/admin/conteudo/itens/p2')).toHaveLength(1)
  })

  it('com uma pergunta só, o Excluir fica desativado, com a explicação (RN36)', async () => {
    simularApi(api(conteudo({ perguntas: [item('p1', 'Como adotar?', 'Preencha.')] })))
    renderizarEm('/admin/textos/perguntas')

    expect(await screen.findByRole('button', { name: 'Excluir "Como adotar?"' })).toBeDisabled()
    expect(screen.getByText(/precisa ter ao menos 1 item/)).toBeInTheDocument()
  })
})

describe('T18–T20 · textos de cada página (CampoTextoEditavel)', () => {
  it('salva o texto, avisa "Salvo e publicado" e marca o site para não usar a cópia antiga', async () => {
    const fetchFalso = simularApi(
      api(conteudo(), {
        'PUT /admin/conteudo/textos/inicio.chamada_titulo': {
          valor: 'Adote um adulto',
          alteracao: { em: '2026-10-14T12:00:00Z', por: 'Gracia' },
        },
      }),
    )
    renderizarEm('/admin/textos/inicio')

    const campo = await screen.findByLabelText(/Título da chamada/)
    expect(screen.getByText('14/60')).toBeInTheDocument()
    const salvar = within(campo.closest('form') as HTMLElement).getByRole('button', {
      name: 'Salvar',
    })
    expect(salvar).toBeDisabled()

    await userEvent.clear(campo)
    await userEvent.type(campo, 'Adote um adulto')
    await userEvent.click(salvar)

    expect(await screen.findByText('Salvo e publicado ✓')).toBeInTheDocument()
    expect(
      within(screen.getByRole('status')).getByRole('link', { name: /Ver no site/ }),
    ).toHaveAttribute('href', '/')
    expect(chamadas(fetchFalso, 'PUT', '/admin/conteudo/textos/inicio.chamada_titulo')).toEqual([
      { valor: 'Adote um adulto' },
    ])
    expect(localStorage.getItem('sospatas:conteudo-alterado')).not.toBeNull()
  })

  it('obrigatório vazio mostra o erro e não chama a API', async () => {
    const fetchFalso = simularApi(api())
    renderizarEm('/admin/textos/inicio')

    const campo = await screen.findByLabelText(/Missão/)
    await userEvent.clear(campo)
    await userEvent.click(
      within(campo.closest('form') as HTMLElement).getByRole('button', { name: 'Salvar' }),
    )
    expect(screen.getByText('Preencha este campo')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'PUT', '/admin/conteudo/textos/inicio.missao')).toHaveLength(0)
  })

  it('com 4 números, o "＋" vira o aviso de limite (RN46)', async () => {
    const numeros = [1, 2, 3, 4].map((n) => item(`n${String(n)}`, `+${String(n)}`, 'feiras'))
    simularApi(api(conteudo({ inicio_numeros: numeros })))
    renderizarEm('/admin/textos/inicio')

    const bloco = await screen.findByRole('region', { name: 'Números em destaque' })
    expect(within(bloco).getByText(/Limite atingido/)).toBeInTheDocument()
    expect(within(bloco).queryByRole('link', { name: /Novo número/ })).not.toBeInTheDocument()
    // Os marcos não têm máximo
    const marcos = screen.getByRole('region', { name: 'Marcos da história' })
    expect(within(marcos).getByRole('link', { name: '＋ Novo marco da história' })).toHaveAttribute(
      'href',
      '/admin/textos/inicio_marcos/novo',
    )
  })
})

describe('T17 · Item de lista', () => {
  it('pergunta nova: rótulos da lista, prévia e volta para a lista ao salvar', async () => {
    const fetchFalso = simularApi(
      api(conteudo(), { 'POST /admin/conteudo/itens': item('p3', 'Posso?', 'Sim.') }),
    )
    renderizarEm('/admin/textos/perguntas/novo')

    expect(await screen.findByRole('heading', { name: 'Nova pergunta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar/ })).toHaveAttribute(
      'href',
      '/admin/textos/perguntas',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getAllByText('Preencha este campo')).toHaveLength(2)

    await userEvent.type(screen.getByLabelText(/Pergunta/), 'Posso adotar dois?')
    await userEvent.type(screen.getByLabelText(/Resposta/), 'Sim, conversamos sobre cada caso.')
    expect(screen.getByText('Prévia no site')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Salvo e publicado ✓')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', '/admin/conteudo/itens')).toEqual([
      {
        lista: 'perguntas',
        titulo: 'Posso adotar dois?',
        texto: 'Sim, conversamos sobre cada caso.',
      },
    ])
    expect(await screen.findByRole('heading', { name: 'Perguntas frequentes' })).toBeInTheDocument()
  })

  it('editar: campos preenchidos, "Alterado por" e volta para a página da lista', async () => {
    const fetchFalso = simularApi(
      api(conteudo(), { 'PUT /admin/conteudo/itens/m1': item('m1', '2015', 'Começo') }),
    )
    renderizarEm('/admin/textos/inicio_marcos/m1')

    expect(await screen.findByLabelText(/Ano ou data/)).toHaveValue('2015')
    expect(screen.getByText('Alterado por Claudia em 07/10/2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar/ })).toHaveAttribute(
      'href',
      '/admin/textos/inicio',
    )
    await userEvent.clear(screen.getByLabelText(/O que aconteceu/))
    await userEvent.type(screen.getByLabelText(/O que aconteceu/), 'Começo')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Salvo e publicado ✓')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'PUT', '/admin/conteudo/itens/m1')).toEqual([
      { titulo: '2015', texto: 'Começo' },
    ])
  })

  it('foto nova da história: exige a foto, mostra o lembrete e envia em multipart (RN38)', async () => {
    const fetchFalso = simularApi(
      api(conteudo(), { 'POST /admin/conteudo/itens': item('f1', null, 'Feira') }),
    )
    renderizarEm('/admin/textos/inicio_fotos/novo')

    expect(await screen.findByRole('heading', { name: 'Nova foto' })).toBeInTheDocument()
    expect(screen.getByText(/só com autorização dos responsáveis/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Legenda/), 'Feira de 2024')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByText('Escolha a foto')).toBeInTheDocument()

    const arquivo = new File(['x'], 'feira.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText(/Escolher foto/), arquivo)
    expect(await screen.findByRole('img', { name: 'Foto escolhida' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Salvo e publicado ✓')).toBeInTheDocument()
    const [corpo] = chamadas(fetchFalso, 'POST', '/admin/conteudo/itens') as FormData[]
    expect(JSON.parse(corpo?.get('dados') as string)).toEqual({
      lista: 'inicio_fotos',
      titulo: null,
      texto: 'Feira de 2024',
    })
    expect(corpo?.get('miniatura')).toBeInstanceOf(Blob)
    expect(corpo?.get('completa')).toBeInstanceOf(Blob)
  })

  it('erro da API aparece na tela e o formulário continua preenchido', async () => {
    simularApi(
      api(conteudo(), {
        'POST /admin/conteudo/itens': respostaDeErro(409, 'Esta lista pode ter até 4 itens.'),
      }),
    )
    renderizarEm('/admin/textos/inicio_numeros/novo')

    await userEvent.type(await screen.findByLabelText(/Número/), '+50')
    await userEvent.type(screen.getByLabelText(/O que significa/), 'voluntários')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Esta lista pode ter até 4 itens.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Número/)).toHaveValue('+50')
  })

  it('item que não existe mais: avisa e leva de volta', async () => {
    simularApi(api())
    renderizarEm('/admin/textos/perguntas/sumiu')
    expect(await screen.findByText('Não encontramos este item')).toBeInTheDocument()
  })
})

describe('"Ver no site" depois de salvar (RN37)', () => {
  it('a página pública pede o /site com a marca, sem usar a cópia guardada pelo navegador', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
    marcarConteudoAlterado()
    const fetchFalso = simularApi({ '/publico/site?v=1800000000000': SITE_TESTE })
    renderizarEm('/perguntas-frequentes')

    expect(await screen.findByRole('heading', { name: 'Perguntas frequentes' })).toBeInTheDocument()
    expect(fetchFalso).toHaveBeenCalledWith(expect.stringMatching(/\/api\/publico\/site\?v=/))
  })

  it('a vitrine com filtro também pede com a marca (animal adotado some na hora)', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
    marcarConteudoAlterado()
    const fetchFalso = simularApi({
      '/publico/site?v=1800000000000': SITE_TESTE,
      '/publico/animais?especie=cao&v=1800000000000': { animais: [] },
    })
    renderizarEm('/animais?especie=cao')

    expect(await screen.findByText(/Nenhum animal/i)).toBeInTheDocument()
    expect(fetchFalso).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/publico\/animais\?especie=cao&v=1800000000000$/),
    )
  })
})
