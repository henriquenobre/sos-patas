import { describe, expect, it } from 'vitest'
import { diasEntre, ehDataValida, hojeNoBrasil, somarDias, subtrairMeses } from './datas'

describe('hojeNoBrasil', () => {
  it('usa o fuso de Brasília: 22h de 08/10 em Passos ainda é 08/10 (em UTC já é 09/10)', () => {
    expect(hojeNoBrasil(new Date('2026-10-09T01:00:00Z'))).toBe('2026-10-08')
  })

  it('vira o dia à meia-noite de Brasília', () => {
    expect(hojeNoBrasil(new Date('2026-10-09T03:00:00Z'))).toBe('2026-10-09')
  })
})

describe('ehDataValida', () => {
  it.each(['2026-10-08', '2024-02-29'])('aceita %s', (data) => {
    expect(ehDataValida(data)).toBe(true)
  })

  it.each(['2026-02-30', '2025-02-29', '08/10/2026', '2026-1-8', ''])('recusa %s', (data) => {
    expect(ehDataValida(data)).toBe(false)
  })
})

describe('contas com datas', () => {
  it('conta dias corridos, inclusive na virada do ano', () => {
    expect(diasEntre('2026-12-30', '2027-01-02')).toBe(3)
    expect(diasEntre('2026-10-08', '2026-10-01')).toBe(-7)
  })

  it('soma dias', () => {
    expect(somarDias('2026-10-08', 30)).toBe('2026-11-07')
  })

  it('subtrai meses usando o último dia quando o dia não existe', () => {
    expect(subtrairMeses('2026-03-31', 1)).toBe('2026-02-28')
    expect(subtrairMeses('2026-10-08', 24)).toBe('2024-10-08')
    expect(subtrairMeses('2026-01-15', 3)).toBe('2025-10-15')
  })
})
