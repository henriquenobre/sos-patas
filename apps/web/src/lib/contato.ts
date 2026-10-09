// Contato da ONG pelo e-mail (RN51): link que abre o aplicativo de e-mail da pessoa.
export function linkEmail(email: string, assunto?: string): string {
  return assunto ? `mailto:${email}?subject=${encodeURIComponent(assunto)}` : `mailto:${email}`
}
