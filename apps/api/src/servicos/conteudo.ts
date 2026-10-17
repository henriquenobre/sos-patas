// Textos e listas das páginas na área da ONG (T15–T20; RN33–RN38, RN46). Os limites de cada
// campo e de cada lista vêm de @sospatas/compartilhado (conteudo.ts), os mesmos do banco.
// Fotos da história (RN38): o navegador manda a miniatura e a completa em WebP; ficam em
// site/historia/{foto_id}.webp e -thumb.webp. Trocar a foto cria arquivos novos (cache de 1 ano).
import { and, asc, eq, gt, inArray, isNotNull, sql } from 'drizzle-orm'
import {
  CHAVES_TEXTO,
  LISTAS,
  MAX_DESTAQUES_INICIO,
  NOMES_LISTA,
  type ChaveTexto,
  type ConteudoAdmin,
  type ItemAdmin,
  type NomeLista,
  type TextoAdmin,
} from '@sospatas/compartilhado'
import { animais, conteudoItens, conteudoTextos, equipe, fotos } from '@sospatas/db'
import { TIPO_WEBP, conferirFotoWebp } from '../armazenamento/webp'
import type { Armazenamento } from '../armazenamento/tipos'
import type { Db } from '../db'
import type { Usuaria } from '../dependencias'
import { codigoPostgres, erros } from '../erros'
import { ehUuid } from '../validacao'
import type { Tx } from './animais'
import { fotoDaHistoria } from './fotos'
import type { ArquivosFoto } from './fotos-animal'

export const ehChaveTexto = (chave: string): chave is ChaveTexto =>
  (CHAVES_TEXTO as string[]).includes(chave)

const itemNaoEncontrado = () =>
  erros.naoEncontrado('Não encontramos este item. Ele pode ter sido excluído.')

const listaMudou = () =>
  erros.conflito('A lista mudou enquanto você editava. Atualize a página e tente de novo.')

/** Caminhos de uma foto nova da história (RN38). */
const caminhosFoto = () => {
  const completa = `site/historia/${crypto.randomUUID()}.webp`
  return { completa, miniatura: completa.replace(/\.webp$/, '-thumb.webp') }
}

const caminhosDaFoto = (completa: string) => [completa, completa.replace(/\.webp$/, '-thumb.webp')]

/** Limpeza depois de outro erro: se falhar, fica só no log (o arquivo sobra, invisível). */
async function apagarSemFalhar(armazenamento: Armazenamento, chaves: string[]): Promise<void> {
  try {
    await armazenamento.apagar(chaves)
  } catch (erro) {
    console.error('Arquivos que sobraram no armazenamento:', chaves, erro)
  }
}

async function gravarFoto(
  armazenamento: Armazenamento,
  arquivos: ArquivosFoto,
): Promise<{ completa: string; miniatura: string }> {
  conferirFotoWebp(arquivos.miniatura)
  conferirFotoWebp(arquivos.completa)
  const destino = caminhosFoto()
  try {
    await armazenamento.colocar(destino.miniatura, arquivos.miniatura, TIPO_WEBP)
    await armazenamento.colocar(destino.completa, arquivos.completa, TIPO_WEBP)
  } catch (erro) {
    console.error('Falha ao gravar a foto da história:', erro)
    await apagarSemFalhar(armazenamento, [destino.miniatura, destino.completa])
    throw erros.armazenamento(
      'Não conseguimos guardar a foto agora. Tente de novo em alguns minutos.',
    )
  }
  return destino
}

// ---------------------------------------------------------------------------
// Leitura (T15–T20)
// ---------------------------------------------------------------------------
const colunasItem = {
  id: conteudoItens.id,
  lista: conteudoItens.lista,
  titulo: conteudoItens.titulo,
  texto: conteudoItens.texto,
  foto_path: conteudoItens.foto_path,
  ordem: conteudoItens.ordem,
  updated_at: conteudoItens.updated_at,
  alterado_por: equipe.nome,
}

type LinhaItem = {
  id: string
  titulo: string | null
  texto: string
  foto_path: string | null
  updated_at: Date
  alterado_por: string | null
}

const itemAdmin = (env: Env, linha: LinhaItem): ItemAdmin => ({
  id: linha.id,
  titulo: linha.titulo,
  texto: linha.texto,
  foto: linha.foto_path ? fotoDaHistoria(env, linha.foto_path) : null,
  alteracao: { em: linha.updated_at.toISOString(), por: linha.alterado_por },
})

/** Tudo de uma vez: são poucos textos e itens, e as telas T15–T20 usam quase tudo. */
export async function buscarConteudoAdmin(db: Db, env: Env): Promise<ConteudoAdmin> {
  const [textos, itens, chamada] = await Promise.all([
    db
      .select({
        chave: conteudoTextos.chave,
        valor: conteudoTextos.valor,
        updated_at: conteudoTextos.updated_at,
        alterado_por: equipe.nome,
      })
      .from(conteudoTextos)
      .leftJoin(equipe, eq(equipe.id, conteudoTextos.updated_by)),
    db
      .select(colunasItem)
      .from(conteudoItens)
      .leftJoin(equipe, eq(equipe.id, conteudoItens.updated_by))
      .orderBy(asc(conteudoItens.lista), asc(conteudoItens.ordem)),
    buscarChamada(db),
  ])

  const porChave = new Map(textos.map((linha) => [linha.chave, linha]))
  const textosAdmin = Object.fromEntries(
    CHAVES_TEXTO.map((chave): [ChaveTexto, TextoAdmin] => {
      const linha = porChave.get(chave)
      return [
        chave,
        linha
          ? {
              valor: linha.valor,
              alteracao: { em: linha.updated_at.toISOString(), por: linha.alterado_por },
            }
          : { valor: '', alteracao: null },
      ]
    }),
  ) as Record<ChaveTexto, TextoAdmin>

  const listas = Object.fromEntries(NOMES_LISTA.map((nome) => [nome, [] as ItemAdmin[]])) as Record<
    NomeLista,
    ItemAdmin[]
  >
  for (const linha of itens) listas[linha.lista].push(itemAdmin(env, linha))

  return { textos: textosAdmin, listas, chamada }
}

async function buscarItem(db: Db | Tx, env: Env, id: string): Promise<ItemAdmin> {
  const [linha] = await db
    .select(colunasItem)
    .from(conteudoItens)
    .leftJoin(equipe, eq(equipe.id, conteudoItens.updated_by))
    .where(eq(conteudoItens.id, id))
  if (!linha) throw itemNaoEncontrado()
  return itemAdmin(env, linha)
}

/** Lista do item, para validar os campos com as regras dela. */
export async function listaDoItem(db: Db, id: string): Promise<NomeLista> {
  if (!ehUuid(id)) throw itemNaoEncontrado()
  const [linha] = await db
    .select({ lista: conteudoItens.lista })
    .from(conteudoItens)
    .where(eq(conteudoItens.id, id))
  if (!linha) throw itemNaoEncontrado()
  return linha.lista
}

// ---------------------------------------------------------------------------
// Textos (CampoTextoEditavel)
// ---------------------------------------------------------------------------
/** Grava o texto (cria a linha se ela não existir) e devolve como ficou. */
export async function salvarTexto(
  db: Db,
  chave: ChaveTexto,
  valor: string,
  usuaria: Usuaria,
): Promise<TextoAdmin> {
  const agora = new Date()
  await db
    .insert(conteudoTextos)
    .values({ chave, valor, updated_at: agora, updated_by: usuaria.id })
    .onConflictDoUpdate({
      target: conteudoTextos.chave,
      set: { valor, updated_at: agora, updated_by: usuaria.id },
    })
  return { valor, alteracao: { em: agora.toISOString(), por: usuaria.nome } }
}

// ---------------------------------------------------------------------------
// Itens de lista (ListaEditavel, T17)
// ---------------------------------------------------------------------------
type DadosItem = { titulo: string | null; texto: string }

/**
 * Uma alteração de cada vez por lista: trava a lista até o fim da transação, para duas
 * pessoas adicionando ao mesmo tempo não passarem do máximo nem repetirem a posição.
 */
async function travarLista(tx: Tx, lista: NomeLista): Promise<number> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`conteudo_itens:${lista}`}))`)
  const [contagem] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(conteudoItens)
    .where(eq(conteudoItens.lista, lista))
  return contagem?.n ?? 0
}

const limiteAtingido = (lista: NomeLista) => {
  const maximo = LISTAS[lista].maximo ?? 0
  return erros.conflito(
    `Esta lista pode ter até ${String(maximo)} itens. Exclua um item para adicionar outro.`,
  )
}

/** Item novo entra no fim da lista (RN35). Na lista de fotos, a foto é obrigatória (RN38). */
export async function criarItem(
  db: Db,
  env: Env,
  armazenamento: Armazenamento,
  lista: NomeLista,
  dados: DadosItem,
  arquivos: ArquivosFoto | null,
  usuaria: Usuaria,
): Promise<ItemAdmin> {
  const config = LISTAS[lista]
  if (config.foto && !arquivos) throw erros.validacao({ foto: 'Escolha a foto' })
  if (!config.foto && arquivos) {
    throw erros.requisicaoInvalida('Esta lista não tem foto.')
  }
  // Conferência antecipada, para não gravar a foto à toa; a que vale é a da transação
  if (config.maximo !== null) {
    const [contagem] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(conteudoItens)
      .where(eq(conteudoItens.lista, lista))
    if ((contagem?.n ?? 0) >= config.maximo) throw limiteAtingido(lista)
  }

  const foto = arquivos ? await gravarFoto(armazenamento, arquivos) : null
  try {
    const id = await db.transaction(async (tx) => {
      const quantidade = await travarLista(tx, lista)
      if (config.maximo !== null && quantidade >= config.maximo) throw limiteAtingido(lista)
      const [novo] = await tx
        .insert(conteudoItens)
        .values({
          lista,
          titulo: dados.titulo,
          texto: dados.texto,
          foto_path: foto?.completa ?? null,
          ordem: quantidade,
          updated_by: usuaria.id,
        })
        .returning({ id: conteudoItens.id })
      if (!novo) throw new Error('Item não gravado')
      return novo.id
    })
    return await buscarItem(db, env, id)
  } catch (erro) {
    if (foto) await apagarSemFalhar(armazenamento, [foto.completa, foto.miniatura])
    if (codigoPostgres(erro) === '23505') throw listaMudou()
    throw erro
  }
}

export async function editarItem(
  db: Db,
  env: Env,
  id: string,
  dados: DadosItem,
  usuaria: Usuaria,
): Promise<ItemAdmin> {
  if (!ehUuid(id)) throw itemNaoEncontrado()
  const alterados = await db
    .update(conteudoItens)
    .set({
      titulo: dados.titulo,
      texto: dados.texto,
      updated_at: new Date(),
      updated_by: usuaria.id,
    })
    .where(eq(conteudoItens.id, id))
    .returning({ id: conteudoItens.id })
  if (alterados.length === 0) throw itemNaoEncontrado()
  return buscarItem(db, env, id)
}

/**
 * RN36: excluir não deixa a lista com menos itens que o mínimo (perguntas e passos: 1).
 * RN38: na lista de fotos, apaga primeiro os arquivos; se o armazenamento falhar, nada muda.
 * Os itens seguintes sobem uma posição.
 */
export async function excluirItem(
  db: Db,
  armazenamento: Armazenamento,
  id: string,
): Promise<NomeLista> {
  if (!ehUuid(id)) throw itemNaoEncontrado()
  const [item] = await db
    .select({
      lista: conteudoItens.lista,
      ordem: conteudoItens.ordem,
      foto_path: conteudoItens.foto_path,
    })
    .from(conteudoItens)
    .where(eq(conteudoItens.id, id))
  if (!item) throw itemNaoEncontrado()

  const { minimo } = LISTAS[item.lista]
  const ultimoItem = () =>
    erros.conflito(
      `Esta lista precisa ter ao menos ${minimo === 1 ? '1 item' : `${String(minimo)} itens`}. ` +
        'Altere este item em vez de excluir.',
    )
  if (minimo > 0) {
    const [contagem] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(conteudoItens)
      .where(eq(conteudoItens.lista, item.lista))
    if ((contagem?.n ?? 0) <= minimo) throw ultimoItem()
  }

  if (item.foto_path) {
    try {
      await armazenamento.apagar(caminhosDaFoto(item.foto_path))
    } catch (erro) {
      console.error('Falha ao apagar a foto da história:', erro)
      throw erros.armazenamento(
        'Não conseguimos apagar a foto agora. Nada foi alterado. Tente de novo em alguns minutos.',
      )
    }
  }

  await db.transaction(async (tx) => {
    const quantidade = await travarLista(tx, item.lista)
    if (minimo > 0 && quantidade <= minimo) throw ultimoItem()
    const [apagado] = await tx
      .delete(conteudoItens)
      .where(eq(conteudoItens.id, id))
      .returning({ ordem: conteudoItens.ordem })
    // Outra pessoa excluiu ao mesmo tempo: a lista já está certa
    if (!apagado) return
    // A unicidade (lista, ordem) só é conferida no fim da transação (migration 0001)
    await tx
      .update(conteudoItens)
      .set({ ordem: sql`${conteudoItens.ordem} - 1` })
      .where(and(eq(conteudoItens.lista, item.lista), gt(conteudoItens.ordem, apagado.ordem)))
  })
  return item.lista
}

/** RN35: troca a posição de dois itens vizinhos da mesma lista, numa transação. */
export async function trocarOrdem(db: Db, ids: [string, string], usuaria: Usuaria): Promise<void> {
  if (ids[0] === ids[1]) throw erros.requisicaoInvalida('Escolha dois itens diferentes.')
  await db.transaction(async (tx) => {
    const itens = await tx
      .select({ id: conteudoItens.id, lista: conteudoItens.lista, ordem: conteudoItens.ordem })
      .from(conteudoItens)
      .where(inArray(conteudoItens.id, ids))
      .for('update')
    const [a, b] = itens
    if (!a || !b) throw itemNaoEncontrado()
    if (a.lista !== b.lista || Math.abs(a.ordem - b.ordem) !== 1) throw listaMudou()
    const agora = new Date()
    await tx
      .update(conteudoItens)
      .set({ ordem: b.ordem, updated_at: agora, updated_by: usuaria.id })
      .where(eq(conteudoItens.id, a.id))
    await tx
      .update(conteudoItens)
      .set({ ordem: a.ordem, updated_at: agora, updated_by: usuaria.id })
      .where(eq(conteudoItens.id, b.id))
  })
}

/**
 * RN38: trocar a foto de um item da história. Grava a nova, aponta o item para ela e só então
 * apaga a antiga (o site nunca aponta para um arquivo que não existe).
 */
export async function trocarFotoItem(
  db: Db,
  env: Env,
  armazenamento: Armazenamento,
  id: string,
  arquivos: ArquivosFoto,
  usuaria: Usuaria,
): Promise<ItemAdmin> {
  const lista = await listaDoItem(db, id)
  if (!LISTAS[lista].foto) throw erros.requisicaoInvalida('Esta lista não tem foto.')
  const nova = await gravarFoto(armazenamento, arquivos)
  let antiga: string | null
  try {
    antiga = await db.transaction(async (tx) => {
      const [atual] = await tx
        .select({ foto_path: conteudoItens.foto_path })
        .from(conteudoItens)
        .where(eq(conteudoItens.id, id))
        .for('update')
      if (!atual) throw itemNaoEncontrado()
      await tx
        .update(conteudoItens)
        .set({ foto_path: nova.completa, updated_at: new Date(), updated_by: usuaria.id })
        .where(eq(conteudoItens.id, id))
      return atual.foto_path
    })
  } catch (erro) {
    await apagarSemFalhar(armazenamento, [nova.completa, nova.miniatura])
    throw erro
  }
  if (antiga) await apagarSemFalhar(armazenamento, caminhosDaFoto(antiga))
  return buscarItem(db, env, id)
}

// ---------------------------------------------------------------------------
// Animais da chamada do Início (RN54)
// ---------------------------------------------------------------------------
/** Fotos 1 e 2 da chamada: o animal disponível escolhido para cada uma, ou null (automático). */
async function buscarChamada(db: Db | Tx): Promise<(string | null)[]> {
  const linhas = await db
    .select({ id: animais.id, posicao: animais.destaque_inicio })
    .from(animais)
    .where(and(isNotNull(animais.destaque_inicio), eq(animais.status, 'disponivel')))
  return Array.from(
    { length: MAX_DESTAQUES_INICIO },
    (_, indice) => linhas.find((linha) => linha.posicao === indice + 1)?.id ?? null,
  )
}

/**
 * Troca os animais da chamada. Só aceita animal disponível e com foto, porque a chamada mostra
 * a foto. Não muda o "Alterado por" do animal: a escolha é da página inicial, não do cadastro.
 */
export async function salvarChamada(db: Db, ids: (string | null)[]): Promise<(string | null)[]> {
  const escolhidos = ids.filter((id) => id !== null)
  return db.transaction(async (tx) => {
    if (escolhidos.length > 0) {
      const encontrados = await tx
        .select({ id: animais.id, nome: animais.nome, status: animais.status, foto: fotos.id })
        .from(animais)
        .leftJoin(fotos, and(eq(fotos.animal_id, animais.id), eq(fotos.ordem, 0)))
        .where(inArray(animais.id, escolhidos))
      for (const id of escolhidos) {
        const animal = encontrados.find((linha) => linha.id === id)
        if (!animal) {
          throw erros.conflito('Um dos animais foi excluído. Atualize a página e escolha de novo.')
        }
        if (animal.status !== 'disponivel') {
          throw erros.conflito(`${animal.nome} não está mais disponível. Escolha outro animal.`)
        }
        if (!animal.foto) {
          throw erros.conflito(`${animal.nome} ainda não tem foto. Escolha outro animal.`)
        }
      }
    }
    // Duas etapas: limpar antes de gravar, para trocar as posições sem bater no índice único
    await tx.execute(
      sql`UPDATE animais SET destaque_inicio = NULL WHERE destaque_inicio IS NOT NULL`,
    )
    for (const [indice, id] of ids.entries()) {
      if (id) {
        await tx.execute(sql`UPDATE animais SET destaque_inicio = ${indice + 1} WHERE id = ${id}`)
      }
    }
    return buscarChamada(tx)
  })
}
