// Aplica o conteúdo inicial e, no banco local, os dados de exemplo.
//
//   pnpm db:seed               → seed_conteudo.sql + seed_dev.sql (só no Postgres local)
//   pnpm db:seed --conteudo    → só seed_conteudo.sql (uso em produção, com DATABASE_URL)
import { ARQUIVO_CONTEUDO, ARQUIVO_DEV, aplicarSeed } from './seed'
import { ehBancoLocal, urlDoBanco } from './url'

const url = urlDoBanco()
const soConteudo = process.argv.includes('--conteudo')
const arquivos = soConteudo ? [ARQUIVO_CONTEUDO] : [ARQUIVO_CONTEUDO, ARQUIVO_DEV]

if (!soConteudo && !ehBancoLocal(url)) {
  console.error(
    'Os dados de exemplo (seed_dev.sql) só rodam no banco local. Em produção, use --conteudo.',
  )
  process.exit(1)
}

await aplicarSeed(url, arquivos)
console.log(`Seed aplicado (${arquivos.join(', ')}) em ${new URL(url).host}`)
