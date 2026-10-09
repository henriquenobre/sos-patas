// Cloudflare Turnstile (antirrobô sem "clique nos semáforos", RN22). A chave do site é pública
// (VITE_TURNSTILE_SITE_KEY); no computador, sem a variável, usa a chave de TESTE oficial do
// Cloudflare, que sempre aprova. A API confere o token com o segredo (TURNSTILE_SECRET).
import { useEffect, useRef } from 'react'

const CHAVE_TESTE = '1x00000000000000000000AA'
const CHAVE = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? (import.meta.env.DEV ? CHAVE_TESTE : '')
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type ApiTurnstile = {
  render: (
    elemento: HTMLElement,
    opcoes: {
      sitekey: string
      language: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
    },
  ) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: ApiTurnstile
  }
}

let carregando: Promise<ApiTurnstile> | null = null

function carregarTurnstile(): Promise<ApiTurnstile> {
  carregando ??= new Promise((resolver, rejeitar) => {
    if (window.turnstile) {
      resolver(window.turnstile)
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () => {
      if (window.turnstile) resolver(window.turnstile)
      else rejeitar(new Error('Turnstile não carregou'))
    }
    script.onerror = () => {
      carregando = null
      rejeitar(new Error('Turnstile não carregou'))
    }
    document.head.appendChild(script)
  })
  return carregando
}

/** Mostra a verificação e avisa o token (ou null, se expirou). */
export function Turnstile({ aoMudar }: { aoMudar: (token: string | null) => void }) {
  const elemento = useRef<HTMLDivElement>(null)
  const aviso = useRef(aoMudar)
  useEffect(() => {
    aviso.current = aoMudar
  }, [aoMudar])

  useEffect(() => {
    let id: string | null = null
    let ativo = true
    void carregarTurnstile()
      .then((turnstile) => {
        if (!ativo || !elemento.current) return
        id = turnstile.render(elemento.current, {
          sitekey: CHAVE,
          language: 'pt-br',
          callback: (token) => {
            aviso.current(token)
          },
          'expired-callback': () => {
            aviso.current(null)
          },
          'error-callback': () => {
            aviso.current(null)
          },
        })
      })
      .catch(() => {
        aviso.current(null)
      })
    return () => {
      ativo = false
      if (id) window.turnstile?.remove(id)
    }
  }, [])

  return <div ref={elemento} className="min-h-[65px]" />
}
