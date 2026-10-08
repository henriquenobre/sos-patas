// SÓ PARA DESENVOLVIMENTO: dá fotos aos animais e anúncios de exemplo do seed_dev.sql, usando
// as fotos ilustrativas do protótipo (prototipo/assets). Gera as versões WebP, envia ao R2
// simulado do `wrangler dev` e grava as linhas em fotos e perdidos_fotos (RN02, RN04, RN19).
//
//   pnpm db:fotos-exemplo    (depois do pnpm db:seed; recusa qualquer banco que não seja o local)
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { LADO_COMPLETA_PX, LADO_MINIATURA_PX } from '@sospatas/compartilhado'
import { RAIZ, comPastaTemporaria, enviarAoR2, gerarWebp } from './imagens'
import { ehBancoLocal, urlDoBanco } from './url'

/** Animal do seed_dev.sql → foto do protótipo. */
const FOTOS_ANIMAIS: Record<string, string> = {
  Apolo: 'apolo.jpg',
  Tobias: 'tobias.jpg',
  Mel: 'mel.jpg',
  Nina: 'nina.jpg',
  Thor: 'thor.jpg',
  Pelezinho: 'pelezinho.jpg',
  Pipoca: 'pipoca.jpg',
  Ruivo: 'ruivo.jpg',
  Bolinha: 'bolinha.jpg',
}

/** Anúncio do seed_dev.sql → foto. Pendente fica na quarentena (RN19). */
const FOTOS_PERDIDOS: Record<string, string> = {
  Bob: 'perdido-bob.jpg',
  Luna: 'perdido-luna.jpg',
}

const url = urlDoBanco()
if (!ehBancoLocal(url)) {
  console.error('As fotos de exemplo só vão para o banco e o R2 locais.')
  process.exit(1)
}

const sql = postgres(url, { max: 1, onnotice: () => undefined })
const origem = (arquivo: string) => join(RAIZ, 'prototipo', 'assets', arquivo)

try {
  await comPastaTemporaria(async (pasta) => {
    const animais = await sql<{ id: string; nome: string }[]>`SELECT id, nome FROM animais`
    for (const animal of animais) {
      const arquivo = FOTOS_ANIMAIS[animal.nome]
      if (!arquivo) continue
      const fotoId = randomUUID()
      const completa = `animais/${animal.id}/${fotoId}.webp`
      const miniatura = `animais/${animal.id}/${fotoId}-thumb.webp`
      await gerarWebp(origem(arquivo), LADO_COMPLETA_PX, join(pasta, 'completa.webp'))
      await gerarWebp(origem(arquivo), LADO_MINIATURA_PX, join(pasta, 'miniatura.webp'))
      enviarAoR2(join(pasta, 'completa.webp'), 'sospatas-fotos', completa)
      enviarAoR2(join(pasta, 'miniatura.webp'), 'sospatas-fotos', miniatura)
      await sql.begin(async (tx) => {
        await tx`DELETE FROM fotos WHERE animal_id = ${animal.id}`
        await tx`INSERT INTO fotos (id, animal_id, ordem, path_miniatura, path_completa)
                 VALUES (${fotoId}, ${animal.id}, 0, ${miniatura}, ${completa})`
      })
      console.log(`✓ ${animal.nome}`)
    }

    const anuncios = await sql<{ id: string; nome: string | null; status: string }[]>`
      SELECT id, nome, status::text FROM perdidos`
    for (const anuncio of anuncios) {
      const arquivo = anuncio.nome ? FOTOS_PERDIDOS[anuncio.nome] : undefined
      if (!arquivo) continue
      const caminho = `perdidos/${anuncio.id}/${randomUUID()}.webp`
      const bucket = anuncio.status === 'publicado' ? 'sospatas-fotos' : 'sospatas-quarentena'
      await gerarWebp(origem(arquivo), LADO_COMPLETA_PX, join(pasta, 'perdido.webp'))
      enviarAoR2(join(pasta, 'perdido.webp'), bucket, caminho)
      await sql.begin(async (tx) => {
        await tx`DELETE FROM perdidos_fotos WHERE perdido_id = ${anuncio.id}`
        await tx`INSERT INTO perdidos_fotos (perdido_id, path) VALUES (${anuncio.id}, ${caminho})`
      })
      console.log(`✓ anúncio ${anuncio.nome ?? ''} (${bucket})`)
    }
  })
} finally {
  await sql.end()
}
