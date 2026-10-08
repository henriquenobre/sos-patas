import { describe, expect, it } from 'vitest'
import {
  diasEsperando,
  ehAdulto,
  esperandoHaMaisTempo,
  idadeEmMeses,
  nascimentoAproximado,
  textoEspera,
  textoIdade,
} from './idade'

const HOJE = '2026-10-08'

describe('idadeEmMeses', () => {
  it('conta só meses completos', () => {
    expect(idadeEmMeses('2026-07-08', HOJE)).toBe(3)
    expect(idadeEmMeses('2026-07-09', HOJE)).toBe(2)
  })

  it('nunca é negativa', () => {
    expect(idadeEmMeses('2026-12-01', HOJE)).toBe(0)
  })
})

describe('ehAdulto (RN11)', () => {
  it('adulto a partir de 1 ano completo', () => {
    expect(ehAdulto('2025-10-08', HOJE)).toBe(true)
    expect(ehAdulto('2025-10-09', HOJE)).toBe(false)
  })
})

describe('textoIdade (RN13)', () => {
  it.each([
    ['2026-09-20', 'menos de 1 mês'],
    ['2026-09-08', 'cerca de 1 mês'],
    ['2026-07-08', 'cerca de 3 meses'],
    ['2025-10-08', 'cerca de 1 ano'],
    ['2024-04-08', 'cerca de 2 anos'],
  ])('nascimento %s → "%s"', (nascimento, esperado) => {
    expect(textoIdade(nascimento, HOJE)).toBe(esperado)
  })
})

describe('nascimentoAproximado (T10)', () => {
  it('converte "3 anos" e "5 meses" em data de nascimento', () => {
    expect(nascimentoAproximado(3, 'anos', HOJE)).toBe('2023-10-08')
    expect(nascimentoAproximado(5, 'meses', HOJE)).toBe('2026-05-08')
  })

  it('a idade calculada de volta é a mesma informada', () => {
    expect(textoIdade(nascimentoAproximado(4, 'anos', HOJE), HOJE)).toBe('cerca de 4 anos')
  })
})

describe('textoEspera (selo do card)', () => {
  it.each([
    [1, '1 dia'],
    [45, '45 dias'],
    [150, '5 meses'],
    [365, '1 ano'],
    [400, '1 ano e 1 mês'],
    [760, '2 anos e 1 mês'],
    [800, '2 anos e 2 meses'],
  ])('%i dias → "%s"', (dias, esperado) => {
    expect(textoEspera(dias)).toBe(esperado)
  })
})

describe('esperandoHaMaisTempo (RN12)', () => {
  const adulto = { status: 'disponivel' as const, nascimento_aprox: '2022-01-01' }

  it('adulto disponível com mais de 90 dias de espera entra', () => {
    expect(esperandoHaMaisTempo({ ...adulto, data_entrada: '2026-07-09' }, HOJE)).toBe(true)
  })

  it('com exatamente 90 dias ainda não entra', () => {
    expect(diasEsperando('2026-07-10', HOJE)).toBe(90)
    expect(esperandoHaMaisTempo({ ...adulto, data_entrada: '2026-07-10' }, HOJE)).toBe(false)
  })

  it('filhote ou adotado não entram', () => {
    const antigo = '2025-01-01'
    expect(
      esperandoHaMaisTempo(
        { status: 'disponivel', nascimento_aprox: '2026-05-01', data_entrada: antigo },
        HOJE,
      ),
    ).toBe(false)
    expect(esperandoHaMaisTempo({ ...adulto, status: 'adotado', data_entrada: antigo }, HOJE)).toBe(
      false,
    )
  })
})
