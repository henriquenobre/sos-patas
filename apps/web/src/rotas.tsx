import { createBrowserRouter } from 'react-router'
import { EmConstrucao } from './pages/EmConstrucao'

// Rotas do site (DESENVOLVIMENTO.md, seção 4). As páginas reais entram a partir da etapa 6.
export const rotas = createBrowserRouter([{ path: '*', element: <EmConstrucao /> }])
