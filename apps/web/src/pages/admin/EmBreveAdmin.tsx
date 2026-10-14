// Abas da área da ONG que chegam nas próximas etapas: Textos (etapa 12) e Mais (etapa 13,
// PLANO_DESENVOLVIMENTO.md).
import { Link } from 'react-router'
import { Pata } from '../../components/Pata'

export function EmBreveAdmin({
  titulo,
  texto = 'Esta parte da área da ONG ainda está sendo construída.',
}: {
  titulo: string
  texto?: string
}) {
  return (
    <section className="py-12 text-center">
      <title>{`${titulo} · Área da ONG · SOS Patas`}</title>
      <Pata className="h-14 w-14 text-azul-claro" rotacao={-15} />
      <h1 className="mt-3 font-titulo text-3xl font-extrabold text-azul-escuro">{titulo}</h1>
      <p className="mt-2 text-slate-600">{texto}</p>
      <div className="mt-6 flex flex-col items-center gap-2">
        <Link
          to="/admin"
          className="min-h-11 rounded-full bg-azul px-6 py-3 font-extrabold text-white"
        >
          Voltar para os animais
        </Link>
        <a href="/" target="_blank" rel="noreferrer" className="py-2 font-bold text-azul">
          Ver o site ↗
        </a>
      </div>
    </section>
  )
}
