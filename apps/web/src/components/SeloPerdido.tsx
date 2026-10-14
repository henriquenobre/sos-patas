// Selo PERDIDO (vermelho) ou ENCONTRADO (verde) dos anúncios (T12, T14).
import { ROTULOS, type PerdidoTipo } from '@sospatas/compartilhado'

export function SeloPerdido({ tipo }: { tipo: PerdidoTipo }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-extrabold uppercase text-white ${
        tipo === 'perdido' ? 'bg-vermelho' : 'bg-emerald-600'
      }`}
    >
      {ROTULOS.perdido_tipo[tipo]}
    </span>
  )
}
