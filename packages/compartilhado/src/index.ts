// Código compartilhado entre o front (apps/web), a API (apps/api) e o banco (db/).

export * from './dominio'
export * from './limites'
export * from './conteudo'
export * from './datas'
export * from './idade'
export * from './whatsapp'
export * from './texto'
export * from './schemas'

/** Resposta de GET /api/saude: confirma que a API está no ar. */
export type RespostaSaude = {
  status: 'ok'
  servico: string
  ambiente: string
  horario: string
}
