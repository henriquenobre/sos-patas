// Envia as fotos da história (lista inicio_fotos do seed) para o bucket de fotos do R2, no
// caminho que o seed_conteudo.sql já gravou no banco (db/seed/fotos_historia.json).
//
// Cada foto vira duas versões WebP sem metadados (RN38, RN02, RP03):
//   site/historia/{id}.webp        completa, até 1200 px
//   site/historia/{id}-thumb.webp  miniatura, até 400 px
//
//   pnpm db:fotos-historia            → R2 simulado do `wrangler dev` (computador)
//   pnpm db:fotos-historia --remoto   → R2 de verdade (etapa 14; pede login no Wrangler)
//   --bucket=nome                     → outro bucket (ex.: sospatas-fotos-previa)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { LADO_COMPLETA_PX, LADO_MINIATURA_PX } from '@sospatas/compartilhado'

type FotoHistoria = { id: string; origem: string; path: string }

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PASTA_API = join(RAIZ, 'apps', 'api')

const remoto = process.argv.includes('--remoto')
const bucket =
  process.argv.find((arg) => arg.startsWith('--bucket='))?.slice('--bucket='.length) ??
  'sospatas-fotos'

const fotos = JSON.parse(
  readFileSync(join(RAIZ, 'db', 'seed', 'fotos_historia.json'), 'utf8'),
) as FotoHistoria[]

async function gerarWebp(origem: string, lado: number, destino: string): Promise<void> {
  // sharp não copia metadados (EXIF, GPS) para a saída, a não ser que se peça
  await sharp(origem)
    .rotate()
    .resize(lado, lado, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(destino)
}

const WRANGLER = join(PASTA_API, 'node_modules', 'wrangler', 'bin', 'wrangler.js')

function enviar(arquivo: string, chave: string): void {
  // Roda o Wrangler a partir de apps/api para usar o mesmo R2 simulado do `wrangler dev`
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

const temporaria = mkdtempSync(join(tmpdir(), 'sospatas-historia-'))
try {
  for (const foto of fotos) {
    const completa = join(temporaria, `${foto.id}.webp`)
    const miniatura = join(temporaria, `${foto.id}-thumb.webp`)
    await gerarWebp(join(RAIZ, foto.origem), LADO_COMPLETA_PX, completa)
    await gerarWebp(join(RAIZ, foto.origem), LADO_MINIATURA_PX, miniatura)
    enviar(completa, foto.path)
    enviar(miniatura, foto.path.replace(/\.webp$/, '-thumb.webp'))
    console.log(`✓ ${foto.origem} → ${foto.path}`)
  }
  console.log(
    `${String(fotos.length)} fotos enviadas para ${bucket} (${remoto ? 'R2 remoto' : 'R2 local'})`,
  )
} finally {
  rmSync(temporaria, { recursive: true, force: true })
}
