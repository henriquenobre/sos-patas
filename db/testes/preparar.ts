// Antes dos testes: recria o banco de teste do zero com as migrations.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { URL_TESTE } from '../scripts/url'

export const urlTeste = (): string => process.env.TEST_DATABASE_URL ?? URL_TESTE

export default async function preparar(): Promise<void> {
  const sql = postgres(urlTeste(), { max: 1, onnotice: () => undefined })
  try {
    await sql.unsafe(
      'DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;',
    )
    await migrate(drizzle({ client: sql }), {
      migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations'),
    })
  } finally {
    await sql.end()
  }
}
