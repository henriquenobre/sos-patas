// T12 · Perdidos e encontrados (/perdidos): só anúncios aprovados pela equipe e no prazo
// (RN18, RN25), com o contato direto por WhatsApp e o aviso contra golpes (RN28). Fotos enviadas
// pelo público aparecem só em <img>, nunca como link (RN24). O filtro fica na URL (?tipo=).
import { Link, useSearchParams } from 'react-router'
import {
  hojeNoBrasil,
  linkWhatsApp,
  type PerdidoPublico,
  type PerdidoTipo,
} from '@sospatas/compartilhado'
import { usePerdidos } from '../api/publico'
import { AvisoGolpes } from '../components/AvisoGolpes'
import { FotoAnimal } from '../components/CardAnimal'
import { Carregando, ErroAoCarregar, TituloPagina } from '../components/Estados'
import { IconeWhatsApp } from '../components/Icones'
import { SeloPerdido } from '../components/SeloPerdido'
import {
  diasAteSairDoAr,
  mensagemWhatsApp,
  textoBotaoWhatsApp,
  textoQuando,
  textoSaiDoAr,
  tituloDoAnuncio,
} from '../lib/perdidos'

const FILTROS: { tipo: PerdidoTipo; texto: string }[] = [
  { tipo: 'perdido', texto: '🔎 Perdidos' },
  { tipo: 'encontrado', texto: '🏠 Encontrados' },
]

function CardPerdido({ anuncio, hoje }: { anuncio: PerdidoPublico; hoje: string }) {
  const titulo = tituloDoAnuncio(anuncio)
  const alt = `Foto de ${titulo}`
  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="relative">
        {anuncio.fotos.length > 1 ? (
          <div className="grid grid-cols-2 gap-0.5">
            {anuncio.fotos.map((url, i) => (
              <div key={url} className="aspect-square">
                <FotoAnimal url={url} alt={`${alt} (${String(i + 1)})`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="aspect-[4/3]">
            <FotoAnimal url={anuncio.fotos[0] ?? null} alt={alt} className="bg-slate-800" />
          </div>
        )}
        <span className="absolute left-3 top-3">
          <SeloPerdido tipo={anuncio.tipo} />
        </span>
      </div>
      <div className="p-4">
        <h2 className="font-titulo text-xl font-bold text-azul-escuro">{titulo}</h2>
        <p className="text-sm text-slate-500">
          📍 {anuncio.bairro} · {textoQuando(anuncio.tipo, anuncio.data_ocorrido, hoje)}
        </p>
        <p className="mt-2 whitespace-pre-line text-slate-700">{anuncio.descricao}</p>
        <a
          href={linkWhatsApp(anuncio.contato_whatsapp, mensagemWhatsApp(anuncio))}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 font-extrabold text-white [&>svg]:shrink-0"
        >
          <IconeWhatsApp /> {textoBotaoWhatsApp(anuncio.tipo)}
        </a>
        <p className="mt-2 text-center text-xs text-slate-500">
          Anúncio de {anuncio.contato_nome} ·{' '}
          {textoSaiDoAr(diasAteSairDoAr(anuncio.expira_em, hoje))}
        </p>
      </div>
    </article>
  )
}

export function Perdidos() {
  const [params, setParams] = useSearchParams()
  const tipoParam = params.get('tipo')
  const tipo = FILTROS.find((filtro) => filtro.tipo === tipoParam)?.tipo
  const resultado = usePerdidos(tipo)
  const hoje = hojeNoBrasil()
  const anuncios = resultado.data?.perdidos ?? []

  return (
    <>
      <title>Perdidos e encontrados · SOS Patas</title>
      <TituloPagina
        titulo="Perdidos e encontrados"
        subtitulo="Ajude animais a voltarem para casa em Passos e região"
      />
      <section className="mx-auto max-w-3xl space-y-4 px-4 pt-5">
        <p className="rounded-2xl bg-azul-claro p-4 text-sm text-slate-700">
          <b>Como funciona:</b> você envia o anúncio, a equipe da SOS Patas confere e publica aqui
          por 30 dias. O contato é direto com quem anunciou.
        </p>
        <Link
          to="/perdidos/novo"
          className="block rounded-xl bg-vermelho px-4 py-4 text-center text-lg font-extrabold text-white"
        >
          ＋ Anunciar animal perdido ou encontrado
        </Link>

        <div role="group" aria-label="Filtro" className="flex flex-wrap gap-2">
          {FILTROS.map((filtro) => (
            <button
              key={filtro.tipo}
              type="button"
              aria-pressed={tipo === filtro.tipo}
              onClick={() => {
                setParams(tipo === filtro.tipo ? {} : { tipo: filtro.tipo }, { replace: true })
              }}
              className={`min-h-11 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold ${
                tipo === filtro.tipo
                  ? 'border-azul bg-azul text-white'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {filtro.texto}
            </button>
          ))}
        </div>

        {resultado.isPending && <Carregando texto="Buscando os anúncios…" />}
        {resultado.isError && <ErroAoCarregar tentarDeNovo={() => void resultado.refetch()} />}
        {resultado.isSuccess &&
          (anuncios.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {anuncios.map((anuncio) => (
                <CardPerdido key={anuncio.id} anuncio={anuncio} hoje={hoje} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-white p-8 text-center font-bold text-slate-700 ring-1 ring-slate-200">
              {tipo === 'perdido'
                ? 'Nenhum animal perdido anunciado agora.'
                : tipo === 'encontrado'
                  ? 'Nenhum animal encontrado anunciado agora.'
                  : 'Nenhum anúncio no ar agora.'}
            </p>
          ))}

        <AvisoGolpes />
      </section>
    </>
  )
}
