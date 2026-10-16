import type { AnimalResumo } from '@sospatas/compartilhado'

/** "Foto do Thor" / "Foto da Mel" (acessibilidade, docs/DESENVOLVIMENTO.md, seção 8). */
export const textoAlternativo = (animal: Pick<AnimalResumo, 'nome' | 'sexo'>) =>
  `Foto ${animal.sexo === 'femea' ? 'da' : 'do'} ${animal.nome}`

/**
 * As duas fotos da chamada do Início (T01): um cão e um gato, os que esperam há mais tempo
 * (a vitrine já vem nessa ordem). Se faltar uma espécie, completa com o próximo animal com foto.
 */
export function animaisDaChamada(vitrine: AnimalResumo[]): AnimalResumo[] {
  const comFoto = vitrine.filter((animal) => animal.foto)
  const escolhidos = [
    comFoto.find((animal) => animal.especie === 'cao'),
    comFoto.find((animal) => animal.especie === 'gato'),
  ].filter((animal) => animal !== undefined)
  for (const animal of comFoto) {
    if (escolhidos.length >= 2) break
    if (!escolhidos.includes(animal)) escolhidos.push(animal)
  }
  return escolhidos
}
