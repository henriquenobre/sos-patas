// Interface de armazenamento de arquivos (docs/ARQUITETURA.md, seção 6). A API só fala com
// esta interface: hoje a implementação é o R2; numa VPS, basta outra (S3, MinIO).

export type ObjetoArmazenado = {
  corpo: ReadableStream<Uint8Array>
  tipo: string
  tamanho: number
}

export interface Armazenamento {
  /** Grava (ou substitui) o arquivo. */
  colocar(chave: string, dados: Uint8Array, tipo: string): Promise<void>
  /** null se o arquivo não existe. */
  obter(chave: string): Promise<ObjetoArmazenado | null>
  /** Copia o arquivo para outro armazenamento (ex.: quarentena → fotos públicas, RN19). */
  copiar(chave: string, destino: Armazenamento, chaveDestino?: string): Promise<void>
  /** Apaga os arquivos; chaves que não existem são ignoradas. */
  apagar(chaves: string[]): Promise<void>
  /** Apaga tudo que começa com o prefixo (ex.: animais/{id}/, RN05) e diz quantos apagou. */
  apagarPrefixo(prefixo: string): Promise<number>
  listar(prefixo: string): Promise<string[]>
}

/** Lê o conteúdo inteiro de um stream (para copiar entre armazenamentos). */
export async function lerTudo(corpo: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(corpo).arrayBuffer())
}
