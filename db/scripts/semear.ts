// Aplica o conteúdo inicial e, no banco local ou na prévia, os dados de exemplo.
//
//   pnpm db:seed                        → seed_conteudo.sql + seed_dev.sql (Postgres local)
//   pnpm db:seed --previa               → o mesmo no banco da prévia (DATABASE_URL, banco marcado)
//   pnpm db:seed --conteudo             → só seed_conteudo.sql (uso em produção, com DATABASE_URL)
import { ARQUIVO_CONTEUDO, ARQUIVO_DEV, aplicarSeed } from './seed'
import { destinoDosExemplos, urlDoBanco } from './url'

const url = urlDoBanco()
const soConteudo = process.argv.includes('--conteudo')
const arquivos = soConteudo ? [ARQUIVO_CONTEUDO] : [ARQUIVO_CONTEUDO, ARQUIVO_DEV]

if (!soConteudo) await destinoDosExemplos(url)

await aplicarSeed(url, arquivos)
console.log(`Seed aplicado (${arquivos.join(', ')}) em ${new URL(url).host}`)
