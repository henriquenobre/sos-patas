// Preparo das fotos no navegador (RN02, RN20): a foto escolhida é redesenhada num <canvas> e
// exportada em duas versões WebP, miniatura (400 px) e completa (1200 px). Redesenhar descarta
// os metadados do arquivo original (EXIF, inclusive a localização GPS); o original nunca é enviado.
import {
  LADO_COMPLETA_PX,
  LADO_MINIATURA_PX,
  TAMANHO_MAX_FOTO_BYTES,
  TAMANHO_MAX_ORIGINAL_BYTES,
  TIPOS_FOTO_ACEITOS,
} from '@sospatas/compartilhado'

export type FotoPreparada = { miniatura: Blob; completa: Blob }

/** Mensagem pronta para a tela. */
export class ErroFoto extends Error {}

/** Qualidades tentadas em ordem, até o arquivo caber no limite da API (500 KB). */
const QUALIDADES = [0.82, 0.7, 0.55, 0.4]

/** Confere tipo e tamanho do arquivo escolhido, antes de qualquer processamento (RN20). */
export function conferirArquivo(arquivo: File): void {
  if (!(TIPOS_FOTO_ACEITOS as readonly string[]).includes(arquivo.type)) {
    throw new ErroFoto('Escolha uma foto em JPG, PNG ou WebP.')
  }
  if (arquivo.size > TAMANHO_MAX_ORIGINAL_BYTES) {
    throw new ErroFoto('Esta foto é muito grande (mais de 10 MB). Escolha outra.')
  }
}

/** Abre a imagem já virada na posição certa (fotos de celular guardam a rotação no EXIF). */
async function abrirImagem(arquivo: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  } catch {
    throw new ErroFoto('Não conseguimos abrir esta foto. Escolha outra.')
  }
}

function exportar(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob | null> {
  return new Promise((resolver) => {
    canvas.toBlob(resolver, 'image/webp', qualidade)
  })
}

/** Redesenha com o lado maior em `lado` px (sem aumentar fotos pequenas) e exporta em WebP. */
async function versao(imagem: ImageBitmap, lado: number): Promise<Blob> {
  const escala = Math.min(1, lado / Math.max(imagem.width, imagem.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(imagem.width * escala))
  canvas.height = Math.max(1, Math.round(imagem.height * escala))
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new ErroFoto('Não conseguimos preparar a foto neste aparelho.')
  contexto.imageSmoothingQuality = 'high'
  contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height)

  for (const qualidade of QUALIDADES) {
    const blob = await exportar(canvas, qualidade)
    // Navegador sem WebP devolve PNG no lugar: a API recusaria (só aceita WebP, RN21)
    if (!blob || blob.type !== 'image/webp') {
      throw new ErroFoto(
        'Este navegador não consegue preparar a foto. Tente pelo Google Chrome ou atualize o navegador.',
      )
    }
    if (blob.size <= TAMANHO_MAX_FOTO_BYTES) return blob
  }
  throw new ErroFoto('Não conseguimos deixar a foto leve o bastante. Escolha outra.')
}

/** Arquivo escolhido → miniatura e completa em WebP, prontas para enviar. */
export async function prepararFoto(arquivo: File): Promise<FotoPreparada> {
  conferirArquivo(arquivo)
  const imagem = await abrirImagem(arquivo)
  try {
    return {
      miniatura: await versao(imagem, LADO_MINIATURA_PX),
      completa: await versao(imagem, LADO_COMPLETA_PX),
    }
  } finally {
    imagem.close()
  }
}

/** Corpo multipart de POST /animais/:id/fotos (campos `miniatura` e `completa`). */
export function formularioFoto(foto: FotoPreparada): FormData {
  const corpo = new FormData()
  corpo.append('miniatura', foto.miniatura, 'miniatura.webp')
  corpo.append('completa', foto.completa, 'completa.webp')
  return corpo
}
