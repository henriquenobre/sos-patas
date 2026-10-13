// Apoio às telas de pedidos de adoção (T27, T28).
import { FUSO_ONG, diasEntre, hojeNoBrasil } from '@sospatas/compartilhado'

/** Dias desde o envio do pedido, contados no fuso de Brasília. */
export const diasDoPedido = (criadoEm: string, hoje: string): number =>
  Math.max(0, diasEntre(hojeNoBrasil(new Date(criadoEm)), hoje))

export const textoHaDias = (dias: number): string =>
  dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${String(dias)} dias`

/** "13/10/2026 às 14:05", no horário de Brasília. */
export function dataEHora(iso: string): string {
  const data = new Date(iso)
  const dia = data.toLocaleDateString('pt-BR', { timeZone: FUSO_ONG })
  const hora = data.toLocaleTimeString('pt-BR', {
    timeZone: FUSO_ONG,
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${dia} às ${hora}`
}
