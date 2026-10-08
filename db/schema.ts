// Schema do banco (DESENVOLVIMENTO.md, seção 5). Fonte dos tipos da API.
// Mudou algo aqui: `pnpm db:gerar` cria a migration em db/migrations/ (nunca alterar o banco à mão).
//
// Os nomes das propriedades são iguais aos das colunas (snake_case), como na documentação.
// Limites, listas de valores e configuração dos textos vêm de @sospatas/compartilhado.

import { sql, type SQL } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import {
  CHAVES_TEXTO,
  ESPECIES,
  LAR_TIPOS,
  LIMITES,
  LISTAS,
  MAX_FOTOS_ANIMAL,
  NOMES_LISTA,
  PERDIDO_ORIGENS,
  PERDIDO_STATUS,
  PERDIDO_TIPOS,
  PIX_TIPOS,
  PORTES,
  RACA_TIPOS,
  REGEX_WHATSAPP,
  RESPONSAVEL_TIPOS,
  SEXOS,
  SIM_NAO_SEM_INFORMACAO,
  STATUS_ANIMAL,
  TEXTOS,
  type NomeLista,
} from '@sospatas/compartilhado'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const especie = pgEnum('especie', ESPECIES)
export const sexo = pgEnum('sexo', SEXOS)
export const porte = pgEnum('porte', PORTES)
export const racaTipo = pgEnum('raca_tipo', RACA_TIPOS)
export const simNaoSemInformacao = pgEnum('sim_nao_sem_informacao', SIM_NAO_SEM_INFORMACAO)
export const statusAnimal = pgEnum('status_animal', STATUS_ANIMAL)
export const responsavelTipo = pgEnum('responsavel_tipo', RESPONSAVEL_TIPOS)
export const larTipo = pgEnum('lar_tipo', LAR_TIPOS)
export const perdidoTipo = pgEnum('perdido_tipo', PERDIDO_TIPOS)
export const perdidoOrigem = pgEnum('perdido_origem', PERDIDO_ORIGENS)
export const perdidoStatus = pgEnum('perdido_status', PERDIDO_STATUS)
export const pixTipo = pgEnum('pix_tipo', PIX_TIPOS)
export const conteudoLista = pgEnum('conteudo_lista', NOMES_LISTA)

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------
/** Texto até `limite` caracteres (RN34). */
const maximo = (coluna: AnyPgColumn, limite: number): SQL =>
  sql`char_length(${coluna}) <= ${sql.raw(String(limite))}`

/** Texto obrigatório: não pode ser vazio nem só espaços. */
const preenchido = (coluna: AnyPgColumn): SQL => sql`btrim(${coluna}) <> ''`

const whatsappValido = (coluna: AnyPgColumn): SQL =>
  sql`${coluna} ~ ${sql.raw(`'${REGEX_WHATSAPP}'`)}`

/** Lista de literais SQL: ('a', 'b', …). Valores vêm do código, nunca do usuário. */
const literais = (valores: readonly string[]): SQL =>
  sql.raw(`(${valores.map((v) => `'${v}'`).join(', ')})`)

/** Atualização: preenchidos pela API em toda escrita (RN43). */
const auditoria = {
  updated_at: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  updated_by: uuid().references(() => equipe.id, { onDelete: 'set null' }),
}

const criadoEm = {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
}

// ---------------------------------------------------------------------------
// equipe: usuárias da área da ONG (login pelo Cloudflare Access)
// ---------------------------------------------------------------------------
export const equipe = pgTable(
  'equipe',
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull().unique(),
    nome: text().notNull(),
    ativo: boolean().notNull().default(true),
    ...criadoEm,
  },
  (t) => [
    check('equipe_email_minusculo', sql`${t.email} = lower(${t.email})`),
    check('equipe_email_limite', maximo(t.email, LIMITES.equipe.email)),
    check('equipe_nome_limite', maximo(t.nome, LIMITES.equipe.nome)),
    check('equipe_nome_preenchido', preenchido(t.nome)),
  ],
)

// ---------------------------------------------------------------------------
// ong: dados de contato, uma linha só (id = 1)
// ---------------------------------------------------------------------------
export const ong = pgTable(
  'ong',
  {
    id: smallint().primaryKey().default(1),
    nome_completo: text().notNull(),
    whatsapp: text().notNull(),
    instagram: text().notNull(),
    facebook: text(),
    pix_tipo: pixTipo().notNull(),
    pix_chave: text().notNull(),
    ...auditoria,
  },
  (t) => [
    check('ong_linha_unica', sql`${t.id} = 1`),
    check('ong_whatsapp_valido', whatsappValido(t.whatsapp)),
    check('ong_nome_completo_limite', maximo(t.nome_completo, LIMITES.ong.nome_completo)),
    check('ong_instagram_limite', maximo(t.instagram, LIMITES.ong.instagram)),
    check('ong_instagram_sem_arroba', sql`position('@' in ${t.instagram}) = 0`),
    check(
      'ong_facebook_url',
      sql`${t.facebook} IS NULL OR (${maximo(t.facebook, LIMITES.ong.facebook)} AND ${t.facebook} LIKE 'https://%')`,
    ),
    check('ong_pix_chave_limite', maximo(t.pix_chave, LIMITES.ong.pix_chave)),
    check('ong_pix_chave_preenchida', preenchido(t.pix_chave)),
  ],
)

// ---------------------------------------------------------------------------
// protetores: protetores parceiros (RN42)
// ---------------------------------------------------------------------------
export const protetores = pgTable(
  'protetores',
  {
    id: uuid().primaryKey().defaultRandom(),
    nome: text().notNull(),
    whatsapp: text().notNull(),
    ...criadoEm,
    ...auditoria,
  },
  (t) => [
    check('protetores_nome_limite', maximo(t.nome, LIMITES.protetores.nome)),
    check('protetores_nome_preenchido', preenchido(t.nome)),
    check('protetores_whatsapp_valido', whatsappValido(t.whatsapp)),
  ],
)

// ---------------------------------------------------------------------------
// animais (leitura pública)
// ---------------------------------------------------------------------------
export const animais = pgTable(
  'animais',
  {
    id: uuid().primaryKey().defaultRandom(),
    nome: text().notNull(),
    especie: especie().notNull(),
    sexo: sexo().notNull(),
    nascimento_aprox: date({ mode: 'string' }).notNull(),
    porte: porte().notNull(),
    raca: text(),
    raca_tipo: racaTipo(),
    cor_pelagem: text(),
    castrado: boolean().notNull(),
    vacinado: simNaoSemInformacao().notNull(),
    vacinas: text(),
    vermifugado: simNaoSemInformacao().notNull(),
    problema_saude: text(),
    docil: boolean(),
    convive_animais: boolean(),
    descricao: text().notNull().default(''),
    status: statusAnimal().notNull().default('disponivel'),
    data_entrada: date({ mode: 'string' })
      .notNull()
      .default(sql`CURRENT_DATE`),
    data_adocao: date({ mode: 'string' }),
    responsavel_tipo: responsavelTipo().notNull().default('ong'),
    protetor_id: uuid().references(() => protetores.id, { onDelete: 'restrict' }),
    ...criadoEm,
    ...auditoria,
  },
  (t) => [
    index('animais_vitrine_idx').on(t.status, t.data_entrada),
    check('animais_nome_limite', maximo(t.nome, LIMITES.animais.nome)),
    check('animais_nome_preenchido', preenchido(t.nome)),
    check('animais_raca_limite', maximo(t.raca, LIMITES.animais.raca)),
    check('animais_cor_pelagem_limite', maximo(t.cor_pelagem, LIMITES.animais.cor_pelagem)),
    check('animais_vacinas_limite', maximo(t.vacinas, LIMITES.animais.vacinas)),
    check(
      'animais_problema_saude_limite',
      maximo(t.problema_saude, LIMITES.animais.problema_saude),
    ),
    check('animais_descricao_limite', maximo(t.descricao, LIMITES.animais.descricao)),
    // RN42: protetor obrigatório se o responsável é protetor; nulo se é a ONG
    check(
      'animais_responsavel_protetor',
      sql`(${t.responsavel_tipo} = 'ong' AND ${t.protetor_id} IS NULL) OR (${t.responsavel_tipo} = 'protetor' AND ${t.protetor_id} IS NOT NULL)`,
    ),
    // RN08: adotado sempre tem data de adoção; disponível nunca tem
    check('animais_data_adocao', sql`(${t.status} = 'adotado') = (${t.data_adocao} IS NOT NULL)`),
  ],
)

// ---------------------------------------------------------------------------
// fotos (leitura pública), até 3 por animal (RN01)
// A unicidade de (animal_id, ordem) é DEFERRABLE e fica na migration 0001, porque o
// Drizzle não gera esse tipo de constraint: assim a API troca a ordem numa transação.
// ---------------------------------------------------------------------------
export const fotos = pgTable(
  'fotos',
  {
    id: uuid().primaryKey().defaultRandom(),
    animal_id: uuid()
      .notNull()
      .references(() => animais.id, { onDelete: 'cascade' }),
    ordem: integer().notNull(),
    path_miniatura: text().notNull(),
    path_completa: text().notNull(),
  },
  (t) => [
    check(
      'fotos_ordem_valida',
      sql`${t.ordem} BETWEEN 0 AND ${sql.raw(String(MAX_FOTOS_ANIMAL - 1))}`,
    ),
  ],
)

// ---------------------------------------------------------------------------
// animais_privado (só a equipe): lar temporário, observações e adotante
// ---------------------------------------------------------------------------
export const animaisPrivado = pgTable(
  'animais_privado',
  {
    animal_id: uuid()
      .primaryKey()
      .references(() => animais.id, { onDelete: 'cascade' }),
    lar_nome: text(),
    lar_tipo: larTipo(),
    observacoes: text().notNull().default(''),
    adotante_nome: text(),
    adotante_whatsapp: text(),
  },
  (t) => [
    check('animais_privado_lar_nome_limite', maximo(t.lar_nome, LIMITES.animais_privado.lar_nome)),
    check(
      'animais_privado_observacoes_limite',
      maximo(t.observacoes, LIMITES.animais_privado.observacoes),
    ),
    check(
      'animais_privado_adotante_nome_limite',
      maximo(t.adotante_nome, LIMITES.animais_privado.adotante_nome),
    ),
    check(
      'animais_privado_adotante_whatsapp_valido',
      sql`${t.adotante_whatsapp} IS NULL OR ${whatsappValido(t.adotante_whatsapp)}`,
    ),
  ],
)

// ---------------------------------------------------------------------------
// perdidos: anúncios de perdidos e encontrados (RN18–RN28, RN39–RN41)
// ---------------------------------------------------------------------------
export const perdidos = pgTable(
  'perdidos',
  {
    id: uuid().primaryKey().defaultRandom(),
    tipo: perdidoTipo().notNull(),
    especie: especie().notNull(),
    nome: text(),
    bairro: text().notNull(),
    data_ocorrido: date({ mode: 'string' }).notNull(),
    descricao: text().notNull(),
    contato_nome: text().notNull(),
    contato_whatsapp: text().notNull(),
    consentimento_em: timestamp({ withTimezone: true }).notNull(),
    origem: perdidoOrigem().notNull().default('site'),
    status: perdidoStatus().notNull().default('pendente'),
    publicado_em: timestamp({ withTimezone: true }),
    expira_em: timestamp({ withTimezone: true }),
    ip_hash: text(),
    ...criadoEm,
    ...auditoria,
  },
  (t) => [
    index('perdidos_status_expira_idx').on(t.status, t.expira_em),
    check('perdidos_nome_limite', maximo(t.nome, LIMITES.perdidos.nome)),
    check('perdidos_bairro_limite', maximo(t.bairro, LIMITES.perdidos.bairro)),
    check('perdidos_bairro_preenchido', preenchido(t.bairro)),
    check('perdidos_descricao_limite', maximo(t.descricao, LIMITES.perdidos.descricao)),
    check('perdidos_descricao_preenchida', preenchido(t.descricao)),
    check('perdidos_contato_nome_limite', maximo(t.contato_nome, LIMITES.perdidos.contato_nome)),
    check('perdidos_contato_nome_preenchido', preenchido(t.contato_nome)),
    check('perdidos_contato_whatsapp_valido', whatsappValido(t.contato_whatsapp)),
    // Publicado sempre tem data de publicação e de expiração; pendente, nenhuma (RN25)
    check(
      'perdidos_datas_publicacao',
      sql`(${t.status} = 'publicado') = (${t.publicado_em} IS NOT NULL AND ${t.expira_em} IS NOT NULL)`,
    ),
    // Anúncio da equipe não passa pelo limite por IP (RN39)
    check('perdidos_ip_hash_so_site', sql`${t.origem} = 'site' OR ${t.ip_hash} IS NULL`),
  ],
)

// ---------------------------------------------------------------------------
// perdidos_fotos: até 2 por anúncio (limite conferido pela API, RN21)
// ---------------------------------------------------------------------------
export const perdidosFotos = pgTable('perdidos_fotos', {
  id: uuid().primaryKey().defaultRandom(),
  perdido_id: uuid()
    .notNull()
    .references(() => perdidos.id, { onDelete: 'cascade' }),
  path: text().notNull(),
})

// ---------------------------------------------------------------------------
// conteudo_textos: textos únicos das páginas (RN33, RN34)
// ---------------------------------------------------------------------------
const chavesObrigatorias = CHAVES_TEXTO.filter((chave) => TEXTOS[chave].obrigatorio)
const limitePorChave = sql.raw(
  `CASE chave ${CHAVES_TEXTO.map((chave) => `WHEN '${chave}' THEN ${String(TEXTOS[chave].limite)}`).join(' ')} END`,
)

export const conteudoTextos = pgTable(
  'conteudo_textos',
  {
    chave: text().primaryKey(),
    valor: text().notNull(),
    ...auditoria,
  },
  (t) => [
    check('conteudo_textos_chave_valida', sql`${t.chave} IN ${literais(CHAVES_TEXTO)}`),
    check('conteudo_textos_valor_limite', sql`char_length(${t.valor}) <= ${limitePorChave}`),
    check(
      'conteudo_textos_obrigatorio',
      sql`${t.chave} NOT IN ${literais(chavesObrigatorias)} OR ${preenchido(t.valor)}`,
    ),
  ],
)

// ---------------------------------------------------------------------------
// conteudo_itens: listas das páginas (RN33–RN38). Mínimo e máximo de itens (RN36, RN38,
// RN46) são conferidos pela API. A unicidade de (lista, ordem) é DEFERRABLE (migration 0001).
// ---------------------------------------------------------------------------
const listasCom = (filtro: (nome: NomeLista) => boolean) => NOMES_LISTA.filter(filtro)
const listasSemTitulo = listasCom((l) => LISTAS[l].titulo === null)
const listasTituloObrigatorio = listasCom((l) => LISTAS[l].titulo?.obrigatorio === true)
const listasComTitulo = listasCom((l) => LISTAS[l].titulo !== null)
const listasComFoto = listasCom((l) => LISTAS[l].foto)

const limiteTituloPorLista = sql.raw(
  `CASE lista ${listasComTitulo.map((l) => `WHEN '${l}' THEN ${String(LISTAS[l].titulo?.limite ?? 0)}`).join(' ')} ELSE 0 END`,
)
const limiteTextoPorLista = sql.raw(
  `CASE lista ${NOMES_LISTA.map((l) => `WHEN '${l}' THEN ${String(LISTAS[l].texto.limite)}`).join(' ')} END`,
)

export const conteudoItens = pgTable(
  'conteudo_itens',
  {
    id: uuid().primaryKey().defaultRandom(),
    lista: conteudoLista().notNull(),
    titulo: text(),
    texto: text().notNull(),
    foto_path: text(),
    ordem: integer().notNull(),
    ...criadoEm,
    ...auditoria,
  },
  (t) => [
    check('conteudo_itens_ordem_valida', sql`${t.ordem} >= 0`),
    check(
      'conteudo_itens_sem_titulo',
      sql`${t.lista} NOT IN ${literais(listasSemTitulo)} OR ${t.titulo} IS NULL`,
    ),
    check(
      'conteudo_itens_titulo_obrigatorio',
      sql`${t.lista} NOT IN ${literais(listasTituloObrigatorio)} OR (${t.titulo} IS NOT NULL AND ${preenchido(t.titulo)})`,
    ),
    check(
      'conteudo_itens_titulo_limite',
      sql`${t.titulo} IS NULL OR char_length(${t.titulo}) <= ${limiteTituloPorLista}`,
    ),
    check('conteudo_itens_texto_preenchido', preenchido(t.texto)),
    check('conteudo_itens_texto_limite', sql`char_length(${t.texto}) <= ${limiteTextoPorLista}`),
    // Só a lista de fotos tem foto, e nela a foto é obrigatória (RN38)
    check(
      'conteudo_itens_foto',
      sql`(${t.lista} IN ${literais(listasComFoto)}) = (${t.foto_path} IS NOT NULL)`,
    ),
  ],
)
