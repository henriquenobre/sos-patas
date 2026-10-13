import { Navigate, createBrowserRouter } from 'react-router'
import { Carregando } from './components/Estados'
import type { MolduraAdmin } from './layouts/LayoutAdmin'
import { LayoutPublico } from './layouts/LayoutPublico'
import { EmBreve, PaginaNaoEncontrada } from './pages/Avisos'
import { Adotar } from './pages/Adotar'
import { ComoAdotar } from './pages/ComoAdotar'
import { ComoAjudar } from './pages/ComoAjudar'
import { Contato } from './pages/Contato'
import { Ficha } from './pages/Ficha'
import { Inicio } from './pages/Inicio'
import { PerguntasFrequentes } from './pages/PerguntasFrequentes'
import { Privacidade } from './pages/Privacidade'
import { Vitrine } from './pages/Vitrine'

// A área da ONG é carregada só quando alguém abre /admin: quem visita o site não baixa esse código.
const admin = {
  layout: () => import('./layouts/LayoutAdmin').then((m) => ({ Component: m.LayoutAdmin })),
  painel: () => import('./pages/admin/Painel').then((m) => ({ Component: m.Painel })),
  cadastrar: () =>
    import('./pages/admin/FormularioAnimal').then((m) => ({ Component: m.CadastrarAnimal })),
  editar: () =>
    import('./pages/admin/FormularioAnimal').then((m) => ({ Component: m.EditarAnimal })),
  pedidos: () => import('./pages/admin/Pedidos').then((m) => ({ Component: m.Pedidos })),
  pedido: () => import('./pages/admin/Pedido').then((m) => ({ Component: m.Pedido })),
  emBreve: (titulo: string, texto?: string) => () =>
    import('./pages/admin/EmBreveAdmin').then((m) => ({
      Component: () => <m.EmBreveAdmin titulo={titulo} texto={texto} />,
    })),
}

// Rotas do site (docs/DESENVOLVIMENTO.md, seção 4).
export const rotas = createBrowserRouter([
  {
    element: <LayoutPublico />,
    children: [
      { path: '/', element: <Inicio /> },
      { path: '/como-adotar', element: <ComoAdotar /> },
      { path: '/perguntas-frequentes', element: <PerguntasFrequentes /> },
      { path: '/ajude', element: <ComoAjudar /> },
      // A antiga "Sobre" virou "Como ajudar" (no Pages, também em public/_redirects)
      { path: '/sobre', element: <Navigate to="/ajude" replace /> },
      { path: '/privacidade', element: <Privacidade /> },
      { path: '/contato', element: <Contato /> },
      { path: '/animais', element: <Vitrine /> },
      { path: '/animais/:id', element: <Ficha /> },
      { path: '/animais/:id/adotar', element: <Adotar /> },
      // Etapa 11: perdidos e encontrados
      { path: '/perdidos', element: <EmBreve /> },
      { path: '/perdidos/novo', element: <EmBreve /> },
      { path: '*', element: <PaginaNaoEncontrada /> },
    ],
  },
  {
    // Área da ONG: o Cloudflare Access pede o login antes de abrir (T08)
    path: '/admin',
    lazy: admin.layout,
    hydrateFallbackElement: <Carregando />,
    children: [
      { index: true, lazy: admin.painel, handle: { aba: 'animais' } satisfies MolduraAdmin },
      {
        path: 'animais/novo',
        lazy: admin.cadastrar,
        handle: { voltar: '/admin' } satisfies MolduraAdmin,
      },
      {
        path: 'animais/:id',
        lazy: admin.editar,
        handle: { voltar: '/admin' } satisfies MolduraAdmin,
      },
      { path: 'pedidos', lazy: admin.pedidos, handle: { aba: 'pedidos' } satisfies MolduraAdmin },
      {
        path: 'pedidos/:id',
        lazy: admin.pedido,
        handle: { voltar: '/admin/pedidos' } satisfies MolduraAdmin,
      },
      // Etapas 11 (perdidos), 12 (textos) e 13 (mais)
      {
        path: 'perdidos/*',
        lazy: admin.emBreve('Perdidos e encontrados'),
        handle: { aba: 'perdidos' } satisfies MolduraAdmin,
      },
      {
        path: 'textos/*',
        lazy: admin.emBreve('Textos do site'),
        handle: { aba: 'textos' } satisfies MolduraAdmin,
      },
      {
        path: 'mais/*',
        lazy: admin.emBreve('Mais'),
        handle: { aba: 'mais' } satisfies MolduraAdmin,
      },
      {
        path: '*',
        lazy: admin.emBreve(
          'Página não encontrada',
          'O endereço pode estar errado ou a página mudou de lugar.',
        ),
        handle: { voltar: '/admin' } satisfies MolduraAdmin,
      },
    ],
  },
])
