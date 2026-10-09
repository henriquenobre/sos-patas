// Pedidos de adoção (RN14, RN15, RN47–RN50): envio pelo site e análise pela equipe.
import { and, count, desc, eq, gt, sql } from 'drizzle-orm'
import {
  MAX_PEDIDOS_POR_DIA_POR_IP,
  VERSAO_FORMULARIO,
  VERSAO_TERMO,
  alertasDoPedido,
  separarPedido,
  type PedidoAdocaoDados,
  type PedidoDetalhe,
  type PedidoResumo,
  type PedidoStatus,
} from '@sospatas/compartilhado'
import { animais, equipe, fotos, pedidosAdocao, protetores } from '@sospatas/db'
import type { Db } from '../db'
import type { Usuaria } from '../dependencias'
import { ErroApi, codigoPostgres, erros } from '../erros'
import { urlFoto } from './fotos'

/** Rotas públicas afetadas quando um animal entra ou sai do site (para limpar o cache). */
export const caminhosPublicosDoAnimal = (animalId: string) => [
  '/api/publico/animais',
  '/api/publico/animais/destaques',
  `/api/publico/animais/${animalId}`,
]

/** Animal que pode receber pedido: existe e está disponível. */
export async function animalParaPedido(db: Db, animalId: string) {
  const [animal] = await db
    .select({
      id: animais.id,
      nome: animais.nome,
      especie: animais.especie,
      status: animais.status,
    })
    .from(animais)
    .where(eq(animais.id, animalId))
    .limit(1)
  if (!animal) throw erros.naoEncontrado('Não encontramos este animal.')
  if (animal.status === 'adotado') {
    throw erros.conflito(`${animal.nome} já encontrou uma família. Veja outros animais.`)
  }
  if (animal.status === 'em_analise') throw outraPessoaPediu(animal.nome)
  return animal
}

const outraPessoaPediu = (nome: string) =>
  new ErroApi(
    409,
    'animal_em_analise',
    `Outra pessoa acabou de pedir para adotar ${nome}. Veja outros animais.`,
  )

/** RN50: 2 pedidos por dia por IP e 1 pendente por WhatsApp. */
export async function conferirLimites(db: Db, whatsapp: string, ipHash: string | null) {
  if (ipHash) {
    const [envios] = await db
      .select({ n: count() })
      .from(pedidosAdocao)
      .where(
        and(
          eq(pedidosAdocao.ip_hash, ipHash),
          gt(pedidosAdocao.created_at, sql`now() - interval '1 day'`),
        ),
      )
    if ((envios?.n ?? 0) >= MAX_PEDIDOS_POR_DIA_POR_IP) {
      throw erros.limite('Recebemos muitos pedidos deste aparelho hoje. Tente de novo amanhã.')
    }
  }
  const [pendente] = await db
    .select({ id: pedidosAdocao.id })
    .from(pedidosAdocao)
    .where(and(eq(pedidosAdocao.whatsapp, whatsapp), eq(pedidosAdocao.status, 'pendente')))
    .limit(1)
  if (pendente) {
    throw new ErroApi(
      409,
      'pedido_em_andamento',
      'Você já tem um pedido de adoção em análise. A equipe vai falar com você pelo WhatsApp.',
    )
  }
}

/**
 * Grava o pedido e tira o animal do site, numa transação (RN48). Se outra pessoa pediu no
 * mesmo instante, o UPDATE não encontra o animal disponível (ou o índice único recusa) e a
 * transação inteira é desfeita.
 */
export async function criarPedido(
  db: Db,
  animalId: string,
  dados: PedidoAdocaoDados,
  ipHash: string | null,
  animalNome: string,
): Promise<string> {
  const { nome, whatsapp, bairro_cidade, respostas } = separarPedido(dados)
  const agora = new Date()
  try {
    return await db.transaction(async (tx) => {
      const reservado = await tx
        .update(animais)
        .set({ status: 'em_analise' })
        .where(and(eq(animais.id, animalId), eq(animais.status, 'disponivel')))
        .returning({ id: animais.id })
      if (reservado.length === 0) throw outraPessoaPediu(animalNome)

      const [pedido] = await tx
        .insert(pedidosAdocao)
        .values({
          animal_id: animalId,
          nome,
          whatsapp,
          bairro_cidade,
          versao_formulario: VERSAO_FORMULARIO,
          respostas,
          termo_ciente_em: agora,
          versao_termo: VERSAO_TERMO,
          consentimento_em: agora,
          ip_hash: ipHash,
        })
        .returning({ id: pedidosAdocao.id })
      if (!pedido) throw new Error('Pedido não gravado')
      return pedido.id
    })
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro
    // Violação do índice "um pendente por animal": duas pessoas ao mesmo tempo
    if (codigoPostgres(erro) === '23505') throw outraPessoaPediu(animalNome)
    throw erro
  }
}

// ---------------------------------------------------------------------------
// Área da ONG
// ---------------------------------------------------------------------------
const colunasPedido = {
  id: pedidosAdocao.id,
  status: pedidosAdocao.status,
  created_at: pedidosAdocao.created_at,
  nome: pedidosAdocao.nome,
  bairro_cidade: pedidosAdocao.bairro_cidade,
  respostas: pedidosAdocao.respostas,
  animal_id: animais.id,
  animal_nome: animais.nome,
  animal_especie: animais.especie,
  animal_sexo: animais.sexo,
  animal_castrado: animais.castrado,
  animal_convive: animais.convive_animais,
  animal_responsavel: animais.responsavel_tipo,
  animal_foto: fotos.path_miniatura,
  protetor_nome: protetores.nome,
}

function consultaPedidos(db: Db) {
  return db
    .select(colunasPedido)
    .from(pedidosAdocao)
    .innerJoin(animais, eq(animais.id, pedidosAdocao.animal_id))
    .leftJoin(fotos, and(eq(fotos.animal_id, animais.id), eq(fotos.ordem, 0)))
    .leftJoin(protetores, eq(protetores.id, animais.protetor_id))
}

type LinhaPedido = Awaited<ReturnType<ReturnType<typeof consultaPedidos>['execute']>>[number]

function montarResumo(env: Env, linha: LinhaPedido) {
  const alertas = alertasDoPedido(linha.respostas, {
    sexo: linha.animal_sexo,
    castrado: linha.animal_castrado,
    convive_animais: linha.animal_convive,
  })
  const resumo: Omit<PedidoResumo, 'quantidade_alertas'> = {
    id: linha.id,
    status: linha.status,
    created_at: linha.created_at.toISOString(),
    nome: linha.nome,
    bairro_cidade: linha.bairro_cidade,
    animal: {
      id: linha.animal_id,
      nome: linha.animal_nome,
      especie: linha.animal_especie,
      sexo: linha.animal_sexo,
      foto: linha.animal_foto ? urlFoto(env, linha.animal_foto) : null,
      responsavel_tipo: linha.animal_responsavel,
      protetor_nome: linha.protetor_nome,
    },
  }
  return { resumo, alertas }
}

/** Lista para a aba Pedidos (T27): pendentes mais antigos primeiro; os demais, mais recentes. */
export async function listarPedidos(
  db: Db,
  env: Env,
  status: PedidoStatus,
): Promise<PedidoResumo[]> {
  const linhas = await consultaPedidos(db)
    .where(eq(pedidosAdocao.status, status))
    .orderBy(status === 'pendente' ? pedidosAdocao.created_at : desc(pedidosAdocao.created_at))
  return linhas.map((linha) => {
    const { resumo, alertas } = montarResumo(env, linha)
    return { ...resumo, quantidade_alertas: alertas.length }
  })
}

const ehUuid = (valor: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)

/** Um pedido completo, com as respostas e os alertas (T28). */
export async function buscarPedido(db: Db, env: Env, id: string): Promise<PedidoDetalhe> {
  if (!ehUuid(id)) throw erros.naoEncontrado('Pedido não encontrado.')
  const [linha] = await db
    .select({
      ...colunasPedido,
      whatsapp: pedidosAdocao.whatsapp,
      versao_formulario: pedidosAdocao.versao_formulario,
      termo_ciente_em: pedidosAdocao.termo_ciente_em,
      versao_termo: pedidosAdocao.versao_termo,
      consentimento_em: pedidosAdocao.consentimento_em,
      observacao_equipe: pedidosAdocao.observacao_equipe,
      analisado_em: pedidosAdocao.analisado_em,
      analisado_por: equipe.nome,
    })
    .from(pedidosAdocao)
    .innerJoin(animais, eq(animais.id, pedidosAdocao.animal_id))
    .leftJoin(fotos, and(eq(fotos.animal_id, animais.id), eq(fotos.ordem, 0)))
    .leftJoin(protetores, eq(protetores.id, animais.protetor_id))
    .leftJoin(equipe, eq(equipe.id, pedidosAdocao.analisado_por))
    .where(eq(pedidosAdocao.id, id))
    .limit(1)
  if (!linha) throw erros.naoEncontrado('Pedido não encontrado.')

  const { resumo, alertas } = montarResumo(env, linha)
  return {
    ...resumo,
    whatsapp: linha.whatsapp,
    versao_formulario: linha.versao_formulario,
    respostas: linha.respostas,
    termo_ciente_em: linha.termo_ciente_em.toISOString(),
    versao_termo: linha.versao_termo,
    consentimento_em: linha.consentimento_em.toISOString(),
    observacao_equipe: linha.observacao_equipe,
    analisado_em: linha.analisado_em?.toISOString() ?? null,
    analisado_por: linha.analisado_por,
    alertas,
  }
}

const jaAnalisado = () =>
  erros.conflito('Este pedido já foi analisado. Atualize a página para ver a situação atual.')

/** Aprovar: o animal continua fora do site até "Marcar como adotado" (RN49). */
export async function aprovarPedido(db: Db, id: string, usuaria: Usuaria): Promise<void> {
  if (!ehUuid(id)) throw erros.naoEncontrado('Pedido não encontrado.')
  const agora = new Date()
  const alterados = await db
    .update(pedidosAdocao)
    .set({
      status: 'aprovado',
      analisado_em: agora,
      analisado_por: usuaria.id,
      updated_by: usuaria.id,
    })
    .where(and(eq(pedidosAdocao.id, id), eq(pedidosAdocao.status, 'pendente')))
    .returning({ id: pedidosAdocao.id })
  if (alterados.length === 0) await pedidoInexistenteOuAnalisado(db, id)
}

/** Recusar: o animal volta para o site na hora (RN49). Devolve o id do animal. */
export async function recusarPedido(db: Db, id: string, usuaria: Usuaria): Promise<string> {
  if (!ehUuid(id)) throw erros.naoEncontrado('Pedido não encontrado.')
  const agora = new Date()
  return db.transaction(async (tx) => {
    const [pedido] = await tx
      .update(pedidosAdocao)
      .set({
        status: 'recusado',
        analisado_em: agora,
        analisado_por: usuaria.id,
        updated_by: usuaria.id,
      })
      .where(and(eq(pedidosAdocao.id, id), eq(pedidosAdocao.status, 'pendente')))
      .returning({ animal_id: pedidosAdocao.animal_id })
    if (!pedido) return pedidoInexistenteOuAnalisado(tx, id)
    await tx
      .update(animais)
      .set({ status: 'disponivel', updated_by: usuaria.id })
      .where(and(eq(animais.id, pedido.animal_id), eq(animais.status, 'em_analise')))
    return pedido.animal_id
  })
}

export async function anotarPedido(
  db: Db,
  id: string,
  observacao: string,
  usuaria: Usuaria,
): Promise<void> {
  if (!ehUuid(id)) throw erros.naoEncontrado('Pedido não encontrado.')
  const alterados = await db
    .update(pedidosAdocao)
    .set({ observacao_equipe: observacao, updated_by: usuaria.id })
    .where(eq(pedidosAdocao.id, id))
    .returning({ id: pedidosAdocao.id })
  if (alterados.length === 0) throw erros.naoEncontrado('Pedido não encontrado.')
}

async function pedidoInexistenteOuAnalisado(db: Pick<Db, 'select'>, id: string): Promise<never> {
  const [existe] = await db
    .select({ id: pedidosAdocao.id })
    .from(pedidosAdocao)
    .where(eq(pedidosAdocao.id, id))
    .limit(1)
  throw existe ? jaAnalisado() : erros.naoEncontrado('Pedido não encontrado.')
}
