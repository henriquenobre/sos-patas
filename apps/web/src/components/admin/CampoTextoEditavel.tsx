// CampoTextoEditavel (RN33): um texto único de página, com o rótulo e o lugar onde aparece no
// site (conteudo.ts), contador de caracteres e o próprio botão "Salvar" (T18–T20). Salvar
// publica na hora (RN37) e mostra "Salvo e publicado ✓" com "Ver no site".
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { TEXTOS, schemaTexto, type ChaveTexto, type TextoAdmin } from '@sospatas/compartilhado'
import { atualizarConteudo } from '../../api/admin'
import { chamarAdmin } from '../../api/cliente'
import { CaixaTexto, DICA_TEXTO_SIMPLES } from './CaixaTexto'
import { useAreaAdmin } from './contexto'
import { AlteradoPor } from './Navegacao'

export function CampoTextoEditavel({
  chave,
  texto,
  pagina,
  aviso,
}: {
  chave: ChaveTexto
  texto: TextoAdmin
  /** Endereço público da página, para o "Ver no site" */
  pagina: string
  /** Lembrete abaixo do campo (ex.: "Sem citar clínicas nem valores") */
  aviso?: string
}) {
  const config = TEXTOS[chave]
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [valor, setValor] = useState(texto.valor)
  const [salvo, setSalvo] = useState(texto.valor)
  const [erro, setErro] = useState<string | undefined>()
  const [enviando, setEnviando] = useState(false)

  // Outra pessoa (ou outra aba) salvou: mostra o texto novo, se este não estiver sendo editado
  if (texto.valor !== salvo && valor === salvo) {
    setSalvo(texto.valor)
    setValor(texto.valor)
  }

  const mudou = valor !== salvo

  async function salvar() {
    const resultado = schemaTexto(chave).safeParse({ valor })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message)
      return
    }
    setErro(undefined)
    setEnviando(true)
    try {
      const novo = await chamarAdmin<TextoAdmin>('PUT', `/conteudo/textos/${chave}`, {
        valor: resultado.data.valor,
      })
      setSalvo(novo.valor)
      setValor(novo.valor)
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
      onSubmit={(evento) => {
        evento.preventDefault()
        void salvar()
      }}
      className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
    >
      <CaixaTexto
        rotulo={config.rotulo}
        ajuda={config.onde}
        valor={valor}
        aoMudar={(novo) => {
          setValor(novo)
          if (erro) setErro(undefined)
        }}
        limite={config.limite}
        obrigatorio={config.obrigatorio}
        erro={erro}
        linhas={config.limite > 100 ? 3 : 1}
        dica={config.limite > 100 ? DICA_TEXTO_SIMPLES : undefined}
      />
      {aviso && <p className="mt-2 text-sm font-bold text-amber-800">{aviso}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {texto.alteracao ? <AlteradoPor {...texto.alteracao} /> : <span />}
        <div className="flex gap-2">
          {mudou && (
            <button
              type="button"
              onClick={() => {
                setValor(salvo)
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
      </div>
    </form>
  )
}
