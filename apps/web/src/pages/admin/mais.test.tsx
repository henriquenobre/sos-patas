// Etapa 13 na área da ONG: T22 Mais, T23 Dados da ONG (RN51), T24 Protetores (RN42) e T21
// anúncio pela equipe (RN39, RN40), com "Alterado por" (RN43).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { OngAdmin, PerdidoAdmin, ProtetorAdmin } from '@sospatas/compartilhado'
import { API_ADMIN, PROTETORES, diasAtras } from '../../testes/admin'
import { chamadas, renderizarEm, respostaDeErro, simularApi } from '../../testes/renderizar'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ONG: OngAdmin = {
  nome_completo: 'Associação SOS Patas',
  email: 'sitesospatas@gmail.com',
  whatsapp: null,
  instagram: 'sospatas.ong',
  facebook: 'https://facebook.com/sospatasmg',
  pix_tipo: 'cnpj',
  pix_chave: '26.515.895/0001-90',
  alteracao: { em: '2026-10-09T12:00:00Z', por: 'Gracia' },
}

const BETO: ProtetorAdmin = {
  id: '0b5c1f0e-5f2d-4f7e-9a1a-3c2d1e0f9a8b',
  nome: 'Beto',
  whatsapp: '35977776666',
  animais: 0,
  animais_disponiveis: 0,
  alteracao: { em: '2026-10-02T12:00:00Z', por: null },
}

const ANA = PROTETORES.protetores[0] as ProtetorAdmin

const LUNA: PerdidoAdmin = {
  id: 'l1',
  tipo: 'perdido',
  especie: 'cao',
  nome: 'Luna',
  bairro: 'Novo Horizonte',
  data_ocorrido: diasAtras(2),
  descricao: 'Filhote branca com orelhas marrons.',
  contato_nome: 'Rita',
  contato_whatsapp: '35900000003',
  origem: 'site',
  status: 'pendente',
  created_at: new Date().toISOString(),
  publicado_em: null,
  expira_em: null,
  fotos: [{ id: 'f1', url: '/api/admin/perdidos/l1/fotos/f1' }],
  alteracao: { em: '2026-10-13T12:00:00Z', por: null },
}

const api = (extra: Record<string, unknown> = {}) => ({
  ...API_ADMIN,
  '/admin/protetores': { protetores: [ANA, BETO] },
  '/admin/ong': ONG,
  ...extra,
})

describe('T22 · Mais', () => {
  it('atalhos para Dados da ONG, Protetores (com a quantidade), Ver o site e Sair', async () => {
    simularApi(api())
    renderizarEm('/admin/mais')

    expect(await screen.findByRole('link', { name: /Protetores parceiros \(2\)/ })).toHaveAttribute(
      'href',
      '/admin/protetores',
    )
    expect(screen.getByRole('link', { name: /Dados da ONG/ })).toHaveAttribute('href', '/admin/ong')
    const atalhos = within(screen.getByRole('list'))
    expect(atalhos.getByRole('link', { name: /Ver o site/ })).toHaveAttribute('target', '_blank')
    const sair = screen.getAllByRole('link', { name: /Sair/ })
    expect(sair.every((link) => link.getAttribute('href') === '/cdn-cgi/access/logout')).toBe(true)
    expect(screen.getByText(/Fale com o administrador do site/)).toBeInTheDocument()
  })
})

describe('T23 · Dados da ONG', () => {
  it('mostra os dados, o "@" fixo do Instagram, a prévia do PIX e quem alterou', async () => {
    simularApi(api())
    renderizarEm('/admin/ong')

    expect(await screen.findByLabelText(/E-mail da ONG/)).toHaveValue('sitesospatas@gmail.com')
    expect(screen.getByLabelText(/Instagram/)).toHaveValue('sospatas.ong')
    expect(screen.getByText('Alterado por Gracia em 09/10/2026')).toBeInTheDocument()
    expect(screen.getByText('Prévia do PIX no site')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'CNPJ' })).toBeChecked()
  })

  it('e-mail inválido mostra o erro e não chama a API', async () => {
    const fetchFalso = simularApi(api())
    renderizarEm('/admin/ong')

    const email = await screen.findByLabelText(/E-mail da ONG/)
    await userEvent.clear(email)
    await userEvent.type(email, 'sospatas')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText(/e-mail/i, { selector: 'p.text-vermelho' })).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'PUT', '/admin/ong')).toHaveLength(0)
  })

  it('salva o WhatsApp novo e avisa "Salvo e publicado" com o link do site', async () => {
    const salva = {
      ...ONG,
      whatsapp: '35988439614',
      alteracao: { em: new Date().toISOString(), por: 'Gracia' },
    }
    const fetchFalso = simularApi(api({ 'PUT /admin/ong': salva }))
    renderizarEm('/admin/ong')

    await userEvent.type(await screen.findByLabelText(/WhatsApp da ONG/), '(35) 9 8843-9614')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Salvo e publicado ✓')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'PUT', '/admin/ong')).toEqual([
      expect.objectContaining({ whatsapp: '(35) 9 8843-9614', instagram: 'sospatas.ong' }),
    ])
    expect(screen.getByLabelText(/WhatsApp da ONG/)).toHaveValue('(35) 9 8843-9614')
  })
})

describe('T24 · Protetores parceiros (RN42)', () => {
  it('lista com o WhatsApp formatado e os animais disponíveis', async () => {
    simularApi(api())
    renderizarEm('/admin/protetores')

    const ana = await screen.findByRole('button', { name: /Protetora Ana Paula/ })
    expect(ana).toHaveTextContent('(35) 9 0000-0000 · 1 animal disponível')
    expect(ana).toHaveTextContent('Alterado por Claudia em 01/10/2026')
  })

  it('protetor com animais: sem "Excluir", com o aviso e o link para os animais dele', async () => {
    simularApi(api())
    renderizarEm('/admin/protetores')

    await userEvent.click(await screen.findByRole('button', { name: /Protetora Ana Paula/ }))
    const modal = screen.getByRole('dialog', { name: 'Editar protetor' })
    expect(within(modal).getByText(/tem 1 animal. Troque o responsável/)).toBeInTheDocument()
    expect(within(modal).getByRole('link', { name: 'Ver animais dele' })).toHaveAttribute(
      'href',
      `/admin?responsavel=${ANA.id}`,
    )
    expect(
      within(modal).queryByRole('button', { name: 'Excluir protetor' }),
    ).not.toBeInTheDocument()
  })

  it('edita o WhatsApp e exclui o protetor sem animais, com confirmação', async () => {
    const fetchFalso = simularApi(
      api({
        [`PUT /admin/protetores/${BETO.id}`]: undefined,
        [`DELETE /admin/protetores/${BETO.id}`]: undefined,
      }),
    )
    renderizarEm('/admin/protetores')

    await userEvent.click(await screen.findByRole('button', { name: /Beto/ }))
    const whatsapp = screen.getByLabelText(/WhatsApp do protetor/)
    await userEvent.clear(whatsapp)
    await userEvent.type(whatsapp, '35911112222')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Protetor salvo ✓')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'PUT', `/admin/protetores/${BETO.id}`)).toEqual([
      { nome: 'Beto', whatsapp: '35911112222' },
    ])

    await userEvent.click(screen.getByRole('button', { name: /Beto/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Excluir protetor' }))
    const confirmar = screen.getByRole('dialog', { name: 'Excluir protetor?' })
    await userEvent.click(within(confirmar).getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText('Protetor excluído')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'DELETE', `/admin/protetores/${BETO.id}`)).toHaveLength(1)
  })

  it('"＋ Novo protetor" cadastra pelo mesmo modal', async () => {
    const fetchFalso = simularApi(api({ 'POST /admin/protetores': { ...BETO, id: 'novo' } }))
    renderizarEm('/admin/protetores')

    await userEvent.click(await screen.findByRole('button', { name: '＋ Novo protetor' }))
    await userEvent.type(screen.getByLabelText(/Nome do protetor/), 'Carla')
    await userEvent.type(screen.getByLabelText(/WhatsApp do protetor/), '35922223333')
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar protetor' }))
    expect(await screen.findByText('Protetor cadastrado ✓')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', '/admin/protetores')).toEqual([
      { nome: 'Carla', whatsapp: '35922223333' },
    ])
  })
})

describe('T21 · Anúncio pela equipe', () => {
  async function preencher() {
    await userEvent.click(await screen.findByRole('radio', { name: '🔎 Perdido' }))
    await userEvent.click(screen.getByRole('radio', { name: '🐶 Cão' }))
    await userEvent.type(screen.getByLabelText(/Bairro ou região/), 'Centro')
    await userEvent.type(screen.getByLabelText(/Características/), 'Caramelo, coleira azul.')
    await userEvent.type(screen.getByLabelText(/Primeiro nome do contato/), 'Marcos')
    await userEvent.type(screen.getByLabelText(/WhatsApp do contato/), '35999991234')
  }

  it('novo: exige a autorização da pessoa e publica direto (RN39)', async () => {
    const fetchFalso = simularApi(api({ 'POST /admin/perdidos': { id: 'n1' } }))
    renderizarEm('/admin/perdidos/novo')

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    expect(screen.getByText(/Confirme que a pessoa autorizou/)).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', '/admin/perdidos')).toHaveLength(0)

    await userEvent.click(screen.getByRole('checkbox', { name: /A pessoa autorizou/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    expect(await screen.findByText('Publicado no site ✓')).toBeInTheDocument()
    const [corpo] = chamadas(fetchFalso, 'POST', '/admin/perdidos') as FormData[]
    expect(JSON.parse(corpo?.get('dados') as string)).toMatchObject({
      tipo: 'perdido',
      bairro: 'Centro',
      contato_nome: 'Marcos',
      autorizacao: true,
    })
  })

  it('editar: campos preenchidos, situação, aviso e as fotos removidas saem (RN40)', async () => {
    const fetchFalso = simularApi(
      api({
        '/admin/perdidos/l1': LUNA,
        'PUT /admin/perdidos/l1': undefined,
        'DELETE /admin/perdidos/l1/fotos/f1': undefined,
      }),
    )
    renderizarEm('/admin/perdidos/l1')

    expect(await screen.findByLabelText(/Bairro ou região/)).toHaveValue('Novo Horizonte')
    expect(screen.getByText('Aguardando aprovação')).toBeInTheDocument()
    expect(screen.getByText('Quem anunciou não é avisado das alterações.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto escolhida' })).toHaveAttribute(
      'src',
      '/api/admin/perdidos/l1/fotos/f1',
    )
    expect(screen.getByRole('button', { name: 'Aprovar e publicar' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remover foto' }))
    await userEvent.clear(screen.getByLabelText(/Características/))
    await userEvent.type(screen.getByLabelText(/Características/), 'Branca, orelhas marrons.')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Salvo ✓')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'PUT', '/admin/perdidos/l1')).toEqual([
      expect.objectContaining({
        descricao: 'Branca, orelhas marrons.',
        contato_whatsapp: '(35) 9 0000-0003',
      }),
    ])
    expect(chamadas(fetchFalso, 'DELETE', '/admin/perdidos/l1/fotos/f1')).toHaveLength(1)
  })

  it('erro da API aparece e o formulário continua preenchido', async () => {
    simularApi(
      api({
        '/admin/perdidos/l1': LUNA,
        'PUT /admin/perdidos/l1': respostaDeErro(400, 'Confira os campos destacados.', {
          descricao: 'Não coloque links na descrição',
        }),
      }),
    )
    renderizarEm('/admin/perdidos/l1')

    await screen.findByLabelText(/Bairro ou região/)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Não coloque links na descrição')).toBeInTheDocument()
    expect(screen.getByLabelText(/Bairro ou região/)).toHaveValue('Novo Horizonte')
  })

  it('a moderação (T14) leva para o novo anúncio e para a edição', async () => {
    simularApi(
      api({
        '/admin/perdidos?status=pendente': { perdidos: [LUNA] },
        '/admin/perdidos?status=publicado': { perdidos: [] },
      }),
    )
    renderizarEm('/admin/perdidos')

    expect(await screen.findByRole('link', { name: 'Editar o anúncio de Luna' })).toHaveAttribute(
      'href',
      '/admin/perdidos/l1',
    )
    expect(screen.getByRole('link', { name: '＋ Novo anúncio' })).toHaveAttribute(
      'href',
      '/admin/perdidos/novo',
    )
  })
})
