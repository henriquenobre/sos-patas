// Dados públicos do site (rotas /api/publico, docs/ARQUITETURA.md, seção 3.1).
import { useQuery } from '@tanstack/react-query'
import type {
  AnimalFicha,
  FiltroVitrine,
  ListaAnimais,
  ListaPerdidos,
  PerdidoTipo,
  SitePublico,
} from '@sospatas/compartilhado'
import { ErroApi, buscarJson } from './cliente'

const CHAVE_CONTEUDO_ALTERADO = 'sospatas:conteudo-alterado'
/** Depois disso, a cópia do navegador (1 min) e a do Cloudflare (15 min) já venceram. */
const VALIDADE_MARCA_MS = 15 * 60_000

/**
 * A equipe acabou de salvar algo que aparece no site (RN37): guarda a hora neste navegador.
 * As páginas públicas, nesta aba ou na do "Ver no site", pedem os dados com essa marca no
 * endereço e não usam a cópia antiga guardada pelo navegador (1 min). O Cloudflare ignora a
 * marca (a chave do cache é o caminho), e a cópia dele já foi apagada pela API ao salvar.
 */
export function marcarConteudoAlterado(): void {
  try {
    localStorage.setItem(CHAVE_CONTEUDO_ALTERADO, String(Date.now()))
  } catch {
    // Sem armazenamento (aba anônima): a mudança aparece quando a cópia do navegador vencer
  }
}

/** Endereço público com a marca da última alteração, se ela for recente. */
function comMarca(endereco: string): string {
  try {
    const marca = Number(localStorage.getItem(CHAVE_CONTEUDO_ALTERADO))
    if (marca && Date.now() - marca < VALIDADE_MARCA_MS) {
      return `${endereco}${endereco.includes('?') ? '&' : '?'}v=${String(marca)}`
    }
  } catch {
    // Sem armazenamento: endereço normal
  }
  return endereco
}

/** Textos, listas e dados da ONG: carregados uma vez e usados por todas as páginas. */
export function useSite() {
  return useQuery({
    queryKey: ['site'],
    queryFn: () => buscarJson<SitePublico>(comMarca('/publico/site')),
    staleTime: 5 * 60_000,
  })
}

/** "Esperando há mais tempo" (RN12). */
export function useDestaques() {
  return useQuery({
    queryKey: ['animais', 'destaques'],
    queryFn: () => buscarJson<ListaAnimais>(comMarca('/publico/animais/destaques')),
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
    queryFn: () =>
      buscarJson<ListaAnimais>(comMarca(`/publico/animais${query ? `?${query}` : ''}`)),
  })
}

/** Ficha do animal (RN31). Animal inexistente (404) não é tentado de novo. */
export function useFicha(id: string) {
  return useQuery({
    queryKey: ['animais', 'ficha', id],
    queryFn: () => buscarJson<AnimalFicha>(comMarca(`/publico/animais/${encodeURIComponent(id)}`)),
    retry: (tentativas, erro) =>
      !(erro instanceof ErroApi && erro.status === 404) && tentativas < 1,
  })
}

/** Perdidos e encontrados aprovados e no ar (RN18, RN25). */
export function usePerdidos(tipo?: PerdidoTipo) {
  return useQuery({
    queryKey: ['perdidos', tipo ?? 'todos'],
    queryFn: () =>
      buscarJson<ListaPerdidos>(comMarca(`/publico/perdidos${tipo ? `?tipo=${tipo}` : ''}`)),
  })
}
