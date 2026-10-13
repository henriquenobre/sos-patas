// O que toda tela da área da ONG recebe do LayoutAdmin: o aviso rápido "Salvo e publicado ✓"
// (com "Ver no site", RN37) e o tratamento de erro comum (sessão vencida vira a tela de login).
import { createContext, useContext } from 'react'

export type AreaAdmin = {
  /** Aviso no rodapé por alguns segundos; `link` = página pública para conferir */
  avisar: (texto: string, link?: string) => void
  /** Mensagem para a tela; se a sessão venceu, troca a página pela tela "Entre de novo" */
  mensagemDeErro: (erro: unknown) => string
}

export const ContextoAdmin = createContext<AreaAdmin | null>(null)

export function useAreaAdmin(): AreaAdmin {
  const area = useContext(ContextoAdmin)
  if (!area) throw new Error('useAreaAdmin fora do LayoutAdmin')
  return area
}
