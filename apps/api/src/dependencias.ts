// O que a API precisa do ambiente onde roda. No Workers vem dos bindings (Hyperdrive, R2) e
// das chaves públicas do Access; nos testes e numa VPS, de outras implementações. Assim as
// rotas e os serviços não dependem do Cloudflare (docs/ARQUITETURA.md, seção 12).
import type { Armazenamento } from './armazenamento/tipos'
import type { Db } from './db'

export type ConexaoDb = { db: Db; encerrar: () => Promise<void> }

export type Usuaria = { id: string; nome: string; email: string }

export type Dependencias = {
  /** Uma conexão por requisição (o Workers não reaproveita conexões entre requisições). */
  conectarDb: (env: Env) => ConexaoDb
  fotos: (env: Env) => Armazenamento
  quarentena: (env: Env) => Armazenamento
  /** Valida o JWT do Cloudflare Access e devolve o e-mail; lança erro se inválido. */
  verificarTokenAccess: (env: Env, token: string) => Promise<{ email: string }>
}

export type ConfigApp = {
  Bindings: Env
  Variables: {
    db: Db
    fotos: Armazenamento
    quarentena: Armazenamento
    /** Só nas rotas /api/admin, depois do login */
    usuaria: Usuaria
  }
}
