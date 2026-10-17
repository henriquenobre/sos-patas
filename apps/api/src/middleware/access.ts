// Login da equipe pelo Cloudflare Access (docs/ARQUITETURA.md, seção 4).
//
// 1. O Access, na borda do Cloudflare, só deixa passar e-mails da política e envia o JWT no
//    cabeçalho Cf-Access-Jwt-Assertion.
// 2. Aqui conferimos a assinatura do JWT (chaves públicas do time), o emissor, o `aud` e a
//    validade, e pegamos o e-mail.
// 3. O e-mail precisa estar ativo na tabela equipe (segunda barreira).
//
// Modo sem login: com ACESSO_LOCAL_EMAIL configurado, a requisição é tratada como vinda desse
// e-mail, sem Access. Só vale no computador (AMBIENTE=local, pelo .dev.vars) e na prévia
// (AMBIENTE=previa, pelo wrangler.toml), que têm só dados de exemplo. Em qualquer outro
// ambiente, ter ACESSO_LOCAL_EMAIL configurado é erro de configuração e a API recusa (a
// produção nunca libera sem login).
import { createMiddleware } from 'hono/factory'
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import type { ConfigApp, Dependencias } from '../dependencias'
import { ErroApi, erros } from '../erros'
import { buscarUsuariaAtiva } from '../servicos/equipe'

export const CABECALHO_JWT_ACCESS = 'Cf-Access-Jwt-Assertion'

type OpcoesJwt = { chaves: JWTVerifyGetKey; emissor: string; aud: string }

/** Confere o JWT do Access e devolve o e-mail. Lança erro se algo não bater. */
export async function verificarJwtAccess(
  token: string,
  { chaves, emissor, aud }: OpcoesJwt,
): Promise<{ email: string }> {
  const { payload } = await jwtVerify(token, chaves, {
    issuer: emissor,
    audience: aud,
    algorithms: ['RS256'],
    clockTolerance: 30,
  })
  if (typeof payload.email !== 'string' || payload.email === '') {
    throw new Error('JWT do Access sem e-mail')
  }
  return { email: payload.email }
}

/** Chaves públicas do time, buscadas uma vez por instância do Worker (o jose guarda em cache). */
const chavesPorTime = new Map<string, JWTVerifyGetKey>()

export function chavesDoTime(dominioTime: string): JWTVerifyGetKey {
  let chaves = chavesPorTime.get(dominioTime)
  if (!chaves) {
    chaves = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', dominioTime))
    chavesPorTime.set(dominioTime, chaves)
  }
  return chaves
}

/** Ambientes em que a área da ONG pode abrir sem login (só dados de exemplo). */
const AMBIENTES_SEM_LOGIN: readonly string[] = ['local', 'previa']

/** E-mail fixo do modo sem login (só no .dev.vars e na prévia), ou undefined. */
export function emailSemLogin(env: Env): string | undefined {
  const valor: unknown = Reflect.get(env, 'ACESSO_LOCAL_EMAIL')
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : undefined
}

async function emailDaRequisicao(
  env: Env,
  token: string | undefined,
  dependencias: Dependencias,
): Promise<string> {
  const emailFixo = emailSemLogin(env)
  if (emailFixo) {
    if (!AMBIENTES_SEM_LOGIN.includes(env.AMBIENTE)) {
      console.error(`ACESSO_LOCAL_EMAIL configurado em ${env.AMBIENTE}: requisição recusada`)
      throw new ErroApi(500, 'configuracao_invalida', 'Erro de configuração do site.')
    }
    return emailFixo
  }

  if (!token) throw erros.naoAutenticado()
  try {
    const { email } = await dependencias.verificarTokenAccess(env, token)
    return email
  } catch {
    throw erros.naoAutenticado()
  }
}

/** Exige login da equipe. Precisa vir depois do middleware de conexões (usa o banco). */
export const exigirEquipe = (dependencias: Dependencias) =>
  createMiddleware<ConfigApp>(async (c, next) => {
    const email = await emailDaRequisicao(c.env, c.req.header(CABECALHO_JWT_ACCESS), dependencias)
    const usuaria = await buscarUsuariaAtiva(c.var.db, email)
    if (!usuaria) throw erros.semPermissao()
    c.set('usuaria', usuaria)
    await next()
  })
