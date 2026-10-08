import { defineConfig } from 'drizzle-kit'
import { urlDoBanco } from './scripts/url'

// Gera e aplica as migrations (docs/ARQUITETURA.md, seção 5). Sem DATABASE_URL, usa o Postgres
// local do docker-compose; no CI, DATABASE_URL aponta para o Neon.
export default defineConfig({
  dialect: 'postgresql',
  schema: './schema.ts',
  out: './migrations',
  dbCredentials: { url: urlDoBanco() },
  strict: true,
  verbose: true,
})
