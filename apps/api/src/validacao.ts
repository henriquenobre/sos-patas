// Validação da entrada com os schemas de @sospatas/compartilhado (os mesmos do formulário).
import type { Context } from 'hono'
import type { z } from 'zod'
import { ErroApi, erros } from './erros'

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

/** Lê o corpo JSON da requisição (Content-Type application/json) e valida. */
export async function lerJson<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  // Só JSON declarado como JSON: um formulário de outro site consegue mandar text/plain com
  // conteúdo de JSON sem o navegador pedir permissão antes (CSRF), mas não application/json
  if (!(c.req.header('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
    throw new ErroApi(415, 'tipo_invalido', 'Envie os dados no formato JSON.')
  }
  let dados: unknown
  try {
    dados = await c.req.json()
  } catch {
    throw erros.requisicaoInvalida('Não foi possível ler os dados enviados.')
  }
  return validar(schema, dados)
}

/** Id no formato uuid (ids de rota: um id malformado é "não encontrado", não erro do banco). */
export const ehUuid = (valor: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
