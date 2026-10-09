// Filtros da vitrine na URL (/animais?especie=gato&idade=adulto), para poder compartilhar.
import { filtroVitrine, type FiltroVitrine } from '@sospatas/compartilhado'

export const NOMES_FILTRO = ['especie', 'porte', 'idade', 'convive'] as const
export type NomeFiltro = (typeof NOMES_FILTRO)[number]

/** Lê os filtros da URL. Valor inválido (link editado à mão) é ignorado, sem dar erro. */
export function filtrosDaUrl(params: URLSearchParams): FiltroVitrine {
  const filtro: Record<string, string> = {}
  for (const nome of NOMES_FILTRO) {
    const valor = params.get(nome)
    if (!valor) continue
    const resultado = filtroVitrine.shape[nome].safeParse(valor)
    if (resultado.success && resultado.data) filtro[nome] = resultado.data
  }
  return filtro
}

/** Liga o filtro, ou desliga se ele já estava com esse valor (tocar de novo desliga, T02). */
export function alternarFiltro(params: URLSearchParams, nome: NomeFiltro, valor: string) {
  const novos = new URLSearchParams(params)
  if (novos.get(nome) === valor) novos.delete(nome)
  else novos.set(nome, valor)
  return novos
}

export const temFiltro = (filtro: FiltroVitrine) => NOMES_FILTRO.some((nome) => filtro[nome])
