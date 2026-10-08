// Formato único de erro da API (docs/ARQUITETURA.md, seção 3):
// { "erro": "codigo_curto", "mensagem": "texto para a tela", "campos"?: { campo: mensagem } }
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type CorpoErro = {
  erro: string
  mensagem: string
  /** Só em erro de validação: mensagem de cada campo, para mostrar embaixo dele */
  campos?: Record<string, string>
}

export class ErroApi extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly codigo: string,
    mensagem: string,
    readonly campos?: Record<string, string>,
  ) {
    super(mensagem)
    this.name = 'ErroApi'
  }
}

/** Erros comuns, com as mensagens que aparecem para quem usa o site. */
export const erros = {
  validacao: (campos: Record<string, string>) =>
    new ErroApi(400, 'validacao', 'Confira os campos destacados.', campos),
  requisicaoInvalida: (mensagem: string) => new ErroApi(400, 'requisicao_invalida', mensagem),
  naoAutenticado: () =>
    new ErroApi(401, 'nao_autenticado', 'Sua sessão terminou. Entre de novo na área da ONG.'),
  semPermissao: () =>
    new ErroApi(403, 'sem_permissao', 'Este e-mail não tem acesso à área da ONG.'),
  naoEncontrado: (mensagem = 'Não encontramos o que você procurou.') =>
    new ErroApi(404, 'nao_encontrado', mensagem),
  conflito: (mensagem: string) => new ErroApi(409, 'conflito', mensagem),
  limite: (mensagem = 'Muitos envios agora. Tente mais tarde.') =>
    new ErroApi(429, 'limite', mensagem),
}

const MENSAGEM_ERRO_INTERNO = 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.'

/** app.onError: transforma qualquer erro na resposta padrão; detalhes internos só no log. */
export function tratarErro(erro: Error, c: Context): Response {
  if (erro instanceof ErroApi) {
    const corpo: CorpoErro = { erro: erro.codigo, mensagem: erro.message }
    if (erro.campos) corpo.campos = erro.campos
    return c.json(corpo, erro.status)
  }
  if (erro instanceof HTTPException) {
    return c.json<CorpoErro>(
      { erro: 'requisicao_invalida', mensagem: erro.message || 'Requisição inválida.' },
      erro.status,
    )
  }
  console.error('Erro não tratado na API:', erro)
  return c.json<CorpoErro>({ erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO }, 500)
}

/** app.notFound */
export function rotaNaoEncontrada(c: Context): Response {
  return c.json<CorpoErro>({ erro: 'nao_encontrado', mensagem: 'Endereço não encontrado.' }, 404)
}
