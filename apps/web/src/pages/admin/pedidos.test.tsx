// Pedidos de adoção na área da ONG: lista (T27) e análise (T28), RN47–RN50.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DECLARACOES,
  VERSAO_TERMO,
  type PedidoDetalhe,
  type PedidoResumo,
} from '@sospatas/compartilhado'
import { API_ADMIN } from '../../testes/admin'
import { chamadas, renderizarEm, respostaDeErro, simularApi } from '../../testes/renderizar'

afterEach(() => {
  vi.unstubAllGlobals()
})

const diasAtrasIso = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString()

const ANIMAL = {
  id: 'a1',
  nome: 'Mel',
  especie: 'gato',
  sexo: 'femea',
  status: 'em_analise',
  foto: null,
  responsavel_tipo: 'protetor',
  protetor_nome: 'Protetora Ana Paula',
} as const

const RECENTE: PedidoResumo = {
  id: 'p1',
  status: 'pendente',
  created_at: diasAtrasIso(1),
  nome: 'Fernanda Lima',
  bairro_cidade: 'Centro, Passos',
  animal: ANIMAL,
  quantidade_alertas: 2,
}

const PARADO: PedidoResumo = {
  ...RECENTE,
  id: 'p2',
  created_at: diasAtrasIso(5),
  nome: 'João Souza',
  quantidade_alertas: 0,
}

const DETALHE: PedidoDetalhe = {
  id: 'p1',
  status: 'pendente',
  created_at: '2026-10-10T17:05:00Z',
  nome: 'Fernanda Lima',
  bairro_cidade: 'Centro, Passos',
  animal: ANIMAL,
  whatsapp: '35988887777',
  versao_formulario: '1.2',
  respostas: {
    maior_idade: 'sim',
    instagram_facebook: null,
    motivo: 'Sempre quis uma gata.\nTenho tempo.',
    moradia: 'apartamento',
    imovel: 'alugado',
    proprietario_permite: 'nao_sei',
    espaco: 'sem_area',
    local_coberto: 'sim',
    casa_segura: 'sim',
    telas_janelas: 'vou_colocar',
    onde_fica: 'dentro',
    moradores: '2 adultos',
    todos_concordam: 'sim',
    tem_animais: 'sim',
    animais_quantos: '1 gato',
    animais_sexo: ['macho', 'femea'],
    animais_castrados_vacinados: 'todos',
    historico_animais: 'Tive um cão por 12 anos.',
    vacinar_vermifugar: 'sim',
    castrar: 'sim',
    arcar_custos: 'sim',
    horas_sozinho: 'de_4_a_8',
    mudanca_viagem: 'Levo comigo.',
  },
  termo_ciente_em: '2026-10-10T17:05:00Z',
  versao_termo: '1.0',
  consentimento_em: '2026-10-10T17:05:00Z',
  observacao_equipe: '',
  analisado_em: null,
  analisado_por: null,
  alertas: [
    { codigo: 'proprietario', texto: 'Permissão do proprietário' },
    { codigo: 'mesmo_sexo', texto: 'Mesmo sexo' },
  ],
}

describe('Pedidos de adoção (T27)', () => {
  it('lista quem pediu, há quantos dias e os alertas; parado há +3 dias em vermelho (RN50)', async () => {
    simularApi({ ...API_ADMIN, '/admin/pedidos?status=pendente': { pedidos: [PARADO, RECENTE] } })
    renderizarEm('/admin/pedidos')
    const parado = await screen.findByRole('link', { name: /João Souza/ })
    expect(parado).toHaveClass('ring-vermelho')
    expect(within(parado).getByText(/há 5 dias · esperando análise/)).toBeInTheDocument()
    expect(within(parado).getByText(/Protetor: Protetora Ana Paula/)).toBeInTheDocument()

    const recente = screen.getByRole('link', { name: /Fernanda Lima/ })
    expect(recente).not.toHaveClass('ring-vermelho')
    expect(recente).toHaveAttribute('href', '/admin/pedidos/p1')
    expect(within(recente).getByText(/há 1 dia/)).toBeInTheDocument()
    expect(recente).toHaveTextContent('⚠️ 2 alertas')
  })

  it('as abas buscam os aprovados e os recusados', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      '/admin/pedidos?status=pendente': { pedidos: [] },
      '/admin/pedidos?status=aprovado': { pedidos: [{ ...RECENTE, status: 'aprovado' }] },
    })
    renderizarEm('/admin/pedidos')
    expect(await screen.findByText('Nenhum pedido esperando análise.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Aprovados' }))
    const item = await screen.findByRole('link', { name: /Fernanda Lima/ })
    expect(item).not.toHaveClass('ring-vermelho')
    expect(chamadas(fetchFalso, 'GET', '/admin/pedidos?status=aprovado')).toHaveLength(1)
  })
})

describe('Análise do pedido (T28)', () => {
  it('mostra quem pediu, o WhatsApp, os alertas, as respostas por extenso e o termo', async () => {
    simularApi({ ...API_ADMIN, '/admin/pedidos/p1': DETALHE })
    renderizarEm('/admin/pedidos/p1')
    expect(await screen.findByText('Permissão do proprietário')).toBeInTheDocument()
    expect(screen.getByText('Mesmo sexo')).toBeInTheDocument()
    const whatsapp = screen.getByRole('link', { name: /Conversar no WhatsApp/ })
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5535988887777\?text=/)
    expect(screen.getByRole('link', { name: /Mel/ })).toHaveAttribute('href', '/admin/animais/a1')

    expect(screen.getByText('Apartamento')).toBeInTheDocument()
    expect(screen.getByText('Não sei')).toBeInTheDocument()
    expect(screen.getByText('Machos e Fêmeas')).toBeInTheDocument()
    expect(screen.getByText('De 4 a 8 horas')).toBeInTheDocument()
    // No botão do WhatsApp e nas respostas do bloco 1
    expect(whatsapp).toHaveTextContent('(35) 9 8888-7777')
    expect(screen.getAllByText('(35) 9 8888-7777')).toHaveLength(2)
    // Pergunta sem resposta (opcional) não aparece
    expect(screen.queryByText('5. Instagram ou Facebook')).not.toBeInTheDocument()
    expect(screen.getByText(/Ciente do termo em 10\/10\/2026 às 14:05/)).toBeInTheDocument()
  })

  it('recusar pede confirmação e devolve o animal ao site (RN49)', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      '/admin/pedidos/p1': DETALHE,
      'POST /admin/pedidos/p1/recusar': undefined,
      '/admin/pedidos?status=pendente': { pedidos: [] },
    })
    renderizarEm('/admin/pedidos/p1')
    await userEvent.click(await screen.findByRole('button', { name: 'Recusar' }))
    const modal = screen.getByRole('dialog', { name: 'Recusar o pedido de Fernanda?' })
    expect(within(modal).getByText(/Mel volta para o site/)).toBeInTheDocument()
    await userEvent.click(within(modal).getByRole('button', { name: 'Recusar' }))
    expect(await screen.findByText('Pedido recusado. Mel voltou para o site.')).toBeInTheDocument()
    expect(await screen.findByText('Nenhum pedido esperando análise.')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', '/admin/pedidos/p1/recusar')).toHaveLength(1)
  })

  it('aprovar mantém o animal fora do site e explica o próximo passo', async () => {
    let aprovado = false
    const fetchFalso = simularApi({
      ...API_ADMIN,
      '/admin/pedidos/p1': () =>
        Response.json(aprovado ? { ...DETALHE, status: 'aprovado' } : DETALHE),
      'POST /admin/pedidos/p1/aprovar': () => {
        aprovado = true
        return new Response(null, { status: 204 })
      },
    })
    renderizarEm('/admin/pedidos/p1')
    await userEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprovar' }),
    )
    expect(await screen.findByText('✅ Pedido aprovado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir Mel' })).toHaveAttribute(
      'href',
      '/admin/animais/a1',
    )
    expect(screen.queryByRole('button', { name: 'Recusar' })).not.toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', '/admin/pedidos/p1/aprovar')).toHaveLength(1)
  })

  it('pedido de animal já adotado: "Adoção concluída", ainda com a impressão', async () => {
    simularApi({
      ...API_ADMIN,
      '/admin/pedidos/p1': {
        ...DETALHE,
        status: 'aprovado',
        animal: { ...ANIMAL, status: 'adotado' },
      },
      '/admin/pedidos?status=aprovado': {
        pedidos: [{ ...RECENTE, status: 'aprovado', animal: { ...ANIMAL, status: 'adotado' } }],
      },
    })
    renderizarEm('/admin/pedidos?aba=aprovado')
    expect(await screen.findByText(/adotado/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: /Fernanda Lima/ }))
    expect(await screen.findByText('🎉 Adoção concluída')).toBeInTheDocument()
    expect(screen.queryByText(/Combine com Fernanda/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '🖨️ Imprimir formulário' })).toBeInTheDocument()
  })

  it('conflito na decisão aparece no modal', async () => {
    simularApi({
      ...API_ADMIN,
      '/admin/pedidos/p1': DETALHE,
      'POST /admin/pedidos/p1/aprovar': respostaDeErro(409, 'Este pedido já foi analisado.'),
    })
    renderizarEm('/admin/pedidos/p1')
    await userEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))
    const modal = screen.getByRole('dialog')
    await userEvent.click(within(modal).getByRole('button', { name: 'Aprovar' }))
    expect(await within(modal).findByText('Este pedido já foi analisado.')).toBeInTheDocument()
  })

  it('"Imprimir formulário" abre a impressão, com as declarações e o termo só no papel', async () => {
    const imprimir = vi.fn()
    vi.stubGlobal('print', imprimir)
    simularApi({ ...API_ADMIN, '/admin/pedidos/p1': { ...DETALHE, versao_termo: VERSAO_TERMO } })
    renderizarEm('/admin/pedidos/p1')
    await userEvent.click(await screen.findByRole('button', { name: '🖨️ Imprimir formulário' }))
    expect(imprimir).toHaveBeenCalledOnce()
    expect(screen.getByText(`☑ ${DECLARACOES[0]}`).closest('div.hidden')).toHaveClass('print:block')
    expect(screen.getByText(/Assinatura de quem adota \(Fernanda Lima\)/)).toBeInTheDocument()
    // O que é só da equipe não vai para o papel
    expect(screen.getByText('⚠️ Pontos para conversar').closest('section')).toHaveClass(
      'print:hidden',
    )
  })

  it('salva a observação interna', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      '/admin/pedidos/p1': DETALHE,
      'PUT /admin/pedidos/p1/observacao': undefined,
    })
    renderizarEm('/admin/pedidos/p1')
    const botao = await screen.findByRole('button', { name: 'Salvar observação' })
    expect(botao).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/Anotações da conversa/), 'Ligar sábado')
    await userEvent.click(botao)
    expect(await screen.findByText('Observação salva ✓')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'PUT', '/admin/pedidos/p1/observacao')).toEqual([
      { observacao: 'Ligar sábado' },
    ])
  })

  it('pedido que não existe mais (apagado pela LGPD)', async () => {
    simularApi(API_ADMIN)
    renderizarEm('/admin/pedidos/p9')
    expect(await screen.findByText('Não encontramos este pedido')).toBeInTheDocument()
  })
})
