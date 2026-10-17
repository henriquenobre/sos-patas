// E-mails que chegam à ONG: formulário "Fale com a ONG" (RN51) e aviso de pedido de adoção
// (RN15). Monta a mensagem em texto puro (MIME), que o Workers envia pelo Cloudflare Email
// Routing (email/cloudflare.ts). Sem dependência do Cloudflare aqui: os testes conferem a
// mensagem montada.
import { ROTULOS, type ContatoDados } from '@sospatas/compartilhado'

/** O que a API manda enviar; remetente e destino vêm do ambiente (EMAIL_REMETENTE, EMAIL_DESTINO). */
export type MensagemEmail = {
  assunto: string
  texto: string
  /** E-mail de quem escreveu: o "Responder" do Gmail da ONG vai para ele */
  responderPara?: string
}

/**
 * Aviso de pedido de adoção novo. Sem os dados de quem pediu: eles ficam só na área da ONG,
 * que apaga o pedido no prazo da RN15; no Gmail, ficariam para sempre.
 */
export function mensagemDoPedido(
  animalNome: string,
  pedidoId: string,
  enderecoSite: string,
): MensagemEmail {
  return {
    assunto: `[Site] Novo pedido de adoção: ${animalNome}`,
    texto: [
      `Chegou um pedido de adoção pelo site para ${animalNome}.`,
      '',
      'Para ver os dados e as respostas, entre na área da ONG:',
      `${enderecoSite}/admin/pedidos/${pedidoId}`,
      '',
      `Enquanto o pedido está em análise, ${animalNome} fica fora do site.`,
      '',
      '---',
      'Os dados de quem pediu não vêm neste e-mail: ficam só na área da ONG, que apaga o pedido',
      'no prazo combinado (LGPD).',
    ].join('\n'),
  }
}

/** Assunto e corpo do e-mail que chega à ONG. */
export function mensagemDoContato(dados: ContatoDados): MensagemEmail {
  const assunto = ROTULOS.assunto_contato[dados.assunto]
  return {
    assunto: `[Site] ${assunto}: ${dados.nome}`,
    texto: [
      'Mensagem enviada pelo formulário "Fale com a ONG" do site.',
      '',
      `Nome: ${dados.nome}`,
      `E-mail: ${dados.email}`,
      `WhatsApp ou telefone: ${dados.telefone ?? 'não informado'}`,
      `Assunto: ${assunto}`,
      '',
      'Mensagem:',
      dados.mensagem,
      '',
      '---',
      'Para responder, use "Responder": a resposta vai direto para o e-mail da pessoa.',
      'Esta mensagem não fica guardada no site.',
    ].join('\n'),
    responderPara: dados.email,
  }
}

/** Texto UTF-8 em base64, sem depender de Buffer (roda no Workers e no Node). */
function base64(texto: string): string {
  let binario = ''
  for (const byte of new TextEncoder().encode(texto)) binario += String.fromCharCode(byte)
  return btoa(binario)
}

/** Assunto com acentos no formato dos cabeçalhos de e-mail (RFC 2047). */
const cabecalhoUtf8 = (texto: string) => `=?UTF-8?B?${base64(texto)}?=`

/**
 * Mensagem MIME completa. Tudo o que veio do visitante vai codificado em base64 (assunto e
 * corpo) ou já foi validado como e-mail (Reply-To), então não dá para injetar cabeçalhos.
 */
export function montarMime(
  mensagem: MensagemEmail,
  enderecos: { de: string; para: string },
  agora = new Date(),
): string {
  const corpo = base64(mensagem.texto.replace(/\r?\n/g, '\r\n')).replace(/.{76}/g, '$&\r\n')
  const dominio = enderecos.de.split('@')[1] ?? 'sospatas.org.br'
  return [
    `From: ${cabecalhoUtf8('Site SOS Patas')} <${enderecos.de}>`,
    `To: <${enderecos.para}>`,
    ...(mensagem.responderPara ? [`Reply-To: <${mensagem.responderPara}>`] : []),
    `Subject: ${cabecalhoUtf8(mensagem.assunto)}`,
    `Date: ${agora.toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${dominio}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    corpo,
  ].join('\r\n')
}
