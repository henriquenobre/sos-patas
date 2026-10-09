// Fotos do animal na área da ONG (T10, T11): enviar, trocar, remover e reordenar (RN01–RN06).
// O navegador já manda as duas versões WebP (RN02); a API confere os bytes (RN21) e grava em
// animais/{animal_id}/{foto_id}.webp e -thumb.webp (RN04). Cada troca cria arquivos novos,
// para o cache de 1 ano das fotos nunca mostrar a versão antiga.
import { and, asc, eq, gt, sql } from 'drizzle-orm'
import { MAX_FOTOS_ANIMAL, type FotoAdmin } from '@sospatas/compartilhado'
import { fotos } from '@sospatas/db'
import { TIPO_WEBP, conferirFotoWebp } from '../armazenamento/webp'
import type { Armazenamento } from '../armazenamento/tipos'
import type { Db } from '../db'
import type { Usuaria } from '../dependencias'
import { codigoPostgres, erros } from '../erros'
import { ehUuid } from '../validacao'
import { exigirAnimal, prefixoFotosAnimal, registrarAlteracao, type Tx } from './animais'
import { urlFoto } from './fotos'

/** Miniatura (cards) e completa (ficha) da mesma foto, já em WebP (RN02). */
export type ArquivosFoto = { miniatura: Uint8Array; completa: Uint8Array }

const caminhos = (animalId: string, fotoId: string) => ({
  miniatura: `${prefixoFotosAnimal(animalId)}${fotoId}-thumb.webp`,
  completa: `${prefixoFotosAnimal(animalId)}${fotoId}.webp`,
})

const fotoNaoEncontrada = () => erros.naoEncontrado('Não encontramos esta foto.')

const fotoAdmin = (
  env: Env,
  foto: { id: string; ordem: number; miniatura: string; completa: string },
): FotoAdmin => ({
  id: foto.id,
  ordem: foto.ordem,
  miniatura: urlFoto(env, foto.miniatura),
  completa: urlFoto(env, foto.completa),
})

/** Grava as duas versões; se a segunda falhar, apaga a primeira. */
async function gravarArquivos(
  armazenamento: Armazenamento,
  destino: { miniatura: string; completa: string },
  arquivos: ArquivosFoto,
): Promise<void> {
  conferirFotoWebp(arquivos.miniatura)
  conferirFotoWebp(arquivos.completa)
  try {
    await armazenamento.colocar(destino.miniatura, arquivos.miniatura, TIPO_WEBP)
    await armazenamento.colocar(destino.completa, arquivos.completa, TIPO_WEBP)
  } catch (erro) {
    console.error('Falha ao gravar a foto:', erro)
    await apagarSemFalhar(armazenamento, [destino.miniatura, destino.completa])
    throw erros.armazenamento(
      'Não conseguimos guardar a foto agora. Tente de novo em alguns minutos.',
    )
  }
}

/** Limpeza depois de outro erro: se falhar, fica só no log (o arquivo sobra, invisível). */
async function apagarSemFalhar(armazenamento: Armazenamento, chaves: string[]): Promise<void> {
  try {
    await armazenamento.apagar(chaves)
  } catch (erro) {
    console.error('Arquivos que sobraram no armazenamento:', chaves, erro)
  }
}

async function buscarFoto(db: Db, animalId: string, fotoId: string) {
  if (!ehUuid(animalId) || !ehUuid(fotoId)) throw fotoNaoEncontrada()
  const [foto] = await db
    .select({
      id: fotos.id,
      ordem: fotos.ordem,
      miniatura: fotos.path_miniatura,
      completa: fotos.path_completa,
    })
    .from(fotos)
    .where(and(eq(fotos.id, fotoId), eq(fotos.animal_id, animalId)))
    .limit(1)
  if (!foto) throw fotoNaoEncontrada()
  return foto
}

async function contarFotos(db: Db | Tx, animalId: string): Promise<number> {
  const [contagem] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(fotos)
    .where(eq(fotos.animal_id, animalId))
  return contagem?.n ?? 0
}

const maisFotosQueOLimite = () =>
  erros.conflito(
    `Cada animal pode ter até ${String(MAX_FOTOS_ANIMAL)} fotos. Remova uma antes de enviar outra.`,
  )

/** Nova foto na próxima posição livre (RN01: no máximo 3; a primeira é a principal). */
export async function adicionarFoto(
  db: Db,
  env: Env,
  armazenamento: Armazenamento,
  animalId: string,
  arquivos: ArquivosFoto,
  usuaria: Usuaria,
): Promise<FotoAdmin> {
  if (!ehUuid(animalId)) throw erros.naoEncontrado('Não encontramos este animal.')
  await exigirAnimal(db, animalId)
  // Conferência antecipada, para não gravar arquivos à toa; a que vale é a da transação
  if ((await contarFotos(db, animalId)) >= MAX_FOTOS_ANIMAL) throw maisFotosQueOLimite()

  const id = crypto.randomUUID()
  const destino = caminhos(animalId, id)
  await gravarArquivos(armazenamento, destino, arquivos)
  let ordem: number
  try {
    ordem = await db.transaction(async (tx) => {
      // Trava o animal antes de contar: fotos enviadas ao mesmo tempo entram uma de cada vez,
      // cada uma na próxima posição livre, sem passar do limite
      await registrarAlteracao(tx, animalId, usuaria)
      const proxima = await contarFotos(tx, animalId)
      if (proxima >= MAX_FOTOS_ANIMAL) throw maisFotosQueOLimite()
      await tx.insert(fotos).values({
        id,
        animal_id: animalId,
        ordem: proxima,
        path_miniatura: destino.miniatura,
        path_completa: destino.completa,
      })
      return proxima
    })
  } catch (erro) {
    await apagarSemFalhar(armazenamento, [destino.miniatura, destino.completa])
    // Posição ocupada por uma remoção ou reordenação simultânea, ou o animal foi excluído
    const codigo = codigoPostgres(erro)
    if (codigo === '23505') {
      throw erros.conflito(
        'Outra foto acabou de ser enviada para este animal. Atualize a página e tente de novo.',
      )
    }
    if (codigo === '23503') throw erros.naoEncontrado('Não encontramos este animal.')
    throw erro
  }
  return fotoAdmin(env, { id, ordem, ...destino })
}

/**
 * Trocar a foto de uma posição (RN06): grava a nova, aponta o registro para ela e só então
 * apaga os arquivos antigos. Se apagar falhar, a troca já valeu e o arquivo antigo sobra no
 * log, sem aparecer no site.
 */
export async function trocarFoto(
  db: Db,
  env: Env,
  armazenamento: Armazenamento,
  animalId: string,
  fotoId: string,
  arquivos: ArquivosFoto,
  usuaria: Usuaria,
): Promise<FotoAdmin> {
  const antiga = await buscarFoto(db, animalId, fotoId)
  const destino = caminhos(animalId, crypto.randomUUID())
  await gravarArquivos(armazenamento, destino, arquivos)
  try {
    await db.transaction(async (tx) => {
      const alteradas = await tx
        .update(fotos)
        .set({ path_miniatura: destino.miniatura, path_completa: destino.completa })
        .where(eq(fotos.id, fotoId))
        .returning({ id: fotos.id })
      if (alteradas.length === 0) throw fotoNaoEncontrada()
      await registrarAlteracao(tx, animalId, usuaria)
    })
  } catch (erro) {
    await apagarSemFalhar(armazenamento, [destino.miniatura, destino.completa])
    throw erro
  }
  await apagarSemFalhar(armazenamento, [antiga.miniatura, antiga.completa])
  return fotoAdmin(env, { id: fotoId, ordem: antiga.ordem, ...destino })
}

/**
 * Remover (RN06): primeiro os arquivos, depois o registro, e as fotos seguintes sobem uma
 * posição (se a principal sair, a segunda vira a principal). Se o armazenamento falhar,
 * nada muda.
 */
export async function removerFoto(
  db: Db,
  armazenamento: Armazenamento,
  animalId: string,
  fotoId: string,
  usuaria: Usuaria,
): Promise<void> {
  const foto = await buscarFoto(db, animalId, fotoId)
  try {
    await armazenamento.apagar([foto.miniatura, foto.completa])
  } catch (erro) {
    console.error('Falha ao apagar a foto:', erro)
    throw erros.armazenamento(
      'Não conseguimos apagar a foto agora. Nada foi alterado. Tente de novo em alguns minutos.',
    )
  }
  await db.transaction(async (tx) => {
    await tx.delete(fotos).where(eq(fotos.id, fotoId))
    // A unicidade (animal_id, ordem) só é conferida no fim da transação (migration 0001)
    await tx
      .update(fotos)
      .set({ ordem: sql`${fotos.ordem} - 1` })
      .where(and(eq(fotos.animal_id, animalId), gt(fotos.ordem, foto.ordem)))
    await registrarAlteracao(tx, animalId, usuaria)
  })
}

/** Nova ordem: a lista precisa ter exatamente as fotos atuais do animal (RN01). */
export async function reordenarFotos(
  db: Db,
  animalId: string,
  ids: string[],
  usuaria: Usuaria,
): Promise<void> {
  if (!ehUuid(animalId)) throw erros.naoEncontrado('Não encontramos este animal.')
  await exigirAnimal(db, animalId)
  await db.transaction(async (tx) => {
    const atuais = await tx
      .select({ id: fotos.id })
      .from(fotos)
      .where(eq(fotos.animal_id, animalId))
      .orderBy(asc(fotos.ordem))
      .for('update')
    const mesmas = atuais.length === ids.length && atuais.every((foto) => ids.includes(foto.id))
    if (!mesmas) {
      throw erros.conflito('As fotos deste animal mudaram. Atualize a página e tente de novo.')
    }
    for (const [ordem, id] of ids.entries()) {
      await tx.update(fotos).set({ ordem }).where(eq(fotos.id, id))
    }
    await registrarAlteracao(tx, animalId, usuaria)
  })
}
