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
