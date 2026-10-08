import { describe, expect, it } from 'vitest'
import { TAMANHO_MAX_FOTO_BYTES } from '@sospatas/compartilhado'
import { ErroApi } from '../erros'
import { ArmazenamentoMemoria } from './memoria'
import { lerTudo } from './tipos'
import { conferirFotoWebp, ehWebp } from './webp'

/** Cabeçalho mínimo de um WebP: "RIFF" + tamanho + "WEBP" + conteúdo. */
function webp(tamanho = 64): Uint8Array {
  const bytes = new Uint8Array(tamanho)
  bytes.set(new TextEncoder().encode('RIFF'), 0)
  bytes.set(new TextEncoder().encode('WEBP'), 8)
  return bytes
}

describe('conferência das fotos (RN21)', () => {
  it('reconhece WebP pelos bytes', () => {
    expect(ehWebp(webp())).toBe(true)
  })

  it('recusa JPG e PNG mesmo com nome .webp', () => {
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    expect(ehWebp(jpg)).toBe(false)
    expect(ehWebp(png)).toBe(false)
    expect(() => {
      conferirFotoWebp(jpg)
    }).toThrow(ErroApi)
  })

  it('recusa arquivo vazio ou cortado', () => {
    expect(ehWebp(new Uint8Array(0))).toBe(false)
    expect(ehWebp(new TextEncoder().encode('RIFF'))).toBe(false)
  })

  it('aceita até 500 KB e recusa acima', () => {
    expect(() => {
      conferirFotoWebp(webp(TAMANHO_MAX_FOTO_BYTES))
    }).not.toThrow()
    expect(() => {
      conferirFotoWebp(webp(TAMANHO_MAX_FOTO_BYTES + 1))
    }).toThrow('500 KB')
  })
})

describe('ArmazenamentoMemoria (mesma interface do R2)', () => {
  it('grava, lê e informa o tipo', async () => {
    const fotos = new ArmazenamentoMemoria()
    await fotos.colocar('animais/a1/f1.webp', webp(), 'image/webp')
    const objeto = await fotos.obter('animais/a1/f1.webp')
    expect(objeto?.tipo).toBe('image/webp')
    expect(objeto && (await lerTudo(objeto.corpo))).toEqual(webp())
    expect(await fotos.obter('nao-existe.webp')).toBeNull()
  })

  it('copia da quarentena para as fotos públicas (RN19)', async () => {
    const quarentena = new ArmazenamentoMemoria()
    const fotos = new ArmazenamentoMemoria()
    await quarentena.colocar('perdidos/p1/f1.webp', webp(), 'image/webp')
    await quarentena.copiar('perdidos/p1/f1.webp', fotos)
    expect(await fotos.listar('perdidos/')).toEqual(['perdidos/p1/f1.webp'])
  })

  it('apaga tudo de um prefixo sem tocar nos outros (RN05)', async () => {
    const fotos = new ArmazenamentoMemoria()
    for (const chave of ['animais/a1/f1.webp', 'animais/a1/f1-thumb.webp', 'animais/a2/f1.webp']) {
      await fotos.colocar(chave, webp(), 'image/webp')
    }
    expect(await fotos.apagarPrefixo('animais/a1/')).toBe(2)
    expect(await fotos.listar('animais/')).toEqual(['animais/a2/f1.webp'])
  })
})
