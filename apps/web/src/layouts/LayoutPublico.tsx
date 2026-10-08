import { Outlet, ScrollRestoration } from 'react-router'
import { Cabecalho } from './Cabecalho'
import { Rodape } from './Rodape'

/** Moldura das páginas públicas: cabeçalho fixo, conteúdo e rodapé com contatos e PIX. */
export function LayoutPublico() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecalho />
      <main className="flex-1">
        <Outlet />
      </main>
      <Rodape />
      <ScrollRestoration />
    </div>
  )
}
