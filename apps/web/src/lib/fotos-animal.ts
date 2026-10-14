// Fotos do animal no formulário (T10, T11) e o envio delas ao salvar (RN01–RN06): primeiro
// remove as que saíram (libera os espaços), depois envia as novas e, por fim, acerta a ordem.
import type { FotoAdmin } from '@sospatas/compartilhado'
import { chamarAdmin } from '../api/cliente'
import { formularioFoto, type FotoPreparada } from './fotos'

export type FotoNoFormulario = { chave: string; previa: string } & (
  { tipo: 'salva'; id: string } | { tipo: 'nova'; arquivos: FotoPreparada }
)

export const fotosSalvas = (fotos: FotoAdmin[]): FotoNoFormulario[] =>
  fotos.map((foto) => ({ chave: foto.id, previa: foto.miniatura, tipo: 'salva', id: foto.id }))

/** Algo mudou nas fotos desde que a tela abriu? */
export function fotosMudaram(originais: FotoAdmin[], fotos: FotoNoFormulario[]): boolean {
  return (
    fotos.length !== originais.length ||
    fotos.some((foto, indice) => foto.tipo !== 'salva' || foto.id !== originais[indice]?.id)
  )
}

/**
 * Leva para a API o que mudou. A API guarda cada foto nova na próxima posição livre: depois das
 * remoções e dos envios, a ordem no site é "as que ficaram, na ordem antiga" + "as novas, na
 * ordem de envio"; se a tela pediu outra, manda a ordem final.
 */
export async function sincronizarFotos(
  animalId: string,
  originais: FotoAdmin[],
  fotos: FotoNoFormulario[],
): Promise<void> {
  const base = `/animais/${animalId}/fotos`
  const mantidas = new Set(fotos.flatMap((foto) => (foto.tipo === 'salva' ? [foto.id] : [])))

  for (const foto of originais) {
    if (!mantidas.has(foto.id)) await chamarAdmin('DELETE', `${base}/${foto.id}`)
  }

  const idDaChave = new Map<string, string>()
  for (const foto of fotos) {
    if (foto.tipo === 'salva') {
      idDaChave.set(foto.chave, foto.id)
    } else {
      const enviada = await chamarAdmin<FotoAdmin>('POST', base, formularioFoto(foto.arquivos))
      idDaChave.set(foto.chave, enviada.id)
    }
  }

  const ordemNaApi = [
    ...originais.filter((foto) => mantidas.has(foto.id)).map((foto) => foto.id),
    ...fotos.filter((foto) => foto.tipo === 'nova').map((foto) => idDaChave.get(foto.chave)),
  ]
  const ordemPedida = fotos.map((foto) => idDaChave.get(foto.chave))
  if (ordemPedida.length > 1 && ordemPedida.some((id, indice) => id !== ordemNaApi[indice])) {
    await chamarAdmin('PUT', `${base}/ordem`, { fotos: ordemPedida })
  }
}
