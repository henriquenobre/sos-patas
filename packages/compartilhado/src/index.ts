// Código compartilhado entre o front (apps/web), a API (apps/api) e o banco (db/).

export * from './dominio'
export * from './limites'
export * from './conteudo'
export * from './datas'
export * from './idade'
export * from './whatsapp'
export * from './texto'
export * from './schemas'
export * from './adocao/formulario'
export * from './adocao/termo'
export * from './adocao/alertas'
export type * from './api/publico'
export type * from './api/admin'

/** Resposta de GET /api/saude: confirma que a API está no ar. */
export type RespostaSaude = {
  status: 'ok'
  servico: string
  ambiente: string
  horario: string
}
