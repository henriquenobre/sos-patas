// T07 · Política de privacidade (LGPD). Texto fixo; o e-mail de contato vem da tabela ong (RN51).
import { useSite } from '../api/publico'
import { TituloPagina } from '../components/Estados'
import { linkEmail } from '../lib/contato'

const SECOES = [
  {
    titulo: 'Quais dados coletamos',
    texto:
      'O site não pede cadastro de visitantes. Só guardamos dados quando você envia um pedido de adoção ou um anúncio de perdido ou encontrado.',
  },
  {
    titulo: 'Fale com a ONG',
    texto:
      'A mensagem do formulário de contato (nome, e-mail, telefone se você informar, assunto e mensagem) vai direto para o e-mail da ONG e não fica guardada no site. A equipe responde pelo e-mail que você informou. Para evitar abusos, o site guarda por 1 dia apenas um código do seu IP (não o IP), que serve só para limitar o número de mensagens.',
  },
  {
    titulo: 'Pedidos de adoção',
    texto:
      'O formulário de adoção guarda seu nome, WhatsApp, bairro e cidade, suas respostas e o registro de que você leu e aceitou o termo de adoção. Só a equipe da ONG vê esses dados, para analisar o pedido e falar com você. Se o pedido for recusado ou a adoção não acontecer, os dados são apagados em até 90 dias. Depois da adoção, só o nome e o WhatsApp de quem adotou ficam guardados, para o acompanhamento. O site não pede RG, CPF nem endereço completo.',
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
  const email = site?.ong.email

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
            Você pode pedir informações ou a exclusão de qualquer dado pelo e-mail{' '}
            {email ? (
              <a href={linkEmail(email)} className="font-bold break-all text-azul hover:underline">
                {email}
              </a>
            ) : (
              'da ONG'
            )}
            .
          </p>
        </div>
      </section>
    </>
  )
}
