// Envio de e-mail pelo Cloudflare Email Routing (binding EMAIL, wrangler.toml). Só o Workers
// importa este arquivo: o módulo cloudflare:email não existe no Node nem nos testes.
// O Cloudflare só entrega para endereços verificados no Email Routing, e o remetente precisa
// ser do domínio (sospatas.org.br): por isso funciona só depois da etapa 14 (RN51).
import { EmailMessage } from 'cloudflare:email'
import { ErroApi } from '../erros'
import { montarMime, type MensagemEmail } from '../servicos/email'

export async function enviarEmailCloudflare(env: Env, mensagem: MensagemEmail): Promise<void> {
  // Opcional: a prévia não tem o binding (wrangler.toml)
  const binding = env.EMAIL
  if (!binding) {
    throw new ErroApi(503, 'email_indisponivel', 'O envio de mensagens ainda não está ligado.')
  }
  const enderecos = { de: env.EMAIL_REMETENTE, para: env.EMAIL_DESTINO }
  await binding.send(
    new EmailMessage(enderecos.de, enderecos.para, montarMime(mensagem, enderecos)),
  )
}
