// Textos e listas editáveis das páginas (docs/DESENVOLVIMENTO.md, seção 5: conteudo_textos e
// conteudo_itens; RN33–RN38, RN46). Esta configuração monta os CHECK do banco, a validação
// (schemas/conteudo.ts) e os formulários genéricos da área da ONG (CampoTextoEditavel e
// ListaEditavel). Rótulos iguais aos do protótipo.

export type ConfigTexto = {
  rotulo: string
  /** Onde o texto aparece no site (ajuda a voluntária a achar) */
  onde: string
  limite: number
  obrigatorio: boolean
}

export const TEXTOS = {
  'inicio.chamada_titulo': {
    rotulo: 'Título da chamada',
    onde: 'Texto grande no topo da página inicial',
    limite: 60,
    obrigatorio: true,
  },
  'inicio.chamada_texto': {
    rotulo: 'Texto da chamada',
    onde: 'Logo abaixo do título',
    limite: 200,
    obrigatorio: true,
  },
  'inicio.historia': {
    rotulo: 'Texto da história',
    onde: 'Seção "Nossa história"',
    limite: 2000,
    obrigatorio: true,
  },
  'inicio.missao': {
    rotulo: 'Missão',
    onde: 'Card com o logo, depois da história',
    limite: 400,
    obrigatorio: true,
  },
  'inicio.esperando_texto': {
    rotulo: 'Texto do "Esperando há mais tempo"',
    onde: 'Abaixo do título "Esperando há mais tempo"',
    limite: 200,
    obrigatorio: true,
  },
  'como_adotar.subtitulo': {
    rotulo: 'Subtítulo',
    onde: 'Abaixo do título "Como adotar"',
    limite: 100,
    obrigatorio: true,
  },
  'como_adotar.aviso_protetor': {
    rotulo: 'Aviso de protetores parceiros',
    onde: 'Card amarelo no fim da página',
    limite: 500,
    obrigatorio: true,
  },
  'como_adotar.vantagens_rodape': {
    rotulo: 'Nota abaixo das vantagens',
    onde: 'Fim do card verde "Vantagem de adotar pelo site"',
    limite: 200,
    obrigatorio: false,
  },
  'ajude.introducao': {
    rotulo: 'Introdução',
    onde: 'Texto do topo da página "Como ajudar"',
    limite: 300,
    obrigatorio: false,
  },
} as const satisfies Record<string, ConfigTexto>

export type ChaveTexto = keyof typeof TEXTOS
export const CHAVES_TEXTO = Object.keys(TEXTOS) as ChaveTexto[]

export type ConfigLista = {
  /** Nomes usados nos botões e avisos: "Excluir esta pergunta?", "Nova pergunta" */
  nomes: { este: string; novo: string; editar: string }
  /** null = a lista não tem título */
  titulo: { rotulo: string; limite: number; obrigatorio: boolean } | null
  texto: { rotulo: string; limite: number }
  /** Só inicio_fotos: cada item tem uma foto (RN38) */
  foto: boolean
  minimo: number
  maximo: number | null
}

export const LISTAS = {
  perguntas: {
    nomes: { este: 'esta pergunta', novo: 'Nova pergunta', editar: 'Editar pergunta' },
    titulo: { rotulo: 'Pergunta', limite: 150, obrigatorio: true },
    texto: { rotulo: 'Resposta', limite: 1000 },
    foto: false,
    minimo: 1,
    maximo: null,
  },
  como_adotar_passos: {
    nomes: { este: 'este passo', novo: 'Novo passo', editar: 'Editar passo' },
    titulo: { rotulo: 'Título do passo', limite: 60, obrigatorio: true },
    texto: { rotulo: 'Explicação', limite: 600 },
    foto: false,
    minimo: 1,
    maximo: null,
  },
  como_adotar_antes: {
    nomes: { este: 'este cuidado', novo: 'Novo cuidado', editar: 'Editar cuidado' },
    titulo: null,
    texto: { rotulo: 'Texto', limite: 200 },
    foto: false,
    minimo: 0,
    maximo: null,
  },
  como_adotar_vantagens: {
    nomes: { este: 'esta vantagem', novo: 'Nova vantagem', editar: 'Editar vantagem' },
    titulo: { rotulo: 'Destaque em negrito', limite: 60, obrigatorio: false },
    texto: { rotulo: 'Texto', limite: 200 },
    foto: false,
    minimo: 0,
    maximo: null,
  },
  inicio_marcos: {
    nomes: { este: 'este marco', novo: 'Novo marco da história', editar: 'Editar marco' },
    titulo: { rotulo: 'Ano ou data', limite: 20, obrigatorio: true },
    texto: { rotulo: 'O que aconteceu', limite: 300 },
    foto: false,
    minimo: 0,
    maximo: null,
  },
  inicio_numeros: {
    nomes: { este: 'este número', novo: 'Novo número', editar: 'Editar número' },
    titulo: { rotulo: 'Número', limite: 20, obrigatorio: true },
    texto: { rotulo: 'O que significa', limite: 80 },
    foto: false,
    minimo: 0,
    maximo: 4,
  },
  inicio_fotos: {
    nomes: { este: 'esta foto', novo: 'Nova foto', editar: 'Editar foto' },
    titulo: null,
    texto: { rotulo: 'Legenda', limite: 120 },
    foto: true,
    minimo: 0,
    maximo: 8,
  },
  inicio_como_funcionamos: {
    nomes: { este: 'este item', novo: 'Novo item', editar: 'Editar item' },
    titulo: { rotulo: 'Título', limite: 40, obrigatorio: true },
    texto: { rotulo: 'Texto', limite: 150 },
    foto: false,
    minimo: 0,
    maximo: null,
  },
  ajude_formas: {
    nomes: {
      este: 'esta forma de ajudar',
      novo: 'Nova forma de ajudar',
      editar: 'Editar forma de ajudar',
    },
    titulo: { rotulo: 'Título', limite: 40, obrigatorio: true },
    texto: { rotulo: 'Texto', limite: 300 },
    foto: false,
    minimo: 0,
    maximo: null,
  },
} as const satisfies Record<string, ConfigLista>

export type NomeLista = keyof typeof LISTAS
export const NOMES_LISTA = Object.keys(LISTAS) as [NomeLista, ...NomeLista[]]
