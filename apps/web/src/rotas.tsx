import { Navigate, createBrowserRouter } from 'react-router'
import { LayoutPublico } from './layouts/LayoutPublico'
import { EmBreve, PaginaNaoEncontrada } from './pages/Avisos'
import { ComoAdotar } from './pages/ComoAdotar'
import { ComoAjudar } from './pages/ComoAjudar'
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
      { path: '/animais', element: <Vitrine /> },
      { path: '/animais/:id', element: <Ficha /> },
      // Etapa 10b: formulário de adoção; etapa 11: perdidos e encontrados
      { path: '/animais/:id/adotar', element: <EmBreve /> },
      { path: '/perdidos', element: <EmBreve /> },
      { path: '/perdidos/novo', element: <EmBreve /> },
      { path: '*', element: <PaginaNaoEncontrada /> },
    ],
  },
])
