// Proteções dos envios públicos: Turnstile (RN22) e hash do IP para os limites (RN23, RN50).

const URL_TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Confere o token no Cloudflare. Falha de rede conta como "não passou" (nunca libera). */
export async function verificarTurnstileCloudflare(
  segredo: string,
  token: string,
  ip: string | null,
): Promise<boolean> {
  const corpo = new FormData()
  corpo.set('secret', segredo)
  corpo.set('response', token)
  if (ip) corpo.set('remoteip', ip)
  try {
    const resposta = await fetch(URL_TURNSTILE, { method: 'POST', body: corpo })
    const resultado: { success?: boolean } = await resposta.json()
    return resultado.success === true
  } catch {
    return false
  }
}

/** IP do visitante, informado pelo Cloudflare. Nunca é guardado puro (LGPD). */
export function ipDaRequisicao(cabecalhos: { header: (nome: string) => string | undefined }) {
  return cabecalhos.header('CF-Connecting-IP') ?? null
}

/** SHA-256 do IP com um segredo: dá para contar envios do mesmo IP sem saber qual é o IP. */
export async function hashDoIp(ip: string | null, segredo: string): Promise<string | null> {
  if (!ip) return null
  const bytes = new TextEncoder().encode(`${segredo}:${ip}`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}
