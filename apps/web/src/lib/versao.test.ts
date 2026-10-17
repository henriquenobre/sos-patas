// Tela da área da ONG cujo arquivo sumiu numa publicação nova: recarrega uma vez, sem loop.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { carregarTela } from './versao'

const recarregar = vi.fn()

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('location', { reload: recarregar })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  recarregar.mockClear()
})

const falha = () => Promise.reject(new TypeError('Failed to fetch dynamically imported module'))

describe('carregarTela', () => {
  it('arquivo existe: devolve o módulo e não recarrega', async () => {
    await expect(carregarTela(() => Promise.resolve({ ok: true }))).resolves.toEqual({ ok: true })
    expect(recarregar).not.toHaveBeenCalled()
  })

  it('arquivo sumiu: recarrega a página uma vez', () => {
    void carregarTela(falha)
    expect(recarregar).not.toHaveBeenCalled() // a falha chega depois
    return vi.waitFor(() => {
      expect(recarregar).toHaveBeenCalledTimes(1)
    })
  })

  it('falhou de novo logo depois de recarregar: mostra o erro em vez de recarregar sem parar', async () => {
    void carregarTela(falha)
    await vi.waitFor(() => {
      expect(recarregar).toHaveBeenCalledTimes(1)
    })
    await expect(carregarTela(falha)).rejects.toThrow(/dynamically imported module/)
    expect(recarregar).toHaveBeenCalledTimes(1)
  })

  it('passado o intervalo, outra publicação nova pode recarregar de novo', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    void carregarTela(falha)
    await vi.waitFor(() => {
      expect(recarregar).toHaveBeenCalledTimes(1)
    })
    vi.setSystemTime(Date.now() + 60_000)
    void carregarTela(falha)
    await vi.waitFor(() => {
      expect(recarregar).toHaveBeenCalledTimes(2)
    })
  })
})
