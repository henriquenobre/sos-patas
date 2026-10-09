// POST /api/publico/contato: formulário "Fale com a ONG" (RN51; docs/ARQUITETURA.md, seção 3.1).
// Valida, confere o Turnstile e o limite por IP e envia por e-mail; nada da mensagem fica no banco.
import { Hono } from 'hono'
import { contatoEntrada } from '@sospatas/compartilhado'
import type { ConfigApp } from '../../dependencias'
import { ErroApi, erros } from '../../erros'
import { conferirLimiteContato, registrarEnvioContato } from '../../servicos/contato'
import { mensagemDoContato } from '../../servicos/email'
import { hashDoIp, ipDaRequisicao } from '../../servicos/seguranca'
import { validar } from '../../validacao'

export const rotasContato = new Hono<ConfigApp>()

rotasContato.post('/contato', async (c) => {
  let corpo: unknown
  try {
    corpo = await c.req.json()
  } catch {
    throw erros.requisicaoInvalida('Não foi possível ler os dados enviados.')
  }
  const dados = validar(contatoEntrada, corpo)

  const ip = ipDaRequisicao(c.req)
  if (!(await c.var.verificarTurnstile(dados.turnstile_token, ip))) {
    throw new ErroApi(
      400,
      'turnstile',
      'Não conseguimos confirmar que você não é um robô. Tente de novo.',
    )
  }

  const ipHash = await hashDoIp(ip, c.env.IP_HASH_SECRET)
  await conferirLimiteContato(c.var.db, ipHash)

  try {
    await c.var.enviarEmail(mensagemDoContato(dados))
  } catch (erro) {
    console.error('Falha ao enviar o e-mail do contato', erro)
    throw new ErroApi(
      503,
      'email_indisponivel',
      'Não conseguimos enviar sua mensagem agora. Escreva direto para o e-mail da ONG, que aparece abaixo.',
    )
  }

  await registrarEnvioContato(c.var.db, ipHash)
  return c.json({ enviado: true }, 201)
})
