// Cadastro de quem adotou (RN53): lista com busca (T30), ficha com histórico (T31), cadastro à
// mão, adoção antiga e exclusão.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AdotanteDetalhe, AdotanteResumo } from '@sospatas/compartilhado'
import { API_ADMIN } from '../../testes/admin'
import { chamadas, renderizarEm, respostaDeErro, simularApi } from '../../testes/renderizar'

afterEach(() => {
  vi.unstubAllGlobals()
})

const JOANA: AdotanteResumo = {
  id: 'ad1',
  nome: 'Joana Pereira',
  whatsapp: '35988439614',
  bairro_cidade: 'Centro, Passos',
  observacoes: '',
  adocoes: 1,
  devolucoes: 0,
  ultima_adocao: '2026-10-10',
}

const MARCOS: AdotanteResumo = {
  id: 'ad2',
  nome: 'Marcos Lima',
  whatsapp: null,
  bairro_cidade: null,
  observacoes: 'Devolveu o Rex depois de 2 meses.',
  adocoes: 1,
  devolucoes: 1,
  ultima_adocao: '2024-03-01',
}

const FICHA_JOANA: AdotanteDetalhe = {
  id: 'ad1',
  nome: 'Joana Pereira',
  whatsapp: '35988439614',
  bairro_cidade: 'Centro, Passos',
  observacoes: '',
  adocoes: [
    {
      id: 'o1',
      animal_id: 'a1',
      animal_nome: 'Nina',
      data_adocao: '2026-10-10',
      data_devolucao: null,
      pedido_id: 'p1',
    },
    {
      id: 'o2',
      animal_id: null,
      animal_nome: 'Pingo',
      data_adocao: '2023-06-10',
      data_devolucao: '2023-08-01',
      pedido_id: null,
    },
  ],
  alteracao: { em: '2026-10-17T15:00:00Z', por: 'Gracia' },
}

describe('Quem adotou (T30)', () => {
  it('fica em Mais', async () => {
    simularApi({ ...API_ADMIN, '/admin/protetores': { protetores: [] } })
    renderizarEm('/admin/mais')
    expect(await screen.findByRole('link', { name: /Quem adotou/ })).toHaveAttribute(
      'href',
      '/admin/adotantes',
    )
  })

  it('lista as pessoas com adoções, devoluções e a observação da equipe', async () => {
    simularApi({ ...API_ADMIN, '/admin/adotantes': { adotantes: [JOANA, MARCOS] } })
    renderizarEm('/admin/adotantes')
    const joana = (await screen.findByText('Joana Pereira')).closest('a')
    expect(joana).toHaveAttribute('href', '/admin/adotantes/ad1')
    expect(joana).toHaveTextContent('(35) 9 8843-9614 · Centro, Passos')
    expect(joana).toHaveTextContent('1 adoção · última em 10/10/2026')
    const marcos = screen.getByText('Marcos Lima').closest('a')
    expect(marcos).toHaveTextContent('Sem WhatsApp')
    expect(marcos).toHaveTextContent('1 devolução')
    expect(marcos).toHaveTextContent('📝 Devolveu o Rex depois de 2 meses.')
  })

  it('busca pelo nome ou WhatsApp', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      '/admin/adotantes': { adotantes: [JOANA, MARCOS] },
      '/admin/adotantes?busca=9614': { adotantes: [JOANA] },
    })
    renderizarEm('/admin/adotantes')
    await userEvent.type(await screen.findByRole('searchbox'), '9614')
    expect(await screen.findByText('1 pessoa')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'GET', '/admin/adotantes?busca=9614')).toHaveLength(1)
  })

  it('busca sem resultado', async () => {
    simularApi({
      ...API_ADMIN,
      '/admin/adotantes': { adotantes: [] },
      '/admin/adotantes?busca=z': { adotantes: [] },
    })
    renderizarEm('/admin/adotantes')
    expect(await screen.findByText(/Ninguém no cadastro ainda/)).toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox'), 'z')
    expect(await screen.findByText(/Ninguém com esse nome ou WhatsApp/)).toBeInTheDocument()
  })
})

describe('Ficha de quem adotou (T31)', () => {
  it('mostra os dados e o histórico: animal do site, formulário e adoção antiga devolvida', async () => {
    simularApi({ ...API_ADMIN, '/admin/adotantes/ad1': FICHA_JOANA })
    renderizarEm('/admin/adotantes/ad1')
    expect(await screen.findByRole('heading', { name: 'Joana Pereira' })).toBeInTheDocument()
    expect(screen.getByLabelText(/WhatsApp/)).toHaveValue('(35) 9 8843-9614')
    expect(screen.getByRole('link', { name: 'Nina' })).toHaveAttribute('href', '/admin/animais/a1')
    expect(screen.getByRole('link', { name: /Ver o formulário de adoção/ })).toHaveAttribute(
      'href',
      '/admin/pedidos/p1',
    )
    expect(screen.getByText('Devolvido em 01/08/2023')).toBeInTheDocument()
    // Só a adoção registrada à mão pode ser apagada aqui
    expect(screen.getAllByRole('button', { name: 'Apagar' })).toHaveLength(1)
  })

  it('salva as observações', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      '/admin/adotantes/ad1': FICHA_JOANA,
      'PUT /admin/adotantes/ad1': undefined,
    })
    renderizarEm('/admin/adotantes/ad1')
    await userEvent.type(await screen.findByLabelText(/Observações da equipe/), 'Manda fotos.')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Salvo ✓')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'PUT', '/admin/adotantes/ad1')).toEqual([
      expect.objectContaining({ nome: 'Joana Pereira', observacoes: 'Manda fotos.' }),
    ])
  })

  it('WhatsApp de outra pessoa: o erro aparece no campo', async () => {
    simularApi({
      ...API_ADMIN,
      '/admin/adotantes/ad1': FICHA_JOANA,
      'PUT /admin/adotantes/ad1': respostaDeErro(400, 'Confira os campos destacados.', {
        whatsapp: 'Este WhatsApp já está no cadastro de Marcos Lima.',
      }),
    })
    renderizarEm('/admin/adotantes/ad1')
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText(/já está no cadastro de Marcos Lima/)).toBeInTheDocument()
  })

  it('registra uma adoção de antes do site', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      '/admin/adotantes/ad1': FICHA_JOANA,
      'POST /admin/adotantes/ad1/adocoes': undefined,
    })
    renderizarEm('/admin/adotantes/ad1')
    await userEvent.click(
      await screen.findByRole('button', { name: '＋ Registrar adoção de antes do site' }),
    )
    const modal = screen.getByRole('dialog', { name: 'Adoção de antes do site' })
    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar adoção' }))
    expect(within(modal).getAllByText('Preencha este campo').length).toBeGreaterThan(0)
    await userEvent.type(within(modal).getByLabelText(/Nome do animal/), 'Bidu')
    await userEvent.type(within(modal).getByLabelText(/Data da adoção/), '01/05/2022')
    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar adoção' }))
    expect(await screen.findByText('Adoção registrada ✓')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', '/admin/adotantes/ad1/adocoes')).toEqual([
      { animal_nome: 'Bidu', data_adocao: '2022-05-01', data_devolucao: null },
    ])
  })

  it('excluir o cadastro pede confirmação e volta para a lista', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      '/admin/adotantes/ad1': FICHA_JOANA,
      'DELETE /admin/adotantes/ad1': undefined,
      '/admin/adotantes': { adotantes: [MARCOS] },
    })
    renderizarEm('/admin/adotantes/ad1')
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir cadastro' }))
    const modal = screen.getByRole('dialog', { name: 'Excluir cadastro?' })
    await userEvent.click(within(modal).getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText('Marcos Lima')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'DELETE', '/admin/adotantes/ad1')).toHaveLength(1)
  })

  it('cadastro à mão de quem adotou antes do site', async () => {
    const fetchFalso = simularApi({
      ...API_ADMIN,
      'POST /admin/adotantes': { id: 'ad9' },
      '/admin/adotantes/ad9': { ...FICHA_JOANA, id: 'ad9', nome: 'Ana Souza', adocoes: [] },
    })
    renderizarEm('/admin/adotantes/nova')
    await userEvent.type(await screen.findByLabelText(/Nome completo/), 'Ana Souza')
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))
    expect(await screen.findByRole('heading', { name: 'Ana Souza' })).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', '/admin/adotantes')).toEqual([
      expect.objectContaining({ nome: 'Ana Souza', whatsapp: '' }),
    ])
  })

  it('pessoa que não existe mais', async () => {
    simularApi({ ...API_ADMIN, '/admin/adotantes/x': respostaDeErro(404, 'Não encontramos.') })
    renderizarEm('/admin/adotantes/x')
    expect(await screen.findByText(/Não encontramos esta pessoa/)).toBeInTheDocument()
  })
})
