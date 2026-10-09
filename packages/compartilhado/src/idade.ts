// Idade dos animais (RN11, RN13) e destaque "Esperando há mais tempo" (RN12).
import { diasEntre, partesDaData, subtrairMeses } from './datas'
import { DIAS_PARA_DESTAQUE } from './limites'
import type { StatusAnimal } from './dominio'

/** Meses completos entre o nascimento aproximado e hoje (nunca negativo). */
export function idadeEmMeses(nascimento: string, hoje: string): number {
  const [anoN, mesN, diaN] = partesDaData(nascimento)
  const [anoH, mesH, diaH] = partesDaData(hoje)
  let meses = (anoH - anoN) * 12 + (mesH - mesN)
  if (diaH < diaN) meses -= 1
  return Math.max(0, meses)
}

/** RN11: adulto tem 1 ano ou mais; filhote, menos de 1 ano. */
export function ehAdulto(nascimento: string, hoje: string): boolean {
  return idadeEmMeses(nascimento, hoje) >= 12
}

/** RN13: idade aproximada para exibir: "cerca de 3 meses", "cerca de 2 anos". */
export function textoIdade(nascimento: string, hoje: string): string {
  const meses = idadeEmMeses(nascimento, hoje)
  if (meses < 1) return 'menos de 1 mês'
  if (meses < 12) return `cerca de ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(meses / 12)
  return `cerca de ${anos} ${anos === 1 ? 'ano' : 'anos'}`
}

export type UnidadeIdade = 'meses' | 'anos'

/** T10: a voluntária informa "3 anos" ou "5 meses"; o banco guarda a data de nascimento aproximada. */
export function nascimentoAproximado(
  quantidade: number,
  unidade: UnidadeIdade,
  hoje: string,
): string {
  return subtrairMeses(hoje, unidade === 'anos' ? quantidade * 12 : quantidade)
}

/** Dias desde a entrada do animal na ONG. */
export function diasEsperando(dataEntrada: string, hoje: string): number {
  return Math.max(0, diasEntre(dataEntrada, hoje))
}

/** Tempo de espera no selo do card: "45 dias", "5 meses", "2 anos e 3 meses". */
export function textoEspera(dias: number): string {
  if (dias < 60) return `${String(dias)} ${dias === 1 ? 'dia' : 'dias'}`
  if (dias < 365) return `${String(Math.floor(dias / 30))} meses`
  const anos = Math.floor(dias / 365)
  const meses = Math.floor((dias % 365) / 30)
  const textoAnos = `${String(anos)} ${anos === 1 ? 'ano' : 'anos'}`
  return meses ? `${textoAnos} e ${String(meses)} ${meses === 1 ? 'mês' : 'meses'}` : textoAnos
}

/** RN12: adulto disponível que entrou há mais de 90 dias. */
export function esperandoHaMaisTempo(
  animal: { status: StatusAnimal; nascimento_aprox: string; data_entrada: string },
  hoje: string,
): boolean {
  return (
    animal.status === 'disponivel' &&
    ehAdulto(animal.nascimento_aprox, hoje) &&
    diasEsperando(animal.data_entrada, hoje) > DIAS_PARA_DESTAQUE
  )
}
