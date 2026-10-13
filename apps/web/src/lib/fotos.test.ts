// Conferência da foto escolhida (RN20). O redesenho em canvas não roda no jsdom: é conferido
// no navegador (etapa 10, "Pronto quando": cadastro com 3 fotos pelo celular).
import { describe, expect, it } from 'vitest'
import { ErroFoto, conferirArquivo, formularioFoto } from './fotos'

const arquivo = (tipo: string, bytes = 10) =>
  new File([new Uint8Array(bytes)], 'foto', { type: tipo })

describe('conferirArquivo (RN20)', () => {
  it('aceita JPG, PNG e WebP', () => {
    for (const tipo of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(() => {
        conferirArquivo(arquivo(tipo))
      }).not.toThrow()
    }
  })

  it('recusa outros formatos com mensagem para a tela', () => {
    expect(() => {
      conferirArquivo(arquivo('image/heic'))
    }).toThrow(new ErroFoto('Escolha uma foto em JPG, PNG ou WebP.'))
  })

  it('recusa arquivo com mais de 10 MB', () => {
    expect(() => {
      conferirArquivo(arquivo('image/jpeg', 10 * 1024 * 1024 + 1))
    }).toThrow(/muito grande/)
  })
})

describe('formularioFoto', () => {
  it('monta o multipart com a miniatura e a completa', () => {
    const corpo = formularioFoto({
      miniatura: new Blob(['m'], { type: 'image/webp' }),
      completa: new Blob(['c'], { type: 'image/webp' }),
    })
    expect(corpo.get('miniatura')).toBeInstanceOf(Blob)
    expect(corpo.get('completa')).toBeInstanceOf(Blob)
  })
})
