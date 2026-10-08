import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { IconeMenu } from '../components/Icones'

const LINKS = [
  { para: '/animais', curto: 'Adote', longo: 'Adote um animal' },
  { para: '/como-adotar', curto: 'Como adotar', longo: 'Como adotar' },
  { para: '/perdidos', curto: 'Perdidos', longo: 'Perdidos e encontrados' },
  { para: '/perguntas-frequentes', curto: 'Dúvidas', longo: 'Perguntas frequentes' },
  { para: '/ajude', curto: 'Como ajudar', longo: 'Como ajudar a ONG' },
]

const classeLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 font-bold text-azul-escuro hover:bg-azul-claro ${isActive ? 'bg-azul-claro' : ''}`

export function Cabecalho() {
  const [menuAberto, setMenuAberto] = useState(false)
  return (
    <header
      className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Logo SOS Patas"
            className="h-11 w-11 rounded-md ring-1 ring-slate-200"
          />
          <span className="font-titulo text-xl font-extrabold leading-none text-azul">
            SOS Patas
            <span className="block font-corpo text-[11px] font-semibold text-slate-500">
              Passos/MG
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {LINKS.map((link) => (
            <NavLink key={link.para} to={link.para} className={classeLink}>
              {link.curto}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => {
            setMenuAberto((aberto) => !aberto)
          }}
          className="rounded-lg p-2.5 text-azul-escuro md:hidden"
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls="menu-celular"
        >
          <IconeMenu />
        </button>
      </div>
      {menuAberto && (
        <nav
          id="menu-celular"
          aria-label="Principal"
          className="flex flex-col border-t border-slate-200 bg-white px-4 py-2 md:hidden"
        >
          {LINKS.map((link) => (
            <NavLink
              key={link.para}
              to={link.para}
              className={classeLink}
              onClick={() => {
                setMenuAberto(false)
              }}
            >
              {link.longo}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
