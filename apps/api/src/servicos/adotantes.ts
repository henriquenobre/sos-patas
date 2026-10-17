// Cadastro de quem adotou (RN53): lista com busca, ficha com o histórico de adoções, cadastro à
// mão (adoções de antes do site), observações da equipe e exclusão a pedido da pessoa (LGPD).
// As adoções feitas pelo site entram aqui por "Marcar como adotado" (servicos/animais.ts).
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm'
import {
  normalizarWhatsapp,
  type AdocaoAntigaDados,
  type AdotanteDados,
  type AdotanteDetalhe,
  type AdotanteResumo,
} from '@sospatas/compartilhado'
import { adocoes, adotantes, equipe } from '@sospatas/db'
import type { Db } from '../db'
import type { Usuaria } from '../dependencias'
import { codigoPostgres, erros } from '../erros'
import { ehUuid } from '../validacao'
import type { Tx } from './animais'

const adotanteNaoEncontrado = () =>
  erros.naoEncontrado('Não encontramos esta pessoa no cadastro de quem adotou.')

/** Escapa % e _ para a busca por parte do texto. */
const padraoBusca = (texto: string) => `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

const colunasResumo = {
  id: adotantes.id,
  nome: adotantes.nome,
  whatsapp: adotantes.whatsapp,
  bairro_cidade: adotantes.bairro_cidade,
  observacoes: adotantes.observacoes,
  adocoes: sql<number>`count(${adocoes.id})::int`,
  devolucoes: sql<number>`(count(${adocoes.id}) FILTER (WHERE ${adocoes.data_devolucao} IS NOT NULL))::int`,
  ultima_adocao: sql<string | null>`max(${adocoes.data_adocao})::text`,
}

function consultaResumo(db: Db | Tx) {
  return db
    .select(colunasResumo)
    .from(adotantes)
    .leftJoin(adocoes, eq(adocoes.adotante_id, adotantes.id))
    .groupBy(adotantes.id)
}

/**
 * Lista da T30, em ordem alfabética. A busca procura no nome e, se tiver números, no WhatsApp
 * ("98843" acha "35988439614").
 */
export async function listarAdotantes(db: Db, busca?: string): Promise<AdotanteResumo[]> {
  const condicoes: SQL[] = []
  if (busca) {
    const digitos = normalizarWhatsapp(busca)
    const porNome = ilike(adotantes.nome, padraoBusca(busca))
    condicoes.push(
      digitos.length >= 4
        ? (or(porNome, ilike(adotantes.whatsapp, padraoBusca(digitos))) ?? porNome)
        : porNome,
    )
  }
  return consultaResumo(db)
    .where(and(...condicoes))
    .orderBy(sql`lower(${adotantes.nome})`, adotantes.id)
}

/** A pessoa com o WhatsApp do pedido, se estiver no cadastro (aviso na análise, T28). */
export async function adotantePorWhatsapp(
  db: Db,
  whatsapp: string,
): Promise<AdotanteResumo | null> {
  const [linha] = await consultaResumo(db).where(eq(adotantes.whatsapp, whatsapp))
  return linha ?? null
}

/** Ficha da T31, com as adoções da mais recente para a mais antiga. */
export async function buscarAdotante(db: Db, id: string): Promise<AdotanteDetalhe> {
  if (!ehUuid(id)) throw adotanteNaoEncontrado()
  const [[linha], historico] = await Promise.all([
    db
      .select({ adotante: adotantes, alterado_por: equipe.nome })
      .from(adotantes)
      .leftJoin(equipe, eq(equipe.id, adotantes.updated_by))
      .where(eq(adotantes.id, id))
      .limit(1),
    db
      .select({
        id: adocoes.id,
        animal_id: adocoes.animal_id,
        animal_nome: adocoes.animal_nome,
        data_adocao: adocoes.data_adocao,
        data_devolucao: adocoes.data_devolucao,
        pedido_id: adocoes.pedido_id,
      })
      .from(adocoes)
      .where(eq(adocoes.adotante_id, id))
      .orderBy(desc(adocoes.data_adocao), desc(adocoes.created_at)),
  ])
  if (!linha) throw adotanteNaoEncontrado()
  const { adotante, alterado_por } = linha
  return {
    id: adotante.id,
    nome: adotante.nome,
    whatsapp: adotante.whatsapp,
    bairro_cidade: adotante.bairro_cidade,
    observacoes: adotante.observacoes,
    adocoes: historico,
    alteracao: { em: adotante.updated_at.toISOString(), por: alterado_por },
  }
}

/** Outro cadastro já usa o número: um cadastro por WhatsApp. */
async function whatsappRepetido(db: Db, erro: unknown, whatsapp: string | null): Promise<never> {
  if (codigoPostgres(erro) === '23505' && whatsapp) {
    const [outra] = await db
      .select({ nome: adotantes.nome })
      .from(adotantes)
      .where(eq(adotantes.whatsapp, whatsapp))
    throw erros.validacao({
      whatsapp: `Este WhatsApp já está no cadastro de ${outra?.nome ?? 'outra pessoa'}. Procure por ele na lista.`,
    })
  }
  throw erro
}

export async function criarAdotante(
  db: Db,
  dados: AdotanteDados,
  usuaria: Usuaria,
): Promise<string> {
  try {
    const [adotante] = await db
      .insert(adotantes)
      .values({ ...dados, updated_by: usuaria.id })
      .returning({ id: adotantes.id })
    if (!adotante) throw new Error('Cadastro não gravado')
    return adotante.id
  } catch (erro) {
    return whatsappRepetido(db, erro, dados.whatsapp)
  }
}

export async function editarAdotante(
  db: Db,
  id: string,
  dados: AdotanteDados,
  usuaria: Usuaria,
): Promise<void> {
  if (!ehUuid(id)) throw adotanteNaoEncontrado()
  let alterados: { id: string }[]
  try {
    alterados = await db
      .update(adotantes)
      .set({ ...dados, updated_by: usuaria.id })
      .where(eq(adotantes.id, id))
      .returning({ id: adotantes.id })
  } catch (erro) {
    return whatsappRepetido(db, erro, dados.whatsapp)
  }
  if (alterados.length === 0) throw adotanteNaoEncontrado()
}

/**
 * Exclusão do cadastro, com o histórico de adoções (a pessoa pediu para apagar os dados, LGPD).
 * Os animais adotados continuam como adotados, só sem o nome de quem adotou.
 */
export async function excluirAdotante(db: Db, id: string): Promise<void> {
  if (!ehUuid(id)) throw adotanteNaoEncontrado()
  const apagados = await db
    .delete(adotantes)
    .where(eq(adotantes.id, id))
    .returning({ id: adotantes.id })
  if (apagados.length === 0) throw adotanteNaoEncontrado()
}

/** Adoção antiga, de antes do site ou de animal que não foi cadastrado nele (T31). */
export async function adicionarAdocaoAntiga(
  db: Db,
  adotanteId: string,
  dados: AdocaoAntigaDados,
  usuaria: Usuaria,
): Promise<void> {
  if (!ehUuid(adotanteId)) throw adotanteNaoEncontrado()
  await db.transaction(async (tx) => {
    const alterados = await tx
      .update(adotantes)
      .set({ updated_by: usuaria.id, updated_at: new Date() })
      .where(eq(adotantes.id, adotanteId))
      .returning({ id: adotantes.id })
    if (alterados.length === 0) throw adotanteNaoEncontrado()
    await tx.insert(adocoes).values({ adotante_id: adotanteId, ...dados, updated_by: usuaria.id })
  })
}

/**
 * Apaga uma adoção registrada à mão (erro de digitação). As do site saem pelo animal ("Voltar
 * para disponível" marca a devolução), para o histórico continuar certo.
 */
export async function excluirAdocaoAntiga(
  db: Db,
  adotanteId: string,
  adocaoId: string,
): Promise<void> {
  if (!ehUuid(adotanteId) || !ehUuid(adocaoId)) {
    throw erros.naoEncontrado('Não encontramos esta adoção.')
  }
  const [adocao] = await db
    .select({ animal_id: adocoes.animal_id, pedido_id: adocoes.pedido_id })
    .from(adocoes)
    .where(and(eq(adocoes.id, adocaoId), eq(adocoes.adotante_id, adotanteId)))
  if (!adocao) throw erros.naoEncontrado('Não encontramos esta adoção.')
  if (adocao.animal_id || adocao.pedido_id) {
    throw erros.conflito(
      'Esta adoção foi registrada pelo site. Para corrigir, use "Voltar para disponível" no animal.',
    )
  }
  await db
    .delete(adocoes)
    .where(and(eq(adocoes.id, adocaoId), isNull(adocoes.animal_id), isNull(adocoes.pedido_id)))
}
