// Protetores parceiros (RN42): lista, cadastro (também pelo cadastro do animal), edição e
// exclusão, que é recusada enquanto houver animais ligados ao protetor.
import { asc, eq, sql } from 'drizzle-orm'
import type { ProtetorAdmin, ProtetorDados } from '@sospatas/compartilhado'
import { animais, equipe, protetores } from '@sospatas/db'
import type { Db } from '../db'
import type { Usuaria } from '../dependencias'
import { codigoPostgres, erros } from '../erros'
import { ehUuid } from '../validacao'

const protetorNaoEncontrado = () => erros.naoEncontrado('Não encontramos este protetor.')

function consultaProtetores(db: Db) {
  return db
    .select({
      id: protetores.id,
      nome: protetores.nome,
      whatsapp: protetores.whatsapp,
      animais: sql<number>`count(${animais.id})::int`,
      animais_disponiveis: sql<number>`(count(${animais.id}) FILTER (WHERE ${animais.status} = 'disponivel'))::int`,
      updated_at: protetores.updated_at,
      alterado_por: equipe.nome,
    })
    .from(protetores)
    .leftJoin(animais, eq(animais.protetor_id, protetores.id))
    .leftJoin(equipe, eq(equipe.id, protetores.updated_by))
    .groupBy(protetores.id, equipe.nome)
}

type LinhaProtetor = Awaited<ReturnType<ReturnType<typeof consultaProtetores>['execute']>>[number]

const protetorAdmin = ({
  updated_at,
  alterado_por,
  ...protetor
}: LinhaProtetor): ProtetorAdmin => ({
  ...protetor,
  alteracao: { em: updated_at.toISOString(), por: alterado_por },
})

/** Em ordem alfabética, para a lista da T24 e a escolha no cadastro do animal. */
export async function listarProtetores(db: Db): Promise<ProtetorAdmin[]> {
  const linhas = await consultaProtetores(db).orderBy(asc(protetores.nome), asc(protetores.id))
  return linhas.map(protetorAdmin)
}

async function buscarProtetor(db: Db, id: string): Promise<ProtetorAdmin> {
  const [linha] = await consultaProtetores(db).where(eq(protetores.id, id))
  if (!linha) throw protetorNaoEncontrado()
  return protetorAdmin(linha)
}

export async function criarProtetor(
  db: Db,
  dados: ProtetorDados,
  usuaria: Usuaria,
): Promise<ProtetorAdmin> {
  const [protetor] = await db
    .insert(protetores)
    .values({ ...dados, updated_by: usuaria.id })
    .returning({ id: protetores.id })
  if (!protetor) throw new Error('Protetor não gravado')
  return buscarProtetor(db, protetor.id)
}

/** Editar o WhatsApp vale para todos os animais do protetor (RN42). Devolve os ids deles. */
export async function editarProtetor(
  db: Db,
  id: string,
  dados: ProtetorDados,
  usuaria: Usuaria,
): Promise<string[]> {
  if (!ehUuid(id)) throw protetorNaoEncontrado()
  const alterados = await db
    .update(protetores)
    .set({ ...dados, updated_by: usuaria.id })
    .where(eq(protetores.id, id))
    .returning({ id: protetores.id })
  if (alterados.length === 0) throw protetorNaoEncontrado()
  const doProtetor = await db
    .select({ id: animais.id })
    .from(animais)
    .where(eq(animais.protetor_id, id))
  return doProtetor.map((animal) => animal.id)
}

const comAnimais = (nome: string, quantidade: number) =>
  erros.conflito(
    `${nome} tem ${quantidade === 1 ? '1 animal' : `${String(quantidade)} animais`}. ` +
      'Troque o responsável deles antes de excluir.',
  )

/** RN42: não exclui protetor com animais (de qualquer situação). */
export async function excluirProtetor(db: Db, id: string): Promise<void> {
  if (!ehUuid(id)) throw protetorNaoEncontrado()
  const protetor = await buscarProtetor(db, id)
  if (protetor.animais > 0) throw comAnimais(protetor.nome, protetor.animais)
  try {
    await db.delete(protetores).where(eq(protetores.id, id))
  } catch (erro) {
    // Um animal foi ligado a ele entre a conferência e a exclusão (FK restrict)
    if (codigoPostgres(erro) === '23503') {
      const atual = await buscarProtetor(db, id)
      throw comAnimais(atual.nome, atual.animais)
    }
    throw erro
  }
}
