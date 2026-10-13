// Dados da área da ONG (rotas /api/admin, docs/ARQUITETURA.md, seção 3.2).
// Toda chave começa com 'admin': depois de qualquer alteração, `atualizarAdmin` recarrega tudo.
import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query'
import type {
  AnimalAdmin,
  FiltroAnimaisAdmin,
  ListaAnimaisAdmin,
  ListaPedidos,
  ListaProtetores,
  PedidoDetalhe,
  PedidoStatus,
  ResumoAdmin,
  UsuariaLogada,
} from '@sospatas/compartilhado'
import { ErroApi, chamarAdmin } from './cliente'

/** 401 e 403 não melhoram tentando de novo; 404 também não. */
const tentarDeNovo = (tentativas: number, erro: unknown) =>
  !(erro instanceof ErroApi && [401, 403, 404].includes(erro.status)) && tentativas < 1

/** "Olá, Gracia" (RN43). Também confirma que o login vale. */
export function useEu() {
  return useQuery({
    queryKey: ['admin', 'eu'],
    queryFn: () => chamarAdmin<UsuariaLogada>('GET', '/eu'),
    staleTime: 30 * 60_000,
    retry: tentarDeNovo,
  })
}

/** Números do topo do painel e das abas (T09, BarraAdmin). */
export function useResumo() {
  return useQuery({
    queryKey: ['admin', 'resumo'],
    queryFn: () => chamarAdmin<ResumoAdmin>('GET', '/resumo'),
    retry: tentarDeNovo,
  })
}

export function useAnimaisAdmin(filtro: Partial<FiltroAnimaisAdmin>) {
  const params = new URLSearchParams()
  for (const nome of ['status', 'responsavel', 'busca'] as const) {
    const valor = filtro[nome]
    if (valor) params.set(nome, valor)
  }
  const query = params.toString()
  return useQuery({
    queryKey: ['admin', 'animais', 'lista', query],
    queryFn: () => chamarAdmin<ListaAnimaisAdmin>('GET', `/animais${query ? `?${query}` : ''}`),
    // A busca muda a cada letra: mantém a lista anterior na tela enquanto a nova chega
    placeholderData: keepPreviousData,
    retry: tentarDeNovo,
  })
}

export function useAnimalAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'animais', 'um', id],
    queryFn: () => chamarAdmin<AnimalAdmin>('GET', `/animais/${encodeURIComponent(id ?? '')}`),
    enabled: Boolean(id),
    // Formulário aberto: não recarregar sozinho por cima do que a pessoa está digitando
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: tentarDeNovo,
  })
}

export function useProtetores() {
  return useQuery({
    queryKey: ['admin', 'protetores'],
    queryFn: () => chamarAdmin<ListaProtetores>('GET', '/protetores'),
    retry: tentarDeNovo,
  })
}

export function usePedidos(status: PedidoStatus) {
  return useQuery({
    queryKey: ['admin', 'pedidos', 'lista', status],
    queryFn: () => chamarAdmin<ListaPedidos>('GET', `/pedidos?status=${status}`),
    retry: tentarDeNovo,
  })
}

export function usePedido(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'pedidos', 'um', id],
    queryFn: () => chamarAdmin<PedidoDetalhe>('GET', `/pedidos/${encodeURIComponent(id ?? '')}`),
    enabled: Boolean(id),
    retry: tentarDeNovo,
  })
}

/**
 * Depois de salvar: recarrega a área da ONG e esquece a cópia das páginas públicas (vitrine,
 * ficha), para "Ver no site" mostrar a versão nova.
 */
export async function atualizarAdmin(queryClient: QueryClient): Promise<void> {
  queryClient.removeQueries({ queryKey: ['animais'] })
  await queryClient.invalidateQueries({ queryKey: ['admin'] })
}
