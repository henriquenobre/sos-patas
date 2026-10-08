// Cliente HTTP da API. Em produção a API está na mesma origem (/api); antes do domínio
// próprio, VITE_API_URL aponta para o Worker da prévia (ARQUITETURA.md, seção 3).
const BASE = import.meta.env.VITE_API_URL ?? ''

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem)
  }
}

export async function buscarJson<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${BASE}/api${caminho}`)
  if (!resposta.ok) {
    throw new ErroApi(resposta.status, `Erro ${resposta.status} ao buscar ${caminho}`)
  }
  return (await resposta.json()) as T
}
