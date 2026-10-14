// Formulário multipart dos anúncios de perdidos (T13, T21): o campo "dados" leva o JSON do
// formulário e cada campo "fotos" um arquivo WebP já redesenhado no navegador (RN20).
import type { Context } from 'hono'
import type { ConfigApp } from '../dependencias'
import { erros } from '../erros'

export async function lerDadosEFotos(
  c: Context<ConfigApp>,
): Promise<{ json: unknown; arquivos: Uint8Array[] }> {
  let corpo: Record<string, unknown>
  try {
    corpo = await c.req.parseBody({ all: true })
  } catch {
    throw erros.requisicaoInvalida('Não foi possível ler os dados enviados.')
  }

  let json: unknown
  try {
    json = typeof corpo.dados === 'string' ? JSON.parse(corpo.dados) : undefined
  } catch {
    json = undefined
  }
  if (json === undefined) throw erros.requisicaoInvalida('Não foi possível ler os dados enviados.')

  const campoFotos = corpo.fotos === undefined ? [] : [corpo.fotos].flat()
  if (!campoFotos.every((foto) => foto instanceof File)) {
    throw erros.requisicaoInvalida('Não foi possível ler as fotos enviadas.')
  }
  const arquivos = await Promise.all(
    campoFotos.map(async (foto) => new Uint8Array(await foto.arrayBuffer())),
  )
  return { json, arquivos }
}
