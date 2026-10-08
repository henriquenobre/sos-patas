import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { chaveParaCopiar } from '../lib/pix'
import { BlocoPix } from './BlocoPix'
import { TextoSimples } from './TextoSimples'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TextoSimples (RN34, RN24)', () => {
  it('transforma endereços em links que abrem em nova aba', () => {
    render(<TextoSimples texto="Siga a página https://www.facebook.com/sospatasmg no Facebook." />)
    const link = screen.getByRole('link', { name: 'https://www.facebook.com/sospatasmg' })
    expect(link).toHaveAttribute('href', 'https://www.facebook.com/sospatasmg')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('não inclui a pontuação final no link', () => {
    render(<TextoSimples texto="Veja em https://exemplo.org." />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://exemplo.org')
  })

  it('mostra HTML vindo do banco como texto, sem executar', () => {
    const { container } = render(
      <TextoSimples texto={'<img src=x onerror="alert(1)"><b>negrito</b>'} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toContain('<b>negrito</b>')
  })

  it('mantém as quebras de linha', () => {
    const { container } = render(<TextoSimples texto={'Linha 1\nLinha 2'} />)
    expect(container.firstElementChild).toHaveClass('whitespace-pre-line')
    expect(container.textContent).toBe('Linha 1\nLinha 2')
  })
})

describe('PIX', () => {
  const ong = {
    nome_completo: 'SOS Patas',
    whatsapp: '35988439614',
    instagram: 'sospatas.ong',
    facebook: null,
    pix_tipo: 'cnpj' as const,
    pix_chave: '26.515.895/0001-90',
  }

  it('copia CNPJ, CPF e telefone só com os números', () => {
    expect(chaveParaCopiar(ong)).toBe('26515895000190')
    expect(chaveParaCopiar({ pix_tipo: 'email', pix_chave: 'pix@sospatas.org' })).toBe(
      'pix@sospatas.org',
    )
  })

  it('o botão copia a chave e avisa', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<BlocoPix ong={ong} />)
    expect(screen.getByText('Chave (CNPJ)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Copiar chave PIX' }))
    expect(writeText).toHaveBeenCalledWith('26515895000190')
    expect(await screen.findByText('Chave copiada ✓')).toBeInTheDocument()
  })
})
