// Perdidos e encontrados (RN18–RN28, RN41): envio pelo site, moderação pela equipe e limpeza
// diária. As fotos ficam em perdidos/{perdido_id}/{foto_id}.webp, com a mesma chave nos dois
// buckets: na quarentena (privada) enquanto o anúncio está pendente e no bucket público depois
// da aprovação (RN19; docs/ARQUITETURA.md, seção 6).
import { and, asc, count, eq, gt, inArray, sql } from 'drizzle-orm'
import {
  DIAS_MAX_PENDENTE,
  DIAS_PUBLICACAO_PERDIDO,
  MAX_ENVIOS_POR_DIA_POR_IP,
  MAX_FOTOS_PERDIDO,
  MAX_PERDIDOS_PENDENTES,
  type PerdidoAdmin,
  type PerdidoStatus,
  type perdidoPublicoEntrada,
} from '@sospatas/compartilhado'
import { perdidos, perdidosFotos } from '@sospatas/db'
import type { z } from 'zod'
import { TIPO_WEBP, conferirFotoWebp } from '../armazenamento/webp'
import type { Armazenamento } from '../armazenamento/tipos'
import type { Db } from '../db'
import type { Usuaria } from '../dependencias'
import { ErroApi, erros } from '../erros'
import { ehUuid } from '../validacao'
import { urlFoto } from './fotos'

type PerdidoPublicoDados = z.output<typeof perdidoPublicoEntrada>

/** Rota pública afetada quando um anúncio entra ou sai do ar (para limpar o cache). */
export const CAMINHO_PUBLICO_PERDIDOS = '/api/publico/perdidos'

export const prefixoFotosPerdido = (perdidoId: string) => `perdidos/${perdidoId}/`

/** Os dois buckets: a quarentena guarda as fotos dos pendentes; o público, as do anúncio no ar. */
export type BucketsPerdidos = { fotos: Armazenamento; quarentena: Armazenamento }

const anuncioNaoEncontrado = () =>
  erros.naoEncontrado('Não encontramos este anúncio. Ele pode ter sido apagado.')

/** Data de saída do ar: hoje + 30 dias, sem acumular (RN25, RN41). */
const novaExpiracao = (agora: Date) =>
  new Date(agora.getTime() + DIAS_PUBLICACAO_PERDIDO * 24 * 60 * 60 * 1000)

/** Limpeza depois de outro erro: se falhar, fica só no log (o arquivo sobra, invisível). */
async function apagarSemFalhar(armazenamento: Armazenamento, chaves: string[]): Promise<void> {
  try {
    await armazenamento.apagar(chaves)
  } catch (erro) {
    console.error('Arquivos que sobraram no armazenamento:', chaves, erro)
  }
}

// ---------------------------------------------------------------------------
// Envio pelo site (T13)
// ---------------------------------------------------------------------------
/** RN21: até 2 fotos, cada uma WebP de verdade e com até 500 KB. */
export function conferirFotosPerdido(arquivos: Uint8Array[]): void {
  if (arquivos.length > MAX_FOTOS_PERDIDO) {
    throw new ErroApi(
      400,
      'fotos_demais',
      `Envie até ${String(MAX_FOTOS_PERDIDO)} fotos por anúncio.`,
    )
  }
  for (const arquivo of arquivos) conferirFotoWebp(arquivo)
}

/** RN23: 3 anúncios por dia por IP e 30 pendentes no total. */
export async function conferirLimitesPerdido(db: Db, ipHash: string | null): Promise<void> {
  if (ipHash) {
    const [envios] = await db
      .select({ n: count() })
      .from(perdidos)
      .where(
        and(eq(perdidos.ip_hash, ipHash), gt(perdidos.created_at, sql`now() - interval '1 day'`)),
      )
    if ((envios?.n ?? 0) >= MAX_ENVIOS_POR_DIA_POR_IP) {
      throw erros.limite('Recebemos muitos anúncios deste aparelho hoje. Tente de novo amanhã.')
    }
  }
  const [pendentes] = await db
    .select({ n: count() })
    .from(perdidos)
    .where(eq(perdidos.status, 'pendente'))
  if ((pendentes?.n ?? 0) >= MAX_PERDIDOS_PENDENTES) {
    throw erros.limite(
      'Recebemos muitos anúncios e a equipe ainda está conferindo. Tente de novo mais tarde.',
    )
  }
}

/**
 * Grava as fotos na quarentena e depois o anúncio como pendente (RN18, RN19). Se o banco
 * falhar, apaga as fotos gravadas.
 */
export async function criarPerdidoPublico(
  db: Db,
  quarentena: Armazenamento,
  dados: PerdidoPublicoDados,
  arquivos: Uint8Array[],
  ipHash: string | null,
): Promise<string> {
  const id = crypto.randomUUID()
  const fotosDoAnuncio = arquivos.map((dadosFoto) => ({
    id: crypto.randomUUID(),
    dados: dadosFoto,
  }))
  const caminho = (fotoId: string) => `${prefixoFotosPerdido(id)}${fotoId}.webp`

  const gravadas: string[] = []
  try {
    for (const foto of fotosDoAnuncio) {
      await quarentena.colocar(caminho(foto.id), foto.dados, TIPO_WEBP)
      gravadas.push(caminho(foto.id))
    }
  } catch (erro) {
    console.error('Falha ao gravar as fotos do anúncio:', erro)
    await apagarSemFalhar(quarentena, gravadas)
    throw erros.armazenamento(
      'Não conseguimos guardar as fotos agora. Tente de novo em alguns minutos.',
    )
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(perdidos).values({
        id,
        tipo: dados.tipo,
        especie: dados.especie,
        nome: dados.nome,
        bairro: dados.bairro,
        data_ocorrido: dados.data_ocorrido,
        descricao: dados.descricao,
        contato_nome: dados.contato_nome,
        contato_whatsapp: dados.contato_whatsapp,
        consentimento_em: new Date(),
        origem: 'site',
        ip_hash: ipHash,
      })
      if (fotosDoAnuncio.length > 0) {
        await tx
          .insert(perdidosFotos)
          .values(
            fotosDoAnuncio.map((foto) => ({ id: foto.id, perdido_id: id, path: caminho(foto.id) })),
          )
      }
    })
  } catch (erro) {
    await apagarSemFalhar(quarentena, gravadas)
    throw erro
  }
  return id
}

// ---------------------------------------------------------------------------
// Moderação pela equipe (T14)
// ---------------------------------------------------------------------------
/** Caminho da rota que transmite a foto da quarentena (só a equipe vê, RN19). */
const rotaFotoQuarentena = (perdidoId: string, fotoId: string) =>
  `/api/admin/perdidos/${perdidoId}/fotos/${fotoId}`

/**
 * Aguardando: mais antigos primeiro (quem chegou antes é conferido antes). No ar: os que saem
 * do ar mais cedo primeiro, inclusive os vencidos que a tarefa diária ainda não apagou.
 */
export async function listarPerdidosAdmin(
  db: Db,
  env: Env,
  status: PerdidoStatus,
): Promise<PerdidoAdmin[]> {
  const anuncios = await db
    .select({
      id: perdidos.id,
      tipo: perdidos.tipo,
      especie: perdidos.especie,
      nome: perdidos.nome,
      bairro: perdidos.bairro,
      data_ocorrido: perdidos.data_ocorrido,
      descricao: perdidos.descricao,
      contato_nome: perdidos.contato_nome,
      contato_whatsapp: perdidos.contato_whatsapp,
      origem: perdidos.origem,
      status: perdidos.status,
      created_at: perdidos.created_at,
      publicado_em: perdidos.publicado_em,
      expira_em: perdidos.expira_em,
    })
    .from(perdidos)
    .where(eq(perdidos.status, status))
    .orderBy(
      status === 'pendente' ? asc(perdidos.created_at) : asc(perdidos.expira_em),
      asc(perdidos.id),
    )
  if (anuncios.length === 0) return []

  const listaFotos = await db
    .select({
      id: perdidosFotos.id,
      perdido_id: perdidosFotos.perdido_id,
      path: perdidosFotos.path,
    })
    .from(perdidosFotos)
    .where(
      inArray(
        perdidosFotos.perdido_id,
        anuncios.map((anuncio) => anuncio.id),
      ),
    )
    .orderBy(asc(perdidosFotos.path))

  return anuncios.map((anuncio) => ({
    ...anuncio,
    created_at: anuncio.created_at.toISOString(),
    publicado_em: anuncio.publicado_em?.toISOString() ?? null,
    expira_em: anuncio.expira_em?.toISOString() ?? null,
    fotos: listaFotos
      .filter((foto) => foto.perdido_id === anuncio.id)
      .map((foto) => ({
        id: foto.id,
        url:
          anuncio.status === 'pendente'
            ? rotaFotoQuarentena(anuncio.id, foto.id)
            : urlFoto(env, foto.path),
      })),
  }))
}

async function buscarAnuncio(db: Pick<Db, 'select'>, id: string) {
  if (!ehUuid(id)) throw anuncioNaoEncontrado()
  const [anuncio] = await db
    .select({ id: perdidos.id, status: perdidos.status })
    .from(perdidos)
    .where(eq(perdidos.id, id))
    .limit(1)
  if (!anuncio) throw anuncioNaoEncontrado()
  return anuncio
}

async function caminhosDasFotos(db: Db, perdidoId: string): Promise<string[]> {
  const linhas = await db
    .select({ path: perdidosFotos.path })
    .from(perdidosFotos)
    .where(eq(perdidosFotos.perdido_id, perdidoId))
  return linhas.map((linha) => linha.path)
}

/**
 * Foto para a equipe ver na moderação: do pendente, lida da quarentena; do anúncio no ar, do
 * bucket público. Nunca é servida pelas rotas públicas (RN19).
 */
export async function obterFotoPerdido(
  db: Db,
  buckets: BucketsPerdidos,
  perdidoId: string,
  fotoId: string,
) {
  if (!ehUuid(perdidoId) || !ehUuid(fotoId)) throw erros.naoEncontrado('Foto não encontrada.')
  const [foto] = await db
    .select({ path: perdidosFotos.path, status: perdidos.status })
    .from(perdidosFotos)
    .innerJoin(perdidos, eq(perdidos.id, perdidosFotos.perdido_id))
    .where(and(eq(perdidosFotos.id, fotoId), eq(perdidosFotos.perdido_id, perdidoId)))
    .limit(1)
  if (!foto) throw erros.naoEncontrado('Foto não encontrada.')
  const bucket = foto.status === 'pendente' ? buckets.quarentena : buckets.fotos
  const objeto = await bucket.obter(foto.path)
  if (!objeto) throw erros.naoEncontrado('Foto não encontrada.')
  return objeto
}

/**
 * Aprovar e publicar (RN19, RN25): copia as fotos da quarentena para o bucket público, põe o
 * anúncio no ar por 30 dias e só então apaga as cópias da quarentena. Se a cópia falhar,
 * nada muda.
 */
export async function aprovarPerdido(
  db: Db,
  buckets: BucketsPerdidos,
  id: string,
  usuaria: Usuaria,
): Promise<void> {
  const anuncio = await buscarAnuncio(db, id)
  if (anuncio.status !== 'pendente') {
    throw erros.conflito('Este anúncio já está no ar. Atualize a página para ver a situação atual.')
  }
  const caminhos = await caminhosDasFotos(db, id)

  const copiadas: string[] = []
  try {
    for (const caminho of caminhos) {
      await buckets.quarentena.copiar(caminho, buckets.fotos)
      copiadas.push(caminho)
    }
  } catch (erro) {
    console.error('Falha ao copiar as fotos do anúncio:', erro)
    await apagarSemFalhar(buckets.fotos, copiadas)
    throw erros.armazenamento(
      'Não conseguimos publicar as fotos agora. Nada foi alterado. Tente de novo em alguns minutos.',
    )
  }

  const agora = new Date()
  const alterados = await db
    .update(perdidos)
    .set({
      status: 'publicado',
      publicado_em: agora,
      expira_em: novaExpiracao(agora),
      updated_by: usuaria.id,
    })
    .where(and(eq(perdidos.id, id), eq(perdidos.status, 'pendente')))
    .returning({ id: perdidos.id })
  if (alterados.length === 0) {
    // Outra pessoa da equipe aprovou (as cópias valem para o anúncio dela) ou apagou no mesmo
    // instante (as cópias sobraram e são apagadas aqui)
    const [existe] = await db
      .select({ id: perdidos.id })
      .from(perdidos)
      .where(eq(perdidos.id, id))
      .limit(1)
    if (!existe) await apagarSemFalhar(buckets.fotos, copiadas)
    throw existe
      ? erros.conflito('Este anúncio já está no ar. Atualize a página para ver a situação atual.')
      : anuncioNaoEncontrado()
  }
  await apagarSemFalhar(buckets.quarentena, caminhos)
}

/** "Renovar por mais 30 dias" (RN41): hoje + 30 dias, sem acumular. */
export async function renovarPerdido(db: Db, id: string, usuaria: Usuaria): Promise<string> {
  const anuncio = await buscarAnuncio(db, id)
  if (anuncio.status !== 'publicado') {
    throw erros.conflito('Só dá para renovar um anúncio que já está no ar.')
  }
  const expiraEm = novaExpiracao(new Date())
  await db
    .update(perdidos)
    .set({ expira_em: expiraEm, updated_by: usuaria.id })
    .where(eq(perdidos.id, id))
  return expiraEm.toISOString()
}

/**
 * Apaga as fotos do anúncio nos dois buckets (pelo prefixo, para não sobrar nenhum arquivo,
 * nem de um envio que falhou no meio).
 */
async function apagarArquivosDoAnuncio(buckets: BucketsPerdidos, id: string): Promise<void> {
  await buckets.quarentena.apagarPrefixo(prefixoFotosPerdido(id))
  await buckets.fotos.apagarPrefixo(prefixoFotosPerdido(id))
}

/**
 * Recusar, tirar do ar ou "voltou para casa" (RN26): apaga os arquivos nos dois buckets e
 * depois o registro, como na exclusão de animal (RN05). Se o armazenamento falhar, nada muda.
 * Devolve o status que o anúncio tinha (publicado = o site muda).
 */
export async function apagarPerdido(
  db: Db,
  buckets: BucketsPerdidos,
  id: string,
): Promise<PerdidoStatus> {
  const anuncio = await buscarAnuncio(db, id)
  try {
    await apagarArquivosDoAnuncio(buckets, id)
  } catch (erro) {
    console.error('Falha ao apagar as fotos do anúncio:', erro)
    throw erros.armazenamento(
      'Não conseguimos apagar as fotos agora. Nada foi alterado. Tente de novo em alguns minutos.',
    )
  }
  await db.delete(perdidos).where(eq(perdidos.id, id))
  return anuncio.status
}

// ---------------------------------------------------------------------------
// Tarefa diária (RN25, RN27)
// ---------------------------------------------------------------------------
/**
 * Apaga os anúncios no ar há mais de 30 dias (RN25) e os pendentes esquecidos há mais de 7
 * (RN27): primeiro os arquivos, depois o registro. Se os arquivos de um anúncio não puderem
 * ser apagados, ele fica para a próxima noite.
 */
export async function apagarPerdidosVencidos(
  db: Db,
  buckets: BucketsPerdidos,
): Promise<{ publicados: number; pendentes: number }> {
  const vencidos = await db
    .select({ id: perdidos.id, status: perdidos.status })
    .from(perdidos)
    .where(
      sql`(${perdidos.status} = 'publicado' AND ${perdidos.expira_em} < now())
       OR (${perdidos.status} = 'pendente'
           AND ${perdidos.created_at} < now() - make_interval(days => ${sql.raw(String(DIAS_MAX_PENDENTE))}))`,
    )

  const apagaveis: typeof vencidos = []
  for (const anuncio of vencidos) {
    try {
      await apagarArquivosDoAnuncio(buckets, anuncio.id)
      apagaveis.push(anuncio)
    } catch (erro) {
      console.error(
        'Tarefa diária: fotos do anúncio não apagadas, fica para amanhã:',
        anuncio.id,
        erro,
      )
    }
  }
  if (apagaveis.length > 0) {
    await db.delete(perdidos).where(
      inArray(
        perdidos.id,
        apagaveis.map((anuncio) => anuncio.id),
      ),
    )
  }
  return {
    publicados: apagaveis.filter((anuncio) => anuncio.status === 'publicado').length,
    pendentes: apagaveis.filter((anuncio) => anuncio.status === 'pendente').length,
  }
}
