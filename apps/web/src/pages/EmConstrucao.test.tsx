import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RespostaSaude } from '@sospatas/compartilhado'
import { EmConstrucao } from './EmConstrucao'

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <EmConstrucao />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EmConstrucao', () => {
  it('mostra que a API está no ar', async () => {
    const saude: RespostaSaude = {
      status: 'ok',
      servico: 'sospatas-api',
      ambiente: 'local',
      horario: new Date().toISOString(),
    }
    const fetchFalso = vi.fn().mockResolvedValue(Response.json(saude))
    vi.stubGlobal('fetch', fetchFalso)

    renderizar()

    expect(await screen.findByText('API no ar (local)')).toBeInTheDocument()
    expect(fetchFalso).toHaveBeenCalledWith('/api/saude')
  })

  it('avisa quando a API não responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))

    renderizar()

    expect(await screen.findByText('API fora do ar')).toBeInTheDocument()
  })
})
