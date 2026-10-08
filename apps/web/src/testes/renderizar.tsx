// Apoio aos testes do front: renderiza uma rota com a API simulada.
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { vi } from 'vitest'
import type { ListaAnimais, SitePublico } from '@sospatas/compartilhado'
import { rotas } from '../rotas'

/** Respostas da API por caminho; caminho ausente responde 404, e `null` simula a API fora do ar. */
export type RespostasApi = Record<string, unknown>

export function simularApi(respostas: RespostasApi) {
  const fetchFalso = vi.fn((url: string) => {
    const caminho = url.replace(/^.*\/api/, '')
    if (!(caminho in respostas)) return Promise.resolve(new Response(null, { status: 404 }))
    const corpo = respostas[caminho]
    if (corpo === null) return Promise.resolve(new Response(null, { status: 503 }))
    return Promise.resolve(Response.json(corpo))
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

/** Renderiza o site inteiro (rotas reais) começando no endereço indicado. */
export function renderizarEm(endereco: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(rotas.routes, { initialEntries: [endereco] })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const item = (id: string, titulo: string | null, texto: string) => ({
  id,
  titulo,
  texto,
  foto: null,
})

export const SITE_TESTE: SitePublico = {
  ong: {
    nome_completo: 'Sociedade de Proteção aos Animais de Passos/MG',
    whatsapp: '35988439614',
    instagram: 'sospatas.ong',
    facebook: 'https://www.facebook.com/sospatasmg',
    pix_tipo: 'cnpj',
    pix_chave: '26.515.895/0001-90',
  },
  textos: {
    'inicio.chamada_titulo': 'Toda patinha merece um lar.',
    'inicio.chamada_texto': 'Conheça os cães e gatos.',
    'inicio.historia': 'Nossa história começou em 2015.\nSegundo parágrafo.',
    'inicio.missao': 'Proteger animais abandonados.',
    'inicio.esperando_texto': 'Adultos são ótimos companheiros.',
    'como_adotar.subtitulo': 'Simples e responsável',
    'como_adotar.aviso_protetor': 'A SOS Patas só divulga animais de protetores.',
    'como_adotar.vantagens_rodape': '',
    'ajude.introducao': 'Toda ajuda faz diferença.',
  },
  listas: {
    perguntas: [
      item('p1', 'Vocês recebem animais?', 'Não temos abrigo.'),
      item('p2', 'E se não se adaptar?', 'Existe um período de 15 dias.'),
    ],
    como_adotar_passos: [
      item('c1', 'Escolha o animal', 'Use a vitrine.'),
      item('c2', 'Análise', 'A equipe analisa.'),
    ],
    como_adotar_antes: [item('a1', null, 'Um animal vive de 10 a 15 anos.')],
    como_adotar_vantagens: [item('v1', 'Prioridade na castração', 'quando houver castramóvel.')],
    inicio_marcos: [item('m1', '2015', 'Nasce o grupo.')],
    inicio_numeros: [
      item('n1', '+100', 'feiras de adoção'),
      item('n2', '+1.000', 'animais adotados'),
    ],
    inicio_fotos: [],
    inicio_como_funcionamos: [item('f1', '100% voluntários', 'Toda a equipe é voluntária.')],
    ajude_formas: [item('j1', 'Seja lar temporário', 'Acolha um animal.')],
  },
}

export const DESTAQUES_TESTE: ListaAnimais = {
  animais: [
    {
      id: 'a1',
      nome: 'Tobias',
      especie: 'cao',
      sexo: 'macho',
      nascimento_aprox: '2019-01-01',
      porte: 'medio',
      data_entrada: '2024-08-01',
      responsavel_tipo: 'ong',
      foto: null,
    },
    {
      id: 'a2',
      nome: 'Mel',
      especie: 'gato',
      sexo: 'femea',
      nascimento_aprox: '2023-01-01',
      porte: 'pequeno',
      data_entrada: '2025-12-01',
      responsavel_tipo: 'protetor',
      foto: '/api/publico/fotos/animais/a2/f1-thumb.webp',
    },
  ],
}

export const API_PADRAO: RespostasApi = {
  '/publico/site': SITE_TESTE,
  '/publico/animais/destaques': DESTAQUES_TESTE,
  '/publico/animais': DESTAQUES_TESTE,
}
