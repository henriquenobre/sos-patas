// T06 · Como ajudar (substitui a antiga /sobre). PIX da tabela ong; introdução e formas de
// ajudar editáveis em T20.
import { Link } from 'react-router'
import { useSite } from '../api/publico'
import { BlocoPix } from '../components/BlocoPix'
import { Carregando, ErroAoCarregar, TituloPagina } from '../components/Estados'
import { TextoSimples } from '../components/TextoSimples'

export function ComoAjudar() {
  const site = useSite()
  if (site.isPending) return <Carregando />
  if (site.isError) return <ErroAoCarregar tentarDeNovo={() => void site.refetch()} />

  const { textos, listas, ong } = site.data
  const introducao = textos['ajude.introducao']

  return (
    <>
      <title>Como ajudar · SOS Patas</title>
      <TituloPagina titulo="Como ajudar" subtitulo={ong.nome_completo} />
      <section className="mx-auto max-w-4xl px-4 pt-6">
        {introducao && (
          <TextoSimples texto={introducao} className="text-lg leading-relaxed text-slate-700" />
        )}
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <BlocoPix ong={ong} />
          {listas.ajude_formas.map((forma) => (
            <div key={forma.id} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <p className="font-titulo text-xl font-bold text-azul-escuro">{forma.titulo}</p>
              <TextoSimples texto={forma.texto} className="mt-1 text-sm text-slate-600" />
            </div>
          ))}
        </div>
        <Link to="/#historia" className="mt-6 inline-block font-bold text-azul hover:underline">
          Conheça a história da SOS Patas →
        </Link>
      </section>
    </>
  )
}
