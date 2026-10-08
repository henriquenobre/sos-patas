// Textos e listas editáveis das páginas (docs/DESENVOLVIMENTO.md, seção 5: conteudo_textos e
// conteudo_itens; RN33–RN38, RN46). Esta configuração monta os CHECK do banco e, nas etapas
// seguintes, a validação da API e os formulários genéricos da área da ONG.

export type ConfigTexto = {
  limite: number
  obrigatorio: boolean
}

export const TEXTOS = {
  'inicio.chamada_titulo': { limite: 60, obrigatorio: true },
  'inicio.chamada_texto': { limite: 200, obrigatorio: true },
  'inicio.historia': { limite: 2000, obrigatorio: true },
  'inicio.missao': { limite: 400, obrigatorio: true },
  'inicio.esperando_texto': { limite: 200, obrigatorio: true },
  'como_adotar.subtitulo': { limite: 100, obrigatorio: true },
  'como_adotar.aviso_protetor': { limite: 500, obrigatorio: true },
  'como_adotar.vantagens_rodape': { limite: 200, obrigatorio: false },
  'ajude.introducao': { limite: 300, obrigatorio: false },
} as const satisfies Record<string, ConfigTexto>

export type ChaveTexto = keyof typeof TEXTOS
export const CHAVES_TEXTO = Object.keys(TEXTOS) as ChaveTexto[]

export type ConfigLista = {
  /** null = a lista não tem título */
  titulo: { limite: number; obrigatorio: boolean } | null
  texto: { limite: number }
  /** Só inicio_fotos: cada item tem uma foto (RN38) */
  foto: boolean
  minimo: number
  maximo: number | null
}

export const LISTAS = {
  perguntas: {
    titulo: { limite: 150, obrigatorio: true },
    texto: { limite: 1000 },
    foto: false,
    minimo: 1,
    maximo: null,
  },
  como_adotar_passos: {
    titulo: { limite: 60, obrigatorio: true },
    texto: { limite: 600 },
    foto: false,
    minimo: 1,
    maximo: null,
  },
  como_adotar_antes: {
    titulo: null,
    texto: { limite: 200 },
    foto: false,
    minimo: 0,
    maximo: null,
  },
  como_adotar_vantagens: {
    titulo: { limite: 60, obrigatorio: false },
    texto: { limite: 200 },
    foto: false,
    minimo: 0,
    maximo: null,
  },
  inicio_marcos: {
    titulo: { limite: 20, obrigatorio: true },
    texto: { limite: 300 },
    foto: false,
    minimo: 0,
    maximo: null,
  },
  inicio_numeros: {
    titulo: { limite: 20, obrigatorio: true },
    texto: { limite: 80 },
    foto: false,
    minimo: 0,
    maximo: 4,
  },
  inicio_fotos: {
    titulo: null,
    texto: { limite: 120 },
    foto: true,
    minimo: 0,
    maximo: 8,
  },
  inicio_como_funcionamos: {
    titulo: { limite: 40, obrigatorio: true },
    texto: { limite: 150 },
    foto: false,
    minimo: 0,
    maximo: null,
  },
  ajude_formas: {
    titulo: { limite: 40, obrigatorio: true },
    texto: { limite: 300 },
    foto: false,
    minimo: 0,
    maximo: null,
  },
} as const satisfies Record<string, ConfigLista>

export type NomeLista = keyof typeof LISTAS
export const NOMES_LISTA = Object.keys(LISTAS) as [NomeLista, ...NomeLista[]]
