import { Link } from 'react-router'
import { ROTULOS, formatarWhatsapp, linkWhatsApp } from '@sospatas/compartilhado'
import { useSite } from '../api/publico'
import { IconeEmail, IconeFacebook, IconeInstagram, IconeWhatsApp } from '../components/Icones'
import { linkEmail } from '../lib/contato'

const NAVEGUE = [
  { para: '/animais', texto: 'Adote' },
  { para: '/como-adotar', texto: 'Como adotar' },
  { para: '/perguntas-frequentes', texto: 'Dúvidas' },
  { para: '/ajude', texto: 'Como ajudar' },
  { para: '/perdidos', texto: 'Perdidos e encontrados' },
  { para: '/contato', texto: 'Fale com a ONG' },
  { para: '/privacidade', texto: 'Privacidade' },
]

export function Rodape() {
  const { data: site } = useSite()
  const ong = site?.ong

  return (
    <footer className="mt-12 bg-azul-escuro text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-12 w-12 rounded-md bg-white" />
            <div>
              <p className="font-titulo text-xl font-bold">SOS Patas</p>
              {ong && <p className="text-sm text-white/70">{ong.nome_completo}</p>}
            </div>
          </div>
          <p className="mt-3 text-sm text-white/80">
            ONG formada 100% por voluntários. Vivemos de doações.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-bold uppercase tracking-wide text-white/60">Navegue</p>
          <div className="grid grid-cols-2 gap-1.5">
            {NAVEGUE.map((link) => (
              <Link key={link.para} to={link.para} className="py-1 hover:underline">
                {link.texto}
              </Link>
            ))}
            {/* Área da ONG: protegida pelo Cloudflare Access (docs/ARQUITETURA.md, seção 4) */}
            <a href="/admin" className="py-1 hover:underline">
              Área da ONG
            </a>
          </div>
        </div>
        {ong && (
          <div className="space-y-2 text-sm">
            <p className="mb-2 font-bold uppercase tracking-wide text-white/60">Contato</p>
            <a
              href={`https://www.instagram.com/${ong.instagram}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 py-1 hover:underline"
            >
              <IconeInstagram /> @{ong.instagram}
            </a>
            {ong.facebook && (
              <a
                href={ong.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1 hover:underline"
              >
                <IconeFacebook /> {ong.facebook.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            )}
            <a
              href={linkEmail(ong.email)}
              className="flex items-center gap-2 py-1 break-all hover:underline"
            >
              <IconeEmail /> {ong.email}
            </a>
            {/* Só quando a ONG tiver um WhatsApp próprio para o site (RN51) */}
            {ong.whatsapp && (
              <a
                href={linkWhatsApp(ong.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1 hover:underline"
              >
                <IconeWhatsApp /> {formatarWhatsapp(ong.whatsapp)}
              </a>
            )}
            <p className="rounded-xl bg-white/10 p-3">
              <span className="font-bold text-amarelo">
                PIX ({ROTULOS.pix_tipo[ong.pix_tipo]}):
              </span>{' '}
              <span className="break-all">{ong.pix_chave}</span>
            </p>
          </div>
        )}
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        SOS Patas · Passos/MG · Projeto de extensão universitária
      </p>
    </footer>
  )
}
