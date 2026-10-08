// Regras de texto dos envios públicos.

/** RN21: descrição de anúncio não pode ter link (http, www., .com). */
export function contemLink(texto: string): boolean {
  return /\bhttps?:|\bwww\.|\.com\b/i.test(texto)
}
