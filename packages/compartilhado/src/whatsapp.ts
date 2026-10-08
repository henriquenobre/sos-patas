// WhatsApp: guardado só com dígitos (DDD + número), exibido formatado e usado em links wa.me.
import { REGEX_WHATSAPP } from './limites'

const PADRAO = new RegExp(REGEX_WHATSAPP)

/**
 * Deixa só os dígitos e tira o código do país (55) ou o zero do DDD, se vierem.
 * "(35) 9 8843-9614", "+55 35 98843-9614" e "035988439614" viram "35988439614".
 */
export function normalizarWhatsapp(entrada: string): string {
  let digitos = entrada.replace(/\D/g, '')
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    digitos = digitos.slice(2)
  }
  if (digitos.startsWith('0') && (digitos.length === 11 || digitos.length === 12)) {
    digitos = digitos.slice(1)
  }
  return digitos
}

/** Já normalizado: 10 ou 11 dígitos, com DDD. */
export function ehWhatsappValido(digitos: string): boolean {
  return PADRAO.test(digitos)
}

/** "35988439614" → "(35) 9 8843-9614"; "3534560000" → "(35) 3456-0000". */
export function formatarWhatsapp(digitos: string): string {
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 3)} ${digitos.slice(3, 7)}-${digitos.slice(7)}`
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }
  return digitos
}

/** Link que abre a conversa no WhatsApp, opcionalmente com uma mensagem pronta. */
export function linkWhatsApp(numero: string, texto?: string): string {
  const base = `https://wa.me/55${normalizarWhatsapp(numero)}`
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base
}
