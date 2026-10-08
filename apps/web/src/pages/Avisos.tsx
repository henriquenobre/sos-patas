// Página não encontrada (404) e páginas que ainda vão ser construídas.
import { Link } from 'react-router'
import { Pata } from '../components/Pata'

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <Pata className="h-16 w-16 text-azul-claro" rotacao={-15} />
      <h1 className="mt-4 font-titulo text-3xl font-extrabold text-azul-escuro">{titulo}</h1>
      <p className="mt-2 text-slate-600">{texto}</p>
      <Link
        to="/"
        className="mt-6 inline-block min-h-11 rounded-full bg-azul px-6 py-3 font-extrabold text-white"
      >
        Voltar para o início
      </Link>
    </section>
  )
}

export function PaginaNaoEncontrada() {
  return (
    <>
      <title>Página não encontrada · SOS Patas</title>
      <Aviso
        titulo="Página não encontrada"
        texto="O endereço pode estar errado ou a página mudou de lugar."
      />
    </>
  )
}

/** Vitrine, ficha e perdidos ainda em construção (etapas 7 e 11 do PLANO_DESENVOLVIMENTO.md). */
export function EmBreve() {
  return (
    <>
      <title>Em breve · SOS Patas</title>
      <Aviso titulo="Em breve" texto="Esta parte do site ainda está sendo construída." />
    </>
  )
}
