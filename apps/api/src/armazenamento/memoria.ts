// Armazenamento em memória: usado nos testes (e na entrada Node, até existir a versão S3).
import { lerTudo, type Armazenamento, type ObjetoArmazenado } from './tipos'

export class ArmazenamentoMemoria implements Armazenamento {
  readonly arquivos = new Map<string, { dados: Uint8Array; tipo: string }>()

  colocar(chave: string, dados: Uint8Array, tipo: string): Promise<void> {
    this.arquivos.set(chave, { dados: dados.slice(), tipo })
    return Promise.resolve()
  }

  obter(chave: string): Promise<ObjetoArmazenado | null> {
    const arquivo = this.arquivos.get(chave)
    if (!arquivo) return Promise.resolve(null)
    return Promise.resolve({
      corpo: new Response(arquivo.dados).body as ReadableStream<Uint8Array>,
      tipo: arquivo.tipo,
      tamanho: arquivo.dados.byteLength,
    })
  }

  async copiar(chave: string, destino: Armazenamento, chaveDestino = chave): Promise<void> {
    const objeto = await this.obter(chave)
    if (!objeto) throw new Error(`Arquivo não encontrado para copiar: ${chave}`)
    await destino.colocar(chaveDestino, await lerTudo(objeto.corpo), objeto.tipo)
  }

  apagar(chaves: string[]): Promise<void> {
    for (const chave of chaves) this.arquivos.delete(chave)
    return Promise.resolve()
  }

  async apagarPrefixo(prefixo: string): Promise<number> {
    const chaves = await this.listar(prefixo)
    await this.apagar(chaves)
    return chaves.length
  }

  listar(prefixo: string): Promise<string[]> {
    return Promise.resolve([...this.arquivos.keys()].filter((chave) => chave.startsWith(prefixo)))
  }
}
