// T09 · Painel de animais (/admin): números do mês, abas Disponíveis / Em análise / Adotados
// (RN48), busca pelo nome, filtro por responsável e ações rápidas (editar, adotado).
// Aba, busca e filtro ficam no endereço: ao voltar de uma edição, a lista está como estava.
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ROTULOS,
  STATUS_ANIMAL,
  diasEsperando,
  esperandoHaMaisTempo,
  hojeNoBrasil,
  textoAdaptacao,
  textoEspera,
  textoIdade,
  type AnimalAdminResumo,
  type StatusAnimal,
} from '@sospatas/compartilhado'
import { useAnimaisAdmin, useProtetores, useResumo } from '../../api/admin'
import { FotoAnimal } from '../../components/CardAnimal'
import { ModalAdocao, type AnimalParaAdocao } from '../../components/admin/ModalAdocao'
import { ErroAoCarregar } from '../../components/Estados'
import { textoAlternativo } from '../../lib/animal'

const ABAS: { status: StatusAnimal; nome: string }[] = [
  { status: 'disponivel', nome: 'Disponíveis' },
  { status: 'em_analise', nome: 'Em análise' },
  { status: 'adotado', nome: 'Adotados' },
]

const ehStatus = (valor: string | null): valor is StatusAnimal =>
  (STATUS_ANIMAL as readonly (string | null)[]).includes(valor)

function Numero({
  valor,
  rotulo,
  cor,
}: {
  valor: number | undefined
  rotulo: string
  cor: string
}) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
      <p className={`font-titulo text-2xl font-extrabold ${cor}`}>{valor ?? '–'}</p>
      <p className="text-xs font-semibold text-slate-500">{rotulo}</p>
    </div>
  )
}

function Chip({
  ativo,
  aoTocar,
  children,
}: {
  ativo: boolean
  aoTocar: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-pressed={ativo}
      className={`min-h-9 shrink-0 rounded-full border-2 px-3 py-1 text-sm font-bold ${
        ativo ? 'border-azul bg-azul text-white' : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

/** Linha de situação: espera (vermelho se +90 dias, RN12), adaptação (RN30) ou o pedido (RN48). */
function Situacao({ animal, hoje }: { animal: AnimalAdminResumo; hoje: string }) {
  if (animal.status === 'adotado' && animal.data_adocao) {
    return (
      <p className="text-xs font-bold text-emerald-700">
        {textoAdaptacao(animal.data_adocao, hoje)}
      </p>
    )
  }
  if (animal.status === 'em_analise') {
    if (!animal.pedido) return <p className="text-xs font-bold text-slate-500">Em análise</p>
    return (
      <Link
        to={`/admin/pedidos/${animal.pedido.id}`}
        className="text-xs font-bold text-azul underline"
      >
        {animal.pedido.status === 'pendente'
          ? '📋 Pedido aguardando análise'
          : '✅ Pedido aprovado: falta a entrega'}
      </Link>
    )
  }
  const muito = esperandoHaMaisTempo(animal, hoje)
  return (
    <p className={`text-xs font-bold ${muito ? 'text-vermelho' : 'text-slate-500'}`}>
      Esperando há {textoEspera(diasEsperando(animal.data_entrada, hoje))}
    </p>
  )
}

function ItemAnimal({
  animal,
  hoje,
  aoAdotar,
}: {
  animal: AnimalAdminResumo
  hoje: string
  aoAdotar: () => void
}) {
  const detalhes = [
    ROTULOS.especie[animal.especie],
    textoIdade(animal.nascimento_aprox, hoje),
    animal.lar_nome,
  ].filter(Boolean)
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-2.5 ring-1 ring-slate-200">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <FotoAnimal url={animal.foto} alt={textoAlternativo(animal)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-titulo text-lg font-bold leading-tight text-azul-escuro">
          {animal.nome}
        </p>
        <p className="truncate text-xs text-slate-500">{detalhes.join(' · ')}</p>
        {animal.protetor && (
          <p className="truncate text-xs font-semibold text-azul">🤝 {animal.protetor.nome}</p>
        )}
        <Situacao animal={animal} hoje={hoje} />
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        <Link
          to={`/admin/animais/${animal.id}`}
          aria-label={`Editar ${animal.nome}`}
          className="flex min-h-9 items-center justify-center rounded-lg bg-azul-claro px-3 text-xs font-extrabold text-azul"
        >
          Editar
        </Link>
        {animal.status === 'disponivel' && (
          <button
            type="button"
            onClick={aoAdotar}
            aria-label={`${animal.nome} foi adotado`}
            className="min-h-9 rounded-lg bg-emerald-50 px-3 text-xs font-extrabold text-emerald-700"
          >
            Adotado ✓
          </button>
        )}
      </div>
    </li>
  )
}

export function Painel() {
  const [params, setParams] = useSearchParams()
  const abaParam = params.get('aba')
  const status: StatusAnimal = ehStatus(abaParam) ? abaParam : 'disponivel'
  const responsavel = params.get('responsavel') ?? ''
  const [busca, setBusca] = useState(params.get('busca') ?? '')
  const [adotando, setAdotando] = useState<AnimalParaAdocao | null>(null)
  const hoje = hojeNoBrasil()

  const resumo = useResumo()
  const protetores = useProtetores()
  const lista = useAnimaisAdmin({ status, responsavel, busca: busca.trim() })

  /** Muda um parâmetro do endereço sem criar uma entrada nova no "voltar" do navegador. */
  function mudar(nome: string, valor: string) {
    setParams(
      (atual) => {
        const novo = new URLSearchParams(atual)
        if (valor) novo.set(nome, valor)
        else novo.delete(nome)
        return novo
      },
      { replace: true },
    )
  }

  const protetorEscolhido = responsavel !== '' && responsavel !== 'ong'
  const perdidos = resumo.data?.perdidos_pendentes ?? 0
  const animais = lista.data?.animais ?? []

  return (
    <>
      <title>Animais · Área da ONG · SOS Patas</title>
      <h1 className="sr-only">Animais</h1>
      <div className="grid grid-cols-3 gap-2">
        <Numero valor={resumo.data?.disponiveis} rotulo="disponíveis" cor="text-azul" />
        <Numero
          valor={resumo.data?.esperando_muito}
          rotulo="adultos esperando +90 dias"
          cor="text-vermelho"
        />
        <Numero
          valor={resumo.data?.adotados_no_mes}
          rotulo="adotados no mês"
          cor="text-emerald-600"
        />
      </div>

      {perdidos > 0 && (
        <Link
          to="/admin/perdidos"
          className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-amarelo-claro p-3 ring-2 ring-amarelo"
        >
          <span className="min-w-0 font-bold text-[#7A4A00]">🔎 Perdidos e encontrados</span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-vermelho px-2.5 py-1 text-xs font-extrabold text-white">
            {perdidos} aguardando aprovação
          </span>
        </Link>
      )}

      <div
        role="tablist"
        aria-label="Situação"
        className="mt-4 flex rounded-xl bg-slate-200 p-1 font-bold"
      >
        {ABAS.map((aba) => (
          <button
            key={aba.status}
            type="button"
            role="tab"
            aria-selected={status === aba.status}
            onClick={() => {
              mudar('aba', aba.status === 'disponivel' ? '' : aba.status)
            }}
            className={`min-h-10 flex-1 rounded-lg px-1 py-2 text-sm sm:text-base ${
              status === aba.status ? 'bg-white text-azul-escuro shadow' : 'text-slate-600'
            }`}
          >
            {aba.nome}
          </button>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Buscar pelo nome</span>
        <input
          type="search"
          value={busca}
          onChange={(evento) => {
            setBusca(evento.target.value)
            mudar('busca', evento.target.value.trim())
          }}
          placeholder="Buscar pelo nome…"
          maxLength={40}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base focus:border-azul focus:outline-none"
        />
      </label>

      <p className="mt-3 text-xs font-bold text-slate-500">Responsável:</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Chip
          ativo={responsavel === ''}
          aoTocar={() => {
            mudar('responsavel', '')
          }}
        >
          Todos
        </Chip>
        <Chip
          ativo={responsavel === 'ong'}
          aoTocar={() => {
            mudar('responsavel', 'ong')
          }}
        >
          SOS Patas
        </Chip>
        <Chip
          ativo={protetorEscolhido}
          aoTocar={() => {
            mudar('responsavel', 'protetor')
          }}
        >
          Protetores
        </Chip>
      </div>
      {protetorEscolhido && (protetores.data?.protetores.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {protetores.data?.protetores.map((protetor) => (
            <Chip
              key={protetor.id}
              ativo={responsavel === protetor.id}
              aoTocar={() => {
                mudar('responsavel', protetor.id)
              }}
            >
              🤝 {protetor.nome}
            </Chip>
          ))}
        </div>
      )}

      {lista.isError ? (
        <ErroAoCarregar tentarDeNovo={() => void lista.refetch()} />
      ) : lista.isPending ? (
        <p role="status" className="mt-6 text-center text-slate-500">
          Carregando…
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-slate-500" aria-live="polite">
            {animais.length === 1 ? '1 animal' : `${String(animais.length)} animais`}
          </p>
          <ul className="mt-2 space-y-2">
            {animais.map((animal) => (
              <ItemAnimal
                key={animal.id}
                animal={animal}
                hoje={hoje}
                aoAdotar={() => {
                  setAdotando({
                    id: animal.id,
                    nome: animal.nome,
                    protetor: animal.protetor?.nome ?? null,
                  })
                }}
              />
            ))}
            {animais.length === 0 && (
              <li className="rounded-2xl bg-white p-6 text-center text-slate-500 ring-1 ring-slate-200">
                Nenhum animal aqui.
              </li>
            )}
          </ul>
        </>
      )}

      <Link
        to="/admin/animais/novo"
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-vermelho px-5 py-4 text-lg font-extrabold text-white shadow-xl md:bottom-6 md:right-6"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        ＋ Cadastrar animal
      </Link>

      {adotando && (
        <ModalAdocao
          animal={adotando}
          aoFechar={() => {
            setAdotando(null)
          }}
          aoConcluir={() => {
            setAdotando(null)
            mudar('aba', 'adotado')
          }}
        />
      )}
    </>
  )
}
