// Validação da entrada com os schemas de @sospatas/compartilhado (os mesmos do formulário).
import type { Context } from 'hono'
import type { z } from 'zod'
import { erros } from './erros'

/** Valida os dados; se falhar, responde 400 com a mensagem de cada campo. */
export function validar<S extends z.ZodType>(schema: S, dados: unknown): z.output<S> {
  const resultado = schema.safeParse(dados)
  if (resultado.success) return resultado.data

  const campos: Record<string, string> = {}
  for (const problema of resultado.error.issues) {
    const campo = problema.path.map(String).join('.') || '_'
    campos[campo] ??= problema.message
  }
  throw erros.validacao(campos)
}

/** Lê o corpo JSON da requisição e valida. */
export async function lerJson<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  let dados: unknown
  try {
    dados = await c.req.json()
  } catch {
    throw erros.requisicaoInvalida('Não foi possível ler os dados enviados.')
  }
  return validar(schema, dados)
}
