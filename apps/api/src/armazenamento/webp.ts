// Conferência das fotos recebidas (RN21): não confiar na extensão nem no Content-Type
// enviados pelo navegador; olhar os bytes do arquivo.
import { TAMANHO_MAX_FOTO_BYTES } from '@sospatas/compartilhado'
import { ErroApi } from '../erros'

const TIPO_WEBP = 'image/webp'

const ascii = (bytes: Uint8Array, inicio: number, fim: number): string =>
  String.fromCharCode(...bytes.subarray(inicio, fim))

/** Arquivo WebP começa com "RIFF", 4 bytes de tamanho e "WEBP". */
export function ehWebp(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP'
}

/** Recusa foto maior que 500 KB ou que não seja WebP de verdade. */
export function conferirFotoWebp(bytes: Uint8Array): void {
  if (bytes.byteLength > TAMANHO_MAX_FOTO_BYTES) {
    throw new ErroApi(400, 'foto_grande', 'Cada foto pode ter até 500 KB.')
  }
  if (!ehWebp(bytes)) {
    throw new ErroApi(400, 'foto_invalida', 'Não foi possível usar esta foto. Escolha outra.')
  }
}

export { TIPO_WEBP }
