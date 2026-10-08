// Estados de carregamento e de falha das páginas públicas (docs/ARQUITETURA.md, seção 11.2:
// se a API cair, a página mostra uma mensagem amigável em vez de quebrar).

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div role="status" className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-500">
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-azul-claro border-t-azul" />
      <p className="mt-3 font-semibold">{texto}</p>
    </div>
  )
}

export function ErroAoCarregar({ tentarDeNovo }: { tentarDeNovo: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="font-titulo text-2xl font-bold text-azul-escuro">
        Não conseguimos carregar agora
      </p>
      <p className="mt-2 text-slate-600">
        Pode ser a sua internet ou uma falha rápida do nosso lado. Tente de novo em alguns minutos.
      </p>
      <button
        type="button"
        onClick={tentarDeNovo}
        className="mt-5 min-h-11 rounded-full bg-azul px-6 py-2.5 font-extrabold text-white"
      >
        Tentar de novo
      </button>
    </div>
  )
}

/** Faixa azul com o título das páginas internas. */
export function TituloPagina({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <div className="bg-azul text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-titulo text-3xl font-extrabold md:text-4xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-white/85">{subtitulo}</p>}
      </div>
    </div>
  )
}
