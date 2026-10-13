// Até 2 fotos do anúncio de perdido (T13, RN20, RN21): cada foto escolhida é redesenhada no
// aparelho em WebP de até 1200 px, sem os dados de localização; o original nunca é enviado.
import { useEffect, useId, useMemo, useState } from 'react'
import { MAX_FOTOS_PERDIDO, TIPOS_FOTO_ACEITOS } from '@sospatas/compartilhado'
import { ErroFoto, prepararFotoCompleta } from '../lib/fotos'

export type FotoDoAnuncio = { id: string; arquivo: Blob }

function Miniatura({ foto, aoRemover }: { foto: FotoDoAnuncio; aoRemover: () => void }) {
  const url = useMemo(() => URL.createObjectURL(foto.arquivo), [foto.arquivo])
  useEffect(
    () => () => {
      URL.revokeObjectURL(url)
    },
    [url],
  )
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-200">
      <img src={url} alt="Foto escolhida" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={aoRemover}
        aria-label="Remover foto"
        className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg font-bold text-white"
      >
        ✕
      </button>
    </div>
  )
}

export function FotosAnuncio({
  fotos,
  aoMudar,
}: {
  fotos: FotoDoAnuncio[]
  aoMudar: (fotos: FotoDoAnuncio[]) => void
}) {
  const id = useId()
  const [preparando, setPreparando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return
    setErro(null)
    setPreparando(true)
    try {
      const pronta = await prepararFotoCompleta(arquivo)
      aoMudar([...fotos, { id: crypto.randomUUID(), arquivo: pronta }])
    } catch (falha) {
      setErro(
        falha instanceof ErroFoto
          ? falha.message
          : 'Não conseguimos usar esta foto. Escolha outra.',
      )
    } finally {
      setPreparando(false)
    }
  }

  const livres = MAX_FOTOS_PERDIDO - fotos.length
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {fotos.map((foto) => (
          <Miniatura
            key={foto.id}
            foto={foto}
            aoRemover={() => {
              aoMudar(fotos.filter((outra) => outra.id !== foto.id))
            }}
          />
        ))}
        {Array.from({ length: livres }, (_, i) =>
          i === 0 ? (
            <label
              key="escolher"
              htmlFor={id}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-600"
            >
              {preparando ? (
                <span role="status">Preparando a foto…</span>
              ) : (
                <>
                  <span aria-hidden="true" className="text-2xl">
                    ＋
                  </span>
                  Adicionar foto
                </>
              )}
            </label>
          ) : (
            <div
              key={`vazio-${String(i)}`}
              aria-hidden="true"
              className="aspect-square rounded-xl border-2 border-dashed border-slate-200"
            />
          ),
        )}
      </div>
      {livres > 0 && (
        <input
          id={id}
          type="file"
          accept={TIPOS_FOTO_ACEITOS.join(',')}
          disabled={preparando}
          className="sr-only"
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0]
            evento.target.value = ''
            void escolher(arquivo)
          }}
        />
      )}
      {erro && (
        <p role="alert" className="mt-2 text-sm font-bold text-vermelho">
          {erro}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        Apenas JPG, PNG ou WebP, até 10 MB. A foto é reduzida no seu celular e os dados de
        localização do arquivo são removidos.
      </p>
    </div>
  )
}
