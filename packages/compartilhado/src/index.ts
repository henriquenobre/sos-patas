// Código compartilhado entre o front (apps/web) e a API (apps/api).
// Os schemas zod, limites e regras de idade entram na etapa 3 do PLANO_DESENVOLVIMENTO.md.

/** Resposta de GET /api/saude: confirma que a API está no ar. */
export type RespostaSaude = {
  status: 'ok'
  servico: string
  ambiente: string
  horario: string
}
