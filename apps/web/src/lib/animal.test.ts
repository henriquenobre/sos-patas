// Fotos da chamada do Início (T01): um cão e um gato, ou o que houver.
import { describe, expect, it } from 'vitest'
import type { AnimalResumo } from '@sospatas/compartilhado'
import { animaisDaChamada } from './animal'

const animal = (nome: string, especie: AnimalResumo['especie'], foto = true): AnimalResumo => ({
  id: nome,
  nome,
  especie,
  sexo: 'macho',
  nascimento_aprox: '2020-01-01',
  porte: 'medio',
  data_entrada: '2026-01-01',
  responsavel_tipo: 'ong',
  convive_animais: null,
  foto: foto ? `https://fotos/${nome}.webp` : null,
})

const nomes = (lista: AnimalResumo[]) => lista.map((a) => a.nome)

describe('animaisDaChamada (T01)', () => {
  it('um cão e um gato, os primeiros da vitrine (esperam há mais tempo)', () => {
    const vitrine = [animal('Thor', 'cao'), animal('Rex', 'cao'), animal('Mel', 'gato')]
    expect(nomes(animaisDaChamada(vitrine))).toEqual(['Thor', 'Mel'])
  })

  it('sem gato, completa com outro cão', () => {
    const vitrine = [animal('Thor', 'cao'), animal('Rex', 'cao'), animal('Bob', 'cao')]
    expect(nomes(animaisDaChamada(vitrine))).toEqual(['Thor', 'Rex'])
  })

  it('sem cão, mostra dois gatos', () => {
    const vitrine = [animal('Mel', 'gato'), animal('Luna', 'gato')]
    expect(nomes(animaisDaChamada(vitrine))).toEqual(['Mel', 'Luna'])
  })

  it('ignora animal sem foto e devolve o que houver', () => {
    const vitrine = [animal('Thor', 'cao', false), animal('Rex', 'cao')]
    expect(nomes(animaisDaChamada(vitrine))).toEqual(['Rex'])
    expect(animaisDaChamada([])).toEqual([])
  })
})

describe('animaisDaChamada com os escolhidos pela equipe (RN54)', () => {
  const vitrine = [animal('Thor', 'cao'), animal('Rex', 'cao'), animal('Mel', 'gato')]

  it('mostra os dois escolhidos, na posição escolhida', () => {
    expect(nomes(animaisDaChamada(vitrine, ['Rex', 'Thor']))).toEqual(['Rex', 'Thor'])
  })

  it('só uma foto escolhida: a outra é automática, com a espécie que falta', () => {
    expect(nomes(animaisDaChamada(vitrine, ['Rex', null]))).toEqual(['Rex', 'Mel'])
    expect(nomes(animaisDaChamada(vitrine, [null, 'Mel']))).toEqual(['Thor', 'Mel'])
  })

  it('escolhido que saiu da vitrine ou está sem foto volta a ser automático', () => {
    expect(nomes(animaisDaChamada(vitrine, ['Bob', null]))).toEqual(['Thor', 'Mel'])
    const semFoto = [animal('Bob', 'cao', false), ...vitrine]
    expect(nomes(animaisDaChamada(semFoto, ['Bob', 'Rex']))).toEqual(['Mel', 'Rex'])
  })
})
