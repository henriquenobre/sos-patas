// T07 · Política de privacidade (LGPD). Texto fixo, igual ao do protótipo; o WhatsApp vem da
// tabela ong.
import { formatarWhatsapp } from '@sospatas/compartilhado'
import { useSite } from '../api/publico'
import { TituloPagina } from '../components/Estados'

const SECOES = [
  {
    titulo: 'Quais dados coletamos',
    texto:
      'O site não pede cadastro de visitantes. O contato para adoção acontece pelo WhatsApp, por iniciativa sua.',
  },
  {
    titulo: 'Anúncios de perdidos e encontrados',
    texto:
      'Quem anuncia informa primeiro nome, WhatsApp, bairro e fotos, com autorização expressa. O anúncio só é publicado após análise da equipe, fica no ar por até 30 dias e depois é apagado com as fotos. Recusados são apagados na hora. A localização gravada nas fotos é removida antes do envio.',
  },
  {
    titulo: 'Estatísticas de acesso',
    texto: 'Usamos estatísticas anônimas e sem cookies para saber quantas pessoas visitam o site.',
  },
  {
    titulo: 'Voluntários e lares temporários',
    texto:
      'Os endereços e nomes dos lares temporários nunca são exibidos no site. Ficam visíveis apenas para a equipe da ONG, com login.',
  },
]

export function Privacidade() {
  const { data: site } = useSite()
  const whatsapp = site ? formatarWhatsapp(site.ong.whatsapp) : 'da ONG'

  return (
    <>
      <title>Política de privacidade · SOS Patas</title>
      <TituloPagina
        titulo="Política de privacidade"
        subtitulo="Como tratamos dados, conforme a LGPD (Lei 13.709/2018)"
      />
      <section className="mx-auto max-w-3xl space-y-4 px-4 pt-6 text-slate-700">
        {SECOES.map((secao) => (
          <div key={secao.titulo} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="font-titulo text-xl font-bold text-azul-escuro">{secao.titulo}</h2>
            <p>{secao.texto}</p>
          </div>
        ))}
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="font-titulo text-xl font-bold text-azul-escuro">Seus direitos</h2>
          <p>
            Você pode pedir informações ou a exclusão de qualquer dado pelo WhatsApp {whatsapp}.
          </p>
        </div>
      </section>
    </>
  )
}
