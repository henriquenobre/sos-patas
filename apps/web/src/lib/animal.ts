import type { AnimalResumo } from '@sospatas/compartilhado'

/** "Foto do Thor" / "Foto da Mel" (acessibilidade, docs/DESENVOLVIMENTO.md, seção 8). */
export const textoAlternativo = (animal: Pick<AnimalResumo, 'nome' | 'sexo'>) =>
  `Foto ${animal.sexo === 'femea' ? 'da' : 'do'} ${animal.nome}`
