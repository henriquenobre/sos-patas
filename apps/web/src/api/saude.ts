import { useQuery } from '@tanstack/react-query'
import type { RespostaSaude } from '@sospatas/compartilhado'
import { buscarJson } from './cliente'

export function useSaudeApi() {
  return useQuery({
    queryKey: ['saude'],
    queryFn: () => buscarJson<RespostaSaude>('/saude'),
  })
}
