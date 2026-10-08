// Login da equipe (Cloudflare Access + tabela equipe), testado pela rota GET /api/admin/eu.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { equipe } from '@sospatas/db'
import type { Usuaria } from '../dependencias'
import type { CorpoErro } from '../erros'
import { CABECALHO_JWT_ACCESS } from './access'
import { criarAppTeste, envTeste } from '../testes/apoio'

let teste: Awaited<ReturnType<typeof criarAppTeste>>

beforeAll(async () => {
  teste = await criarAppTeste()
  await teste.db
    .insert(equipe)
    .values([
      { email: 'gracia@exemplo.com', nome: 'Gracia' },
      { email: 'antiga@exemplo.com', nome: 'Antiga', ativo: false },
    ])
    .onConflictDoNothing()
})

afterAll(async () => {
  await teste.encerrar()
})

async function eu(token?: string, env = envTeste()) {
  const headers: Record<string, string> = token ? { [CABECALHO_JWT_ACCESS]: token } : {}
  return teste.app.request('/api/admin/eu', { headers }, env)
}

describe('login pelo Cloudflare Access', () => {
  it('JWT válido de alguém da equipe: entra e recebe nome e e-mail', async () => {
    const resposta = await eu(await teste.token('gracia@exemplo.com'))
    expect(resposta.status).toBe(200)
    expect(await resposta.json<Usuaria>()).toMatchObject({
      nome: 'Gracia',
      email: 'gracia@exemplo.com',
    })
  })

  it('e-mail com maiúsculas no JWT também entra (a equipe guarda em minúsculas)', async () => {
    const resposta = await eu(await teste.token('Gracia@Exemplo.com'))
    expect(resposta.status).toBe(200)
  })

  it('sem o cabeçalho do Access: 401', async () => {
    const resposta = await eu()
    expect(resposta.status).toBe(401)
    expect(await resposta.json<CorpoErro>()).toMatchObject({ erro: 'nao_autenticado' })
  })

  it('JWT vencido: 401', async () => {
    const vencido = await teste.token('gracia@exemplo.com', {
      expiraEm: Math.floor(Date.now() / 1000) - 3600,
    })
    expect((await eu(vencido)).status).toBe(401)
  })

  it('JWT de outra aplicação (aud diferente): 401', async () => {
    const outraAplicacao = await teste.token('gracia@exemplo.com', { aud: 'outra-aplicacao' })
    expect((await eu(outraAplicacao)).status).toBe(401)
  })

  it('JWT de outro time do Access (emissor diferente): 401', async () => {
    const outroTime = await teste.token('gracia@exemplo.com', {
      emissor: 'https://outro-time.cloudflareaccess.com',
    })
    expect((await eu(outroTime)).status).toBe(401)
  })

  it('JWT adulterado: 401', async () => {
    const token = await teste.token('gracia@exemplo.com')
    const [cabecalho, , assinatura] = token.split('.')
    const corpoFalso = Buffer.from(
      JSON.stringify({ email: 'invasor@exemplo.com', aud: 'aud-de-teste' }),
    ).toString('base64url')
    expect((await eu(`${String(cabecalho)}.${corpoFalso}.${String(assinatura)}`)).status).toBe(401)
  })

  it('e-mail fora da tabela equipe: 403', async () => {
    const resposta = await eu(await teste.token('estranho@exemplo.com'))
    expect(resposta.status).toBe(403)
    expect(await resposta.json<CorpoErro>()).toMatchObject({ erro: 'sem_permissao' })
  })

  it('usuária desativada: 403, mesmo com o Access deixando passar', async () => {
    expect((await eu(await teste.token('antiga@exemplo.com'))).status).toBe(403)
  })
})

describe('modo local do login', () => {
  it('com AMBIENTE=local, usa o e-mail do .dev.vars sem JWT', async () => {
    const env = envTeste({ AMBIENTE: 'local', ACESSO_LOCAL_EMAIL: 'gracia@exemplo.com' })
    const resposta = await eu(undefined, env)
    expect(resposta.status).toBe(200)
    expect(await resposta.json<Usuaria>()).toMatchObject({ nome: 'Gracia' })
  })

  it('o e-mail local também precisa estar na equipe', async () => {
    const env = envTeste({ AMBIENTE: 'local', ACESSO_LOCAL_EMAIL: 'estranho@exemplo.com' })
    expect((await eu(undefined, env)).status).toBe(403)
  })

  it.each(['producao', 'previa'])(
    'em %s, ter ACESSO_LOCAL_EMAIL configurado bloqueia (nunca libera sem login)',
    async (ambiente) => {
      const env = envTeste({ AMBIENTE: ambiente, ACESSO_LOCAL_EMAIL: 'gracia@exemplo.com' })
      const resposta = await eu(await teste.token('gracia@exemplo.com'), env)
      expect(resposta.status).toBe(500)
      expect(await resposta.json<CorpoErro>()).toMatchObject({ erro: 'configuracao_invalida' })
    },
  )
})
