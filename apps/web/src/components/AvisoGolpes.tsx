// Aviso fixo contra golpes da página de perdidos e da confirmação do anúncio (RN28).
export function AvisoGolpes({ centralizado = false }: { centralizado?: boolean }) {
  return (
    <aside
      className={`rounded-2xl border-2 border-vermelho/40 bg-vermelho-claro p-4 ${centralizado ? 'text-center' : ''}`}
    >
      <p className="font-extrabold text-vermelho">⚠️ Cuidado com golpes</p>
      <p className="mt-1 text-sm text-slate-800">
        Nunca pague nada antes de ver o animal pessoalmente. Desconfie de quem pede dinheiro,
        &quot;taxa&quot; ou código recebido por SMS. Combine encontros em locais públicos.
      </p>
    </aside>
  )
}
