import { describe, expect, it } from 'vitest'
import { LIMITES } from '../limites'
import { LISTAS, NOMES_LISTA, TEXTOS } from '../conteudo'
import { hojeNoBrasil, somarDias } from '../datas'
import {
  adocaoEntrada,
  animalEntrada,
  ongEntrada,
  perdidoEquipeEntrada,
  perdidoPublicoEntrada,
  protetorEntrada,
  schemaItem,
  schemaTexto,
  type AnimalEntrada,
} from '.'

/** Mensagens de erro por campo, para conferir o que aparece no formulário. */
function erros(resultado: {
  success: boolean
  error?: { issues: { path: PropertyKey[]; message: string }[] }
}) {
  return Object.fromEntries(
    (resultado.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]),
  )
}

const amanha = () => somarDias(hojeNoBrasil(), 1)

const animalValido: AnimalEntrada = {
  nome: '  Thor ',
  especie: 'cao',
  sexo: 'macho',
  nascimento_aprox: '2021-10-01',
  porte: 'gigante',
  castrado: true,
  vacinado: 'sim',
  vacinas: 'V10 e antirrábica',
  vermifugado: 'sim',
  responsavel_tipo: 'ong',
}

describe('animalEntrada', () => {
  it('aceita o mínimo do formulário e completa os padrões', () => {
    const animal = animalEntrada.parse(animalValido)
    expect(animal).toMatchObject({
      nome: 'Thor',
      raca: null,
      descricao: '',
      docil: null,
      protetor_id: null,
      privado: { lar_nome: null, lar_tipo: null, observacoes: '' },
    })
  })

  it('transforma texto opcional vazio em nulo', () => {
    const animal = animalEntrada.parse({ ...animalValido, raca: '   ', problema_saude: '' })
    expect(animal.raca).toBeNull()
    expect(animal.problema_saude).toBeNull()
  })

  it('mostra mensagens simples por campo', () => {
    const resultado = animalEntrada.safeParse({
      ...animalValido,
      nome: '',
      porte: 'enorme',
      descricao: 'a'.repeat(LIMITES.animais.descricao + 1),
    })
    expect(erros(resultado)).toMatchObject({
      nome: 'Preencha este campo',
      porte: 'Escolha o porte',
      descricao: 'Use até 500 caracteres',
    })
  })

  it('recusa nascimento no futuro', () => {
    const resultado = animalEntrada.safeParse({ ...animalValido, nascimento_aprox: amanha() })
    expect(erros(resultado).nascimento_aprox).toBe('A data não pode ser no futuro')
  })

  it('exige o protetor quando o responsável é protetor (RN42)', () => {
    const resultado = animalEntrada.safeParse({ ...animalValido, responsavel_tipo: 'protetor' })
    expect(erros(resultado).protetor_id).toBe('Escolha o protetor parceiro')
  })

  it('descarta o protetor quando o responsável é a ONG', () => {
    const animal = animalEntrada.parse({
      ...animalValido,
      protetor_id: '6f1c1d1e-5a0b-4c4e-9d55-50537061746f',
    })
    expect(animal.protetor_id).toBeNull()
  })

  it('descarta "quais vacinas" se não foi vacinado', () => {
    const animal = animalEntrada.parse({ ...animalValido, vacinado: 'nao' })
    expect(animal.vacinas).toBeNull()
  })
})

describe('adoção e protetor', () => {
  it('exige nome e WhatsApp de quem adotou, e normaliza o número', () => {
    expect(
      adocaoEntrada.parse({ adotante_nome: 'Fernanda', adotante_whatsapp: '(35) 9 9999-0000' }),
    ).toEqual({ adotante_nome: 'Fernanda', adotante_whatsapp: '35999990000' })
    expect(
      erros(adocaoEntrada.safeParse({ adotante_nome: 'Fernanda', adotante_whatsapp: '9999' })),
    ).toMatchObject({ adotante_whatsapp: 'Informe o WhatsApp com DDD (10 ou 11 números)' })
  })

  it('protetor precisa de nome e WhatsApp', () => {
    expect(erros(protetorEntrada.safeParse({ nome: ' ', whatsapp: '35988439614' }))).toMatchObject({
      nome: 'Preencha este campo',
    })
  })
})

describe('anúncios de perdidos e encontrados', () => {
  const anuncio = {
    tipo: 'perdido',
    especie: 'cao',
    nome: 'Bob',
    bairro: 'Bela Vista',
    data_ocorrido: hojeNoBrasil(),
    descricao: 'Filhote preto com coleira vermelha.',
    contato_nome: 'Marcos',
    contato_whatsapp: '35 99999-0001',
  }

  it('o envio público exige consentimento e Turnstile (RN22, RN28)', () => {
    expect(
      perdidoPublicoEntrada.safeParse({ ...anuncio, consentimento: true, turnstile_token: 'x' })
        .success,
    ).toBe(true)
    expect(Object.keys(erros(perdidoPublicoEntrada.safeParse(anuncio))).sort()).toEqual([
      'consentimento',
      'turnstile_token',
    ])
  })

  it('o anúncio da equipe exige a autorização da pessoa (RN39), sem Turnstile', () => {
    expect(perdidoEquipeEntrada.safeParse({ ...anuncio, autorizacao: true }).success).toBe(true)
    expect(
      erros(perdidoEquipeEntrada.safeParse({ ...anuncio, autorizacao: false })),
    ).toHaveProperty('autorizacao')
  })

  it('recusa link na descrição e data no futuro (RN21)', () => {
    const resultado = perdidoEquipeEntrada.safeParse({
      ...anuncio,
      autorizacao: true,
      descricao: 'Mais fotos em www.golpe.net',
      data_ocorrido: amanha(),
    })
    expect(erros(resultado)).toMatchObject({
      descricao: 'Não coloque links na descrição',
      data_ocorrido: 'A data não pode ser no futuro',
    })
  })
})

describe('textos e itens das páginas', () => {
  it('cada texto usa o limite e a obrigatoriedade da sua chave', () => {
    expect(schemaTexto('inicio.missao').safeParse({ valor: '' }).success).toBe(false)
    expect(schemaTexto('ajude.introducao').parse({ valor: '' })).toEqual({ valor: '' })
    const limite = TEXTOS['inicio.chamada_titulo'].limite
    expect(
      schemaTexto('inicio.chamada_titulo').safeParse({ valor: 'a'.repeat(limite + 1) }).success,
    ).toBe(false)
  })

  it('o título segue a configuração da lista', () => {
    expect(schemaItem('perguntas').safeParse({ titulo: '', texto: 'Resposta' }).success).toBe(false)
    expect(
      schemaItem('como_adotar_vantagens').parse({ titulo: '', texto: 'Item' }).titulo,
    ).toBeNull()
    expect(
      schemaItem('como_adotar_antes').safeParse({ titulo: 'Não pode', texto: 'Item' }).success,
    ).toBe(false)
    expect(schemaItem('inicio_fotos').parse({ texto: 'Legenda' })).toEqual({
      titulo: null,
      texto: 'Legenda',
    })
  })

  it('toda lista tem rótulos para o formulário genérico', () => {
    for (const lista of NOMES_LISTA) {
      const config = LISTAS[lista]
      expect(config.nomes.novo, lista).not.toBe('')
      expect(config.texto.rotulo, lista).not.toBe('')
    }
  })
})

describe('dados da ONG', () => {
  const ong = {
    whatsapp: '(35) 9 8843-9614',
    instagram: '@sospatas.ong',
    facebook: 'facebook.com/sospatasmg',
    pix_tipo: 'cnpj',
    pix_chave: '26.515.895/0001-90',
  }

  it('limpa o @ do Instagram e completa o endereço do Facebook', () => {
    expect(ongEntrada.parse(ong)).toMatchObject({
      whatsapp: '35988439614',
      instagram: 'sospatas.ong',
      facebook: 'https://facebook.com/sospatasmg',
    })
  })

  it('Facebook vazio vira nulo; Instagram com espaço é recusado', () => {
    expect(ongEntrada.parse({ ...ong, facebook: '' }).facebook).toBeNull()
    expect(erros(ongEntrada.safeParse({ ...ong, instagram: 'sos patas' }))).toHaveProperty(
      'instagram',
    )
  })
})
