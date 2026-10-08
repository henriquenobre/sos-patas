// Armazenamento no Cloudflare R2 (buckets FOTOS e QUARENTENA do wrangler.toml).
import { lerTudo, type Armazenamento, type ObjetoArmazenado } from './tipos'

/** O R2 apaga no máximo 1.000 arquivos por chamada. */
const LOTE_R2 = 1000

export class ArmazenamentoR2 implements Armazenamento {
  constructor(private readonly bucket: R2Bucket) {}

  async colocar(chave: string, dados: Uint8Array, tipo: string): Promise<void> {
    await this.bucket.put(chave, dados, { httpMetadata: { contentType: tipo } })
  }

  async obter(chave: string): Promise<ObjetoArmazenado | null> {
    const objeto = await this.bucket.get(chave)
    if (!objeto) return null
    return {
      // O tipo do R2 é ReadableStream<any>; o conteúdo são bytes
      corpo: objeto.body as ReadableStream<Uint8Array>,
      tipo: objeto.httpMetadata?.contentType ?? 'application/octet-stream',
      tamanho: objeto.size,
    }
  }

  async copiar(chave: string, destino: Armazenamento, chaveDestino = chave): Promise<void> {
    const objeto = await this.obter(chave)
    if (!objeto) throw new Error(`Arquivo não encontrado para copiar: ${chave}`)
    await destino.colocar(chaveDestino, await lerTudo(objeto.corpo), objeto.tipo)
  }

  async apagar(chaves: string[]): Promise<void> {
    for (let i = 0; i < chaves.length; i += LOTE_R2) {
      await this.bucket.delete(chaves.slice(i, i + LOTE_R2))
    }
  }

  async apagarPrefixo(prefixo: string): Promise<number> {
    const chaves = await this.listar(prefixo)
    await this.apagar(chaves)
    return chaves.length
  }

  async listar(prefixo: string): Promise<string[]> {
    const chaves: string[] = []
    let cursor: string | undefined
    do {
      const pagina = await this.bucket.list({ prefix: prefixo, cursor })
      chaves.push(...pagina.objects.map((objeto) => objeto.key))
      cursor = pagina.truncated ? pagina.cursor : undefined
    } while (cursor)
    return chaves
  }
}
