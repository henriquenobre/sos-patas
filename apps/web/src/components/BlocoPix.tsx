// Chave PIX da ONG com o botão "Copiar" (tabela ong; T01, T06 e rodapé).
import { useEffect, useState } from 'react'
import { ROTULOS, type OngPublica } from '@sospatas/compartilhado'
import { chaveParaCopiar } from '../lib/pix'

function useCopiar(texto: string) {
  const [copiado, setCopiado] = useState(false)
  useEffect(() => {
    if (!copiado) return
    const tempo = setTimeout(() => {
      setCopiado(false)
    }, 1800)
    return () => {
      clearTimeout(tempo)
    }
  }, [copiado])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    } catch {
      // Sem permissão de área de transferência: a chave continua visível para copiar à mão
    }
  }
  return { copiado, copiar }
}

type Variante = 'vermelho' | 'claro' | 'destaque'

const ESTILOS: Record<Variante, { caixa: string; rotulo: string; botao: string }> = {
  vermelho: {
    caixa: 'rounded-2xl bg-vermelho p-5 text-white',
    rotulo: 'text-white/90',
    botao: 'bg-white text-vermelho',
  },
  claro: {
    caixa: 'rounded-2xl bg-white p-5 text-azul-escuro ring-1 ring-slate-200',
    rotulo: 'text-slate-500',
    botao: 'bg-vermelho text-white',
  },
  destaque: {
    caixa: 'relative rounded-2xl bg-white p-4 text-center text-azul-escuro',
    rotulo: 'text-xs font-extrabold uppercase tracking-wide text-slate-500',
    botao: 'bg-azul text-white',
  },
}

export function BlocoPix({ ong, variante = 'vermelho' }: { ong: OngPublica; variante?: Variante }) {
  const { copiado, copiar } = useCopiar(chaveParaCopiar(ong))
  const estilo = ESTILOS[variante]
  const tipo = ROTULOS.pix_tipo[ong.pix_tipo]

  return (
    <div className={estilo.caixa}>
      {variante === 'destaque' ? (
        <p className={estilo.rotulo}>PIX ({tipo})</p>
      ) : (
        <>
          <p className="font-titulo text-xl font-bold">Doe pelo PIX</p>
          <p className={`mt-1 text-sm ${estilo.rotulo}`}>Chave ({tipo})</p>
        </>
      )}
      <p
        className={`break-all font-titulo font-extrabold ${variante === 'destaque' ? 'text-2xl' : 'text-xl'}`}
      >
        {ong.pix_chave}
      </p>
      <button
        type="button"
        onClick={() => void copiar()}
        className={`mt-3 min-h-11 w-full rounded-lg px-4 py-2 text-sm font-extrabold ${estilo.botao}`}
      >
        <span aria-live="polite">{copiado ? 'Chave copiada ✓' : 'Copiar chave PIX'}</span>
      </button>
    </div>
  )
}
