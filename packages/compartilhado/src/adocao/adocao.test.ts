import { describe, expect, it } from 'vitest'
import {
  formularioAdocaoEntrada,
  pedidoAdocaoEntrada,
  separarPedido,
  type RespostasAdocao,
} from '../schemas/pedido'
import { alertasDoPedido, type AnimalDoPedido } from './alertas'
import { BLOCOS, DECLARACOES, OPCOES, PERGUNTAS } from './formulario'
import { CLAUSULAS_TERMO } from './termo'

const formulario = {
  nome: 'Fernanda',
  maior_idade: 'sim',
  whatsapp: '35 99999-0001',
  bairro_cidade: 'Centro, Passos',
  motivo: 'Quero um companheiro.',
  moradia: 'casa',
  imovel: 'proprio',
  espaco: 'grande',
  local_coberto: 'sim',
  casa_segura: 'sim',
  onde_fica: 'dentro',
  moradores: '2 pessoas',
  todos_concordam: 'sim',
  tem_animais: 'nao',
  vacinar_vermifugar: 'sim',
  castrar: 'sim',
  arcar_custos: 'sim',
  horas_sozinho: 'menos_4',
  mudanca_viagem: 'Levo comigo.',
  declaracoes: DECLARACOES.map(() => true),
} as const

const erros = (resultado: { error?: { issues: { path: PropertyKey[] }[] } }) =>
  (resultado.error?.issues ?? []).map((issue) => issue.path.join('.')).sort()

describe('formulário de adoção 1.1', () => {
  it('tem as 24 perguntas, 8 declarações e o termo com 9 cláusulas', () => {
    const numeradas = Object.values(PERGUNTAS).filter((texto) => /^\d+\./.test(texto))
    expect(numeradas).toHaveLength(24)
    expect(DECLARACOES).toHaveLength(8)
    expect(CLAUSULAS_TERMO).toHaveLength(9)
    const nosBlocos = BLOCOS.flatMap((bloco) => bloco.perguntas)
    expect(new Set(nosBlocos).size).toBe(Object.keys(PERGUNTAS).length)
  })

  it('aceita o formulário completo e normaliza o WhatsApp', () => {
    const dados = formularioAdocaoEntrada('cao').parse(formulario)
    expect(dados.whatsapp).toBe('35999990001')
    expect(dados.telas_janelas).toBeNull()
  })

  it('exige todas as declarações', () => {
    const resultado = formularioAdocaoEntrada('cao').safeParse({
      ...formulario,
      declaracoes: [...DECLARACOES.map(() => true).slice(0, 7), false],
    })
    expect(erros(resultado)).toEqual(['declaracoes'])
  })

  it('perguntas condicionais: obrigatórias quando valem', () => {
    const alugado = formularioAdocaoEntrada('cao').safeParse({ ...formulario, imovel: 'alugado' })
    expect(erros(alugado)).toEqual(['proprietario_permite'])
    expect(erros(formularioAdocaoEntrada('gato').safeParse(formulario))).toEqual(['telas_janelas'])
    const comAnimais = formularioAdocaoEntrada('cao').safeParse({
      ...formulario,
      tem_animais: 'sim',
    })
    expect(erros(comAnimais)).toEqual([
      'animais_castrados_vacinados',
      'animais_quantos',
      'animais_sexo',
    ])
  })

  it('o pedido exige a ciência do termo e o Turnstile; as respostas não guardam os dois', () => {
    expect(erros(pedidoAdocaoEntrada('cao').safeParse(formulario))).toEqual([
      'ciente_termo',
      'turnstile_token',
    ])
    const dados = pedidoAdocaoEntrada('cao').parse({
      ...formulario,
      ciente_termo: true,
      turnstile_token: 'x',
    })
    const { respostas, nome } = separarPedido(dados)
    expect(nome).toBe('Fernanda')
    expect(respostas).not.toHaveProperty('ciente_termo')
    expect(respostas).not.toHaveProperty('declaracoes')
    expect(respostas).not.toHaveProperty('nome')
  })

  it('toda opção de escolha tem texto', () => {
    for (const opcoes of Object.values(OPCOES)) {
      for (const texto of Object.values(opcoes)) expect(texto).not.toBe('')
    }
  })
})

describe('alertas automáticos (FORMULARIO_ADOCAO.md)', () => {
  const base = formularioAdocaoEntrada('cao').parse(formulario)
  const respostas = (extra: Partial<RespostasAdocao> = {}): RespostasAdocao => {
    const { nome: _n, whatsapp: _w, bairro_cidade: _b, declaracoes: _d, ...resto } = base
    return { ...resto, ...extra }
  }
  const animal: AnimalDoPedido = { sexo: 'macho', castrado: true, convive_animais: true }
  const codigos = (r: RespostasAdocao, a: AnimalDoPedido = animal) =>
    alertasDoPedido(r, a).map((x) => x.codigo)

  it('pedido sem pontos de atenção não tem alertas', () => {
    expect(codigos(respostas())).toEqual([])
  })

  it.each([
    [{ maior_idade: 'nao' }, 'menor_idade'],
    [{ imovel: 'alugado', proprietario_permite: 'nao_sei' }, 'proprietario'],
    [{ local_coberto: 'nao' }, 'sem_local_coberto'],
    [{ casa_segura: 'nao' }, 'risco_fuga'],
    [{ telas_janelas: 'nao' }, 'risco_fuga'],
    [{ onde_fica: 'preso' }, 'animal_preso'],
    [{ todos_concordam: 'ainda_nao' }, 'familia'],
    [{ vacinar_vermifugar: 'nao' }, 'sem_condicoes'],
    [{ castrar: 'nao' }, 'nao_castrar'],
  ] as [Partial<RespostasAdocao>, string][])('%o → %s', (extra, codigo) => {
    expect(codigos(respostas(extra))).toEqual([codigo])
  })

  it('outros animais: mesmo sexo, risco de cria e "não convive"', () => {
    const comAnimais = respostas({
      tem_animais: 'sim',
      animais_quantos: '1 cão',
      animais_sexo: ['macho'],
      animais_castrados_vacinados: 'nenhum',
    })
    expect(codigos(comAnimais, { sexo: 'macho', castrado: false, convive_animais: false })).toEqual(
      ['mesmo_sexo', 'risco_cria', 'nao_convive'],
    )
    expect(codigos(comAnimais, { sexo: 'femea', castrado: true, convive_animais: true })).toEqual(
      [],
    )
  })
})
