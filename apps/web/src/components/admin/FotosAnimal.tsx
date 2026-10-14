// Bloco "📷 Fotos" do cadastro e da edição (T10, T11): até 3 espaços, a primeira é a principal
// (RN01). A foto escolhida é preparada no aparelho na hora (lib/fotos.ts, RN02), mas só vai para
// o site ao tocar em "Salvar": até lá, remover e mudar a ordem só mexem nesta tela.
import { useEffect, useRef, useState } from 'react'
import { MAX_FOTOS_ANIMAL, TIPOS_FOTO_ACEITOS } from '@sospatas/compartilhado'
import { ErroFoto, prepararFoto } from '../../lib/fotos'
import type { FotoNoFormulario } from '../../lib/fotos-animal'
import { IconeX } from '../Icones'

let proximaChave = 0

const classeBotao =
  'flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm font-bold text-white'

export function FotosAnimal({
  fotos,
  aoMudar,
  maximo = MAX_FOTOS_ANIMAL,
  nome,
}: {
  fotos: FotoNoFormulario[]
  aoMudar: (fotos: FotoNoFormulario[]) => void
  maximo?: number
  /** Nome do animal, para os textos alternativos */
  nome: string
}) {
  const [preparando, setPreparando] = useState(false)
  const [erro, setErro] = useState('')
  const previasCriadas = useRef<string[]>([])

  // Libera a memória das prévias das fotos novas ao sair da tela
  useEffect(
    () => () => {
      for (const url of previasCriadas.current) URL.revokeObjectURL(url)
    },
    [],
  )

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return
    setErro('')
    setPreparando(true)
    try {
      const arquivos = await prepararFoto(arquivo)
      const previa = URL.createObjectURL(arquivos.miniatura)
      previasCriadas.current.push(previa)
      proximaChave += 1
      aoMudar([...fotos, { chave: `nova-${String(proximaChave)}`, previa, tipo: 'nova', arquivos }])
    } catch (falha) {
      setErro(
        falha instanceof ErroFoto
          ? falha.message
          : 'Não conseguimos preparar esta foto. Escolha outra.',
      )
    } finally {
      setPreparando(false)
    }
  }

  function mover(de: number, para: number) {
    const nova = [...fotos]
    const [foto] = nova.splice(de, 1)
    if (!foto) return
    nova.splice(para, 0, foto)
    aoMudar(nova)
  }

  const quem = nome.trim() || 'animal'
  const espacos = Array.from({ length: maximo }, (_, indice) => indice)
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {espacos.map((indice) => {
          const foto = fotos[indice]
          if (foto) {
            return (
              <div key={foto.chave} className="relative aspect-square overflow-hidden rounded-xl">
                <img
                  src={foto.previa}
                  alt={`Foto ${String(indice + 1)} de ${quem}`}
                  className="h-full w-full object-cover"
                />
                {indice === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-azul px-1.5 text-[10px] font-bold text-white">
                    Principal
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    aoMudar(fotos.filter((_, i) => i !== indice))
                  }}
                  aria-label={`Remover a foto ${String(indice + 1)}`}
                  className={`absolute right-1 top-1 ${classeBotao}`}
                >
                  <IconeX />
                </button>
                <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  {indice > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        mover(indice, indice - 1)
                      }}
                      aria-label={`Passar a foto ${String(indice + 1)} para a esquerda`}
                      className={classeBotao}
                    >
                      ◀
                    </button>
                  ) : (
                    <span />
                  )}
                  {indice < fotos.length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        mover(indice, indice + 1)
                      }}
                      aria-label={`Passar a foto ${String(indice + 1)} para a direita`}
                      className={classeBotao}
                    >
                      ▶
                    </button>
                  )}
                </div>
              </div>
            )
          }
          // Só o primeiro espaço vazio recebe foto (as fotos ficam sempre em sequência)
          if (indice !== fotos.length) {
            return (
              <div
                key={`vazio-${String(indice)}`}
                aria-hidden="true"
                className="aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50"
              />
            )
          }
          return (
            <label
              key="adicionar"
              className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 ${preparando ? 'opacity-60' : ''}`}
            >
              {preparando ? (
                <>
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-azul-claro border-t-azul" />
                  <span className="mt-1 text-xs font-bold">Preparando…</span>
                </>
              ) : (
                <>
                  <span className="text-2xl" aria-hidden="true">
                    ＋
                  </span>
                  <span className="text-xs font-bold">Adicionar foto</span>
                </>
              )}
              <input
                type="file"
                aria-label="Adicionar foto"
                accept={TIPOS_FOTO_ACEITOS.join(',')}
                disabled={preparando}
                className="sr-only"
                onChange={(evento) => {
                  void escolher(evento.target.files?.[0])
                  evento.target.value = ''
                }}
              />
            </label>
          )
        })}
      </div>
      {erro && (
        <p role="alert" className="mt-2 text-sm font-bold text-vermelho">
          {erro}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        {maximo === 1
          ? 'Animal adotado guarda só a foto principal.'
          : `Até ${String(maximo)} fotos. A primeira é a principal. As fotos são reduzidas automaticamente antes do envio.`}
      </p>
    </div>
  )
}
