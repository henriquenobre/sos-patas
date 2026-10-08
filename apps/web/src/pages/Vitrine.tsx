// T02 · Vitrine: só disponíveis, mais antigos primeiro (RN10), com filtros (RN11) e cards com
// a miniatura (RN03). Os filtros ficam na URL para poder compartilhar a busca.
import { Fragment } from 'react'
import { useSearchParams } from 'react-router'
import { esperandoHaMaisTempo, hojeNoBrasil } from '@sospatas/compartilhado'
import { useVitrine } from '../api/publico'
import { CardAnimal } from '../components/CardAnimal'
import { Carregando, ErroAoCarregar, TituloPagina } from '../components/Estados'
import { alternarFiltro, filtrosDaUrl, temFiltro, type NomeFiltro } from '../lib/filtros'

const GRUPOS: { nome: NomeFiltro; opcoes: { valor: string; texto: string }[] }[] = [
  {
    nome: 'especie',
    opcoes: [
      { valor: 'cao', texto: '🐶 Cães' },
      { valor: 'gato', texto: '🐱 Gatos' },
    ],
  },
  {
    nome: 'idade',
    opcoes: [
      { valor: 'filhote', texto: 'Filhotes' },
      { valor: 'adulto', texto: 'Adultos' },
    ],
  },
  {
    nome: 'porte',
    opcoes: [
      { valor: 'mini', texto: 'Mini' },
      { valor: 'pequeno', texto: 'Pequeno' },
      { valor: 'medio', texto: 'Médio' },
      { valor: 'grande', texto: 'Grande' },
      { valor: 'gigante', texto: 'Gigante' },
    ],
  },
  { nome: 'convive', opcoes: [{ valor: 'sim', texto: 'Convive com outros animais' }] },
]

function ChipFiltro({
  ativo,
  texto,
  aoTocar,
}: {
  ativo: boolean
  texto: string
  aoTocar: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoTocar}
      className={`min-h-11 shrink-0 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold ${
        ativo ? 'border-azul bg-azul text-white' : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      {texto}
    </button>
  )
}

export function Vitrine() {
  const [params, setParams] = useSearchParams()
  const filtro = filtrosDaUrl(params)
  const resultado = useVitrine(filtro)
  // Total sem filtros, para o subtítulo (RN46 permite esta contagem na vitrine)
  const todos = useVitrine()
  const hoje = hojeNoBrasil()
  const total = todos.data?.animais.length

  const animais = resultado.data?.animais ?? []

  return (
    <>
      <title>Animais para adoção · SOS Patas</title>
      <TituloPagina
        titulo="Animais para adoção"
        subtitulo={
          total === undefined
            ? 'Cães e gatos esperando uma família'
            : `${String(total)} ${total === 1 ? 'animal esperando' : 'cães e gatos esperando'} uma família`
        }
      />
      <div className="sticky top-[61px] z-20 border-b border-slate-200 bg-fundo/95 backdrop-blur">
        <div
          role="group"
          aria-label="Filtros"
          className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]"
        >
          {GRUPOS.map((grupo, i) => (
            <Fragment key={grupo.nome}>
              {i > 0 && <span aria-hidden="true" className="mx-1 w-px shrink-0 bg-slate-300" />}
              {grupo.opcoes.map((opcao) => (
                <ChipFiltro
                  key={opcao.valor}
                  texto={opcao.texto}
                  ativo={filtro[grupo.nome] === opcao.valor}
                  aoTocar={() => {
                    setParams(alternarFiltro(params, grupo.nome, opcao.valor), { replace: true })
                  }}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-5">
        {resultado.isPending && <Carregando texto="Buscando os animais…" />}
        {resultado.isError && <ErroAoCarregar tentarDeNovo={() => void resultado.refetch()} />}
        {resultado.isSuccess && (
          <>
            <p className="mb-3 text-sm font-semibold text-slate-500" aria-live="polite">
              {animais.length} {animais.length === 1 ? 'animal encontrado' : 'animais encontrados'}{' '}
              · mais antigos primeiro
            </p>
            {animais.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {animais.map((animal) => (
                  <CardAnimal
                    key={animal.id}
                    animal={animal}
                    hoje={hoje}
                    destaque={esperandoHaMaisTempo({ ...animal, status: 'disponivel' }, hoje)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
                <p className="font-bold text-slate-700">
                  {temFiltro(filtro)
                    ? 'Nenhum animal com esses filtros.'
                    : 'Nenhum animal para adoção agora.'}
                </p>
                {temFiltro(filtro) && (
                  <button
                    type="button"
                    onClick={() => {
                      setParams({}, { replace: true })
                    }}
                    className="mt-2 min-h-11 font-bold text-azul underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}
