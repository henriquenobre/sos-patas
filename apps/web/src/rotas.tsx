import { Navigate, createBrowserRouter } from 'react-router'
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
])
