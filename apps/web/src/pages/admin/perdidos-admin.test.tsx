// Moderação de perdidos e encontrados na área da ONG (T14): RN18, RN19, RN25, RN26, RN28, RN41.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ListaPerdidosAdmin, PerdidoAdmin } from '@sospatas/compartilhado'
import { API_ADMIN, RESUMO, diasAtras } from '../../testes/admin'
import { chamadas, renderizarEm, respostaDeErro, simularApi } from '../../testes/renderizar'

afterEach(() => {
  vi.unstubAllGlobals()
})

const isoDiasAtras = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString()

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
  created_at: isoDiasAtras(1),
  publicado_em: null,
  expira_em: null,
  fotos: [{ id: 'f1', url: '/api/admin/perdidos/l1/fotos/f1' }],
  alteracao: { em: isoDiasAtras(1), por: null },
}

const BOB: PerdidoAdmin = {
  ...LUNA,
  id: 'b1',
  nome: 'Bob',
  status: 'publicado',
  publicado_em: isoDiasAtras(3),
  expira_em: new Date(Date.now() + 27 * 86_400_000).toISOString(),
  fotos: [{ id: 'f2', url: '/api/publico/fotos/perdidos/b1/f2.webp' }],
}

const PENDENTES: ListaPerdidosAdmin = { perdidos: [LUNA] }
const NO_AR: ListaPerdidosAdmin = { perdidos: [BOB] }

const api = (extra: Record<string, unknown> = {}) => ({
  ...API_ADMIN,
  '/admin/resumo': { ...RESUMO, perdidos_pendentes: 1 },
  '/admin/perdidos?status=pendente': PENDENTES,
  '/admin/perdidos?status=publicado': NO_AR,
  ...extra,
})

describe('T14 · Moderar perdidos e encontrados', () => {
  it('aguardando: mostra o anúncio com a foto da quarentena, contato e a lista de conferência', async () => {
    simularApi(api())
    renderizarEm('/admin/perdidos')

    const card = (await screen.findByRole('heading', { name: 'Luna · Cão' })).closest('li')
    if (!card) throw new Error('card da Luna')
    expect(within(card).getByText(/enviado ontem/)).toBeInTheDocument()
    expect(within(card).getByText(/Novo Horizonte · Rita ·/)).toBeInTheDocument()
    expect(within(card).getByText('(35) 9 0000-0003')).toBeInTheDocument()
    expect(within(card).getByRole('img', { name: 'Foto 1 de Luna' })).toHaveAttribute(
      'src',
      '/api/admin/perdidos/l1/fotos/f1',
    )
    expect(screen.getByRole('tab', { name: 'Aguardando (1)' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'No ar (1)' })).toBeInTheDocument()
    expect(screen.getByText('Antes de aprovar, confira:')).toBeInTheDocument()
  })

  it('aprovar e publicar chama a API e avisa com o link do site', async () => {
    const fetchFalso = simularApi(api({ 'POST /admin/perdidos/l1/aprovar': undefined }))
    renderizarEm('/admin/perdidos')
    await screen.findByRole('heading', { name: 'Luna · Cão' })

    await userEvent.click(screen.getByRole('button', { name: 'Aprovar e publicar' }))
    expect(await screen.findByText('Publicado no site ✓')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver no site/ })).toHaveAttribute('href', '/perdidos')
    expect(chamadas(fetchFalso, 'POST', '/admin/perdidos/l1/aprovar')).toHaveLength(1)
  })

  it('recusar pede confirmação e apaga (RN26)', async () => {
    const fetchFalso = simularApi(api({ 'DELETE /admin/perdidos/l1': undefined }))
    renderizarEm('/admin/perdidos')
    await screen.findByRole('heading', { name: 'Luna · Cão' })

    await userEvent.click(screen.getByRole('button', { name: 'Recusar' }))
    const modal = screen.getByRole('dialog', { name: 'Recusar o anúncio?' })
    expect(within(modal).getByText(/Quem anunciou não é avisado/)).toBeInTheDocument()
    await userEvent.click(within(modal).getByRole('button', { name: 'Recusar e apagar' }))

    expect(await screen.findByText('Anúncio recusado e apagado')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'DELETE', '/admin/perdidos/l1')).toHaveLength(1)
  })

  it('falha do armazenamento: a mensagem aparece no modal e nada muda', async () => {
    simularApi(
      api({
        'DELETE /admin/perdidos/l1': respostaDeErro(
          503,
          'Não conseguimos apagar as fotos agora. Nada foi alterado.',
        ),
      }),
    )
    renderizarEm('/admin/perdidos')
    await screen.findByRole('heading', { name: 'Luna · Cão' })
    await userEvent.click(screen.getByRole('button', { name: 'Recusar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Recusar e apagar' }))

    const modal = screen.getByRole('dialog', { name: 'Recusar o anúncio?' })
    expect(await within(modal).findByRole('alert')).toHaveTextContent('Nada foi alterado')
  })

  it('no ar: "Sai do ar em N dias", renovar, voltou para casa e tirar do ar (RN25, RN41)', async () => {
    const fetchFalso = simularApi(
      api({
        'POST /admin/perdidos/b1/renovar': () => Response.json({ expira_em: BOB.expira_em }),
        'DELETE /admin/perdidos/b1': undefined,
      }),
    )
    renderizarEm('/admin/perdidos?aba=publicado')

    const card = (await screen.findByRole('heading', { name: 'Bob · Cão' })).closest('li')
    if (!card) throw new Error('card do Bob')
    expect(within(card).getByText('Sai do ar em 27 dias')).toBeInTheDocument()
    expect(within(card).getByRole('img', { name: 'Foto 1 de Bob' })).toHaveAttribute(
      'src',
      BOB.fotos[0]?.url,
    )

    await userEvent.click(within(card).getByRole('button', { name: 'Renovar por mais 30 dias' }))
    expect(await screen.findByText('Renovado: fica no ar por mais 30 dias ✓')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'POST', '/admin/perdidos/b1/renovar')).toHaveLength(1)

    await userEvent.click(within(card).getByRole('button', { name: 'Voltou para casa 🎉' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sim, apagar o anúncio' }))
    expect(await screen.findByText('Que bom! Anúncio apagado 🎉')).toBeInTheDocument()
    expect(chamadas(fetchFalso, 'DELETE', '/admin/perdidos/b1')).toHaveLength(1)
    expect(screen.queryByText('Antes de aprovar, confira:')).not.toBeInTheDocument()
  })

  it('sem anúncios aguardando, avisa', async () => {
    simularApi(api({ '/admin/perdidos?status=pendente': { perdidos: [] } }))
    renderizarEm('/admin/perdidos')
    expect(await screen.findByText('Nenhum anúncio esperando aprovação.')).toBeInTheDocument()
  })
})
