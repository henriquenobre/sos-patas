import postgres from 'postgres'

/** Postgres do docker-compose (só desenvolvimento; usuário e senha não são segredo). */
export const URL_LOCAL = 'postgres://sospatas:sospatas@localhost:5432/sospatas'
export const URL_TESTE = 'postgres://sospatas:sospatas@localhost:5432/sospatas_teste'

export function urlDoBanco(): string {
  return process.env.DATABASE_URL ?? URL_LOCAL
}

export function ehBancoLocal(url: string): boolean {
  const { hostname } = new URL(url)
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

/**
 * O banco da prévia (projeto `sospatas-previa` do Neon) é marcado uma vez com
 * `COMMENT ON DATABASE neondb IS 'sospatas:previa'` (README, "Publicar a prévia"). O Neon não
 * deixa o dono do banco criar parâmetros próprios, mas deixa comentar o banco. A produção nunca
 * recebe a marca: sem ela, os dados de exemplo são recusados.
 */
export async function ehBancoDePrevia(url: string): Promise<boolean> {
  const sql = postgres(url, { max: 1, onnotice: () => undefined })
  try {
    const [linha] = await sql<{ marca: string | null }[]>`
      SELECT shobj_description(oid, 'pg_database') AS marca
      FROM pg_database WHERE datname = current_database()`
    return linha?.marca === 'sospatas:previa'
  } finally {
    await sql.end()
  }
}

/**
 * Onde os dados de exemplo podem ir: banco local, ou a prévia com `--previa` e a marca no
 * banco. Encerra o processo com a explicação em qualquer outro caso.
 */
export async function destinoDosExemplos(url: string): Promise<'local' | 'previa'> {
  if (ehBancoLocal(url)) return 'local'
  if (!process.argv.includes('--previa')) {
    console.error(
      'Os dados de exemplo só rodam no banco local. Na prévia, use --previa; em produção, nunca.',
    )
    process.exit(1)
  }
  if (!(await ehBancoDePrevia(url))) {
    console.error(
      `O banco ${new URL(url).host} não está marcado como prévia (COMMENT ON DATABASE). Nada foi alterado.`,
    )
    process.exit(1)
  }
  return 'previa'
}
