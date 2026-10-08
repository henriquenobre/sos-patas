// Dados públicos do site (rotas /api/publico, docs/ARQUITETURA.md, seção 3.1).
import { useQuery } from '@tanstack/react-query'
import type { FiltroVitrine, ListaAnimais, SitePublico } from '@sospatas/compartilhado'
import { buscarJson } from './cliente'

/** Textos, listas e dados da ONG: carregados uma vez e usados por todas as páginas. */
export function useSite() {
  return useQuery({
    queryKey: ['site'],
    queryFn: () => buscarJson<SitePublico>('/publico/site'),
    staleTime: 5 * 60_000,
  })
}

/** "Esperando há mais tempo" (RN12). */
export function useDestaques() {
  return useQuery({
    queryKey: ['animais', 'destaques'],
    queryFn: () => buscarJson<ListaAnimais>('/publico/animais/destaques'),
  })
}

/** Vitrine com filtros (RN10, RN11). */
export function useVitrine(filtro: FiltroVitrine = {}) {
  const params = new URLSearchParams()
  for (const nome of ['especie', 'porte', 'idade', 'convive'] as const) {
    const valor = filtro[nome]
    if (valor) params.set(nome, valor)
  }
  const query = params.toString()
  return useQuery({
    queryKey: ['animais', 'vitrine', query],
    queryFn: () => buscarJson<ListaAnimais>(`/publico/animais${query ? `?${query}` : ''}`),
  })
}
