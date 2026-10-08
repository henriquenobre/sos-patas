import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

export const ARQUIVO_CONTEUDO = 'seed_conteudo.sql'
export const ARQUIVO_DEV = 'seed_dev.sql'

const caminhoSeed = (arquivo: string): string =>
  join(dirname(fileURLToPath(import.meta.url)), '..', 'seed', arquivo)

/** Executa os arquivos de db/seed/, na ordem. */
export async function aplicarSeed(url: string, arquivos: string[]): Promise<void> {
  const sql = postgres(url, { max: 1, onnotice: () => undefined })
  try {
    for (const arquivo of arquivos) {
      const conteudo = await readFile(caminhoSeed(arquivo), 'utf8')
      // Sem parâmetros, o postgres.js usa o protocolo simples: vários comandos de uma vez
      await sql.unsafe(conteudo)
    }
  } finally {
    await sql.end()
  }
}
