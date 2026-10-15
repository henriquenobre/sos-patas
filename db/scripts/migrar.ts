// Aplica as migrations pendentes (docs/ARQUITETURA.md, seção 5): no computador, o Postgres do
// Docker; no deploy, o Neon (DATABASE_URL). Usa o mesmo aplicador do drizzle-kit, mas mostra a
// mensagem do banco quando algo falha (o drizzle-kit migrate sai com erro sem dizer qual).
//
//   pnpm db:migrate
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { urlDoBanco } from './url'

const url = urlDoBanco()
const sql = postgres(url, { max: 1, onnotice: () => undefined })

try {
  await migrate(drizzle({ client: sql }), {
    migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations'),
  })
  console.log(`Migrations em dia em ${new URL(url).host}`)
} catch (erro) {
  const causa = erro instanceof Error && erro.cause instanceof Error ? erro.cause : erro
  console.error(`Falha ao aplicar as migrations em ${new URL(url).host}:`)
  console.error(causa)
  process.exitCode = 1
} finally {
  await sql.end()
}
