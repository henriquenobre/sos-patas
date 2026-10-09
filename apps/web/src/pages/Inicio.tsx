// T01 · Início (institucional), prototipo/TELAS.md. Textos e listas editáveis (RN33, T19);
// "Esperando há mais tempo" vem da API (RN12).
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { hojeNoBrasil, type AnimalResumo, type ItemPublico } from '@sospatas/compartilhado'
import { useDestaques, useSite, useVitrine } from '../api/publico'
import { BlocoPix } from '../components/BlocoPix'
import { CardAnimal, FotoAnimal } from '../components/CardAnimal'
import { textoAlternativo } from '../lib/animal'
import { Carregando, ErroAoCarregar } from '../components/Estados'
import { Chapeu, Pata } from '../components/Pata'
import { TextoSimples } from '../components/TextoSimples'

/** Trilha de patinhas "caminhando" pelo fundo da chamada: [esquerda %, topo %, rotação]. */
const TRILHA = [
  [2, 93, 50],
  [6, 85, 70],
  [10, 89, 50],
  [14, 80, 70],
  [18, 84, 50],
  [22, 75, 70],
  [26, 79, 50],
  [30, 70, 70],
] as const

// Classes completas (o Tailwind só gera classes que aparecem escritas no código)
const COLUNAS_CELULAR = ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3'] as const
const COLUNAS_COMPUTADOR = [
  '',
  'md:grid-cols-1',
  'md:grid-cols-2',
  'md:grid-cols-3',
  'md:grid-cols-4',
] as const
const COLUNAS_PASSOS = [
  '',
  'lg:grid-cols-1',
  'lg:grid-cols-2',
  'lg:grid-cols-3',
  'lg:grid-cols-4',
  'lg:grid-cols-5',
] as const
const CORES_NUMEROS = ['text-azul', 'text-emerald-600', 'text-vermelho', 'text-[#C27C0E]'] as const

function Polaroide({
  animal,
  inclinacao,
  selo,
}: {
  animal?: AnimalResumo
  inclinacao: string
  selo: 'pata' | 'coracao'
}) {
  return (
    <div className={`relative rounded-3xl bg-white p-2 pb-3 shadow-xl ${inclinacao}`}>
      <div className="aspect-[3/4] overflow-hidden rounded-2xl">
        <FotoAnimal
          url={animal?.foto ?? null}
          alt={animal ? textoAlternativo(animal) : 'Foto de um animal da SOS Patas'}
        />
      </div>
      {selo === 'pata' ? (
        <span className="absolute -left-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full bg-amarelo p-2.5 text-azul-escuro shadow-md">
          <Pata className="h-full w-full" rotacao={-15} />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="absolute -bottom-3 -right-3 flex h-11 w-11 items-center justify-center rounded-full bg-vermelho text-xl text-white shadow-md"
        >
          ♥
        </span>
      )}
    </div>
  )
}

function FaixaNumeros({ numeros }: { numeros: ItemPublico[] }) {
  if (numeros.length === 0) return null
  const colunasCelular = numeros.length > 3 ? 2 : numeros.length
  return (
    <section className="relative z-10 mx-auto -mt-8 max-w-6xl px-4">
      <div
        className={`grid gap-y-3 rounded-3xl bg-white p-3 text-center shadow-md ring-1 ring-slate-200 md:p-5 ${COLUNAS_CELULAR[colunasCelular] ?? ''} ${COLUNAS_COMPUTADOR[numeros.length] ?? ''}`}
      >
        {numeros.map((numero, i) => {
          const cor = CORES_NUMEROS[i % CORES_NUMEROS.length]
          return (
            <div
              key={numero.id}
              className={`flex flex-col items-center border-dashed border-slate-200 px-1 ${i % colunasCelular ? 'border-l' : ''} ${i > 0 ? 'md:border-l' : ''}`}
            >
              <Pata className={`h-5 w-5 opacity-80 ${cor ?? ''}`} rotacao={i % 2 ? 15 : -15} />
              <p
                className={`whitespace-nowrap font-titulo text-xl font-extrabold leading-tight sm:text-2xl md:text-3xl ${cor ?? ''}`}
              >
                {numero.titulo}
              </p>
              <p className="text-xs font-semibold text-slate-600 md:text-sm">{numero.texto}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function EsperandoHaMaisTempo({ texto, hoje }: { texto: string; hoje: string }) {
  const destaques = useDestaques()
  const animais = destaques.data?.animais ?? []
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Chapeu>Eles precisam de você</Chapeu>
          <h2 className="font-titulo text-3xl font-extrabold text-azul-escuro">
            Esperando há mais tempo
          </h2>
          <TextoSimples texto={texto} className="max-w-2xl text-slate-600" />
        </div>
        <Link
          to="/animais"
          className="hidden shrink-0 font-bold text-azul hover:underline sm:block"
        >
          Ver todos →
        </Link>
      </div>
      {destaques.isPending && <Carregando texto="Buscando os animais…" />}
      {animais.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {animais.map((animal) => (
            <CardAnimal key={animal.id} animal={animal} hoje={hoje} destaque />
          ))}
        </div>
      )}
      <Link
        to="/animais"
        className="mt-5 block rounded-xl bg-azul py-3 text-center font-extrabold text-white sm:hidden"
      >
        Ver todos os animais
      </Link>
    </section>
  )
}

export function Inicio() {
  const site = useSite()
  const vitrine = useVitrine()
  const { hash } = useLocation()
  const hoje = hojeNoBrasil()

  // Link "Conheça a história" (Como ajudar) leva para /#historia
  useEffect(() => {
    if (hash && site.isSuccess) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash, site.isSuccess])

  if (site.isPending) return <Carregando />
  if (site.isError) return <ErroAoCarregar tentarDeNovo={() => void site.refetch()} />

  const { textos, listas, ong } = site.data
  const comFoto = (vitrine.data?.animais ?? []).filter((animal) => animal.foto)
  const cao = comFoto.find((animal) => animal.especie === 'cao')
  const gato = comFoto.find((animal) => animal.especie === 'gato')
  const [fotoPrincipal, ...galeria] = listas.inicio_fotos
  const marcos = listas.inicio_marcos
  const passos = listas.como_adotar_passos

  return (
    <>
      <title>SOS Patas – Adoção de animais em Passos/MG</title>

      <section className="relative overflow-hidden bg-azul pb-10 text-white md:pb-14">
        <Pata className="absolute -right-8 -top-8 h-44 w-44 text-white/[.07]" rotacao={20} />
        <Pata
          className="absolute left-[45%] top-6 hidden h-16 w-16 text-white/[.08] md:block"
          rotacao={-25}
        />
        {TRILHA.map(([esquerda, topo, rotacao], i) => (
          <Pata
            key={i}
            className={`absolute h-5 w-5 text-white/20 md:h-7 md:w-7 ${i > 4 ? 'hidden md:inline-block' : ''}`}
            rotacao={rotacao}
            style={{ left: `${String(esquerda)}%`, top: `${String(topo)}%` }}
          />
        ))}
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-vermelho px-3 py-1 text-xs font-extrabold uppercase tracking-wide">
              <Pata className="h-3.5 w-3.5" rotacao={-15} />
              Adoção responsável
            </span>
            <h1 className="mt-3 font-titulo text-4xl font-extrabold leading-[1.05] md:text-6xl">
              {textos['inicio.chamada_titulo']}
              <span className="ml-2 inline-flex items-end gap-0.5 align-baseline text-amarelo">
                <Pata className="h-6 w-6 md:h-9 md:w-9" rotacao={-20} />
                <Pata
                  className="h-4 w-4 -translate-y-3 md:h-6 md:w-6 md:-translate-y-5"
                  rotacao={10}
                />
              </span>
            </h1>
            <TextoSimples
              texto={textos['inicio.chamada_texto']}
              className="mt-3 max-w-md text-lg text-white/90"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/animais"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amarelo px-6 py-3 font-extrabold text-azul-escuro shadow-lg hover:brightness-105"
              >
                <Pata className="h-5 w-5" rotacao={-15} />
                Ver animais para adoção
              </Link>
              <Link
                to="/ajude"
                className="min-h-11 rounded-full border-2 border-white/70 px-6 py-3 font-bold hover:bg-white/10"
              >
                Ajude a ONG
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 px-2">
            <Polaroide animal={cao} inclinacao="-rotate-3" selo="pata" />
            <div className="mt-8">
              <Polaroide animal={gato} inclinacao="rotate-3" selo="coracao" />
            </div>
          </div>
        </div>
        <svg
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-8 w-full text-fundo md:h-12"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,38 C180,8 360,58 540,34 C720,10 900,56 1080,32 C1260,8 1350,40 1440,28 L1440,60 L0,60 Z"
          />
        </svg>
      </section>

      <FaixaNumeros numeros={listas.inicio_numeros} />

      <section id="historia" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-12">
        <Chapeu>Quem somos</Chapeu>
        <h2 className="font-titulo text-3xl font-extrabold text-azul-escuro">Nossa história</h2>
        <div className={`mt-4 grid gap-6 ${marcos.length ? 'md:grid-cols-[1.3fr_1fr]' : ''}`}>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {fotoPrincipal?.foto && (
              <figure className="relative">
                <img
                  src={fotoPrincipal.foto.completa}
                  alt={fotoPrincipal.texto}
                  className="aspect-[16/9] w-full object-cover"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-2 pt-6 text-sm font-semibold text-white">
                  {fotoPrincipal.texto}
                </figcaption>
              </figure>
            )}
            <TextoSimples
              texto={textos['inicio.historia']}
              className="p-5 text-lg leading-relaxed text-slate-700"
            />
          </div>
          {marcos.length > 0 && (
            <ol className="relative space-y-4 border-l-4 border-azul-claro pl-6">
              {marcos.map((marco, i) => (
                <li key={marco.id} className="relative">
                  <span className="absolute -left-[39px] top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-fundo text-vermelho">
                    <Pata className="h-5 w-5" rotacao={i % 2 ? 15 : -15} />
                  </span>
                  <p className="font-titulo text-xl font-extrabold text-azul">{marco.titulo}</p>
                  <TextoSimples texto={marco.texto} className="text-slate-700" />
                </li>
              ))}
            </ol>
          )}
        </div>
        {galeria.length > 0 && (
          <>
            <h3 className="mt-8 font-titulo text-2xl font-bold text-azul-escuro">
              Nossa história em fotos
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {galeria.map((item) => (
                <figure
                  key={item.id}
                  className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200"
                >
                  {item.foto && (
                    <img
                      src={item.foto.miniatura}
                      alt={item.texto}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  )}
                  <figcaption className="p-2.5 text-xs font-semibold text-slate-600">
                    {item.texto}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="flex flex-col items-center gap-5 rounded-2xl bg-azul-claro p-6 sm:flex-row">
          <img
            src="/logo.png"
            alt="Logo SOS Patas"
            className="h-28 w-28 shrink-0 rounded-xl bg-white ring-1 ring-slate-200"
          />
          <div>
            <Chapeu cor="text-azul">Nossa missão</Chapeu>
            <TextoSimples
              texto={textos['inicio.missao']}
              className="text-lg leading-relaxed text-slate-800"
            />
          </div>
        </div>
        {listas.inicio_como_funcionamos.length > 0 && (
          <>
            <h3 className="mt-8 font-titulo text-2xl font-bold text-azul-escuro">
              Como funcionamos
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {listas.inicio_como_funcionamos.map((fato) => (
                <div key={fato.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="font-extrabold text-azul-escuro">{fato.titulo}</p>
                  <TextoSimples texto={fato.texto} className="text-sm text-slate-600" />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <EsperandoHaMaisTempo texto={textos['inicio.esperando_texto']} hoje={hoje} />

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <Chapeu>Passo a passo</Chapeu>
        <h2 className="font-titulo text-3xl font-extrabold text-azul-escuro">Como adotar</h2>
        <ol
          className={`mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 ${COLUNAS_PASSOS[Math.min(passos.length, 5)] ?? ''}`}
        >
          {passos.map((passo, i) => (
            <li
              key={passo.id}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 lg:flex-col lg:items-start lg:py-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vermelho font-titulo text-lg font-extrabold text-white">
                {i + 1}
              </span>
              <p className="min-w-0 hyphens-auto break-words font-extrabold leading-tight text-azul-escuro">
                {passo.titulo}
              </p>
            </li>
          ))}
        </ol>
        <Link to="/como-adotar" className="mt-3 inline-block font-bold text-azul hover:underline">
          Saiba mais sobre a adoção →
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <Link
          to="/perdidos"
          className="flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 hover:shadow-md"
        >
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-azul-claro text-3xl"
          >
            🔎
          </span>
          <span className="flex-1">
            <span className="block font-titulo text-xl font-bold text-azul-escuro">
              Perdeu ou encontrou um animal?
            </span>
            <span className="text-sm text-slate-600">
              Anuncie grátis e a gente ajuda a divulgar até ele voltar para casa.
            </span>
          </span>
          <span aria-hidden="true" className="font-extrabold text-azul">
            →
          </span>
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="relative grid items-center gap-6 overflow-hidden rounded-3xl bg-vermelho p-6 text-white md:grid-cols-[1fr_auto]">
          <Pata className="absolute -bottom-6 -left-4 h-28 w-28 text-white/10" rotacao={25} />
          <Pata
            className="absolute right-1/3 top-2 hidden h-12 w-12 text-white/10 md:inline-block"
            rotacao={-20}
          />
          <div className="relative">
            <h2 className="font-titulo text-3xl font-extrabold">A ONG vive de doações</h2>
            <p className="mt-1 text-white/90">
              Consultas, remédios, castrações e lares temporários têm custo. Qualquer valor ajuda.
            </p>
          </div>
          <BlocoPix ong={ong} variante="destaque" />
        </div>
      </section>
    </>
  )
}
