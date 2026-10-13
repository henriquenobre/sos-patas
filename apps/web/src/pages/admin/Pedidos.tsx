// T27 · Pedidos de adoção (/admin/pedidos): quem pediu qual animal, há quanto tempo e quantos
// alertas. O animal fica fora do site enquanto o pedido espera (RN48), por isso pedido pendente
// há mais de 3 dias aparece em vermelho (RN50).
import { Link, useSearchParams } from 'react-router'
import {
  DIAS_ALERTA_PEDIDO_PARADO,
  hojeNoBrasil,
  type PedidoResumo,
  type PedidoStatus,
} from '@sospatas/compartilhado'
import { usePedidos } from '../../api/admin'
import { FotoAnimal } from '../../components/CardAnimal'
import { ErroAoCarregar } from '../../components/Estados'
import { TituloAdmin } from '../../components/admin/Navegacao'
import { textoAlternativo } from '../../lib/animal'
import { diasDoPedido, textoHaDias } from '../../lib/pedidos'

const ABAS: { status: PedidoStatus; nome: string }[] = [
  { status: 'pendente', nome: 'Pendentes' },
  { status: 'aprovado', nome: 'Aprovados' },
  { status: 'recusado', nome: 'Recusados' },
]

function ItemPedido({ pedido, hoje }: { pedido: PedidoResumo; hoje: string }) {
  const dias = diasDoPedido(pedido.created_at, hoje)
  const parado = pedido.status === 'pendente' && dias > DIAS_ALERTA_PEDIDO_PARADO
  return (
    <li>
      <Link
        to={`/admin/pedidos/${pedido.id}`}
        className={`flex items-center gap-3 rounded-2xl bg-white p-2.5 ${
          parado ? 'ring-2 ring-vermelho' : 'ring-1 ring-slate-200'
        }`}
      >
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          <FotoAnimal url={pedido.animal.foto} alt={textoAlternativo(pedido.animal)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-titulo text-lg font-bold leading-tight text-azul-escuro">
            {pedido.animal.nome}
          </p>
          <p className="truncate text-sm text-slate-700">
            {pedido.nome} · {pedido.bairro_cidade}
          </p>
          {pedido.animal.protetor_nome && (
            <p className="truncate text-xs font-semibold text-azul">
              🤝 Protetor: {pedido.animal.protetor_nome}
            </p>
          )}
          <p className={`text-xs font-bold ${parado ? 'text-vermelho' : 'text-slate-500'}`}>
            Pedido {textoHaDias(dias)}
            {parado && ' · esperando análise'}
          </p>
        </div>
        {pedido.quantidade_alertas > 0 && (
          <span className="shrink-0 rounded-full bg-amarelo-claro px-2.5 py-1 text-xs font-extrabold text-[#7A4A00] ring-1 ring-amarelo">
            ⚠️ {pedido.quantidade_alertas}
            <span className="sr-only">
              {pedido.quantidade_alertas === 1 ? ' alerta' : ' alertas'}
            </span>
          </span>
        )}
      </Link>
    </li>
  )
}

export function Pedidos() {
  const [params, setParams] = useSearchParams()
  const abaParam = params.get('aba')
  const status = ABAS.find((aba) => aba.status === abaParam)?.status ?? 'pendente'
  const lista = usePedidos(status)
  const hoje = hojeNoBrasil()
  const pedidos = lista.data?.pedidos ?? []

  return (
    <>
      <title>Pedidos de adoção · Área da ONG · SOS Patas</title>
      <TituloAdmin
        titulo="Pedidos de adoção"
        subtitulo="O animal fica fora do site enquanto o pedido espera. Analise logo."
      />
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
              setParams(aba.status === 'pendente' ? {} : { aba: aba.status }, { replace: true })
            }}
            className={`min-h-10 flex-1 rounded-lg py-2 ${
              status === aba.status ? 'bg-white text-azul-escuro shadow' : 'text-slate-600'
            }`}
          >
            {aba.nome}
          </button>
        ))}
      </div>

      {lista.isError ? (
        <ErroAoCarregar tentarDeNovo={() => void lista.refetch()} />
      ) : lista.isPending ? (
        <p role="status" className="mt-6 text-center text-slate-500">
          Carregando…
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pedidos.map((pedido) => (
            <ItemPedido key={pedido.id} pedido={pedido} hoje={hoje} />
          ))}
          {pedidos.length === 0 && (
            <li className="rounded-2xl bg-white p-6 text-center text-slate-500 ring-1 ring-slate-200">
              {status === 'pendente' ? 'Nenhum pedido esperando análise.' : 'Nenhum pedido aqui.'}
            </li>
          )}
        </ul>
      )}
    </>
  )
}
