import type { OngPublica } from '@sospatas/compartilhado'

/** CNPJ, CPF e telefone são copiados só com os números, que é o que os bancos aceitam. */
export function chaveParaCopiar(ong: Pick<OngPublica, 'pix_tipo' | 'pix_chave'>): string {
  return ['cnpj', 'cpf', 'telefone'].includes(ong.pix_tipo)
    ? ong.pix_chave.replace(/\D/g, '')
    : ong.pix_chave
}
