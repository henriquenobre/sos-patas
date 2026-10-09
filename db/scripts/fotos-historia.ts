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
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LADO_COMPLETA_PX, LADO_MINIATURA_PX } from '@sospatas/compartilhado'
import { RAIZ, comPastaTemporaria, enviarAoR2, gerarWebp } from './imagens'

type FotoHistoria = { id: string; origem: string; path: string }

const remoto = process.argv.includes('--remoto')
const bucket =
  process.argv.find((arg) => arg.startsWith('--bucket='))?.slice('--bucket='.length) ??
  'sospatas-fotos'

const fotos = JSON.parse(
  readFileSync(join(RAIZ, 'db', 'seed', 'fotos_historia.json'), 'utf8'),
) as FotoHistoria[]

await comPastaTemporaria(async (pasta) => {
  for (const foto of fotos) {
    const completa = join(pasta, `${foto.id}.webp`)
    const miniatura = join(pasta, `${foto.id}-thumb.webp`)
    await gerarWebp(join(RAIZ, foto.origem), LADO_COMPLETA_PX, completa)
    await gerarWebp(join(RAIZ, foto.origem), LADO_MINIATURA_PX, miniatura)
    enviarAoR2(completa, bucket, foto.path, remoto)
    enviarAoR2(miniatura, bucket, foto.path.replace(/\.webp$/, '-thumb.webp'), remoto)
    console.log(`✓ ${foto.origem} → ${foto.path}`)
  }
})
console.log(
  `${String(fotos.length)} fotos enviadas para ${bucket} (${remoto ? 'R2 remoto' : 'R2 local'})`,
)
