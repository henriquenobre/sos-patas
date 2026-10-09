// Formulário "Fale com a ONG" (RN51): validação, Turnstile, limite por IP e envio por e-mail.
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ContatoEntrada } from '@sospatas/compartilhado'
import { contatoEnvios } from '@sospatas/db'
import type { CorpoErro } from '../erros'
import { montarMime } from '../servicos/email'
import { apagarEnviosContatoAntigos } from '../servicos/contato'
import { TOKEN_TURNSTILE_VALIDO, criarAppTeste, envTeste } from '../testes/apoio'

let teste: Awaited<ReturnType<typeof criarAppTeste>>

function corpo(extra: Partial<ContatoEntrada> = {}): ContatoEntrada {
  return {
    nome: 'Fernanda Souza',
    email: ' Fernanda@Exemplo.com ',
    telefone: '',
    assunto: 'ajudar',
    mensagem: 'Quero ser mensalista. Como faço?',
    turnstile_token: TOKEN_TURNSTILE_VALIDO,
    ...extra,
  }
}

function enviar(dados: unknown, ip = '200.2.2.2') {
  return teste.app.request(
    '/api/publico/contato',
    {
      method: 'POST',
      body: JSON.stringify(dados),
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
    },
    envTeste(),
  )
}

beforeAll(async () => {
  teste = await criarAppTeste()
})

beforeEach(async () => {
  await teste.db.execute(sql`TRUNCATE contato_envios`)
  teste.emails.length = 0
  teste.controle.falharEmail = false
})

afterAll(async () => {
  await teste.encerrar()
})

describe('POST /api/publico/contato', () => {
  it('envia o e-mail para a ONG com o "Responder" para quem escreveu', async () => {
    const resposta = await enviar(corpo())
    expect(resposta.status).toBe(201)
    expect(teste.emails).toHaveLength(1)
    const [email] = teste.emails
    expect(email?.assunto).toBe('[Site] Quero ajudar a ONG: Fernanda Souza')
    expect(email?.responderPara).toBe('fernanda@exemplo.com')
    expect(email?.texto).toContain('Quero ser mensalista. Como faço?')
    expect(email?.texto).toContain('WhatsApp ou telefone: não informado')
  })

  it('não guarda a mensagem: só o hash do IP, para o limite', async () => {
    await enviar(corpo())
    const linhas = await teste.db.select().from(contatoEnvios)
    expect(linhas).toHaveLength(1)
    expect(linhas[0]?.ip_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(linhas)).not.toContain('mensalista')
  })

  it('confere os campos e mostra o erro de cada um', async () => {
    const resposta = await enviar(
      corpo({ email: 'fernanda', mensagem: ' ', assunto: 'x' as 'outro' }),
    )
    expect(resposta.status).toBe(400)
    const erro: CorpoErro = await resposta.json()
    expect(Object.keys(erro.campos ?? {}).sort()).toEqual(['assunto', 'email', 'mensagem'])
    expect(teste.emails).toHaveLength(0)
  })

  it('sem Turnstile válido, não envia', async () => {
    const resposta = await enviar(corpo({ turnstile_token: 'falso' }))
    expect(resposta.status).toBe(400)
    expect((await resposta.json<CorpoErro>()).erro).toBe('turnstile')
    expect(teste.emails).toHaveLength(0)
  })

  it('aceita 3 mensagens por dia do mesmo IP; a 4ª é recusada', async () => {
    for (let i = 0; i < 3; i += 1) expect((await enviar(corpo())).status).toBe(201)
    const quarta = await enviar(corpo())
    expect(quarta.status).toBe(429)
    expect((await enviar(corpo(), '200.9.9.9')).status).toBe(201)
  })

  it('se o e-mail falhar, avisa (503) e não conta no limite', async () => {
    teste.controle.falharEmail = true
    const resposta = await enviar(corpo())
    expect(resposta.status).toBe(503)
    expect((await resposta.json<CorpoErro>()).erro).toBe('email_indisponivel')
    expect(await teste.db.select().from(contatoEnvios)).toHaveLength(0)
  })

  it('a tarefa diária apaga os registros com mais de 1 dia', async () => {
    await teste.db
      .insert(contatoEnvios)
      .values([
        { ip_hash: 'antigo', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { ip_hash: 'recente' },
      ])
    expect(await apagarEnviosContatoAntigos(teste.db)).toBe(1)
    expect(await teste.db.select().from(contatoEnvios)).toHaveLength(1)
  })
})

describe('montarMime', () => {
  const mime = montarMime(
    {
      assunto: '[Site] Adoção: João\r\nBcc: ataque@exemplo.com',
      texto: 'Olá!\nTudo bem?',
      responderPara: 'joao@exemplo.com',
    },
    { de: 'site@sospatas.org.br', para: 'sitesospatas@gmail.com' },
  )
  const [cabecalhos = '', corpoMime = ''] = mime.split('\r\n\r\n')

  it('tem remetente, destino e "Responder para"', () => {
    expect(cabecalhos).toContain('<site@sospatas.org.br>')
    expect(cabecalhos).toContain('To: <sitesospatas@gmail.com>')
    expect(cabecalhos).toContain('Reply-To: <joao@exemplo.com>')
  })

  it('codifica assunto e corpo: acentos certos e sem cabeçalho injetado', () => {
    expect(cabecalhos).not.toMatch(/^Bcc:/m)
    const assunto = /Subject: =\?UTF-8\?B\?(.+)\?=/.exec(cabecalhos)?.[1] ?? ''
    expect(new TextDecoder().decode(Uint8Array.from(atob(assunto), (c) => c.charCodeAt(0)))).toBe(
      '[Site] Adoção: João\r\nBcc: ataque@exemplo.com',
    )
    const texto = new TextDecoder().decode(
      Uint8Array.from(atob(corpoMime.replace(/\r\n/g, '')), (c) => c.charCodeAt(0)),
    )
    expect(texto).toBe('Olá!\r\nTudo bem?')
  })
})
