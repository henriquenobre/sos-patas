import { Navigate, createBrowserRouter, type Params } from 'react-router'
import { Carregando } from './components/Estados'
import type { MolduraAdmin } from './layouts/LayoutAdmin'
import { LayoutPublico } from './layouts/LayoutPublico'
import { ehNomeLista, paginaDaLista, telaDaPagina } from './lib/conteudo'
import { carregarTela } from './lib/versao'
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
// carregarTela: se o arquivo sumiu numa publicação nova, recarrega a página (lib/versao.ts).
const admin = {
  layout: () =>
    carregarTela(() => import('./layouts/LayoutAdmin')).then((m) => ({ Component: m.LayoutAdmin })),
  painel: () =>
    carregarTela(() => import('./pages/admin/Painel')).then((m) => ({ Component: m.Painel })),
  cadastrar: () =>
    carregarTela(() => import('./pages/admin/FormularioAnimal')).then((m) => ({
      Component: m.CadastrarAnimal,
    })),
  editar: () =>
    carregarTela(() => import('./pages/admin/FormularioAnimal')).then((m) => ({
      Component: m.EditarAnimal,
    })),
  pedidos: () =>
    carregarTela(() => import('./pages/admin/Pedidos')).then((m) => ({ Component: m.Pedidos })),
  pedido: () =>
    carregarTela(() => import('./pages/admin/Pedido')).then((m) => ({ Component: m.Pedido })),
  perdidos: () =>
    carregarTela(() => import('./pages/admin/PerdidosAdmin')).then((m) => ({
      Component: m.PerdidosAdmin,
    })),
  textos: () =>
    carregarTela(() => import('./pages/admin/Textos')).then((m) => ({ Component: m.TextosDoSite })),
  perguntas: () =>
    carregarTela(() => import('./pages/admin/Textos')).then((m) => ({
      Component: m.EditarPerguntas,
    })),
  comoAdotar: () =>
    carregarTela(() => import('./pages/admin/Textos')).then((m) => ({
      Component: m.EditarComoAdotar,
    })),
  inicio: () =>
    carregarTela(() => import('./pages/admin/Textos')).then((m) => ({ Component: m.EditarInicio })),
  ajude: () =>
    carregarTela(() => import('./pages/admin/Textos')).then((m) => ({
      Component: m.EditarComoAjudar,
    })),
  item: () =>
    carregarTela(() => import('./pages/admin/ItemConteudo')).then((m) => ({
      Component: m.ItemConteudo,
    })),
  novoAnuncio: () =>
    carregarTela(() => import('./pages/admin/AnuncioEquipe')).then((m) => ({
      Component: m.NovoAnuncio,
    })),
  editarAnuncio: () =>
    carregarTela(() => import('./pages/admin/AnuncioEquipe')).then((m) => ({
      Component: m.EditarAnuncio,
    })),
  mais: () => carregarTela(() => import('./pages/admin/Mais')).then((m) => ({ Component: m.Mais })),
  ong: () =>
    carregarTela(() => import('./pages/admin/Mais')).then((m) => ({ Component: m.DadosDaOng })),
  protetores: () =>
    carregarTela(() => import('./pages/admin/Mais')).then((m) => ({ Component: m.Protetores })),
  adotantes: () =>
    carregarTela(() => import('./pages/admin/Adotantes')).then((m) => ({ Component: m.Adotantes })),
  novoAdotante: () =>
    carregarTela(() => import('./pages/admin/Adotantes')).then((m) => ({
      Component: m.NovoAdotante,
    })),
  fichaAdotante: () =>
    carregarTela(() => import('./pages/admin/Adotantes')).then((m) => ({
      Component: m.FichaAdotante,
    })),
  emBreve: (titulo: string, texto?: string) => () =>
    carregarTela(() => import('./pages/admin/EmBreveAdmin')).then((m) => ({
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
