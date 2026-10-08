// Código compartilhado entre o front (apps/web), a API (apps/api) e o banco (db/).
// Os schemas zod e as regras de idade entram na etapa 3 do docs/PLANO_DESENVOLVIMENTO.md.

export * from './dominio'
export * from './limites'
export * from './conteudo'

/** Resposta de GET /api/saude: confirma que a API está no ar. */
export type RespostaSaude = {
  status: 'ok'
  servico: string
  ambiente: string
  horario: string
}
