// Conexão com o banco (docs/ARQUITETURA.md, seção 5). No Workers, a string de conexão vem do
// binding HYPERDRIVE (no computador, aponta para o Postgres do Docker). Em Node, de DATABASE_URL.
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@sospatas/db'

export function criarDb(urlConexao: string) {
  const cliente = postgres(urlConexao, {
    // O Hyperdrive já mantém o pool; poucas conexões por requisição bastam
    max: 5,
    // Evita uma consulta extra a cada conexão (os tipos usados são os padrão)
    fetch_types: false,
  })
  return { db: drizzle({ client: cliente, schema }), encerrar: () => cliente.end() }
}

export type Db = ReturnType<typeof criarDb>['db']

/** Conexão a partir do env do Worker. Criar uma por requisição (o Workers não reaproveita). */
export const dbDoEnv = (env: Env) => criarDb(env.HYPERDRIVE.connectionString)
