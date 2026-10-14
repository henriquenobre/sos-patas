// Apoio às telas de perdidos e encontrados (T12, T13, T14).
import { diasEntre, hojeNoBrasil, type Especie, type PerdidoTipo } from '@sospatas/compartilhado'

type Anuncio = { tipo: PerdidoTipo; especie: Especie; nome: string | null }

/** Nome do animal ou, sem nome, "Gato encontrado" / "Cachorro perdido". */
export function tituloDoAnuncio(anuncio: Anuncio): string {
  if (anuncio.nome) return anuncio.nome
  const animal = anuncio.especie === 'gato' ? 'Gato' : 'Cachorro'
  return `${animal} ${anuncio.tipo === 'perdido' ? 'perdido' : 'encontrado'}`
}

/** "Sumiu há 4 dias" / "Encontrado hoje", pela data informada no anúncio. */
export function textoQuando(tipo: PerdidoTipo, dataOcorrido: string, hoje: string): string {
  const dias = Math.max(0, diasEntre(dataOcorrido, hoje))
  const quando = dias === 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${String(dias)} dias`
  return `${tipo === 'perdido' ? 'Sumiu' : 'Encontrado'} ${quando}`
}

/** Dias até sair do ar (RN25), contados no fuso de Brasília; 0 = sai hoje ou já venceu. */
export const diasAteSairDoAr = (expiraEm: string, hoje: string): number =>
  Math.max(0, diasEntre(hoje, hojeNoBrasil(new Date(expiraEm))))

/** "sai do ar em 29 dias"; `inicio` = começo de frase ("Sai do ar…"). */
export function textoSaiDoAr(dias: number, inicio = false): string {
  const texto =
    dias === 0
      ? 'sai do ar hoje'
      : dias === 1
        ? 'sai do ar amanhã'
        : `sai do ar em ${String(dias)} dias`
  return inicio ? `S${texto.slice(1)}` : texto
}

/** "enviado hoje" / "enviado ontem" / "enviado há 3 dias" (T14). */
export const textoEnviado = (dias: number): string =>
  `enviado ${dias === 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${String(dias)} dias`}`

/** Mensagem pronta do botão de WhatsApp do card (T12). */
export function mensagemWhatsApp(anuncio: Anuncio & { contato_nome: string }): string {
  const animal = anuncio.nome ?? (anuncio.especie === 'gato' ? 'o gato' : 'o cachorro')
  return anuncio.tipo === 'perdido'
    ? `Olá, ${anuncio.contato_nome}! Vi o anúncio de ${animal} no site da SOS Patas e acho que vi este animal.`
    : `Olá, ${anuncio.contato_nome}! Vi no site da SOS Patas o anúncio do animal que você encontrou e acho que é meu.`
}

export const textoBotaoWhatsApp = (tipo: PerdidoTipo): string =>
  tipo === 'perdido' ? 'Vi este animal' : 'É meu animal'
