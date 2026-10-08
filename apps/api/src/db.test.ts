import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { criarDb } from './db'

// Postgres do docker-compose (no CI, o serviço postgres do workflow)
const URL_TESTE =
  process.env.TEST_DATABASE_URL ?? 'postgres://sospatas:sospatas@localhost:5432/sospatas_teste'

describe('criarDb', () => {
  it('conecta no Postgres e executa uma consulta', async () => {
    const { db, encerrar } = criarDb(URL_TESTE)
    try {
      const linhas = await db.execute<{ versao: string }>(
        sql`SELECT current_setting('server_version') AS versao`,
      )
      expect(linhas[0]?.versao).toMatch(/^18\./)
    } finally {
      await encerrar()
    }
  })
})
