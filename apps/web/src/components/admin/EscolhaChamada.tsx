// EscolhaChamada (T19, RN54): a equipe escolhe os animais das duas fotos da chamada do Início.
// Cada foto pode ficar "Automático" (um cão e um gato, os que esperam há mais tempo). A lista
// só tem animais disponíveis com foto. Salvar publica na hora (RN37).
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ROTULOS, type ConteudoAdmin } from '@sospatas/compartilhado'
import { atualizarConteudo, useAnimaisAdmin } from '../../api/admin'
import { chamarAdmin } from '../../api/cliente'
import { useAreaAdmin } from './contexto'

const POSICOES = ['Foto 1 (à esquerda)', 'Foto 2 (à direita)']
/** Valor do <select> para "Automático" */
const AUTOMATICO = ''

const valores = (chamada: (string | null)[]) =>
  POSICOES.map((_, posicao) => chamada[posicao] ?? AUTOMATICO)

const iguais = (a: string[], b: string[]) => a.join() === b.join()

export function EscolhaChamada({
  chamada,
  pagina,
}: {
  chamada: (string | null)[]
  /** Endereço público da página, para o "Ver no site" */
  pagina: string
}) {
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const disponiveis = useAnimaisAdmin({ status: 'disponivel' })
  const atual = valores(chamada)
  const [escolha, setEscolha] = useState(atual)
  const [salvo, setSalvo] = useState(atual)
  const [erro, setErro] = useState<string | undefined>()
  const [enviando, setEnviando] = useState(false)

  // Outra pessoa (ou outra aba) salvou: mostra a escolha nova, se esta não estiver sendo editada
  if (!iguais(atual, salvo) && iguais(escolha, salvo)) {
    setSalvo(atual)
    setEscolha(atual)
  }

  const comFoto = (disponiveis.data?.animais ?? []).filter((animal) => animal.foto)
  const mudou = !iguais(escolha, salvo)

  async function salvar() {
    setErro(undefined)
    setEnviando(true)
    try {
      const resposta = await chamarAdmin<Pick<ConteudoAdmin, 'chamada'>>(
        'PUT',
        '/conteudo/chamada',
        { animais: escolha.map((id) => id || null) },
      )
      const nova = valores(resposta.chamada)
      setSalvo(nova)
      setEscolha(nova)
      avisar('Salvo e publicado ✓', pagina)
      await atualizarConteudo(queryClient)
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form
      noValidate
      aria-label="Animais da chamada"
      onSubmit={(evento) => {
        evento.preventDefault()
        void salvar()
      }}
      className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
    >
      <p className="font-bold text-azul-escuro">Animais da chamada</p>
      <p className="text-sm text-slate-600">
        As duas fotos ao lado do título. Em "Automático", entram um cão e um gato, os que esperam há
        mais tempo. Se o animal escolhido sair do site (adotado ou em análise), a foto volta a ser
        automática.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {POSICOES.map((rotulo, posicao) => {
          const id = `chamada-${String(posicao + 1)}`
          const escolhido = comFoto.find((animal) => animal.id === escolha[posicao])
          return (
            <div key={rotulo} className="flex items-end gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-azul-claro">
                {escolhido?.foto ? (
                  <img src={escolhido.foto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span
                    className="flex h-full items-center justify-center text-2xl"
                    aria-hidden="true"
                  >
                    🐾
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor={id} className="text-sm font-bold text-slate-700">
                  {rotulo}
                </label>
                <select
                  id={id}
                  value={escolhido ? escolha[posicao] : AUTOMATICO}
                  disabled={disponiveis.isPending}
                  onChange={(evento) => {
                    const nova = [...escolha]
                    nova[posicao] = evento.target.value
                    setEscolha(nova)
                    if (erro) setErro(undefined)
                  }}
                  className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-bold focus:border-azul focus:outline-none"
                >
                  <option value={AUTOMATICO}>Automático</option>
                  {comFoto.map((animal) => (
                    <option
                      key={animal.id}
                      value={animal.id}
                      // O mesmo animal não pode ocupar as duas fotos
                      disabled={escolha.some((outro, i) => i !== posicao && outro === animal.id)}
                    >
                      {animal.nome} ({ROTULOS.especie[animal.especie]})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>
      {disponiveis.isError && (
        <p role="alert" className="mt-2 text-sm font-bold text-vermelho">
          Não conseguimos carregar a lista de animais. Atualize a página.
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-sm font-bold text-vermelho">
          {erro}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        {mudou && (
          <button
            type="button"
            onClick={() => {
              setEscolha(salvo)
              setErro(undefined)
            }}
            disabled={enviando}
            className="min-h-11 rounded-xl px-4 font-bold text-slate-600 ring-2 ring-slate-200"
          >
            Desfazer
          </button>
        )}
        <button
          type="submit"
          disabled={!mudou || enviando}
          className="min-h-11 rounded-xl bg-azul px-5 font-extrabold text-white disabled:opacity-40"
        >
          {enviando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
