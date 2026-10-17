import { Navigate, createBrowserRouter, type Params } from 'react-router'
import { Carregando } from './components/Estados'
import type { MolduraAdmin } from './layouts/LayoutAdmin'
import { LayoutPublico } from './layouts/LayoutPublico'
import { ehNomeLista, paginaDaLista, telaDaPagina } from './lib/conteudo'
import { PaginaNaoEncontrada } from './pages/Avisos'
import { Adotar } from './pages/Adotar'
import { AnunciarPerdido } from './pages/AnunciarPerdido'
import { ComoAdotar } from './pages/ComoAdotar'
import { ComoAjudar } from './pages/ComoAjudar'
import { Contato } from './pages/Contato'
import { Ficha } from './pages/Ficha'
import { Inicio } from './pages/Inicio'
import { Perdidos } from './pages/Perdidos'
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
  perdidos: () =>
    import('./pages/admin/PerdidosAdmin').then((m) => ({ Component: m.PerdidosAdmin })),
  textos: () => import('./pages/admin/Textos').then((m) => ({ Component: m.TextosDoSite })),
  perguntas: () => import('./pages/admin/Textos').then((m) => ({ Component: m.EditarPerguntas })),
  comoAdotar: () => import('./pages/admin/Textos').then((m) => ({ Component: m.EditarComoAdotar })),
  inicio: () => import('./pages/admin/Textos').then((m) => ({ Component: m.EditarInicio })),
  ajude: () => import('./pages/admin/Textos').then((m) => ({ Component: m.EditarComoAjudar })),
  item: () => import('./pages/admin/ItemConteudo').then((m) => ({ Component: m.ItemConteudo })),
  novoAnuncio: () =>
    import('./pages/admin/AnuncioEquipe').then((m) => ({ Component: m.NovoAnuncio })),
  editarAnuncio: () =>
    import('./pages/admin/AnuncioEquipe').then((m) => ({ Component: m.EditarAnuncio })),
  mais: () => import('./pages/admin/Mais').then((m) => ({ Component: m.Mais })),
  ong: () => import('./pages/admin/Mais').then((m) => ({ Component: m.DadosDaOng })),
  protetores: () => import('./pages/admin/Mais').then((m) => ({ Component: m.Protetores })),
  adotantes: () => import('./pages/admin/Adotantes').then((m) => ({ Component: m.Adotantes })),
  novoAdotante: () =>
    import('./pages/admin/Adotantes').then((m) => ({ Component: m.NovoAdotante })),
  fichaAdotante: () =>
    import('./pages/admin/Adotantes').then((m) => ({ Component: m.FichaAdotante })),
  emBreve: (titulo: string, texto?: string) => () =>
    import('./pages/admin/EmBreveAdmin').then((m) => ({
      Component: () => <m.EmBreveAdmin titulo={titulo} texto={texto} />,
    })),
}

/** O item de uma lista (T17) volta para a página onde a lista aparece. */
const voltarDoItem = ({ lista }: Params): string =>
  ehNomeLista(lista) ? telaDaPagina(paginaDaLista(lista)) : '/admin/textos'

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
      { path: '/perdidos', element: <Perdidos /> },
      { path: '/perdidos/novo', element: <AnunciarPerdido /> },
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
      {
        path: 'perdidos',
        lazy: admin.perdidos,
        handle: { aba: 'perdidos' } satisfies MolduraAdmin,
      },
      {
        path: 'perdidos/novo',
        lazy: admin.novoAnuncio,
        handle: { voltar: '/admin/perdidos' } satisfies MolduraAdmin,
      },
      {
        path: 'perdidos/:id',
        lazy: admin.editarAnuncio,
        handle: { voltar: '/admin/perdidos' } satisfies MolduraAdmin,
      },
      // Textos do site (T15–T20)
      { path: 'textos', lazy: admin.textos, handle: { aba: 'textos' } satisfies MolduraAdmin },
      ...(
        [
          ['perguntas', admin.perguntas],
          ['como-adotar', admin.comoAdotar],
          ['inicio', admin.inicio],
          ['ajude', admin.ajude],
        ] as const
      ).map(([pagina, lazy]) => ({
        path: `textos/${pagina}`,
        lazy,
        handle: { voltar: '/admin/textos' } satisfies MolduraAdmin,
      })),
      {
        path: 'textos/:lista/novo',
        lazy: admin.item,
        handle: { voltar: voltarDoItem } satisfies MolduraAdmin,
      },
      {
        path: 'textos/:lista/:id',
        lazy: admin.item,
        handle: { voltar: voltarDoItem } satisfies MolduraAdmin,
      },
      // Mais (T22–T24)
      { path: 'mais', lazy: admin.mais, handle: { aba: 'mais' } satisfies MolduraAdmin },
      { path: 'ong', lazy: admin.ong, handle: { voltar: '/admin/mais' } satisfies MolduraAdmin },
      {
        path: 'protetores',
        lazy: admin.protetores,
        handle: { voltar: '/admin/mais' } satisfies MolduraAdmin,
      },
      // Quem adotou (T30, T31; RN53)
      {
        path: 'adotantes',
        lazy: admin.adotantes,
        handle: { voltar: '/admin/mais' } satisfies MolduraAdmin,
      },
      {
        path: 'adotantes/nova',
        lazy: admin.novoAdotante,
        handle: { voltar: '/admin/adotantes' } satisfies MolduraAdmin,
      },
      {
        path: 'adotantes/:id',
        lazy: admin.fichaAdotante,
        handle: { voltar: '/admin/adotantes' } satisfies MolduraAdmin,
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
