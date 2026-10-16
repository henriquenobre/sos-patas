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
