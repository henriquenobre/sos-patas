// T03 · Ficha do animal: fotos completas (RN01, RN03), saúde sem promessa de castração (RN17),
// temperamento, responsável e aviso de protetor (RN31), benefício de adotar pelo site (RN32)
// e o botão "Quero adotar", que leva ao formulário de adoção (RN14).
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import {
  ROTULOS,
  diasEsperando,
  esperandoHaMaisTempo,
  hojeNoBrasil,
  textoEspera,
  textoIdade,
  type AnimalFicha,
  type SimNaoSemInformacao,
} from '@sospatas/compartilhado'
import { ErroApi } from '../api/cliente'
import { useFicha } from '../api/publico'
import { FotoAnimal } from '../components/CardAnimal'
import { Carregando, ErroAoCarregar, TituloPagina } from '../components/Estados'
import { Pata } from '../components/Pata'
import { textoAlternativo } from '../lib/animal'

const CORES_TAG = {
  azul: 'bg-azul-claro text-azul',
  vermelho: 'bg-vermelho-claro text-vermelho',
  verde: 'bg-emerald-50 text-emerald-700',
}

function Tag({ children, cor = 'azul' }: { children: ReactNode; cor?: keyof typeof CORES_TAG }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${CORES_TAG[cor]}`}
    >
      {children}
    </span>
  )
}

/** Linha de Saúde/Temperamento: ✓ (sim), × (não) ou ? (sem informação, em cinza). */
function Item({
  estado,
  children,
}: {
  estado: 'sim' | 'nao' | 'sem_informacao'
  children: ReactNode
}) {
  const marca = {
    sim: { simbolo: '✓', classe: 'bg-emerald-100 text-emerald-700', texto: 'text-slate-800' },
    nao: { simbolo: '×', classe: 'bg-slate-100 text-slate-500', texto: 'text-slate-500' },
    sem_informacao: {
      simbolo: '?',
      classe: 'bg-slate-100 text-slate-500',
      texto: 'text-slate-500',
    },
  }[estado]
  return (
    <li className={`flex items-center gap-2 ${marca.texto}`}>
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${marca.classe}`}
      >
        {marca.simbolo}
      </span>
      {children}
    </li>
  )
}

const deBooleano = (valor: boolean | null) =>
  valor === null ? 'sem_informacao' : valor ? 'sim' : 'nao'

function Saude({ animal }: { animal: AnimalFicha }) {
  const ela = animal.sexo === 'femea'
  const terminacao = ela ? 'a' : 'o'
  const triplo = (valor: SimNaoSemInformacao, sim: string, nao: string, semInfo: string) => (
    <Item estado={valor}>{valor === 'sim' ? sim : valor === 'nao' ? nao : semInfo}</Item>
  )
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">Saúde</h2>
      <ul className="space-y-2 font-semibold">
        <Item estado={animal.castrado ? 'sim' : 'nao'}>
          {animal.castrado ? `Castrad${terminacao}` : `Ainda não castrad${terminacao}`}
        </Item>
        {triplo(
          animal.vacinado,
          `Vacinad${terminacao}${animal.vacinas ? ` (${animal.vacinas})` : ''}`,
          `Não vacinad${terminacao}`,
          'Vacinação: sem informação',
        )}
        {triplo(
          animal.vermifugado,
          `Vermifugad${terminacao} nos últimos 3 meses`,
          `Não vermifugad${terminacao} nos últimos 3 meses`,
          'Vermífugo: sem informação',
        )}
        {animal.problema_saude ? (
          <li className="flex items-start gap-2 text-[#7A4A00]">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amarelo-claro text-xs font-bold"
            >
              !
            </span>
            <span>{animal.problema_saude}</span>
          </li>
        ) : (
          <Item estado="sim">Sem problema de saúde conhecido</Item>
        )}
      </ul>
    </div>
  )
}

function Temperamento({ animal }: { animal: AnimalFicha }) {
  const texto = (valor: boolean | null, rotulo: string) =>
    valor === null ? `${rotulo}: não informado` : rotulo
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
        Temperamento
      </h2>
      <ul className="space-y-2 font-semibold">
        <Item estado={deBooleano(animal.docil)}>
          {texto(animal.docil, animal.docil === false ? 'Não é dócil' : 'Dócil')}
        </Item>
        <Item estado={deBooleano(animal.convive_animais)}>
          {texto(
            animal.convive_animais,
            animal.convive_animais === false
              ? 'Não convive com outros animais'
              : 'Convive com outros animais',
          )}
        </Item>
      </ul>
    </div>
  )
}

function Galeria({ animal }: { animal: AnimalFicha }) {
  const [atual, setAtual] = useState(0)
  const alt = textoAlternativo(animal)
  const foto = animal.fotos[atual] ?? animal.fotos[0]
  return (
    <div>
      <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-slate-200 md:aspect-square">
        <FotoAnimal url={foto?.completa ?? null} alt={alt} />
      </div>
      {animal.fotos.length > 1 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {animal.fotos.map((item, i) => (
            <button
              key={item.completa}
              type="button"
              onClick={() => {
                setAtual(i)
              }}
              aria-label={`Ver foto ${String(i + 1)} de ${String(animal.fotos.length)}`}
              aria-pressed={i === atual}
              className={`overflow-hidden rounded-xl ring-2 ${i === atual ? 'ring-azul' : 'opacity-70 ring-transparent'}`}
            >
              <img src={item.miniatura} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function linhaRaca(animal: AnimalFicha): string {
  const raca = animal.raca ?? 'não informada'
  const tipo =
    animal.raca_tipo && !/^SRD/i.test(animal.raca ?? '')
      ? ` (${ROTULOS.raca_tipo[animal.raca_tipo].toLowerCase()})`
      : ''
  return `${raca}${tipo}`
}

export function Ficha() {
  const { id = '' } = useParams()
  const ficha = useFicha(id)
  const hoje = hojeNoBrasil()

  if (ficha.isPending) return <Carregando />
  if (ficha.isError) {
    if (ficha.error instanceof ErroApi && ficha.error.status === 404) {
      return (
        <>
          <title>Animal não encontrado · SOS Patas</title>
          <TituloPagina titulo="Animal não encontrado" />
          <p className="mx-auto max-w-6xl px-4 pt-6">
            <Link className="font-bold text-azul underline" to="/animais">
              Ver os animais para adoção
            </Link>
          </p>
        </>
      )
    }
    return <ErroAoCarregar tentarDeNovo={() => void ficha.refetch()} />
  }

  const animal = ficha.data

  // RN48: com pedido de adoção em análise, o animal sai do site; por um link antigo, só o aviso
  if (animal.status === 'em_analise') {
    return (
      <>
        <title>{`${animal.nome} · SOS Patas`}</title>
        <section className="mx-auto max-w-xl px-4 py-12 text-center">
          <div className="mx-auto h-40 w-40 overflow-hidden rounded-full ring-4 ring-azul-claro">
            <FotoAnimal url={animal.fotos[0]?.miniatura ?? null} alt={textoAlternativo(animal)} />
          </div>
          <h1 className="mt-4 font-titulo text-3xl font-extrabold text-azul-escuro">
            {animal.nome} está em processo de adoção
          </h1>
          <p className="mt-2 text-slate-600">
            Que tal conhecer outros animais que esperam uma família?
          </p>
          <Link
            to="/animais"
            className="mt-6 inline-block min-h-11 rounded-full bg-azul px-6 py-3 font-extrabold text-white"
          >
            Ver outros animais
          </Link>
        </section>
      </>
    )
  }
  const disponivel = animal.status === 'disponivel'
  const protetor = animal.responsavel.tipo === 'protetor'

  return (
    <>
      <title>{`${animal.nome} · SOS Patas`}</title>
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <Link to="/animais" className="inline-flex min-h-11 items-center gap-1 font-bold text-azul">
          ← Voltar
        </Link>
      </div>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pt-1 md:grid-cols-2">
        <Galeria key={animal.id} animal={animal} />
        <div>
          {animal.status === 'adotado' ? (
            <Tag cor="verde">Adotado 💙</Tag>
          ) : (
            esperandoHaMaisTempo(animal, hoje) && (
              <Tag cor="vermelho">
                Esperando há {textoEspera(diasEsperando(animal.data_entrada, hoje))}
              </Tag>
            )
          )}
          <h1 className="mt-2 font-titulo text-5xl font-extrabold text-azul-escuro">
            {animal.nome}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Tag>{ROTULOS.especie[animal.especie]}</Tag>
            <Tag>{ROTULOS.sexo[animal.sexo]}</Tag>
            <Tag>{textoIdade(animal.nascimento_aprox, hoje)}</Tag>
            <Tag>Porte {ROTULOS.porte[animal.porte].toLowerCase()}</Tag>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            <b>Raça:</b> {linhaRaca(animal)} · <b>Pelagem:</b>{' '}
            {animal.cor_pelagem ?? 'não informada'}
          </p>
          {animal.descricao && (
            <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-slate-700">
              {animal.descricao}
            </p>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Saude animal={animal} />
            <Temperamento animal={animal} />
          </div>

          <div className="mt-4 rounded-2xl bg-azul-claro p-4 text-sm">
            <p>
              <span className="font-extrabold text-azul-escuro">Responsável:</span>{' '}
              {animal.responsavel.nome}
              {protetor && ' (protetor parceiro)'}
            </p>
            <p className="mt-1 text-slate-700">
              Adoção com formulário de interesse, termo de adoção e <b>15 dias de adaptação</b>.
            </p>
            {protetor && (
              <p className="mt-2 rounded-xl bg-amarelo-claro p-2.5 text-[13px] text-[#7A4A00]">
                Este animal é de um protetor parceiro. A adoção é combinada diretamente com{' '}
                {animal.responsavel.nome}; a SOS Patas apenas divulga e não é responsável por esta
                adoção.
              </p>
            )}
          </div>
          <div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
            🎁 <b>Adotando pelo site:</b> prioridade na castração gratuita (castramóvel) e desconto
            em clínicas parceiras.
          </div>

          {disponivel && (
            <>
              <div
                className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 md:static md:mt-5 md:border-0 md:bg-transparent md:p-0"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
              >
                <Link
                  to={`/animais/${animal.id}/adotar`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-4 text-lg font-extrabold text-white shadow-lg hover:brightness-95"
                >
                  <Pata className="h-6 w-6" rotacao={-15} />
                  Quero adotar {animal.nome}
                </Link>
              </div>
              <div className="h-20 md:hidden" />
            </>
          )}
        </div>
      </section>
    </>
  )
}
