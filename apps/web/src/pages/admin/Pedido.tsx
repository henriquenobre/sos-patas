// T28 · Análise do pedido (/admin/pedidos/:id): quem pediu, alertas automáticos (só chamam
// atenção, nunca reprovam sozinhos), respostas pelos blocos do formulário, ciência do termo
// (RN47), observação interna e as decisões (RN49): aprovar (o animal continua fora do site até
// "Marcar como adotado") ou recusar (o animal volta para o site na hora).
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  BLOCOS,
  LIMITES,
  OPCOES,
  PERGUNTAS,
  ROTULOS,
  formatarWhatsapp,
  hojeNoBrasil,
  linkWhatsApp,
  type PedidoDetalhe,
} from '@sospatas/compartilhado'
import { atualizarAdmin, usePedido } from '../../api/admin'
import { ErroApi, chamarAdmin } from '../../api/cliente'
import { FotoAnimal } from '../../components/CardAnimal'
import { CampoTexto } from '../../components/Campos'
import { Carregando, ErroAoCarregar } from '../../components/Estados'
import { IconeWhatsApp } from '../../components/Icones'
import { BotoesModal, Modal } from '../../components/Modal'
import { useAreaAdmin } from '../../components/admin/contexto'
import { textoAlternativo } from '../../lib/animal'
import { dataEHora, diasDoPedido, textoHaDias } from '../../lib/pedidos'

type Pergunta = keyof typeof PERGUNTAS

/** Resposta pronta para ler: a opção escolhida por extenso; null se a pergunta não se aplica. */
function resposta(pedido: PedidoDetalhe, pergunta: Pergunta): string | null {
  if (pergunta === 'nome') return pedido.nome
  if (pergunta === 'whatsapp') return formatarWhatsapp(pedido.whatsapp)
  if (pergunta === 'bairro_cidade') return pedido.bairro_cidade
  const valor: unknown = (pedido.respostas as Record<string, unknown>)[pergunta]
  if (valor === null || valor === undefined || valor === '') return null
  const opcoes = (OPCOES as Record<string, Record<string, string> | undefined>)[pergunta]
  const porExtenso = (item: unknown) => {
    const texto = typeof item === 'string' ? item : JSON.stringify(item)
    return opcoes?.[texto] ?? texto
  }
  return Array.isArray(valor) ? valor.map(porExtenso).join(' e ') : porExtenso(valor)
}

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <h2 className="font-titulo text-xl font-bold text-azul-escuro">{titulo}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Observacao({ pedido }: { pedido: PedidoDetalhe }) {
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [texto, setTexto] = useState(pedido.observacao_equipe)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const mudou = texto.trim() !== pedido.observacao_equipe

  async function salvar() {
    setErro('')
    setEnviando(true)
    try {
      await chamarAdmin('PUT', `/pedidos/${pedido.id}/observacao`, { observacao: texto })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'pedidos'] })
      avisar('Observação salva ✓')
    } catch (falha) {
      setErro(
        falha instanceof ErroApi && falha.campos.observacao
          ? falha.campos.observacao
          : mensagemDeErro(falha),
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Cartao titulo="🔒 Observação interna">
      <CampoTexto
        rotulo="Anotações da conversa (só a equipe vê)"
        obrigatorio={false}
        multilinha
        valor={texto}
        aoMudar={setTexto}
        erro={erro}
        limite={LIMITES.pedidos_adocao.observacao_equipe}
      />
      <button
        type="button"
        onClick={() => void salvar()}
        disabled={!mudou || enviando}
        className="mt-2 min-h-11 w-full rounded-xl bg-azul py-2.5 font-extrabold text-white disabled:opacity-50"
      >
        {enviando ? 'Salvando…' : 'Salvar observação'}
      </button>
    </Cartao>
  )
}

function Decisao({ pedido }: { pedido: PedidoDetalhe }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [acao, setAcao] = useState<'aprovar' | 'recusar' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState('')
  const animal = pedido.animal
  const primeiroNome = pedido.nome.split(' ')[0] ?? pedido.nome

  async function decidir(qual: 'aprovar' | 'recusar') {
    setFalha('')
    setEnviando(true)
    try {
      await chamarAdmin('POST', `/pedidos/${pedido.id}/${qual}`)
      await atualizarAdmin(queryClient)
      if (qual === 'aprovar') {
        setAcao(null)
        setEnviando(false)
        avisar('Pedido aprovado ✓')
      } else {
        avisar(`Pedido recusado. ${animal.nome} voltou para o site.`, `/animais/${animal.id}`)
        void navigate('/admin/pedidos')
      }
    } catch (erro) {
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
    }
  }

  const fechar = () => {
    setAcao(null)
    setFalha('')
  }
  const textoFalha = falha && (
    <p
      role="alert"
      className="mt-3 rounded-xl bg-vermelho-claro p-3 text-sm font-bold text-vermelho"
    >
      {falha}
    </p>
  )

  if (pedido.status === 'aprovado') {
    return (
      <Cartao titulo="✅ Pedido aprovado">
        <p className="text-slate-700">
          Combine com {primeiroNome} pelo WhatsApp onde buscar {animal.nome}. Na entrega, abra o
          animal e toque em <b>"Marcar como adotado"</b>: o nome e o WhatsApp já vêm preenchidos.
        </p>
        <Link
          to={`/admin/animais/${animal.id}`}
          className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 py-3 font-extrabold text-white"
        >
          Abrir {animal.nome}
        </Link>
      </Cartao>
    )
  }
  if (pedido.status !== 'pendente') return null

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setAcao('recusar')
          }}
          className="min-h-12 rounded-xl py-3 font-extrabold text-vermelho ring-2 ring-vermelho-claro"
        >
          Recusar
        </button>
        <button
          type="button"
          onClick={() => {
            setAcao('aprovar')
          }}
          className="min-h-12 rounded-xl bg-emerald-600 py-3 font-extrabold text-white"
        >
          Aprovar
        </button>
      </div>
      {acao === 'aprovar' && (
        <Modal
          titulo={`Aprovar o pedido de ${primeiroNome}?`}
          aoFechar={enviando ? undefined : fechar}
        >
          <p className="text-slate-600">
            {animal.nome} continua fora do site. Combine a entrega pelo WhatsApp e, quando{' '}
            {primeiroNome} buscar {animal.nome}, use "Marcar como adotado".
          </p>
          {textoFalha}
          <BotoesModal
            aoCancelar={fechar}
            rotulo="Aprovar"
            cor="bg-emerald-600"
            enviando={enviando}
            aoConfirmar={() => void decidir('aprovar')}
          />
        </Modal>
      )}
      {acao === 'recusar' && (
        <Modal
          titulo={`Recusar o pedido de ${primeiroNome}?`}
          corTitulo="text-vermelho"
          aoFechar={enviando ? undefined : fechar}
        >
          <p className="text-slate-600">
            {animal.nome} volta para o site. Avise a pessoa pelo WhatsApp.
          </p>
          {textoFalha}
          <BotoesModal
            aoCancelar={fechar}
            rotulo="Recusar"
            cor="bg-vermelho"
            enviando={enviando}
            aoConfirmar={() => void decidir('recusar')}
          />
        </Modal>
      )}
    </>
  )
}

function Analise({ pedido }: { pedido: PedidoDetalhe }) {
  const hoje = hojeNoBrasil()
  const animal = pedido.animal
  const dias = diasDoPedido(pedido.created_at, hoje)
  const primeiroNome = pedido.nome.split(' ')[0] ?? pedido.nome
  const mensagem = `Olá, ${primeiroNome}! Aqui é da SOS Patas, sobre o seu pedido para adotar ${animal.nome}.`

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <title>{`Pedido de ${pedido.nome} · Área da ONG · SOS Patas`}</title>
      <h1 className="sr-only">Pedido de adoção</h1>

      <Link
        to={`/admin/animais/${animal.id}`}
        className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200"
      >
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          <FotoAnimal url={animal.foto} alt={textoAlternativo(animal)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500">Pedido para adotar</p>
          <p className="font-titulo text-2xl font-extrabold leading-tight text-azul-escuro">
            {animal.nome}
          </p>
          {animal.protetor_nome && (
            <p className="text-xs font-semibold text-azul">🤝 Protetor: {animal.protetor_nome}</p>
          )}
        </div>
      </Link>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-sm font-bold text-slate-500">Quem pediu</p>
        <p className="font-titulo text-2xl font-bold text-azul-escuro">{pedido.nome}</p>
        <p className="text-slate-600">{pedido.bairro_cidade}</p>
        <p className="mt-1 text-sm text-slate-500">
          Enviado em {dataEHora(pedido.created_at)} ({textoHaDias(dias)}) ·{' '}
          <b>{ROTULOS.pedido_status[pedido.status]}</b>
        </p>
        <a
          href={linkWhatsApp(pedido.whatsapp, mensagem)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 font-extrabold text-white"
        >
          <IconeWhatsApp /> Conversar no WhatsApp · {formatarWhatsapp(pedido.whatsapp)}
        </a>
        {pedido.analisado_em && (
          <p className="mt-2 text-sm text-slate-500">
            {ROTULOS.pedido_status[pedido.status]}
            {pedido.analisado_por && ` por ${pedido.analisado_por}`} em{' '}
            {dataEHora(pedido.analisado_em)}
          </p>
        )}
      </section>

      {pedido.alertas.length > 0 ? (
        <section className="rounded-2xl bg-amarelo-claro p-4 ring-2 ring-amarelo">
          <h2 className="font-extrabold text-[#7A4A00]">⚠️ Pontos para conversar</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pedido.alertas.map((alerta) => (
              <li
                key={alerta.codigo}
                className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#7A4A00]"
              >
                {alerta.texto}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[#7A4A00]">
            Os alertas só chamam atenção para a conversa: não reprovam o pedido.
          </p>
        </section>
      ) : (
        <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          Nenhum alerta automático nas respostas.
        </p>
      )}

      <Decisao pedido={pedido} />

      {BLOCOS.map((bloco) => (
        <Cartao key={bloco.titulo} titulo={bloco.titulo}>
          <dl className="space-y-3">
            {bloco.perguntas.map((pergunta) => {
              const texto = resposta(pedido, pergunta)
              if (texto === null) return null
              return (
                <div key={pergunta}>
                  <dt className="text-sm font-bold text-slate-500">{PERGUNTAS[pergunta]}</dt>
                  <dd className="whitespace-pre-line text-slate-800">{texto}</dd>
                </div>
              )
            })}
          </dl>
        </Cartao>
      ))}

      <Cartao titulo="Termo de adoção">
        <p className="text-slate-700">
          ✓ Ciente do termo em {dataEHora(pedido.termo_ciente_em)} (termo versão{' '}
          {pedido.versao_termo}, formulário versão {pedido.versao_formulario}).
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Consentimento para uso dos dados (LGPD) em {dataEHora(pedido.consentimento_em)}.
        </p>
      </Cartao>

      <Observacao pedido={pedido} />
    </div>
  )
}

export function Pedido() {
  const { id } = useParams()
  const pedido = usePedido(id)
  if (pedido.isPending) return <Carregando />
  if (pedido.isError) {
    if (pedido.error instanceof ErroApi && pedido.error.status === 404) {
      return (
        <div className="py-12 text-center">
          <title>Pedido não encontrado · Área da ONG · SOS Patas</title>
          <h1 className="font-titulo text-2xl font-bold text-azul-escuro">
            Não encontramos este pedido
          </h1>
          <p className="mt-2 text-slate-600">
            Pedidos recusados ou concluídos são apagados 90 dias depois (LGPD).
          </p>
          <Link
            to="/admin/pedidos"
            className="mt-4 inline-block font-extrabold text-azul underline"
          >
            Voltar para os pedidos
          </Link>
        </div>
      )
    }
    return <ErroAoCarregar tentarDeNovo={() => void pedido.refetch()} />
  }
  return <Analise pedido={pedido.data} />
}
