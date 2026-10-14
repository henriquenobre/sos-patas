// Páginas do site que a equipe edita em "Textos" (T15–T20, RN33): que textos e listas cada
// uma tem, onde ela fica no site e para onde volta o formulário de um item (T17).
import {
  LISTAS,
  NOMES_LISTA,
  type Alteracao,
  type ChaveTexto,
  type ConteudoAdmin,
  type NomeLista,
} from '@sospatas/compartilhado'

export type PaginaConteudo = 'inicio' | 'como-adotar' | 'perguntas' | 'ajude'

type ConfigPagina = {
  nome: string
  icone: string
  /** O que dá para mudar (card da T15) */
  resumo: string
  /** Endereço público, para o "Ver no site" */
  publica: string
  textos: ChaveTexto[]
  listas: NomeLista[]
}

/** Na ordem dos cards da T15. */
export const PAGINAS: Record<PaginaConteudo, ConfigPagina> = {
  inicio: {
    nome: 'Página inicial',
    icone: '🏠',
    resumo: 'Chamada, história, marcos, números, fotos, missão e como funcionamos',
    publica: '/',
    textos: [
      'inicio.chamada_titulo',
      'inicio.chamada_texto',
      'inicio.historia',
      'inicio.missao',
      'inicio.esperando_texto',
    ],
    listas: ['inicio_numeros', 'inicio_marcos', 'inicio_fotos', 'inicio_como_funcionamos'],
  },
  'como-adotar': {
    nome: 'Como adotar',
    icone: '📋',
    resumo: 'Passos, cuidados, vantagens, aviso de protetores',
    publica: '/como-adotar',
    textos: ['como_adotar.subtitulo', 'como_adotar.vantagens_rodape', 'como_adotar.aviso_protetor'],
    listas: ['como_adotar_passos', 'como_adotar_antes', 'como_adotar_vantagens'],
  },
  perguntas: {
    nome: 'Perguntas frequentes',
    icone: '❓',
    resumo: 'Perguntas e respostas',
    publica: '/perguntas-frequentes',
    textos: [],
    listas: ['perguntas'],
  },
  ajude: {
    nome: 'Como ajudar',
    icone: '💛',
    resumo: 'Introdução e formas de ajudar',
    publica: '/ajude',
    textos: ['ajude.introducao'],
    listas: ['ajude_formas'],
  },
}

export const ehNomeLista = (valor: string | undefined): valor is NomeLista =>
  (NOMES_LISTA as string[]).includes(valor ?? '')

/** Página onde a lista aparece (o "Voltar" e o "Cancelar" do T17 levam para ela). */
export function paginaDaLista(lista: NomeLista): PaginaConteudo {
  const pagina = (Object.keys(PAGINAS) as PaginaConteudo[]).find((nome) =>
    PAGINAS[nome].listas.includes(lista),
  )
  return pagina ?? 'inicio'
}

/** Endereço da tela de edição da página, na área da ONG. */
export const telaDaPagina = (pagina: PaginaConteudo): string => `/admin/textos/${pagina}`

/** "Alterado em…" do card da T15: a alteração mais recente entre os textos e itens da página. */
export function ultimaAlteracao(conteudo: ConteudoAdmin, pagina: PaginaConteudo): Alteracao | null {
  const { textos, listas } = PAGINAS[pagina]
  const alteracoes = [
    ...textos.map((chave) => conteudo.textos[chave].alteracao),
    ...listas.flatMap((lista) => conteudo.listas[lista].map((item) => item.alteracao)),
  ].filter((alteracao): alteracao is Alteracao => alteracao !== null)
  return alteracoes.reduce<Alteracao | null>(
    (maisRecente, alteracao) =>
      !maisRecente || alteracao.em > maisRecente.em ? alteracao : maisRecente,
    null,
  )
}

/** "8 perguntas", "1 pergunta". */
export function quantidadeDeItens(lista: NomeLista, quantidade: number): string {
  const nomes: Partial<Record<NomeLista, [string, string]>> = {
    perguntas: ['pergunta', 'perguntas'],
  }
  const [um, varios] = nomes[lista] ?? ['item', 'itens']
  return `${String(quantidade)} ${quantidade === 1 ? um : varios}`
}

/** Máximo da lista atingido (RN38, RN46): o "＋ Adicionar" vira aviso. */
export const listaCheia = (lista: NomeLista, quantidade: number): boolean => {
  const { maximo } = LISTAS[lista]
  return maximo !== null && quantidade >= maximo
}
