// Leituras públicas do site (docs/ARQUITETURA.md, seção 3.1). Só colunas públicas: nada de
// animais_privado, equipe, ip_hash, updated_by nem anúncio pendente ou vencido.
import { and, asc, desc, eq, gt, inArray, lt, lte, sql, type SQL } from 'drizzle-orm'
import {
  MAX_DESTAQUES,
  DIAS_PARA_DESTAQUE,
  NOMES_LISTA,
  ROTULOS,
  hojeNoBrasil,
  somarDias,
  subtrairMeses,
  type AnimalFicha,
  type AnimalResumo,
  type ChaveTexto,
  type FiltroPerdidos,
  type FiltroVitrine,
  type ItemPublico,
  type NomeLista,
  type OngPublica,
  type PerdidoPublico,
  type SitePublico,
} from '@sospatas/compartilhado'
import { animais, fotos, ong, perdidos, perdidosFotos, protetores } from '@sospatas/db'
import type { Db } from '../db'
import { erros } from '../erros'
import { fotoDaHistoria, urlFoto } from './fotos'

// ---------------------------------------------------------------------------
// GET /site
// ---------------------------------------------------------------------------
type LinhaSite = {
  ong: OngPublica | null
  textos: Record<ChaveTexto, string>
  itens: {
    id: string
    lista: NomeLista
    titulo: string | null
    texto: string
    foto_path: string | null
  }[]
}

/** Dados da ONG, textos e itens numa consulta só (poupa o banco, ARQUITETURA 11.2). */
export async function buscarSite(db: Db, env: Env): Promise<SitePublico> {
  const [linha] = await db.execute<{ site: LinhaSite }>(sql`
    SELECT json_build_object(
      'ong', (SELECT json_build_object(
                'nome_completo', nome_completo, 'whatsapp', whatsapp, 'instagram', instagram,
                'facebook', facebook, 'pix_tipo', pix_tipo, 'pix_chave', pix_chave)
              FROM ong WHERE id = 1),
      'textos', (SELECT coalesce(json_object_agg(chave, valor), '{}'::json) FROM conteudo_textos),
      'itens', (SELECT coalesce(json_agg(json_build_object(
                  'id', id, 'lista', lista, 'titulo', titulo, 'texto', texto, 'foto_path', foto_path)
                  ORDER BY lista, ordem), '[]'::json)
                FROM conteudo_itens)
    ) AS site`)

  const site = linha?.site
  if (!site?.ong) throw new Error('Banco sem a linha da tabela ong (rodar o seed_conteudo.sql)')

  const listas = Object.fromEntries(
    NOMES_LISTA.map((nome) => [nome, [] as ItemPublico[]]),
  ) as Record<NomeLista, ItemPublico[]>
  for (const item of site.itens) {
    listas[item.lista].push({
      id: item.id,
      titulo: item.titulo,
      texto: item.texto,
      foto: item.foto_path ? fotoDaHistoria(env, item.foto_path) : null,
    })
  }

  return { ong: site.ong, textos: site.textos, listas }
}

// ---------------------------------------------------------------------------
// Animais: vitrine, destaques e ficha
// ---------------------------------------------------------------------------
const colunasResumo = {
  id: animais.id,
  nome: animais.nome,
  especie: animais.especie,
  sexo: animais.sexo,
  nascimento_aprox: animais.nascimento_aprox,
  porte: animais.porte,
  data_entrada: animais.data_entrada,
  foto_path: fotos.path_miniatura,
}

type LinhaResumo = Omit<AnimalResumo, 'foto'> & { foto_path: string | null }

function resumo(env: Env, { foto_path, ...animal }: LinhaResumo): AnimalResumo {
  return { ...animal, foto: foto_path ? urlFoto(env, foto_path) : null }
}

/** Disponíveis, com a miniatura da foto principal, mais antigos primeiro (RN03, RN10). */
async function listarDisponiveis(db: Db, env: Env, condicoes: SQL[], limite?: number) {
  const consulta = db
    .select(colunasResumo)
    .from(animais)
    .leftJoin(fotos, and(eq(fotos.animal_id, animais.id), eq(fotos.ordem, 0)))
    .where(and(eq(animais.status, 'disponivel'), ...condicoes))
    .orderBy(asc(animais.data_entrada), asc(animais.nome), asc(animais.id))
  const linhas = limite === undefined ? await consulta : await consulta.limit(limite)
  return linhas.map((linha) => resumo(env, linha))
}

/** RN11: adulto nasceu até esta data (1 ano ou mais). Mesma regra de ehAdulto. */
const nascimentoLimiteAdulto = (hoje: string) => subtrairMeses(hoje, 12)

export async function buscarVitrine(
  db: Db,
  env: Env,
  filtro: FiltroVitrine,
  hoje = hojeNoBrasil(),
): Promise<AnimalResumo[]> {
  const condicoes: SQL[] = []
  if (filtro.especie) condicoes.push(eq(animais.especie, filtro.especie))
  if (filtro.porte) condicoes.push(eq(animais.porte, filtro.porte))
  if (filtro.idade === 'adulto') {
    condicoes.push(lte(animais.nascimento_aprox, nascimentoLimiteAdulto(hoje)))
  }
  if (filtro.idade === 'filhote') {
    condicoes.push(gt(animais.nascimento_aprox, nascimentoLimiteAdulto(hoje)))
  }
  if (filtro.convive === 'sim') condicoes.push(eq(animais.convive_animais, true))
  return listarDisponiveis(db, env, condicoes)
}

/** RN12: adultos disponíveis esperando há mais de 90 dias, até 6, os mais antigos primeiro. */
export async function buscarDestaques(
  db: Db,
  env: Env,
  hoje = hojeNoBrasil(),
): Promise<AnimalResumo[]> {
  return listarDisponiveis(
    db,
    env,
    [
      lte(animais.nascimento_aprox, nascimentoLimiteAdulto(hoje)),
      lt(animais.data_entrada, somarDias(hoje, -DIAS_PARA_DESTAQUE)),
    ],
    MAX_DESTAQUES,
  )
}

const ehUuid = (valor: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)

/** Ficha: disponível ou adotado, com fotos e responsável (RN31). */
export async function buscarFicha(db: Db, env: Env, id: string): Promise<AnimalFicha> {
  const naoEncontrado = () => erros.naoEncontrado('Não encontramos este animal.')
  if (!ehUuid(id)) throw naoEncontrado()

  const [[animal], listaFotos] = await Promise.all([
    db
      .select({
        id: animais.id,
        nome: animais.nome,
        especie: animais.especie,
        sexo: animais.sexo,
        nascimento_aprox: animais.nascimento_aprox,
        porte: animais.porte,
        data_entrada: animais.data_entrada,
        raca: animais.raca,
        raca_tipo: animais.raca_tipo,
        cor_pelagem: animais.cor_pelagem,
        castrado: animais.castrado,
        vacinado: animais.vacinado,
        vacinas: animais.vacinas,
        vermifugado: animais.vermifugado,
        problema_saude: animais.problema_saude,
        docil: animais.docil,
        convive_animais: animais.convive_animais,
        descricao: animais.descricao,
        status: animais.status,
        responsavel_tipo: animais.responsavel_tipo,
        protetor_nome: protetores.nome,
        protetor_whatsapp: protetores.whatsapp,
        ong_whatsapp: ong.whatsapp,
      })
      .from(animais)
      .leftJoin(protetores, eq(protetores.id, animais.protetor_id))
      .leftJoin(ong, eq(ong.id, 1))
      .where(eq(animais.id, id))
      .limit(1),
    db
      .select({ miniatura: fotos.path_miniatura, completa: fotos.path_completa })
      .from(fotos)
      .where(eq(fotos.animal_id, id))
      .orderBy(asc(fotos.ordem)),
  ])
  if (!animal) throw naoEncontrado()

  const { responsavel_tipo, protetor_nome, protetor_whatsapp, ong_whatsapp, ...dados } = animal
  const responsavel =
    responsavel_tipo === 'protetor'
      ? { tipo: responsavel_tipo, nome: protetor_nome ?? '', whatsapp: protetor_whatsapp ?? '' }
      : { tipo: responsavel_tipo, nome: ROTULOS.responsavel_tipo.ong, whatsapp: ong_whatsapp ?? '' }

  return {
    ...dados,
    fotos: listaFotos.map((foto) => ({
      miniatura: urlFoto(env, foto.miniatura),
      completa: urlFoto(env, foto.completa),
    })),
    responsavel,
  }
}

// ---------------------------------------------------------------------------
// Perdidos e encontrados
// ---------------------------------------------------------------------------
/** Só anúncios aprovados e ainda no prazo, os mais recentes primeiro (RN18, RN25). */
export async function buscarPerdidos(
  db: Db,
  env: Env,
  filtro: FiltroPerdidos,
): Promise<PerdidoPublico[]> {
  const condicoes: SQL[] = [eq(perdidos.status, 'publicado'), gt(perdidos.expira_em, sql`now()`)]
  if (filtro.tipo) condicoes.push(eq(perdidos.tipo, filtro.tipo))

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
      publicado_em: perdidos.publicado_em,
      expira_em: perdidos.expira_em,
    })
    .from(perdidos)
    .where(and(...condicoes))
    .orderBy(desc(perdidos.publicado_em), asc(perdidos.id))
  if (anuncios.length === 0) return []

  const caminhos = await db
    .select({ perdido_id: perdidosFotos.perdido_id, path: perdidosFotos.path })
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
    // Publicado sempre tem as duas datas (CHECK perdidos_datas_publicacao)
    publicado_em: (anuncio.publicado_em ?? new Date(0)).toISOString(),
    expira_em: (anuncio.expira_em ?? new Date(0)).toISOString(),
    fotos: caminhos
      .filter((foto) => foto.perdido_id === anuncio.id)
      .map((foto) => urlFoto(env, foto.path)),
  }))
}
