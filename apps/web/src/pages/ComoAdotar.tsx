// T04 · Como adotar. Subtítulo, passos, "antes de adotar", vantagens e aviso de protetores
// editáveis em T18 (RN31, RN32, RN33).
import { Link } from 'react-router'
import { useSite } from '../api/publico'
import { Carregando, ErroAoCarregar, TituloPagina } from '../components/Estados'
import { TextoSimples } from '../components/TextoSimples'

export function ComoAdotar() {
  const site = useSite()
  if (site.isPending) return <Carregando />
  if (site.isError) return <ErroAoCarregar tentarDeNovo={() => void site.refetch()} />

  const { textos, listas } = site.data
  const rodapeVantagens = textos['como_adotar.vantagens_rodape']

  return (
    <>
      <title>Como adotar · SOS Patas</title>
      <TituloPagina titulo="Como adotar" subtitulo={textos['como_adotar.subtitulo']} />
      <section className="mx-auto max-w-3xl px-4 pt-6">
        <ol className="relative space-y-4 border-l-4 border-azul-claro pl-6">
          {listas.como_adotar_passos.map((passo, i) => (
            <li key={passo.id} className="relative">
              <span className="absolute -left-[42px] flex h-9 w-9 items-center justify-center rounded-full bg-azul font-titulo text-lg font-extrabold text-white ring-4 ring-fundo">
                {i + 1}
              </span>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="font-titulo text-xl font-bold text-azul-escuro">{passo.titulo}</p>
                <TextoSimples texto={passo.texto} className="text-slate-600" />
              </div>
            </li>
          ))}
        </ol>

        {listas.como_adotar_antes.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="font-titulo text-2xl font-bold text-azul-escuro">
              Antes de adotar, pense em:
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
              {listas.como_adotar_antes.map((item) => (
                <TextoSimples key={item.id} como="li" texto={item.texto} />
              ))}
            </ul>
          </div>
        )}

        {listas.como_adotar_vantagens.length > 0 && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
            <h2 className="font-titulo text-2xl font-bold text-emerald-800">
              🎁 Vantagem de adotar pelo site
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
              {listas.como_adotar_vantagens.map((vantagem) => (
                <li key={vantagem.id}>
                  {vantagem.titulo && <b>{vantagem.titulo} </b>}
                  <TextoSimples como="span" texto={vantagem.texto} />
                </li>
              ))}
            </ul>
            {rodapeVantagens && (
              <TextoSimples texto={rodapeVantagens} className="mt-2 text-sm text-slate-600" />
            )}
          </div>
        )}

        <div className="mt-4 rounded-2xl border-2 border-amarelo bg-amarelo-claro p-5">
          <h2 className="font-titulo text-xl font-bold text-azul-escuro">
            Animais de protetores parceiros
          </h2>
          <TextoSimples
            texto={textos['como_adotar.aviso_protetor']}
            className="mt-1 text-slate-700"
          />
        </div>

        <Link
          to="/animais"
          className="mt-6 block rounded-xl bg-azul py-4 text-center text-lg font-extrabold text-white"
        >
          Ver animais para adoção
        </Link>
      </section>
    </>
  )
}
