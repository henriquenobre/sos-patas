// Área da ONG: moldura e sessão, painel (T09), cadastro (T10) e edição (T11), com a API
// simulada e as rotas reais. O preparo das fotos (canvas) é simulado: o jsdom não desenha.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { hojeNoBrasil, nascimentoAproximado } from '@sospatas/compartilhado'
import { ANIMAL_COMPLETO, API_ADMIN, APOLO, EU, PROTETORES, diasAtras } from '../../testes/admin'
import { chamadas, renderizarEm, respostaDeErro, simularApi } from '../../testes/renderizar'

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
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const LISTA = { animais: [APOLO] }

describe('Moldura da área da ONG', () => {
  it('mostra "Olá, {nome}", as abas e o número de pedidos pendentes', async () => {
    simularApi({ ...API_ADMIN, '/admin/animais?status=disponivel': LISTA })
    renderizarEm('/admin')
    expect(await screen.findByText('Olá, Gracia')).toBeInTheDocument()
    const barras = screen.getAllByRole('navigation', { name: 'Área da ONG' })
    for (const barra of barras) {
      expect(within(barra).getByRole('link', { name: /Pedidos.*4.*aguardando/ })).toHaveAttribute(
        'href',
        '/admin/pedidos',
      )
      expect(within(barra).getByRole('link', { name: /Animais/ })).toHaveAttribute(
        'aria-current',
        'page',
      )
    }
    expect(screen.getByRole('link', { name: 'Sair' })).toHaveAttribute(
      'href',
      '/cdn-cgi/access/logout',
    )
    expect(screen.queryByText(/aberto sem login/)).not.toBeInTheDocument()
  })

  it('prévia sem login: aviso fixo no topo para não confundir com a produção', async () => {
    simularApi({
      ...API_ADMIN,
      '/admin/eu': { ...EU, sem_login: true },
      '/admin/animais?status=disponivel': LISTA,
    })
    renderizarEm('/admin')
    expect(await screen.findByText('Olá, Gracia')).toBeInTheDocument()
    expect(screen.getByText(/Ambiente de teste, aberto sem login/)).toBeInTheDocument()
  })

  it('sessão vencida (401) pede para entrar de novo', async () => {
    simularApi({ '/admin/eu': respostaDeErro(401, 'Sua sessão terminou.') })
    renderizarEm('/admin')
    expect(await screen.findByText('Sua sessão terminou')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar de novo' })).toBeInTheDocument()
  })

  it('redirecionamento do Access para o login também conta como sessão vencida', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ type: 'opaqueredirect', ok: false, status: 0 })),
    )
    renderizarEm('/admin')
    expect(await screen.findByText('Sua sessão terminou')).toBeInTheDocument()
  })

  it('a sessão que vence no meio do uso também troca a tela', async () => {
    simularApi({
      ...API_ADMIN,
      '/admin/animais?status=disponivel': respostaDeErro(401, 'Sua sessão terminou.'),
    })
    renderizarEm('/admin')
    expect(await screen.findByText('Sua sessão terminou')).toBeInTheDocument()
  })

  it('e-mail fora da equipe (403) vê "Sem acesso"', async () => {
    simularApi({ '/admin/eu': respostaDeErro(403, 'Sem acesso.') })
    renderizarEm('/admin')
    expect(await screen.findByText('Sem acesso')).toBeInTheDocument()
  })
})

describe('Painel de animais (T09)', () => {
  it('mostra os números, o lar temporário e o tempo de espera em vermelho (RN12)', async () => {
    simularApi({ ...API_ADMIN, '/admin/animais?status=disponivel': LISTA })
    renderizarEm('/admin')
    expect(await screen.findByText('Apolo')).toBeInTheDocument()
    expect(screen.getByText('adultos esperando +90 dias').previousSibling).toHaveTextContent('3')
    expect(screen.getByText(/Cão · 4 anos · Lar da Claudia/)).toBeInTheDocument()
    expect(screen.getByText(/Esperando há 1 ano/)).toHaveClass('text-vermelho')
    expect(screen.getByRole('link', { name: 'Editar Apolo' })).toHaveAttribute(
      'href',
      `/admin/animais/${APOLO.id}`,
    )
  })

  it('aba Adotados mostra a adaptação (RN30); Em análise leva ao pedido (RN48)', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      '/admin/animais?status=disponivel': LISTA,
      '/admin/animais?status=adotado': {
        animais: [{ ...APOLO, status: 'adotado', data_adocao: diasAtras(5) }],
      },
      '/admin/animais?status=em_analise': {
        animais: [{ ...APOLO, status: 'em_analise', pedido: { id: 'p1', status: 'pendente' } }],
      },
    })
    renderizarEm('/admin')
    await userEvent.click(await screen.findByRole('tab', { name: 'Adotados' }))
    expect(await screen.findByText('Em adaptação: faltam 10 dias')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apolo foi adotado' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Em análise' }))
    expect(await screen.findByRole('link', { name: /Pedido aguardando análise/ })).toHaveAttribute(
      'href',
      '/admin/pedidos/p1',
    )
    expect(chamadas(fetchFalso, 'GET', '/admin/animais?status=adotado')).toHaveLength(1)
  })

  it('busca e filtro por responsável vão para a API', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      '/admin/animais?status=disponivel': LISTA,
      '/admin/animais?status=disponivel&responsavel=protetor': { animais: [] },
      [`/admin/animais?status=disponivel&responsavel=${PROTETORES.protetores[0]?.id ?? ''}`]: {
        animais: [],
      },
      '/admin/animais?status=disponivel&busca=ap': LISTA,
    })
    renderizarEm('/admin')
    await userEvent.type(await screen.findByPlaceholderText('Buscar pelo nome…'), 'ap')
    await waitFor(() => {
      expect(chamadas(fetchFalso, 'GET', '/admin/animais?status=disponivel&busca=ap')).toHaveLength(
        1,
      )
    })
    await userEvent.clear(screen.getByPlaceholderText('Buscar pelo nome…'))
    await userEvent.click(screen.getByRole('button', { name: 'Protetores' }))
    expect(await screen.findByText('Nenhum animal aqui.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '🤝 Protetora Ana Paula' }))
    expect(screen.getByRole('button', { name: '🤝 Protetora Ana Paula' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('"Adotado ✓" pede nome e WhatsApp e registra a adoção (RN07, RN08)', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      '/admin/animais?status=disponivel': LISTA,
      '/admin/animais?status=adotado': { animais: [] },
      [`POST /admin/animais/${APOLO.id}/adocao`]: undefined,
    })
    renderizarEm('/admin')
    await userEvent.click(await screen.findByRole('button', { name: 'Apolo foi adotado' }))
    const modal = screen.getByRole('dialog', { name: 'Apolo foi adotado? 🎉' })
    await userEvent.click(within(modal).getByRole('button', { name: 'Confirmar adoção' }))
    expect(within(modal).getByText('Preencha este campo')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', `/admin/animais/${APOLO.id}/adocao`)).toHaveLength(0)

    await userEvent.type(within(modal).getByLabelText(/Nome de quem adotou/), 'Fernanda')
    await userEvent.type(within(modal).getByLabelText(/WhatsApp de quem adotou/), '35 98888-7777')
    await userEvent.click(within(modal).getByRole('button', { name: 'Confirmar adoção' }))
    expect(await screen.findByText('Adoção registrada! 🎉')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', `/admin/animais/${APOLO.id}/adocao`)).toEqual([
      { adotante_nome: 'Fernanda', adotante_whatsapp: '35 98888-7777' },
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Pronto' }))
    expect(await screen.findByRole('tab', { name: 'Adotados' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})

/** Preenche os campos obrigatórios do cadastro. */
async function preencherObrigatorios() {
  await userEvent.type(screen.getByLabelText(/^Nome/), 'Bidu')
  await userEvent.click(screen.getByLabelText('🐶 Cão'))
  await userEvent.click(screen.getByLabelText('Macho'))
  await userEvent.type(screen.getByLabelText(/Idade aproximada/), '3')
  await userEvent.click(screen.getByLabelText('Médio'))
  const saude = screen.getByRole('heading', { name: '💉 Saúde' }).parentElement as HTMLElement
  const grupos = within(saude).getAllByRole('group')
  await userEvent.click(within(grupos[0] as HTMLElement).getByLabelText('Sim'))
  await userEvent.click(within(grupos[1] as HTMLElement).getByLabelText('Sim'))
  await userEvent.click(within(grupos[2] as HTMLElement).getByLabelText('Sem informação'))
  await userEvent.click(within(grupos[3] as HTMLElement).getByLabelText('Não'))
}

describe('Cadastrar animal (T10)', () => {
  it('sem os obrigatórios, mostra os erros e não envia', async () => {
    const fetchFalso = simularApi(API_ADMIN)
    renderizarEm('/admin/animais/novo')
    await userEvent.click(await screen.findByRole('button', { name: 'Publicar no site' }))
    expect(screen.getAllByText('Preencha este campo').length).toBeGreaterThan(0)
    expect(screen.getByText('Informe a idade aproximada (só o número)')).toBeInTheDocument()
    expect(screen.getByText('Escolha cão ou gato')).toBeInTheDocument()
    expect(screen.getByText('Responda se é castrado')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', '/admin/animais')).toHaveLength(0)
  })

  it('cadastra com 3 fotos e volta para o painel com "Ver no site"', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      'POST /admin/animais': { id: 'novo-id' },
      'POST /admin/animais/novo-id/fotos': { id: 'f', ordem: 0, miniatura: '', completa: '' },
      '/admin/animais?status=disponivel': LISTA,
    })
    renderizarEm('/admin/animais/novo')
    await screen.findByRole('heading', { name: 'Cadastrar animal' })
    for (const nome of ['a.jpg', 'b.jpg', 'c.jpg']) {
      await userEvent.upload(
        screen.getByLabelText('Adicionar foto'),
        new File(['x'], nome, { type: 'image/jpeg' }),
      )
      await screen.findAllByAltText(/Foto \d de/)
    }
    expect(screen.getAllByAltText(/Foto \d de/)).toHaveLength(3)
    expect(screen.queryByLabelText('Adicionar foto')).not.toBeInTheDocument()

    await preencherObrigatorios()
    await userEvent.type(screen.getByLabelText(/lar temporário/), 'Lar da Gracia')
    await userEvent.click(screen.getByRole('button', { name: 'Publicar no site' }))

    expect(await screen.findByText('Bidu publicado no site ✓')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver no site ↗' })).toHaveAttribute(
      'href',
      '/animais/novo-id',
    )
    const [corpo] = chamadas(fetchFalso, 'POST', '/admin/animais') as Record<string, unknown>[]
    expect(corpo).toMatchObject({
      nome: 'Bidu',
      especie: 'cao',
      sexo: 'macho',
      porte: 'medio',
      nascimento_aprox: nascimentoAproximado(3, 'anos', hojeNoBrasil()),
      castrado: true,
      vacinado: 'sim',
      vermifugado: 'sem_informacao',
      problema_saude: null,
      docil: null,
      responsavel_tipo: 'ong',
      protetor_id: null,
      data_entrada: hojeNoBrasil(),
      privado: { lar_nome: 'Lar da Gracia', lar_tipo: null, observacoes: '' },
    })
    const fotos = chamadas(fetchFalso, 'POST', '/admin/animais/novo-id/fotos')
    expect(fotos).toHaveLength(3)
    expect(fotos[0]).toBeInstanceOf(FormData)
    expect((fotos[0] as FormData).get('miniatura')).toBeInstanceOf(Blob)
    expect((fotos[0] as FormData).get('completa')).toBeInstanceOf(Blob)
  })

  it('protetor parceiro: exige escolher e cria um novo ali mesmo (RN42)', async () => {
    const novo = {
      ...PROTETORES.protetores[0],
      id: '11111111-1111-4111-8111-111111111111',
      nome: 'Grupo Gatos',
    }
    const fetchFalso = simularApi({
      ...API_ADMIN,
      'POST /admin/protetores': novo,
      'POST /admin/animais': { id: 'novo-id' },
      '/admin/animais?status=disponivel': LISTA,
    })
    renderizarEm('/admin/animais/novo')
    await preencherObrigatoriosQuandoPronto()
    await userEvent.click(screen.getByLabelText('Protetor parceiro'))
    await userEvent.click(screen.getByRole('button', { name: 'Publicar no site' }))
    expect(await screen.findByText('Escolha o protetor parceiro')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', '/admin/animais')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: '＋ Novo protetor' }))
    const modal = screen.getByRole('dialog', { name: 'Novo protetor parceiro' })
    await userEvent.type(within(modal).getByLabelText(/Nome do protetor/), 'Grupo Gatos')
    await userEvent.type(within(modal).getByLabelText(/WhatsApp do protetor/), '35999990000')
    await userEvent.click(within(modal).getByRole('button', { name: 'Cadastrar protetor' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(chamadas(fetchFalso, 'POST', '/admin/protetores')).toEqual([
      { nome: 'Grupo Gatos', whatsapp: '35999990000' },
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Publicar no site' }))
    await screen.findByText('Bidu publicado no site ✓')
    const [corpo] = chamadas(fetchFalso, 'POST', '/admin/animais') as Record<string, unknown>[]
    expect(corpo).toMatchObject({ responsavel_tipo: 'protetor', protetor_id: novo.id })
  })

  it('erro de campo da API aparece embaixo do campo', async () => {
    simularApi({
      ...API_ADMIN,
      'POST /admin/animais': respostaDeErro(400, 'Confira os campos destacados.', {
        nascimento_aprox: 'A data não pode ser no futuro',
      }),
    })
    renderizarEm('/admin/animais/novo')
    await preencherObrigatoriosQuandoPronto()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar no site' }))
    expect(await screen.findByText('A data não pode ser no futuro')).toBeInTheDocument()
    expect(screen.getByText('Confira os campos destacados.')).toBeInTheDocument()
  })
})

async function preencherObrigatoriosQuandoPronto() {
  await screen.findByRole('heading', { name: 'Cadastrar animal' })
  await preencherObrigatorios()
}

describe('Editar animal (T11)', () => {
  const caminho = `/admin/animais/${APOLO.id}`

  it('abre preenchido, com "Alterado por" e sem mudar a data de nascimento', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      [caminho]: ANIMAL_COMPLETO,
      [`PUT ${caminho}`]: undefined,
      '/admin/animais?status=disponivel': LISTA,
    })
    renderizarEm(caminho)
    expect(await screen.findByRole('heading', { name: 'Editar Apolo' })).toBeInTheDocument()
    expect(screen.getByText('Alterado por Claudia em 07/10/2026')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Apolo')
    expect(screen.getByLabelText('Mestiço')).toBeChecked()
    expect(screen.getByRole('link', { name: 'Ver no site ↗' })).toHaveAttribute(
      'href',
      `/animais/${APOLO.id}`,
    )

    await userEvent.type(screen.getByLabelText(/Observações internas/), 'Toma remédio')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Salvo e publicado ✓')).toBeInTheDocument()
    const [corpo] = chamadas(fetchFalso, 'PUT', caminho) as Record<string, unknown>[]
    expect(corpo).toMatchObject({
      nascimento_aprox: '2022-06-15',
      raca_tipo: 'mestico',
      docil: true,
      convive_animais: false,
      vacinas: 'V10',
      privado: { lar_nome: 'Lar da Claudia', lar_tipo: 'provisorio', observacoes: 'Toma remédio' },
    })
    // Fotos sem mudança: nenhuma chamada de fotos
    expect(fetchFalso.mock.calls.filter(([url]) => url.includes(`${caminho}/fotos`))).toHaveLength(
      0,
    )
  })

  it('remover e reordenar fotos: apaga a que saiu e manda a ordem nova', async () => {
    const terceira = { id: 'foto-3', ordem: 2, miniatura: '/f/3-thumb.webp', completa: '/f/3.webp' }
    const fetchFalso = simularApi({
      ...API_ADMIN,
      [caminho]: {
        ...ANIMAL_COMPLETO,
        fotos: [...ANIMAL_COMPLETO.fotos, terceira],
      },
      [`PUT ${caminho}`]: undefined,
      [`DELETE ${caminho}/fotos/foto-1`]: undefined,
      [`PUT ${caminho}/fotos/ordem`]: undefined,
      '/admin/animais?status=disponivel': LISTA,
    })
    renderizarEm(caminho)
    await userEvent.click(await screen.findByRole('button', { name: 'Remover a foto 1' }))
    // Agora: foto-2, foto-3. Passa a 2ª (foto-3) para a esquerda: vira a principal
    await userEvent.click(screen.getByRole('button', { name: 'Passar a foto 2 para a esquerda' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await screen.findByText('Salvo e publicado ✓')
    expect(chamadas(fetchFalso, 'DELETE', `${caminho}/fotos/foto-1`)).toHaveLength(1)
    expect(chamadas(fetchFalso, 'PUT', `${caminho}/fotos/ordem`)).toEqual([
      { fotos: ['foto-3', 'foto-2'] },
    ])
  })

  it('falha nas fotos: os dados ficam salvos e a tela avisa', async () => {
    simularApi({
      ...API_ADMIN,
      [caminho]: ANIMAL_COMPLETO,
      [`PUT ${caminho}`]: undefined,
      [`DELETE ${caminho}/fotos/foto-1`]: respostaDeErro(
        503,
        'Não conseguimos apagar a foto agora.',
      ),
    })
    renderizarEm(caminho)
    await userEvent.click(await screen.findByRole('button', { name: 'Remover a foto 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(
      await screen.findByText(
        'Os dados foram salvos, mas as fotos não. Não conseguimos apagar a foto agora.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Editar Apolo' })).toBeInTheDocument()
  })

  it('pedido aprovado: "Marcar como adotado" já vem com quem pediu (RN49)', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      [caminho]: {
        ...ANIMAL_COMPLETO,
        status: 'em_analise',
        pedido_aprovado: { id: 'p1', nome: 'Fernanda Lima', whatsapp: '35988887777' },
      },
      [`POST ${caminho}/adocao`]: undefined,
      '/admin/animais?status=adotado': { animais: [] },
    })
    renderizarEm(caminho)
    expect(await screen.findByText(/Pedido aprovado de/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver no site ↗' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como adotado ✓' }))
    const modal = screen.getByRole('dialog')
    expect(within(modal).getByLabelText(/Nome de quem adotou/)).toHaveValue('Fernanda Lima')
    expect(within(modal).getByLabelText(/WhatsApp de quem adotou/)).toHaveValue('(35) 9 8888-7777')
    await userEvent.click(within(modal).getByRole('button', { name: 'Confirmar adoção' }))
    await screen.findByText('Adoção registrada! 🎉')
    expect(chamadas(fetchFalso, 'POST', `${caminho}/adocao`)).toEqual([
      { adotante_nome: 'Fernanda Lima', adotante_whatsapp: '(35) 9 8888-7777' },
    ])
  })

  it('pedido aguardando análise: sem adotar nem devolver, com o aviso', async () => {
    simularApi({
      ...API_ADMIN,
      [caminho]: { ...ANIMAL_COMPLETO, status: 'em_analise' },
    })
    renderizarEm(caminho)
    expect(await screen.findByText(/aguardando análise/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Marcar como adotado/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Voltar para disponível/ })).not.toBeInTheDocument()
  })

  it('adotado: mostra a adaptação e volta para disponível com confirmação (RN30)', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      [caminho]: {
        ...ANIMAL_COMPLETO,
        status: 'adotado',
        data_adocao: diasAtras(20),
        fotos: [ANIMAL_COMPLETO.fotos[0]],
        adotante: { id: 'ad1', nome: 'Fernanda', whatsapp: '35988887777' },
        pedido_da_adocao: { id: 'p1' },
      },
      [`POST ${caminho}/devolucao`]: undefined,
      '/admin/animais?status=disponivel': LISTA,
    })
    renderizarEm(caminho)
    expect(await screen.findByText('Adoção concluída')).toBeInTheDocument()
    expect(screen.getByText(/Adotado por/)).toHaveTextContent(
      'Adotado por Fernanda · (35) 9 8888-7777',
    )
    // Quem adotou abre no cadastro de quem adotou (RN53)
    expect(screen.getByRole('link', { name: 'Fernanda' })).toHaveAttribute(
      'href',
      '/admin/adotantes/ad1',
    )
    expect(
      screen.getByRole('link', { name: '📋 Ver o formulário de adoção (para imprimir)' }),
    ).toHaveAttribute('href', '/admin/pedidos/p1')
    expect(screen.getByText('Animal adotado guarda só a foto principal.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Voltar para disponível' }))
    const modal = screen.getByRole('dialog', { name: 'Apolo volta para o site?' })
    await userEvent.click(within(modal).getByRole('button', { name: 'Voltar para disponível' }))
    expect(await screen.findByText('Apolo voltou para disponíveis')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', `${caminho}/devolucao`)).toHaveLength(1)
  })

  it('excluir pede confirmação; se o armazenamento falhar, avisa e nada some (RN05)', async () => {
    simularApi({
      ...API_ADMIN,
      [caminho]: ANIMAL_COMPLETO,
      [`DELETE ${caminho}`]: respostaDeErro(503, 'Não conseguimos apagar as fotos agora.'),
    })
    renderizarEm(caminho)
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir animal' }))
    const modal = screen.getByRole('dialog', { name: 'Excluir Apolo?' })
    expect(within(modal).getByText(/todas as fotos/)).toBeInTheDocument()
    await userEvent.click(within(modal).getByRole('button', { name: 'Excluir' }))
    expect(
      await within(modal).findByText('Não conseguimos apagar as fotos agora.'),
    ).toBeInTheDocument()
    await userEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('excluir com sucesso volta para o painel', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      [caminho]: ANIMAL_COMPLETO,
      [`DELETE ${caminho}`]: undefined,
      '/admin/animais?status=disponivel': { animais: [] },
    })
    renderizarEm(caminho)
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir animal' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }),
    )
    expect(await screen.findByText('Apolo foi excluído')).toBeInTheDocument()
    expect(await screen.findByText('Nenhum animal aqui.')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'DELETE', caminho)).toHaveLength(1)
  })

  it('animal que não existe mais', async () => {
    simularApi(API_ADMIN)
    renderizarEm(caminho)
    expect(await screen.findByText('Não encontramos este animal')).toBeInTheDocument()
  })
})
