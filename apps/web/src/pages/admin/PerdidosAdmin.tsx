// T14 · Moderar perdidos e encontrados (/admin/perdidos). Aguardando: a equipe confere cada
// anúncio (lista da RN28) e aprova (as fotos saem da quarentena para o site, RN19) ou recusa
// (apaga tudo, RN26). No ar: "Sai do ar em N dias" (RN25), renovar (RN41), "Voltou para casa"
// e "Tirar do ar" (apagam tudo, RN26). Criar e editar anúncio pela equipe (T21) é da etapa 13.
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  ROTULOS,
  formatarWhatsapp,
  hojeNoBrasil,
  type PerdidoAdmin,
  type PerdidoStatus,
} from '@sospatas/compartilhado'
import { atualizarAdmin, usePerdidosAdmin } from '../../api/admin'
import { chamarAdmin, urlDaApi } from '../../api/cliente'
import { FotoAnimal } from '../../components/CardAnimal'
import { ErroAoCarregar } from '../../components/Estados'
import { BotoesModal, Modal } from '../../components/Modal'
import { SeloPerdido } from '../../components/SeloPerdido'
import { TituloAdmin } from '../../components/admin/Navegacao'
import { useAreaAdmin } from '../../components/admin/contexto'
import { diasDoPedido } from '../../lib/pedidos'
import { diasAteSairDoAr, textoEnviado, textoSaiDoAr, tituloDoAnuncio } from '../../lib/perdidos'

type Acao = 'recusar' | 'voltou' | 'tirar'

const CONFIRMACOES: Record<Acao, { titulo: string; texto: string; botao: string; aviso: string }> =
  {
    recusar: {
      titulo: 'Recusar o anúncio?',
      texto: 'O anúncio e as fotos são apagados na hora. Quem anunciou não é avisado.',
      botao: 'Recusar e apagar',
      aviso: 'Anúncio recusado e apagado',
    },
    voltou: {
      titulo: 'O animal voltou para casa? 🎉',
      texto: 'O anúncio sai do site e é apagado na hora, com as fotos.',
      botao: 'Sim, apagar o anúncio',
      aviso: 'Que bom! Anúncio apagado 🎉',
    },
    tirar: {
      titulo: 'Tirar o anúncio do ar?',
      texto: 'O anúncio sai do site e é apagado na hora, com as fotos.',
      botao: 'Tirar do ar e apagar',
      aviso: 'Anúncio tirado do ar e apagado',
    },
  }

/** Foto pendente vem da quarentena pela API (só a equipe vê); a publicada, do site. */
const enderecoFoto = (url: string) => (url.startsWith('/api/') ? urlDaApi(url) : url)

function CardModeracao({ anuncio, hoje }: { anuncio: PerdidoAdmin; hoje: string }) {
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [acao, setAcao] = useState<Acao | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  const titulo = tituloDoAnuncio(anuncio)
  const especie = ROTULOS.especie[anuncio.especie]
  const pendente = anuncio.status === 'pendente'
  const diasNoAr = anuncio.expira_em ? diasAteSairDoAr(anuncio.expira_em, hoje) : 0

  async function executar(
    metodo: 'POST' | 'DELETE',
    caminho: string,
    aviso: string,
    link?: string,
  ) {
    setEnviando(true)
    setFalha(null)
    try {
      await chamarAdmin(metodo, caminho)
      setAcao(null)
      avisar(aviso, link)
      await atualizarAdmin(queryClient)
    } catch (erro) {
      setFalha(mensagemDeErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  const fechar = enviando
    ? undefined
    : () => {
        setAcao(null)
        setFalha(null)
      }

  return (
    <li className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="flex gap-3 p-3">
        <div className="flex shrink-0 flex-col gap-1.5">
          {anuncio.fotos.length === 0 ? (
            <div className="h-24 w-24 overflow-hidden rounded-xl">
              <FotoAnimal url={null} alt={`${titulo}, sem foto`} />
            </div>
          ) : (
            anuncio.fotos.map((foto, i) => (
              <div key={foto.id} className="h-24 w-24 overflow-hidden rounded-xl">
                <FotoAnimal
                  url={enderecoFoto(foto.url)}
                  alt={`Foto ${String(i + 1)} de ${titulo}`}
                />
              </div>
            ))
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <SeloPerdido tipo={anuncio.tipo} />
            {pendente
              ? textoEnviado(diasDoPedido(anuncio.created_at, hoje))
              : textoSaiDoAr(diasNoAr, true)}
          </p>
          <h2 className="mt-1 font-titulo text-lg font-bold leading-tight text-azul-escuro">
            {titulo} · {especie}
          </h2>
          <p className="text-sm text-slate-500">
            📍 {anuncio.bairro} · {anuncio.contato_nome} ·{' '}
            <span className="whitespace-nowrap">{formatarWhatsapp(anuncio.contato_whatsapp)}</span>
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{anuncio.descricao}</p>
          {anuncio.origem === 'equipe' && (
            <p className="mt-1 text-xs font-bold text-azul">Criado pela equipe</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
        {pendente ? (
          <>
            <button
              type="button"
              onClick={() => {
                setAcao('recusar')
              }}
              className="min-h-11 rounded-xl px-3 py-2.5 font-bold text-vermelho ring-2 ring-vermelho-claro"
            >
              Recusar
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() =>
                void executar(
                  'POST',
                  `/perdidos/${anuncio.id}/aprovar`,
                  'Publicado no site ✓',
                  '/perdidos',
                )
              }
              className="min-h-11 rounded-xl bg-emerald-600 px-3 py-2.5 font-extrabold leading-tight text-white disabled:opacity-60"
            >
              {enviando ? 'Publicando…' : 'Aprovar e publicar'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={enviando}
              onClick={() =>
                void executar(
                  'POST',
                  `/perdidos/${anuncio.id}/renovar`,
                  'Renovado: fica no ar por mais 30 dias ✓',
                )
              }
              className="col-span-2 min-h-11 rounded-xl bg-azul-claro px-3 py-2.5 font-bold text-azul-escuro disabled:opacity-60"
            >
              {enviando && !acao ? 'Renovando…' : 'Renovar por mais 30 dias'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAcao('voltou')
              }}
              className="min-h-11 rounded-xl bg-emerald-50 px-3 py-2.5 font-bold leading-tight text-emerald-700"
            >
              Voltou para <span className="whitespace-nowrap">casa 🎉</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAcao('tirar')
              }}
              className="min-h-11 rounded-xl px-3 py-2.5 font-bold text-vermelho ring-2 ring-vermelho-claro"
            >
              Tirar do ar
            </button>
          </>
        )}
        {falha && !acao && (
          <p role="alert" className="col-span-2 text-sm font-bold text-vermelho">
            {falha}
          </p>
        )}
      </div>

      {acao && (
        <Modal titulo={CONFIRMACOES[acao].titulo} aoFechar={fechar}>
          <p className="text-slate-600">
            <b>{titulo}</b>: {CONFIRMACOES[acao].texto}
          </p>
          {falha && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-vermelho-claro p-3 font-bold text-vermelho"
            >
              {falha}
            </p>
          )}
          <BotoesModal
            aoCancelar={() => fechar?.()}
            rotulo={CONFIRMACOES[acao].botao}
            enviando={enviando}
            cor={acao === 'voltou' ? 'bg-emerald-600' : 'bg-vermelho'}
            aoConfirmar={() =>
              void executar(
                'DELETE',
                `/perdidos/${anuncio.id}`,
                CONFIRMACOES[acao].aviso,
                acao === 'recusar' ? undefined : '/perdidos',
              )
            }
          />
        </Modal>
      )}
    </li>
  )
}

const ABAS: { status: PerdidoStatus; nome: string }[] = [
  { status: 'pendente', nome: 'Aguardando' },
  { status: 'publicado', nome: 'No ar' },
]

export function PerdidosAdmin() {
  const [params, setParams] = useSearchParams()
  const status: PerdidoStatus = params.get('aba') === 'publicado' ? 'publicado' : 'pendente'
  const pendentes = usePerdidosAdmin('pendente')
  const publicados = usePerdidosAdmin('publicado')
  const lista = status === 'pendente' ? pendentes : publicados
  const hoje = hojeNoBrasil()
  const anuncios = lista.data?.perdidos ?? []
  const quantos = {
    pendente: pendentes.data?.perdidos.length,
    publicado: publicados.data?.perdidos.length,
  }

  return (
    <>
      <title>Perdidos e encontrados · Área da ONG · SOS Patas</title>
      <TituloAdmin
        titulo="Perdidos e encontrados"
        subtitulo="Confira cada anúncio antes de publicar. Recusados são apagados na hora, com as fotos."
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
            {quantos[aba.status] !== undefined && ` (${String(quantos[aba.status])})`}
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
        <ul className="mt-3 space-y-3">
          {anuncios.map((anuncio) => (
            <CardModeracao key={anuncio.id} anuncio={anuncio} hoje={hoje} />
          ))}
          {anuncios.length === 0 && (
            <li className="rounded-2xl bg-white p-6 text-center text-slate-500 ring-1 ring-slate-200">
              {status === 'pendente'
                ? 'Nenhum anúncio esperando aprovação.'
                : 'Nenhum anúncio no ar agora.'}
            </li>
          )}
        </ul>
      )}

      {status === 'pendente' && (
        <section className="mt-4 rounded-2xl bg-amarelo-claro p-4 text-[#7A4A00]">
          <h2 className="font-bold">Antes de aprovar, confira:</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-800">
            <li>A foto é de um animal e não tem conteúdo impróprio</li>
            <li>O texto não tem links, propaganda ou pedido de dinheiro</li>
            <li>Não aparece endereço completo nem documento</li>
          </ul>
        </section>
      )}
    </>
  )
}
