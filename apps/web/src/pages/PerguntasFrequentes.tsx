// T05 · Perguntas frequentes. Perguntas e respostas editáveis em T16 (RN33, RN36); o bloco
// "Não encontrou sua dúvida?" é fixo: leva ao "Fale com a ONG" e usa o Instagram e o e-mail da
// tabela ong (RN51).
import { Link } from 'react-router'
import { useSite } from '../api/publico'
import { Carregando, ErroAoCarregar, TituloPagina } from '../components/Estados'
import { TextoSimples } from '../components/TextoSimples'
import { linkEmail } from '../lib/contato'

export function PerguntasFrequentes() {
  const site = useSite()
  if (site.isPending) return <Carregando />
  if (site.isError) return <ErroAoCarregar tentarDeNovo={() => void site.refetch()} />

  const { listas, ong } = site.data

  return (
    <>
      <title>Perguntas frequentes · SOS Patas</title>
      <TituloPagina
        titulo="Perguntas frequentes"
        subtitulo="Respostas para as dúvidas mais comuns"
      />
      <section className="mx-auto max-w-3xl space-y-3 px-4 pt-6">
        {listas.perguntas.map((pergunta, i) => (
          <details
            key={pergunta.id}
            className="group rounded-2xl bg-white ring-1 ring-slate-200"
            open={i === 0}
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 p-4 font-extrabold text-azul-escuro [&::-webkit-details-marker]:hidden">
              {pergunta.titulo}
              <span aria-hidden="true" className="text-azul transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <TextoSimples texto={pergunta.texto} className="px-4 pb-4 text-slate-700" />
          </details>
        ))}
        <div className="rounded-2xl bg-azul-claro p-5 text-center">
          <p className="font-bold text-azul-escuro">Não encontrou sua dúvida?</p>
          <p className="text-sm text-slate-700">
            Fale com a gente pelo Instagram <b>@{ong.instagram}</b> ou pelo e-mail{' '}
            <a
              href={linkEmail(ong.email)}
              className="font-bold break-all text-azul hover:underline"
            >
              {ong.email}
            </a>
            .
          </p>
          <Link
            to="/contato"
            className="mt-3 inline-block min-h-11 rounded-full bg-azul px-5 py-3 font-bold text-white"
          >
            Fale com a ONG
          </Link>
        </div>
      </section>
    </>
  )
}
