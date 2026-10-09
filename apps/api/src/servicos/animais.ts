// Animais na área da ONG (T09–T11): lista, cadastro, edição, adoção, devolução e exclusão
// (RN05, RN07–RN09, RN30, RN42, RN43, RN49). Toda escrita grava quem alterou (RN43).
import { and, asc, desc, eq, gt, ilike, inArray, sql, type SQL } from 'drizzle-orm'
import {
  DIAS_PARA_DESTAQUE,
  hojeNoBrasil,
  somarDias,
  subtrairMeses,
  type AdocaoDados,
  type AnimalAdmin,
  type AnimalAdminResumo,
  type AnimalDados,
  type FiltroAnimaisAdmin,
  type PedidoDoAnimal,
  type ResumoAdmin,
} from '@sospatas/compartilhado'
import { animais, animaisPrivado, equipe, fotos, pedidosAdocao, protetores } from '@sospatas/db'
import type { Armazenamento } from '../armazenamento/tipos'
import type { Db } from '../db'
import type { Usuaria } from '../dependencias'
import { ErroApi, codigoPostgres, erros } from '../erros'
import { ehUuid } from '../validacao'
import { urlFoto } from './fotos'

export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const animalNaoEncontrado = () => erros.naoEncontrado('Não encontramos este animal.')

/** Prefixo das fotos do animal no bucket público: apagado de uma vez na exclusão (RN04, RN05). */
export const prefixoFotosAnimal = (animalId: string) => `animais/${animalId}/`

/** RN11 e RN12: adulto nasceu até esta data; "esperando muito" entrou antes desta. */
const nascimentoLimiteAdulto = (hoje: string) => subtrairMeses(hoje, 12)
const entradaLimiteDestaque = (hoje: string) => somarDias(hoje, -DIAS_PARA_DESTAQUE)

/** Escapa % e _ para a busca por parte do nome. */
const padraoBusca = (texto: string) => `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

// ---------------------------------------------------------------------------
// GET /resumo
// ---------------------------------------------------------------------------
export async function buscarResumo(db: Db, hoje = hojeNoBrasil()): Promise<ResumoAdmin> {
  const inicioDoMes = `${hoje.slice(0, 8)}01`
  const [linha] = await db.execute<ResumoAdmin>(sql`
    SELECT
      count(*) FILTER (WHERE status = 'disponivel')::int AS disponiveis,
      count(*) FILTER (
        WHERE status = 'disponivel'
          AND nascimento_aprox <= ${nascimentoLimiteAdulto(hoje)}
          AND data_entrada < ${entradaLimiteDestaque(hoje)}
      )::int AS esperando_muito,
      count(*) FILTER (WHERE status = 'adotado' AND data_adocao >= ${inicioDoMes})::int
        AS adotados_no_mes,
      (SELECT count(*) FROM perdidos WHERE status = 'pendente')::int AS perdidos_pendentes,
      (SELECT count(*) FROM pedidos_adocao WHERE status = 'pendente')::int AS pedidos_pendentes
    FROM animais`)
  if (!linha) throw new Error('Resumo sem resultado')
  return linha
}

// ---------------------------------------------------------------------------
// GET /animais
// ---------------------------------------------------------------------------
/** Pedido pendente ou aprovado mais recente; só interessa a quem está em análise. */
const pedidoEmAndamento = sql<PedidoDoAnimal | null>`CASE WHEN ${animais.status} = 'em_analise' THEN (
  SELECT json_build_object('id', p.id, 'status', p.status)
  FROM pedidos_adocao p
  WHERE p.animal_id = ${animais.id} AND p.status IN ('pendente', 'aprovado')
  ORDER BY p.created_at DESC LIMIT 1) END`

export async function listarAnimaisAdmin(
  db: Db,
  env: Env,
  filtro: FiltroAnimaisAdmin,
): Promise<AnimalAdminResumo[]> {
  const condicoes: SQL[] = [eq(animais.status, filtro.status)]
  if (filtro.responsavel === 'ong' || filtro.responsavel === 'protetor') {
    condicoes.push(eq(animais.responsavel_tipo, filtro.responsavel))
  } else if (filtro.responsavel) {
    condicoes.push(eq(animais.protetor_id, filtro.responsavel))
  }
  if (filtro.busca) condicoes.push(ilike(animais.nome, padraoBusca(filtro.busca)))

  const linhas = await db
    .select({
      id: animais.id,
      nome: animais.nome,
      especie: animais.especie,
      sexo: animais.sexo,
      nascimento_aprox: animais.nascimento_aprox,
      porte: animais.porte,
      status: animais.status,
      data_entrada: animais.data_entrada,
      data_adocao: animais.data_adocao,
      responsavel_tipo: animais.responsavel_tipo,
      protetor_id: protetores.id,
      protetor_nome: protetores.nome,
      lar_nome: animaisPrivado.lar_nome,
      foto_path: fotos.path_miniatura,
      pedido: pedidoEmAndamento,
    })
    .from(animais)
    .leftJoin(protetores, eq(protetores.id, animais.protetor_id))
    .leftJoin(animaisPrivado, eq(animaisPrivado.animal_id, animais.id))
    .leftJoin(fotos, and(eq(fotos.animal_id, animais.id), eq(fotos.ordem, 0)))
    .where(and(...condicoes))
    // Adotados: os mais recentes primeiro (acompanhamento da adaptação, RN30); os demais,
    // como na vitrine, os que esperam há mais tempo primeiro
    .orderBy(
      ...(filtro.status === 'adotado'
        ? [desc(animais.data_adocao), asc(animais.nome)]
        : [asc(animais.data_entrada), asc(animais.nome)]),
      asc(animais.id),
    )

  return linhas.map(({ protetor_id, protetor_nome, foto_path, ...animal }) => ({
    ...animal,
    protetor: protetor_id && protetor_nome ? { id: protetor_id, nome: protetor_nome } : null,
    foto: foto_path ? urlFoto(env, foto_path) : null,
  }))
}

// ---------------------------------------------------------------------------
// GET /animais/:id
// ---------------------------------------------------------------------------
export async function buscarAnimalAdmin(db: Db, env: Env, id: string): Promise<AnimalAdmin> {
  if (!ehUuid(id)) throw animalNaoEncontrado()

  const [[linha], listaFotos, [pedidoAprovado]] = await Promise.all([
    db
      .select({
        animal: animais,
        privado: animaisPrivado,
        protetor_nome: protetores.nome,
        protetor_whatsapp: protetores.whatsapp,
        alterado_por: equipe.nome,
      })
      .from(animais)
      .leftJoin(animaisPrivado, eq(animaisPrivado.animal_id, animais.id))
      .leftJoin(protetores, eq(protetores.id, animais.protetor_id))
      .leftJoin(equipe, eq(equipe.id, animais.updated_by))
      .where(eq(animais.id, id))
      .limit(1),
    db
      .select({
        id: fotos.id,
        ordem: fotos.ordem,
        miniatura: fotos.path_miniatura,
        completa: fotos.path_completa,
      })
      .from(fotos)
      .where(eq(fotos.animal_id, id))
      .orderBy(asc(fotos.ordem)),
    db
      .select({ id: pedidosAdocao.id, nome: pedidosAdocao.nome, whatsapp: pedidosAdocao.whatsapp })
      .from(pedidosAdocao)
      .innerJoin(animais, eq(animais.id, pedidosAdocao.animal_id))
      .where(
        and(
          eq(pedidosAdocao.animal_id, id),
          eq(pedidosAdocao.status, 'aprovado'),
          eq(animais.status, 'em_analise'),
        ),
      )
      .orderBy(desc(pedidosAdocao.created_at))
      .limit(1),
  ])
  if (!linha) throw animalNaoEncontrado()

  const { animal, privado, protetor_nome, protetor_whatsapp, alterado_por } = linha
  return {
    id: animal.id,
    nome: animal.nome,
    especie: animal.especie,
    sexo: animal.sexo,
    nascimento_aprox: animal.nascimento_aprox,
    porte: animal.porte,
    status: animal.status,
    data_entrada: animal.data_entrada,
    data_adocao: animal.data_adocao,
    responsavel_tipo: animal.responsavel_tipo,
    raca: animal.raca,
    raca_tipo: animal.raca_tipo,
    cor_pelagem: animal.cor_pelagem,
    castrado: animal.castrado,
    vacinado: animal.vacinado,
    vacinas: animal.vacinas,
    vermifugado: animal.vermifugado,
    problema_saude: animal.problema_saude,
    docil: animal.docil,
    convive_animais: animal.convive_animais,
    descricao: animal.descricao,
    protetor:
      animal.protetor_id && protetor_nome && protetor_whatsapp
        ? { id: animal.protetor_id, nome: protetor_nome, whatsapp: protetor_whatsapp }
        : null,
    fotos: listaFotos.map((foto) => ({
      id: foto.id,
      ordem: foto.ordem,
      miniatura: urlFoto(env, foto.miniatura),
      completa: urlFoto(env, foto.completa),
    })),
    privado: {
      lar_nome: privado?.lar_nome ?? null,
      lar_tipo: privado?.lar_tipo ?? null,
      observacoes: privado?.observacoes ?? '',
      adotante_nome: privado?.adotante_nome ?? null,
      adotante_whatsapp: privado?.adotante_whatsapp ?? null,
    },
    pedido_aprovado: pedidoAprovado ?? null,
    alteracao: { em: animal.updated_at.toISOString(), por: alterado_por },
  }
}

// ---------------------------------------------------------------------------
// POST /animais e PUT /animais/:id
// ---------------------------------------------------------------------------
/** Colunas públicas vindas do formulário (status e adoção só mudam pelas ações próprias). */
function colunasDoFormulario(dados: AnimalDados) {
  const { privado: _privado, data_entrada, ...colunas } = dados
  return data_entrada === undefined ? colunas : { ...colunas, data_entrada }
}

/** Protetor escolhido não existe mais (outra pessoa excluiu): erro no campo, como a validação. */
function protetorInexistente(erro: unknown): never {
  if (codigoPostgres(erro) === '23503') {
    throw erros.validacao({ protetor_id: 'Este protetor não existe mais. Atualize a lista.' })
  }
  throw erro
}

export async function criarAnimal(db: Db, dados: AnimalDados, usuaria: Usuaria): Promise<string> {
  try {
    return await db.transaction(async (tx) => {
      const [animal] = await tx
        .insert(animais)
        .values({ ...colunasDoFormulario(dados), updated_by: usuaria.id })
        .returning({ id: animais.id })
      if (!animal) throw new Error('Animal não gravado')
      await tx.insert(animaisPrivado).values({ animal_id: animal.id, ...dados.privado })
      return animal.id
    })
  } catch (erro) {
    return protetorInexistente(erro)
  }
}

export async function editarAnimal(
  db: Db,
  id: string,
  dados: AnimalDados,
  usuaria: Usuaria,
): Promise<void> {
  if (!ehUuid(id)) throw animalNaoEncontrado()
  try {
    await db.transaction(async (tx) => {
      const alterados = await tx
        .update(animais)
        .set({ ...colunasDoFormulario(dados), updated_by: usuaria.id })
        .where(eq(animais.id, id))
        .returning({ id: animais.id })
      if (alterados.length === 0) throw animalNaoEncontrado()
      await tx
        .insert(animaisPrivado)
        .values({ animal_id: id, ...dados.privado })
        .onConflictDoUpdate({ target: animaisPrivado.animal_id, set: dados.privado })
    })
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro
    protetorInexistente(erro)
  }
}

// ---------------------------------------------------------------------------
// Adoção e devolução (RN07, RN08, RN30, RN49)
// ---------------------------------------------------------------------------
async function situacaoDoAnimal(db: Db | Tx, id: string) {
  if (!ehUuid(id)) throw animalNaoEncontrado()
  const [animal] = await db
    .select({ nome: animais.nome, status: animais.status })
    .from(animais)
    .where(eq(animais.id, id))
    .limit(1)
  if (!animal) throw animalNaoEncontrado()
  return animal
}

/** Pedido pendente ou aprovado mais recente do animal. */
async function pedidoEmAndamentoDoAnimal(db: Db | Tx, animalId: string) {
  const [pedido] = await db
    .select({ id: pedidosAdocao.id, status: pedidosAdocao.status })
    .from(pedidosAdocao)
    .where(
      and(
        eq(pedidosAdocao.animal_id, animalId),
        inArray(pedidosAdocao.status, ['pendente', 'aprovado']),
      ),
    )
    .orderBy(desc(pedidosAdocao.created_at))
    .limit(1)
  return pedido ?? null
}

const pedidoAguardandoAnalise = (nome: string) =>
  new ErroApi(
    409,
    'pedido_pendente',
    `Há um pedido de adoção de ${nome} aguardando análise. Aprove ou recuse o pedido antes.`,
  )

const mudouNoMeioTempo = () =>
  erros.conflito('Este animal acabou de ser alterado. Atualize a página e tente de novo.')

/**
 * Marcar como adotado (RN07, RN08): status adotado, data de hoje, adotante no bloco privado e
 * só a foto principal. Os arquivos das fotos extras são apagados antes do banco: se o R2
 * falhar, nada muda (mesma ordem da RN05).
 */
export async function marcarAdotado(
  db: Db,
  armazenamento: Armazenamento,
  id: string,
  adotante: AdocaoDados,
  usuaria: Usuaria,
  hoje = hojeNoBrasil(),
): Promise<void> {
  const animal = await situacaoDoAnimal(db, id)
  if (animal.status === 'adotado') throw erros.conflito(`${animal.nome} já está como adotado.`)
  if (animal.status === 'em_analise') {
    const pedido = await pedidoEmAndamentoDoAnimal(db, id)
    if (pedido?.status === 'pendente') throw pedidoAguardandoAnalise(animal.nome)
  }

  const extras = await db
    .select({ id: fotos.id, miniatura: fotos.path_miniatura, completa: fotos.path_completa })
    .from(fotos)
    .where(and(eq(fotos.animal_id, id), gt(fotos.ordem, 0)))
  try {
    await armazenamento.apagar(extras.flatMap((foto) => [foto.miniatura, foto.completa]))
  } catch (erro) {
    console.error('Falha ao apagar as fotos extras na adoção:', erro)
    throw erros.armazenamento(
      'Não conseguimos apagar as fotos extras agora. Nada foi alterado. Tente de novo em alguns minutos.',
    )
  }

  await db.transaction(async (tx) => {
    const alterados = await tx
      .update(animais)
      .set({ status: 'adotado', data_adocao: hoje, updated_by: usuaria.id })
      .where(and(eq(animais.id, id), eq(animais.status, animal.status)))
      .returning({ id: animais.id })
    if (alterados.length === 0) throw mudouNoMeioTempo()
    if (extras.length > 0) {
      await tx.delete(fotos).where(
        inArray(
          fotos.id,
          extras.map((foto) => foto.id),
        ),
      )
    }
    await tx
      .insert(animaisPrivado)
      .values({ animal_id: id, ...adotante })
      .onConflictDoUpdate({ target: animaisPrivado.animal_id, set: adotante })
  })
}

/**
 * "Voltar para disponível" (RN30, RN49): o animal adotado que não se adaptou volta para quem
 * doou; a adoção aprovada que não aconteceu marca o pedido como não concluído.
 */
export async function devolver(db: Db, id: string, usuaria: Usuaria): Promise<void> {
  const animal = await situacaoDoAnimal(db, id)
  if (animal.status === 'disponivel') throw erros.conflito(`${animal.nome} já está disponível.`)

  await db.transaction(async (tx) => {
    if (animal.status === 'em_analise') {
      const pedido = await pedidoEmAndamentoDoAnimal(tx, id)
      if (pedido?.status === 'pendente') throw pedidoAguardandoAnalise(animal.nome)
      if (pedido) {
        await tx
          .update(pedidosAdocao)
          .set({ status: 'nao_concluido', updated_by: usuaria.id })
          .where(eq(pedidosAdocao.id, pedido.id))
      }
    } else {
      // O adotante é dado pessoal: sem a adoção, não há motivo para guardar (LGPD)
      await tx
        .update(animaisPrivado)
        .set({ adotante_nome: null, adotante_whatsapp: null })
        .where(eq(animaisPrivado.animal_id, id))
    }
    const alterados = await tx
      .update(animais)
      .set({ status: 'disponivel', data_adocao: null, updated_by: usuaria.id })
      .where(and(eq(animais.id, id), eq(animais.status, animal.status)))
      .returning({ id: animais.id })
    if (alterados.length === 0) throw mudouNoMeioTempo()
  })
}

// ---------------------------------------------------------------------------
// DELETE /animais/:id (RN05, RN09)
// ---------------------------------------------------------------------------
/**
 * Exclusão: primeiro todos os arquivos do prefixo do animal; só depois o registro (o cascade
 * apaga fotos, dados privados e pedidos). Se o armazenamento falhar, o registro fica.
 */
export async function excluirAnimal(
  db: Db,
  armazenamento: Armazenamento,
  id: string,
): Promise<void> {
  await situacaoDoAnimal(db, id)
  try {
    await armazenamento.apagarPrefixo(prefixoFotosAnimal(id))
  } catch (erro) {
    console.error('Falha ao apagar as fotos na exclusão do animal:', erro)
    throw erros.armazenamento(
      'Não conseguimos apagar as fotos agora, então o animal não foi excluído. Tente de novo em alguns minutos.',
    )
  }
  await db.delete(animais).where(eq(animais.id, id))
}

/** Grava quem alterou o animal (RN43), para mudanças que não passam pelo formulário (fotos). */
export async function registrarAlteracao(db: Db | Tx, id: string, usuaria: Usuaria) {
  await db
    .update(animais)
    .set({ updated_by: usuaria.id, updated_at: new Date() })
    .where(eq(animais.id, id))
}

/** Lança 404 se o animal não existe. */
export async function exigirAnimal(db: Db, id: string): Promise<void> {
  await situacaoDoAnimal(db, id)
}
