// Apoio aos scripts de fotos: gera as versões WebP (sem metadados) e envia ao R2 pelo Wrangler.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PASTA_API = join(RAIZ, 'apps', 'api')
const WRANGLER = join(PASTA_API, 'node_modules', 'wrangler', 'bin', 'wrangler.js')

/** Redimensiona e converte para WebP. O sharp não copia EXIF/GPS para a saída (RP03, RN20). */
export async function gerarWebp(origem: string, lado: number, destino: string): Promise<void> {
  await sharp(origem)
    .rotate()
    .resize(lado, lado, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(destino)
}

/**
 * Envia um arquivo ao R2. Roda o Wrangler a partir de apps/api para usar o mesmo R2 simulado
 * do `wrangler dev` (local) ou, com `remoto`, o R2 de verdade (pede login no Wrangler).
 */
export function enviarAoR2(arquivo: string, bucket: string, chave: string, remoto = false): void {
  execFileSync(
    process.execPath,
    [
      WRANGLER,
      'r2',
      'object',
      'put',
      `${bucket}/${chave}`,
      `--file=${arquivo}`,
      '--content-type=image/webp',
      remoto ? '--remote' : '--local',
    ],
    { cwd: PASTA_API, stdio: ['ignore', 'ignore', 'inherit'] },
  )
}

/** Executa com uma pasta temporária, apagada no fim. */
export async function comPastaTemporaria<T>(trabalho: (pasta: string) => Promise<T>): Promise<T> {
  const pasta = mkdtempSync(join(tmpdir(), 'sospatas-fotos-'))
  try {
    return await trabalho(pasta)
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
}
