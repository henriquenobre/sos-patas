import { useSaudeApi } from '../api/saude'

// Página provisória da etapa 1: confirma que front e API conversam.
// Substituída pelo Início (T01) na etapa 6.
export function EmConstrucao() {
  const saude = useSaudeApi()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <img src="/logo.png" alt="Logo da SOS Patas" className="size-32" />
      <h1 className="font-titulo text-3xl font-bold text-azul-escuro">Site em construção</h1>
      <p>Em breve, os cães e gatos da SOS Patas que esperam por uma família.</p>

      <p
        role="status"
        className="rounded-full bg-azul-claro px-4 py-2 text-sm font-semibold text-azul-escuro"
      >
        {saude.isPending && 'Verificando a API…'}
        {saude.isError && <span className="text-vermelho">API fora do ar</span>}
        {saude.isSuccess && `API no ar (${saude.data.ambiente})`}
      </p>
    </main>
  )
}
