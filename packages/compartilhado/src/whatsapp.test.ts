import { describe, expect, it } from 'vitest'
import { contemLink } from './texto'
import { ehWhatsappValido, formatarWhatsapp, linkWhatsApp, normalizarWhatsapp } from './whatsapp'

describe('normalizarWhatsapp', () => {
  it.each([
    ['(35) 9 8843-9614', '35988439614'],
    ['+55 35 98843-9614', '35988439614'],
    ['5535988439614', '35988439614'],
    ['035988439614', '35988439614'],
    ['(35) 3456-0000', '3534560000'],
  ])('%s → %s', (entrada, esperado) => {
    expect(normalizarWhatsapp(entrada)).toBe(esperado)
  })
})

describe('ehWhatsappValido', () => {
  it('aceita 10 ou 11 dígitos', () => {
    expect(ehWhatsappValido('35988439614')).toBe(true)
    expect(ehWhatsappValido('3534560000')).toBe(true)
  })

  it('recusa número sem DDD ou com letras', () => {
    expect(ehWhatsappValido('988439614')).toBe(false)
    expect(ehWhatsappValido('3598843961a')).toBe(false)
  })
})

describe('formatarWhatsapp', () => {
  it('formata celular e fixo', () => {
    expect(formatarWhatsapp('35988439614')).toBe('(35) 9 8843-9614')
    expect(formatarWhatsapp('3534560000')).toBe('(35) 3456-0000')
  })
})

describe('linkWhatsApp', () => {
  it('monta o link wa.me com o código do Brasil', () => {
    expect(linkWhatsApp('(35) 9 8843-9614')).toBe('https://wa.me/5535988439614')
  })

  it('codifica a mensagem pronta', () => {
    expect(linkWhatsApp('35988439614', 'Olá! Vi o Thor & quero adotar')).toBe(
      'https://wa.me/5535988439614?text=Ol%C3%A1!%20Vi%20o%20Thor%20%26%20quero%20adotar',
    )
  })
})

describe('contemLink (RN21)', () => {
  it.each([
    'veja em http://golpe.net',
    'https://exemplo.org',
    'acesse www.site.net',
    'meusite.com',
    'meusite.com.br/cachorro',
    'HTTP://MAIUSCULO.NET',
  ])('detecta link em "%s"', (texto) => {
    expect(contemLink(texto)).toBe(true)
  })

  it.each([
    'Cão caramelo, coleira vermelha, muito manso.',
    'Estava comigo desde ontem',
    'Fugiu perto da praça, atende por Bob',
  ])('não confunde texto comum: "%s"', (texto) => {
    expect(contemLink(texto)).toBe(false)
  })
})
