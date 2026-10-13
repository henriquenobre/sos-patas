// Cliente HTTP da API. Em produção a API está na mesma origem (/api); antes do domínio
// próprio, VITE_API_URL aponta para o Worker da prévia (docs/ARQUITETURA.md, seção 3).
const BASE = import.meta.env.VITE_API_URL ?? ''

/** Erro no formato da API: { erro, mensagem, campos? } (docs/ARQUITETURA.md, seção 3). */
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    readonly codigo = 'erro',
    readonly campos: Record<string, string> = {},
  ) {
    super(mensagem)
  }
}

const MENSAGEM_PADRAO = 'Não conseguimos falar com o site agora. Tente de novo em alguns minutos.'

async function erroDaResposta(resposta: Response): Promise<ErroApi> {
  try {
    const corpo = (await resposta.json()) as {
      erro?: string
      mensagem?: string
      campos?: Record<string, string>
    }
    return new ErroApi(resposta.status, corpo.mensagem ?? MENSAGEM_PADRAO, corpo.erro, corpo.campos)
  } catch {
    return new ErroApi(resposta.status, MENSAGEM_PADRAO)
  }
}

export async function buscarJson<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${BASE}/api${caminho}`)
  if (!resposta.ok) throw await erroDaResposta(resposta)
  return (await resposta.json()) as T
}

/** POST com corpo JSON. Erros da API viram ErroApi com a mensagem e os campos. */
export async function enviarJson<T>(caminho: string, dados: unknown): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(`${BASE}/api${caminho}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  } catch {
    throw new ErroApi(0, 'Sem conexão com a internet. Confira e tente de novo.')
  }
  if (!resposta.ok) throw await erroDaResposta(resposta)
  return (await resposta.json()) as T
}

// ---------------------------------------------------------------------------
// Área da ONG (/api/admin, atrás do Cloudflare Access)
// ---------------------------------------------------------------------------
const MENSAGEM_SESSAO = 'Sua sessão terminou. Entre de novo na área da ONG.'

/** 401: o login do Access venceu (ou não existe). A tela pede para entrar de novo. */
export const ehSessaoExpirada = (erro: unknown): boolean =>
  erro instanceof ErroApi && erro.status === 401

/**
 * Chamada da área da ONG. Com a sessão vencida, o Access responde com um redirecionamento para
 * a página de login (em outro domínio), que o fetch não consegue seguir: `redirect: 'manual'`
 * transforma isso numa resposta "opaqueredirect", tratada como 401.
 * `corpo` FormData vai como multipart (fotos); qualquer outro valor, como JSON.
 */
export async function chamarAdmin<T = void>(
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE',
  caminho: string,
  corpo?: unknown,
): Promise<T> {
  const init: RequestInit = { method: metodo, redirect: 'manual' }
  if (corpo instanceof FormData) {
    init.body = corpo
  } else if (corpo !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(corpo)
  }
  let resposta: Response
  try {
    resposta = await fetch(`${BASE}/api/admin${caminho}`, init)
  } catch {
    throw new ErroApi(0, 'Sem conexão com a internet. Confira e tente de novo.')
  }
  if (resposta.type === 'opaqueredirect') {
    throw new ErroApi(401, MENSAGEM_SESSAO, 'nao_autenticado')
  }
  if (!resposta.ok) throw await erroDaResposta(resposta)
  if (resposta.status === 204) return undefined as T
  return (await resposta.json()) as T
}
