// Site publicado de novo com a página aberta: cada publicação troca os nomes dos arquivos em
// assets/, e o arquivo de uma tela da área da ONG que ainda não tinha sido aberta deixa de
// existir (o Pages devolve o index.html no lugar). Recarregar a página busca a versão nova.

const CHAVE = 'sospatas:recarregou-versao'
/** Se já recarregou há menos que isso e o erro continua, não é versão velha: mostra o erro. */
const INTERVALO_MS = 30_000

function lerMarca(): number {
  try {
    return Number(sessionStorage.getItem(CHAVE) ?? 0)
  } catch {
    return 0
  }
}

/**
 * Recarrega a página para pegar a versão nova do site. Devolve false, sem recarregar, se já
 * recarregou há pouco (evita recarregar sem parar se o problema for outro).
 */
export function recarregarParaVersaoNova(): boolean {
  if (Date.now() - lerMarca() < INTERVALO_MS) return false
  try {
    sessionStorage.setItem(CHAVE, String(Date.now()))
  } catch {
    // Sem sessionStorage (aba anônima com bloqueio): sem a trava, não arrisca recarregar sem parar
    return false
  }
  window.location.reload()
  return true
}

/** Carrega o código de uma tela; se o arquivo sumiu numa publicação nova, recarrega a página. */
export async function carregarTela<T>(importar: () => Promise<T>): Promise<T> {
  try {
    return await importar()
  } catch (erro) {
    // Enquanto a página recarrega, a tela fica em "Carregando…" em vez de mostrar o erro
    if (recarregarParaVersaoNova()) return new Promise<T>(() => undefined)
    throw erro
  }
}
