// Testes das migrations, do seed e das regras garantidas pelo próprio banco (CHECK, FK, UNIQUE).
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { LIMITES, LISTAS, TEXTOS } from '@sospatas/compartilhado'
import { ARQUIVO_CONTEUDO, ARQUIVO_DEV, aplicarSeed } from '../scripts/seed'
import { urlTeste } from './preparar'

const sql = postgres(urlTeste(), { max: 1, onnotice: () => undefined })

/** Espera que a operação falhe por causa da constraint indicada. */
async function esperarFalha(operacao: Promise<unknown>, constraint: string): Promise<void> {
  await expect(operacao).rejects.toMatchObject({ constraint_name: constraint })
}

const texto = (tamanho: number): string => 'a'.repeat(tamanho)

async function idAnimal(nome: string): Promise<string> {
  const [linha] = await sql<{ id: string }[]>`SELECT id FROM animais WHERE nome = ${nome}`
  if (!linha) throw new Error(`Animal ${nome} não está no seed`)
  return linha.id
}

async function idProtetorComAnimais(): Promise<string> {
  const [linha] = await sql<{ id: string }[]>`
    SELECT protetor_id AS id FROM animais WHERE protetor_id IS NOT NULL LIMIT 1`
  if (!linha) throw new Error('Nenhum animal de protetor no seed')
  return linha.id
}

/** Animal mínimo válido; `extra` sobrescreve colunas. */
function inserirAnimal(extra: Record<string, unknown> = {}) {
  const animal = {
    nome: 'Teste',
    especie: 'cao',
    sexo: 'macho',
    nascimento_aprox: '2024-01-01',
    porte: 'medio',
    castrado: true,
    vacinado: 'sim',
    vermifugado: 'sim',
    ...extra,
  }
  return sql`INSERT INTO animais ${sql(animal)}`
}

beforeAll(async () => {
  await aplicarSeed(urlTeste(), [ARQUIVO_CONTEUDO, ARQUIVO_DEV])
})

afterAll(async () => {
  await sql.end()
})

describe('seed', () => {
  it('preenche a ONG, todos os textos e todas as listas', async () => {
    const [ong] = await sql`SELECT * FROM ong`
    expect(ong).toMatchObject({ id: 1, pix_tipo: 'cnpj', instagram: 'sospatas.ong' })

    const textos = await sql<{ chave: string }[]>`SELECT chave FROM conteudo_textos`
    expect(textos.map((t) => t.chave).sort()).toEqual(Object.keys(TEXTOS).sort())

    const listas = await sql<{ lista: string; n: number }[]>`
      SELECT lista::text, count(*)::int AS n FROM conteudo_itens GROUP BY lista`
    for (const [nome, config] of Object.entries(LISTAS)) {
      const n = listas.find((l) => l.lista === nome)?.n ?? 0
      expect(n, nome).toBeGreaterThan(0)
      expect(n, nome).toBeGreaterThanOrEqual(config.minimo)
      if (config.maximo !== null) expect(n, nome).toBeLessThanOrEqual(config.maximo)
    }
  })

  it('pode rodar de novo sem duplicar nem sobrescrever o que a equipe editou', async () => {
    await sql`UPDATE conteudo_textos SET valor = 'Editado pela equipe' WHERE chave = 'como_adotar.subtitulo'`
    const [antes] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM conteudo_itens`

    await aplicarSeed(urlTeste(), [ARQUIVO_CONTEUDO])

    const [depois] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM conteudo_itens`
    expect(depois?.n).toBe(antes?.n)
    const [subtitulo] = await sql<{ valor: string }[]>`
      SELECT valor FROM conteudo_textos WHERE chave = 'como_adotar.subtitulo'`
    expect(subtitulo?.valor).toBe('Editado pela equipe')
  })

  it('dá às fotos da história o caminho site/historia/{id}.webp', async () => {
    const fotos = await sql<{ id: string; foto_path: string }[]>`
      SELECT id, foto_path FROM conteudo_itens WHERE lista = 'inicio_fotos'`
    for (const foto of fotos) expect(foto.foto_path).toBe(`site/historia/${foto.id}.webp`)
  })

  it('cria os animais de exemplo, com o adotado e o do protetor coerentes', async () => {
    const animais = await sql`SELECT nome, status, data_adocao, responsavel_tipo FROM animais`
    expect(animais).toHaveLength(9)
    expect(animais.find((a) => a.nome === 'Bolinha')).toMatchObject({ status: 'adotado' })
    expect(animais.find((a) => a.nome === 'Mel')).toMatchObject({ responsavel_tipo: 'protetor' })
  })
})

describe('animais', () => {
  it('aceita um animal válido, com os padrões da documentação', async () => {
    await inserirAnimal({ nome: 'Válido' })
    const [animal] =
      await sql`SELECT status, responsavel_tipo, data_entrada, descricao FROM animais WHERE nome = 'Válido'`
    expect(animal).toMatchObject({ status: 'disponivel', responsavel_tipo: 'ong', descricao: '' })
    expect(animal?.data_entrada).not.toBeNull()
  })

  it('recusa textos acima do limite (RN34)', async () => {
    await esperarFalha(
      inserirAnimal({ nome: texto(LIMITES.animais.nome + 1) }),
      'animais_nome_limite',
    )
    await esperarFalha(
      inserirAnimal({ descricao: texto(LIMITES.animais.descricao + 1) }),
      'animais_descricao_limite',
    )
  })

  it('recusa nome vazio', async () => {
    await esperarFalha(inserirAnimal({ nome: '   ' }), 'animais_nome_preenchido')
  })

  it('exige protetor quando o responsável é protetor, e só nesse caso (RN42)', async () => {
    await esperarFalha(
      inserirAnimal({ responsavel_tipo: 'protetor' }),
      'animais_responsavel_protetor',
    )
    await esperarFalha(
      inserirAnimal({ responsavel_tipo: 'ong', protetor_id: await idProtetorComAnimais() }),
      'animais_responsavel_protetor',
    )
  })

  it('exige data de adoção em adotado, e só nele (RN08)', async () => {
    await esperarFalha(inserirAnimal({ status: 'adotado' }), 'animais_data_adocao')
    await esperarFalha(inserirAnimal({ data_adocao: '2026-10-01' }), 'animais_data_adocao')
  })

  it('não deixa excluir protetor com animais (RN42)', async () => {
    const id = await idProtetorComAnimais()
    await esperarFalha(
      sql`DELETE FROM protetores WHERE id = ${id}`,
      'animais_protetor_id_protetores_id_fk',
    )
  })

  it('apaga fotos e dados privados junto com o animal (cascade)', async () => {
    const id = await idAnimal('Tobias')
    await sql`INSERT INTO fotos (animal_id, ordem, path_miniatura, path_completa)
              VALUES (${id}, 0, 'animais/x/1-thumb.webp', 'animais/x/1.webp')`
    await sql`DELETE FROM animais WHERE id = ${id}`
    const [restos] = await sql<{ n: number }[]>`
      SELECT (SELECT count(*) FROM fotos WHERE animal_id = ${id})
           + (SELECT count(*) FROM animais_privado WHERE animal_id = ${id}) AS n`
    expect(Number(restos?.n)).toBe(0)
  })
})

describe('fotos', () => {
  const foto = (animalId: string, ordem: number) =>
    sql`INSERT INTO fotos (animal_id, ordem, path_miniatura, path_completa)
        VALUES (${animalId}, ${ordem}, 'a-thumb.webp', 'a.webp')`

  it('aceita no máximo 3 fotos por animal: ordem de 0 a 2 (RN01)', async () => {
    await esperarFalha(foto(await idAnimal('Apolo'), 3), 'fotos_ordem_valida')
  })

  it('não deixa duas fotos na mesma posição', async () => {
    const id = await idAnimal('Thor')
    await esperarFalha(
      sql.begin(async (tx) => {
        await tx`INSERT INTO fotos (animal_id, ordem, path_miniatura, path_completa) VALUES (${id}, 0, 'a', 'a')`
        await tx`INSERT INTO fotos (animal_id, ordem, path_miniatura, path_completa) VALUES (${id}, 0, 'b', 'b')`
      }),
      'fotos_animal_ordem_unica',
    )
  })
})

describe('conteúdo', () => {
  it('troca a ordem de dois itens numa transação (RN35)', async () => {
    const itens = await sql<{ id: string; ordem: number }[]>`
      SELECT id, ordem FROM conteudo_itens WHERE lista = 'perguntas' AND ordem IN (0, 1) ORDER BY ordem`
    const [primeiro, segundo] = itens
    if (!primeiro || !segundo) throw new Error('Seed sem perguntas suficientes')

    await sql.begin(async (tx) => {
      await tx`UPDATE conteudo_itens SET ordem = 1 WHERE id = ${primeiro.id}`
      await tx`UPDATE conteudo_itens SET ordem = 0 WHERE id = ${segundo.id}`
    })

    const [agora] = await sql<
      { ordem: number }[]
    >`SELECT ordem FROM conteudo_itens WHERE id = ${primeiro.id}`
    expect(agora?.ordem).toBe(1)
  })

  it('recusa chave de texto que não existe', async () => {
    await esperarFalha(
      sql`INSERT INTO conteudo_textos (chave, valor) VALUES ('inicio.inventada', 'x')`,
      'conteudo_textos_chave_valida',
    )
  })

  it('recusa texto acima do limite da chave', async () => {
    await esperarFalha(
      sql`UPDATE conteudo_textos SET valor = ${texto(TEXTOS['inicio.chamada_titulo'].limite + 1)}
          WHERE chave = 'inicio.chamada_titulo'`,
      'conteudo_textos_valor_limite',
    )
  })

  it('recusa apagar texto obrigatório, mas aceita apagar um opcional', async () => {
    await esperarFalha(
      sql`UPDATE conteudo_textos SET valor = '' WHERE chave = 'inicio.missao'`,
      'conteudo_textos_obrigatorio',
    )
    await sql`UPDATE conteudo_textos SET valor = '' WHERE chave = 'ajude.introducao'`
  })

  it('confere título conforme a lista', async () => {
    const item = (lista: string, titulo: string | null) =>
      sql`INSERT INTO conteudo_itens (lista, titulo, texto, ordem)
          VALUES (${lista}::conteudo_lista, ${titulo}, 'Texto', 100)`

    await esperarFalha(item('perguntas', null), 'conteudo_itens_titulo_obrigatorio')
    await esperarFalha(item('como_adotar_antes', 'Título'), 'conteudo_itens_sem_titulo')
    await esperarFalha(
      item('inicio_numeros', texto(LISTAS.inicio_numeros.titulo.limite + 1)),
      'conteudo_itens_titulo_limite',
    )
  })

  it('exige foto só nos itens da galeria da história (RN38)', async () => {
    await esperarFalha(
      sql`INSERT INTO conteudo_itens (lista, texto, ordem) VALUES ('inicio_fotos', 'Legenda', 100)`,
      'conteudo_itens_foto',
    )
    await esperarFalha(
      sql`INSERT INTO conteudo_itens (lista, titulo, texto, foto_path, ordem)
          VALUES ('perguntas', 'P?', 'R', 'site/x.webp', 100)`,
      'conteudo_itens_foto',
    )
  })
})

describe('ong, equipe e perdidos', () => {
  it('a tabela ong tem uma linha só', async () => {
    await esperarFalha(
      sql`INSERT INTO ong (id, nome_completo, whatsapp, instagram, pix_tipo, pix_chave)
          VALUES (2, 'Outra', '35999999999', 'outra', 'cnpj', '1')`,
      'ong_linha_unica',
    )
  })

  it('WhatsApp só com dígitos, 10 ou 11', async () => {
    await esperarFalha(
      sql`UPDATE ong SET whatsapp = '(35) 98843-9614' WHERE id = 1`,
      'ong_whatsapp_valido',
    )
  })

  it('e-mail da equipe sempre em minúsculas', async () => {
    await esperarFalha(
      sql`INSERT INTO equipe (email, nome) VALUES ('Gracia@Exemplo.com', 'Gracia')`,
      'equipe_email_minusculo',
    )
  })

  const anuncio = (extra: Record<string, unknown>) =>
    sql`INSERT INTO perdidos ${sql({
      tipo: 'perdido',
      especie: 'cao',
      bairro: 'Centro',
      data_ocorrido: '2026-10-01',
      descricao: 'Cão caramelo',
      contato_nome: 'Ana',
      contato_whatsapp: '35999999999',
      consentimento_em: new Date(),
      ...extra,
    })}`

  it('anúncio publicado sempre tem data de publicação e de expiração (RN25)', async () => {
    await esperarFalha(anuncio({ status: 'publicado' }), 'perdidos_datas_publicacao')
  })

  it('anúncio da equipe não guarda hash de IP (RN39)', async () => {
    await esperarFalha(anuncio({ origem: 'equipe', ip_hash: 'abc' }), 'perdidos_ip_hash_so_site')
  })

  it('recusa descrição acima de 300 caracteres', async () => {
    await esperarFalha(
      anuncio({ descricao: texto(LIMITES.perdidos.descricao + 1) }),
      'perdidos_descricao_limite',
    )
  })
})
