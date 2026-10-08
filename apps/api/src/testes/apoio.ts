// Apoio aos testes da API: env de teste, banco de teste e um "Access" falso com chaves
// geradas na hora (assinamos JWTs como o Cloudflare Access assinaria).
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose'
import { criarApp } from '../app'
import { ArmazenamentoMemoria } from '../armazenamento/memoria'
import { criarDb } from '../db'
import type { Dependencias } from '../dependencias'
import { verificarJwtAccess } from '../middleware/access'

export const URL_TESTE =
  process.env.TEST_DATABASE_URL ?? 'postgres://sospatas:sospatas@localhost:5432/sospatas_teste'

export const TIME_ACCESS = 'https://sospatas-teste.cloudflareaccess.com'
export const AUD_ACCESS = 'aud-de-teste'

export function envTeste(extra: Partial<Env> = {}): Env {
  return {
    AMBIENTE: 'teste',
    ACCESS_TEAM_DOMAIN: TIME_ACCESS,
    ACCESS_AUD: AUD_ACCESS,
    CORS_ORIGENS: '',
    ACESSO_LOCAL_EMAIL: '',
    FOTOS_URL_BASE: '',
    ...extra,
  } as Partial<Env> as Env
}

/** Par de chaves do "Access" de teste. */
export async function criarAccessFalso() {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'chave-teste', alg: 'RS256' }
  const chaves = createLocalJWKSet({ keys: [jwk] })

  /** Assina um JWT como o Access; `opcoes` permite gerar tokens inválidos de propósito. */
  async function token(
    email: string,
    opcoes: { aud?: string; emissor?: string; expiraEm?: string | number } = {},
  ): Promise<string> {
    return new SignJWT({ email })
      .setProtectedHeader({ alg: 'RS256', kid: 'chave-teste' })
      .setIssuer(opcoes.emissor ?? TIME_ACCESS)
      .setAudience(opcoes.aud ?? AUD_ACCESS)
      .setIssuedAt()
      .setExpirationTime(opcoes.expiraEm ?? '1h')
      .sign(privateKey)
  }

  return { chaves, token }
}

/** App ligado ao banco de teste, a armazenamentos em memória e ao Access falso. */
export async function criarAppTeste() {
  const access = await criarAccessFalso()
  const fotos = new ArmazenamentoMemoria()
  const quarentena = new ArmazenamentoMemoria()
  const conexao = criarDb(URL_TESTE)

  const dependencias: Dependencias = {
    // Nos testes, uma conexão só para todas as requisições
    conectarDb: () => ({ db: conexao.db, encerrar: () => Promise.resolve() }),
    fotos: () => fotos,
    quarentena: () => quarentena,
    verificarTokenAccess: (env, token) =>
      verificarJwtAccess(token, {
        chaves: access.chaves,
        emissor: env.ACCESS_TEAM_DOMAIN,
        aud: env.ACCESS_AUD,
      }),
  }

  return {
    app: criarApp(dependencias),
    db: conexao.db,
    encerrar: conexao.encerrar,
    fotos,
    quarentena,
    token: access.token,
  }
}
