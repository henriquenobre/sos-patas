// Endereço público das fotos (docs/ARQUITETURA.md, seção 6).
import type { FotoPublica } from '@sospatas/compartilhado'

/** Prefixos do bucket público que podem ser lidos pela rota /api/publico/fotos/*. */
export const PREFIXOS_FOTOS_PUBLICAS = ['animais/', 'site/', 'perdidos/'] as const

/** Caminho válido: prefixo conhecido, só letras, números, - _ / e terminando em .webp. */
export function ehCaminhoFotoPublica(caminho: string): boolean {
  return (
    PREFIXOS_FOTOS_PUBLICAS.some((prefixo) => caminho.startsWith(prefixo)) &&
    /^[a-z0-9\-_/]+\.webp$/i.test(caminho) &&
    !caminho.includes('..')
  )
}

/**
 * URL para o <img>. Com FOTOS_URL_BASE (produção), o domínio de fotos com cache; vazio
 * (computador), a própria API serve a foto. Na prévia, a base é a rota de fotos do próprio Worker.
 */
export function urlFoto(env: Env, caminho: string): string {
  const base = env.FOTOS_URL_BASE.trim().replace(/\/$/, '')
  return base ? `${base}/${caminho}` : `/api/publico/fotos/${caminho}`
}

/** Fotos da história guardam só a completa; a miniatura fica ao lado, com "-thumb" (RN38). */
export function fotoDaHistoria(env: Env, caminhoCompleta: string): FotoPublica {
  return {
    completa: urlFoto(env, caminhoCompleta),
    miniatura: urlFoto(env, caminhoCompleta.replace(/\.webp$/, '-thumb.webp')),
  }
}
