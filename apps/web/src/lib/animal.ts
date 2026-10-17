import type { AnimalResumo } from '@sospatas/compartilhado'

/** "Foto do Thor" / "Foto da Mel" (acessibilidade, docs/DESENVOLVIMENTO.md, seção 8). */
export const textoAlternativo = (animal: Pick<AnimalResumo, 'nome' | 'sexo'>) =>
  `Foto ${animal.sexo === 'femea' ? 'da' : 'do'} ${animal.nome}`

/**
 * As duas fotos da chamada do Início (T01). Primeiro, os animais escolhidos pela equipe (RN54),
 * se ainda estiverem na vitrine com foto. O que ficar vago é automático: um cão e um gato, os
 * que esperam há mais tempo (a vitrine já vem nessa ordem); se faltar uma espécie, completa com
 * o próximo animal com foto.
 */
export function animaisDaChamada(
  vitrine: AnimalResumo[],
  escolhidos: (string | null)[] = [],
): AnimalResumo[] {
  const comFoto = vitrine.filter((animal) => animal.foto)
  const fotos = [0, 1].map((posicao) => {
    const id = escolhidos[posicao]
    return id ? comFoto.find((animal) => animal.id === id) : undefined
  })
  const livres = comFoto.filter((animal) => !fotos.includes(animal))
  for (const posicao of [0, 1]) {
    if (fotos[posicao]) continue
    const especieQueFalta = (['cao', 'gato'] as const).find(
      (especie) => !fotos.some((animal) => animal?.especie === especie),
    )
    const animal = livres.find((livre) => livre.especie === especieQueFalta) ?? livres[0]
    if (!animal) break
    fotos[posicao] = animal
    livres.splice(livres.indexOf(animal), 1)
  }
  return fotos.filter((animal) => animal !== undefined)
}
