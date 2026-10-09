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
