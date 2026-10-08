// Ícones em SVG (os mesmos do protótipo). Decorativos: escondidos dos leitores de tela.
type PropsIcone = { className?: string }

export function IconePata({ className = 'h-full w-full' }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5.5" cy="9.5" r="2.3" />
      <circle cx="9.5" cy="5.5" r="2.3" />
      <circle cx="14.5" cy="5.5" r="2.3" />
      <circle cx="18.5" cy="9.5" r="2.3" />
      <path d="M12 11c-3.2 0-6.5 4.3-6.5 7 0 1.7 1.3 2.6 3 2.6 1.4 0 2.3-.8 3.5-.8s2.1.8 3.5.8c1.7 0 3-.9 3-2.6 0-2.7-3.3-7-6.5-7z" />
    </svg>
  )
}

export function IconeWhatsApp({ className = 'h-5 w-5' }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.6 2.1 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" />
    </svg>
  )
}

export function IconeInstagram({ className = 'h-5 w-5' }: PropsIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  )
}

export function IconeFacebook({ className = 'h-5 w-5' }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.2V10H7v4h3v8h4v-8h3l.5-4H14V8.6c0-.4.2-.6.6-.6z" />
    </svg>
  )
}

export function IconeMenu({ className = 'h-6 w-6' }: PropsIcone) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}
