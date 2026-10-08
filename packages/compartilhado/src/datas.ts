// Datas do domínio em texto 'AAAA-MM-DD' (como o tipo `date` do banco), sempre no fuso de
// Brasília: o Worker roda em UTC, e às 22h de Passos já seria "amanhã" em UTC.

export const FUSO_ONG = 'America/Sao_Paulo'

const FORMATO_ISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_ONG,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Data de hoje em Passos/MG, no formato 'AAAA-MM-DD'. */
export function hojeNoBrasil(agora: Date = new Date()): string {
  return FORMATO_ISO.format(agora)
}

function partes(data: string): [number, number, number] {
  const [ano, mes, dia] = data.split('-').map(Number)
  if (ano === undefined || mes === undefined || dia === undefined) {
    throw new Error(`Data inválida: ${data}`)
  }
  return [ano, mes, dia]
}

const emUtc = (data: string): number => {
  const [ano, mes, dia] = partes(data)
  return Date.UTC(ano, mes - 1, dia)
}

const deUtc = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

/** Confere se é uma data real no formato 'AAAA-MM-DD' (rejeita 2026-02-30). */
export function ehDataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false
  return deUtc(emUtc(data)) === data
}

/** Dias corridos de `inicio` até `fim` (negativo se `fim` vem antes). */
export function diasEntre(inicio: string, fim: string): number {
  return Math.round((emUtc(fim) - emUtc(inicio)) / 86_400_000)
}

export function somarDias(data: string, dias: number): string {
  return deUtc(emUtc(data) + dias * 86_400_000)
}

/** Volta `meses` meses. Se o dia não existe no mês de destino, usa o último dia (31/03 → 28/02). */
export function subtrairMeses(data: string, meses: number): string {
  const [ano, mes, dia] = partes(data)
  const total = ano * 12 + (mes - 1) - meses
  const anoNovo = Math.floor(total / 12)
  const mesNovo = (total % 12) + 1
  const ultimoDia = new Date(Date.UTC(anoNovo, mesNovo, 0)).getUTCDate()
  return deUtc(Date.UTC(anoNovo, mesNovo - 1, Math.min(dia, ultimoDia)))
}

export { partes as partesDaData }
