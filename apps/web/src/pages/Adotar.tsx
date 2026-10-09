// T26 · Formulário de adoção (/animais/:id/adotar), fluxo definido com a ONG em 08/10/2026:
// 1. formulário (versão 1.1) → 2. termo de adoção, com a ciência registrada (RN47) → envio.
// O pedido vai para a análise da equipe e o animal sai do site (RN48); se aprovado, a ONG
// fala com a pessoa pelo WhatsApp para combinar onde buscar o animal (RN49).
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  AVISO_TERMO,
  CLAUSULAS_TERMO,
  DECLARACOES,
  LIMITES,
  OPCOES,
  PERGUNTAS,
  TEXTO_CIENCIA_TERMO,
  TITULO_TERMO,
  formularioAdocaoEntrada,
  type AnimalFicha,
  type PerguntaEscolha,
} from '@sospatas/compartilhado'
import { ErroApi, enviarJson } from '../api/cliente'
import { useFicha } from '../api/publico'
import { FotoAnimal } from '../components/CardAnimal'
import { Caixa, CampoTexto, Escolha, MultiEscolha } from '../components/Campos'
import { Carregando, ErroAoCarregar, TituloPagina } from '../components/Estados'
import { Pata } from '../components/Pata'
import { Turnstile } from '../components/Turnstile'
import { textoAlternativo } from '../lib/animal'

type Valor = string | string[] | boolean[]
type Respostas = Record<string, Valor | undefined>
type Passo = 'formulario' | 'termo'

const L = LIMITES.pedidos_adocao
const CAMPOS_DO_TERMO = ['ciente_termo', 'turnstile_token']

function rolarAte(elemento: Element | null, bloco: ScrollLogicalPosition) {
  try {
    elemento?.scrollIntoView({ block: bloco })
  } catch {
    // Navegador sem rolagem suave (ou ambiente de testes): segue sem rolar
  }
}

/** Rola até o primeiro campo com erro, depois que a tela atualizar. */
function mostrarPrimeiroErro() {
  setTimeout(() => {
    rolarAte(document.querySelector('[aria-invalid="true"]'), 'center')
  }, 0)
}

function irParaTopo() {
  setTimeout(() => {
    rolarAte(document.getElementById('topo-adocao'), 'start')
  }, 0)
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <h2 className="font-titulo text-2xl font-bold text-azul-escuro">{titulo}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  )
}

function AnimalEscolhido({ animal }: { animal: AnimalFicha }) {
  const foto = animal.fotos[0]?.miniatura ?? null
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-azul-claro p-4">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
        <FotoAnimal url={foto} alt={textoAlternativo(animal)} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-600">Você quer adotar</p>
        <p className="font-titulo text-3xl font-extrabold leading-tight text-azul-escuro">
          {animal.nome}
        </p>
        <p className="text-sm text-slate-600">
          Responsável: {animal.responsavel.nome}
          {animal.responsavel.tipo === 'protetor' && ' (protetor parceiro)'}
        </p>
      </div>
    </div>
  )
}

function Aviso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-12 text-center">
      <Pata className="h-14 w-14 text-azul-claro" rotacao={-15} />
      <h1 className="mt-3 font-titulo text-3xl font-extrabold text-azul-escuro">{titulo}</h1>
      <div className="mt-2 space-y-2 text-slate-600">{children}</div>
      <Link
        to="/animais"
        className="mt-6 inline-block min-h-11 rounded-full bg-azul px-6 py-3 font-extrabold text-white"
      >
        Ver outros animais
      </Link>
    </section>
  )
}

/** T26b · Pedido enviado: próximos passos (fluxo da ONG, RN49). */
function Confirmacao({ animal, whatsapp }: { animal: AnimalFicha; whatsapp: string }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
        <Pata className="h-14 w-14 text-emerald-500" rotacao={-15} />
        <h1 className="mt-3 font-titulo text-3xl font-extrabold text-azul-escuro">
          Recebemos seu pedido para adotar {animal.nome}!
        </h1>
        <ol className="mt-5 space-y-3 text-left text-slate-700">
          <li>
            <b>1. Análise:</b> a equipe da SOS Patas vai ler suas respostas. Enquanto isso,{' '}
            {animal.nome} fica reservado e sai do site.
          </li>
          <li>
            <b>2. Contato:</b> se o pedido for aprovado, a ONG fala com você pelo WhatsApp{' '}
            <b>{whatsapp}</b> para combinar onde você busca {animal.nome}.
          </li>
          <li>
            <b>3. Adaptação:</b> depois da chegada em casa, são 15 dias de adaptação, com
            acompanhamento.
          </li>
        </ol>
        <p className="mt-4 text-sm text-slate-500">
          Seu aceite do termo de adoção ficou registrado. Se tiver dúvida,{' '}
          <Link to="/contato?assunto=adocao" className="font-bold text-azul hover:underline">
            fale com a ONG
          </Link>
          .
        </p>
        <Link
          to="/animais"
          className="mt-6 inline-block min-h-11 rounded-full bg-azul px-6 py-3 font-extrabold text-white"
        >
          Ver outros animais
        </Link>
      </div>
    </section>
  )
}

function Formulario({
  animal,
  aoEnviar,
}: {
  animal: AnimalFicha
  aoEnviar: (whatsapp: string) => void
}) {
  const queryClient = useQueryClient()
  const [passo, setPasso] = useState<Passo>('formulario')
  const [respostas, setRespostas] = useState<Respostas>({
    declaracoes: DECLARACOES.map(() => false),
  })
  const [erros, setErros] = useState<Record<string, string>>({})
  const [cienteTermo, setCienteTermo] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [falhaFinal, setFalhaFinal] = useState<{ titulo: string; texto: string } | null>(null)
  const [mensagemEnvio, setMensagemEnvio] = useState<string | null>(null)

  const texto = (campo: string) => {
    const valor = respostas[campo]
    return typeof valor === 'string' ? valor : ''
  }
  const mudar = (campo: string, valor: Valor) => {
    setRespostas((atuais) => ({ ...atuais, [campo]: valor }))
    if (erros[campo]) setErros(({ [campo]: _removido, ...resto }) => resto)
  }

  const campoTexto = (
    campo: keyof typeof PERGUNTAS,
    limite: number,
    extra: Partial<Parameters<typeof CampoTexto>[0]> = {},
  ) => (
    <CampoTexto
      rotulo={PERGUNTAS[campo]}
      valor={texto(campo)}
      aoMudar={(valor) => {
        mudar(campo, valor)
      }}
      erro={erros[campo]}
      limite={limite}
      {...extra}
    />
  )
  const escolha = (
    campo: PerguntaEscolha & keyof typeof PERGUNTAS,
    extra: { dica?: string } = {},
  ) => (
    <Escolha
      rotulo={PERGUNTAS[campo]}
      opcoes={OPCOES[campo]}
      valor={texto(campo) || undefined}
      aoMudar={(valor) => {
        mudar(campo, valor)
      }}
      erro={erros[campo]}
      {...extra}
    />
  )

  const declaracoes = (respostas.declaracoes ?? []) as boolean[]
  const ehGato = animal.especie === 'gato'

  function continuar() {
    const resultado = formularioAdocaoEntrada(animal.especie).safeParse(respostas)
    if (!resultado.success) {
      const novos: Record<string, string> = {}
      for (const problema of resultado.error.issues) {
        const campo = String(problema.path[0] ?? '_')
        novos[campo] ??= problema.message
      }
      setErros(novos)
      mostrarPrimeiroErro()
      return
    }
    setErros({})
    setPasso('termo')
    irParaTopo()
  }

  async function enviar() {
    if (!cienteTermo) {
      setErros({ ciente_termo: 'Marque que leu o termo de adoção e está ciente dos compromissos' })
      return
    }
    if (!token) {
      setErros({ turnstile_token: 'Aguarde a confirmação de que você não é um robô' })
      return
    }
    setEnviando(true)
    setMensagemEnvio(null)
    try {
      await enviarJson(`/publico/animais/${animal.id}/pedidos`, {
        ...respostas,
        ciente_termo: true,
        turnstile_token: token,
      })
      // A confirmação fica na página (Adotar), que não troca de tela quando a ficha recarregar
      aoEnviar(texto('whatsapp'))
      irParaTopo()
      // O animal saiu do site: a vitrine e a ficha precisam ser carregadas de novo
      await queryClient.invalidateQueries({ queryKey: ['animais'] })
    } catch (erro) {
      tratarFalha(erro)
    } finally {
      setEnviando(false)
    }
  }

  function tratarFalha(erro: unknown) {
    if (!(erro instanceof ErroApi)) {
      setMensagemEnvio('Algo deu errado. Tente de novo em alguns minutos.')
      return
    }
    const camposDoFormulario = Object.keys(erro.campos).filter(
      (campo) => !CAMPOS_DO_TERMO.includes(campo),
    )
    if (camposDoFormulario.length > 0) {
      setErros(erro.campos)
      setPasso('formulario')
      mostrarPrimeiroErro()
      return
    }
    if (
      erro.codigo === 'animal_em_analise' ||
      erro.codigo === 'conflito' ||
      erro.codigo === 'pedido_em_andamento'
    ) {
      setFalhaFinal({ titulo: 'Não foi possível enviar', texto: erro.message })
      return
    }
    setErros(erro.campos)
    setMensagemEnvio(erro.message)
  }

  if (falhaFinal) {
    return (
      <Aviso titulo={falhaFinal.titulo}>
        <p>{falhaFinal.texto}</p>
      </Aviso>
    )
  }

  return (
    <div id="topo-adocao" className="mx-auto max-w-2xl scroll-mt-20 space-y-4 px-4 pt-5">
      <AnimalEscolhido animal={animal} />
      <ol className="flex gap-2 text-sm font-bold" aria-label="Passos">
        <li
          className={`flex-1 rounded-full px-3 py-2 text-center ${passo === 'formulario' ? 'bg-azul text-white' : 'bg-slate-200 text-slate-600'}`}
          aria-current={passo === 'formulario' ? 'step' : undefined}
        >
          1. Formulário
        </li>
        <li
          className={`flex-1 rounded-full px-3 py-2 text-center ${passo === 'termo' ? 'bg-azul text-white' : 'bg-slate-200 text-slate-600'}`}
          aria-current={passo === 'termo' ? 'step' : undefined}
        >
          2. Termo de adoção
        </li>
      </ol>

      {passo === 'formulario' ? (
        <>
          <Bloco titulo="1. Sobre você">
            {campoTexto('nome', L.nome, { autoComplete: 'name' })}
            {escolha('maior_idade', {
              dica:
                texto('maior_idade') === 'nao'
                  ? 'Para adotar, é preciso um responsável maior de idade.'
                  : undefined,
            })}
            {campoTexto('whatsapp', 20, {
              tipo: 'tel',
              autoComplete: 'tel',
              dica: 'Com DDD. É por ele que a ONG vai falar com você.',
            })}
            {campoTexto('bairro_cidade', L.bairro_cidade, {
              dica: 'Só bairro e cidade, sem endereço completo.',
            })}
            {campoTexto('instagram_facebook', L.texto_curto, { obrigatorio: false })}
            {campoTexto('motivo', L.texto_longo, { multilinha: true })}
          </Bloco>

          <Bloco titulo="2. Sua casa">
            {escolha('moradia')}
            {escolha('imovel')}
            {texto('imovel') === 'alugado' && escolha('proprietario_permite')}
            {escolha('espaco')}
            {escolha('local_coberto')}
            {escolha('casa_segura')}
            {ehGato && escolha('telas_janelas')}
            {escolha('onde_fica')}
            {campoTexto('moradores', L.texto_curto, {
              dica: 'Ex.: "4 pessoas, 2 crianças de 5 e 8 anos".',
            })}
            {escolha('todos_concordam')}
          </Bloco>

          <Bloco titulo="3. Outros animais">
            {escolha('tem_animais')}
            {texto('tem_animais') === 'sim' && (
              <>
                {campoTexto('animais_quantos', L.texto_curto, { dica: 'Ex.: "2 cães e 1 gato".' })}
                <MultiEscolha
                  rotulo={PERGUNTAS.animais_sexo}
                  opcoes={OPCOES.animais_sexo}
                  valor={(respostas.animais_sexo as string[] | undefined) ?? []}
                  aoMudar={(valor) => {
                    mudar('animais_sexo', valor)
                  }}
                  erro={erros.animais_sexo}
                />
                {escolha('animais_castrados_vacinados')}
              </>
            )}
            {campoTexto('historico_animais', L.texto_longo, {
              multilinha: true,
              dica: 'Se nunca teve, escreva "Nunca tive".',
            })}
          </Bloco>

          <Bloco titulo="4. Cuidados e custos">
            {escolha('vacinar_vermifugar')}
            {escolha('castrar', { dica: 'A castração é um compromisso do termo de adoção.' })}
            {escolha('arcar_custos')}
            {escolha('horas_sozinho')}
            {campoTexto('mudanca_viagem', L.texto_curto)}
          </Bloco>

          <Bloco titulo="5. Compromissos">
            <p className="text-slate-600">Marque todas as declarações para continuar.</p>
            <div className="space-y-2" aria-invalid={Boolean(erros.declaracoes)}>
              {DECLARACOES.map((declaracao, i) => (
                <Caixa
                  key={declaracao}
                  marcado={declaracoes[i] ?? false}
                  erro={Boolean(erros.declaracoes)}
                  aoMudar={(marcado) => {
                    mudar(
                      'declaracoes',
                      declaracoes.map((atual, j) => (j === i ? marcado : atual)),
                    )
                  }}
                >
                  {declaracao}
                </Caixa>
              ))}
            </div>
            {erros.declaracoes && (
              <p className="text-sm font-bold text-vermelho">{erros.declaracoes}</p>
            )}
          </Bloco>

          {Object.keys(erros).length > 0 && (
            <p role="alert" className="rounded-xl bg-vermelho-claro p-3 font-bold text-vermelho">
              Confira os campos destacados.
            </p>
          )}
          <button
            type="button"
            onClick={continuar}
            className="w-full rounded-xl bg-azul py-4 text-lg font-extrabold text-white"
          >
            Continuar para o termo de adoção
          </button>
        </>
      ) : (
        <>
          <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="font-titulo text-2xl font-bold text-azul-escuro">{TITULO_TERMO}</h2>
            <p className="mt-1 text-slate-600">
              Leia com atenção. Se a adoção for aprovada, você assume estes compromissos com a SOS
              Patas (ou com o protetor parceiro responsável por {animal.nome}).
            </p>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-slate-800">
              {CLAUSULAS_TERMO.map((clausula) => (
                <li key={clausula}>{clausula}</li>
              ))}
            </ol>
            <p className="mt-4 rounded-xl bg-vermelho-claro p-3 text-sm font-bold text-vermelho">
              {AVISO_TERMO}
            </p>
          </section>

          <Caixa
            marcado={cienteTermo}
            erro={Boolean(erros.ciente_termo)}
            aoMudar={(marcado) => {
              setCienteTermo(marcado)
              setErros({})
            }}
          >
            <b>{TEXTO_CIENCIA_TERMO}</b>
          </Caixa>
          {erros.ciente_termo && (
            <p className="text-sm font-bold text-vermelho">{erros.ciente_termo}</p>
          )}

          <Turnstile
            aoMudar={(novo) => {
              setToken(novo)
            }}
          />
          {erros.turnstile_token && (
            <p className="text-sm font-bold text-vermelho">{erros.turnstile_token}</p>
          )}
          {mensagemEnvio && (
            <p role="alert" className="rounded-xl bg-vermelho-claro p-3 font-bold text-vermelho">
              {mensagemEnvio}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={enviando}
              className="min-h-11 flex-1 rounded-xl bg-[#25D366] py-4 text-lg font-extrabold text-white disabled:opacity-60"
            >
              {enviando ? 'Enviando…' : 'Enviar pedido de adoção'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPasso('formulario')
                irParaTopo()
              }}
              className="min-h-11 rounded-xl border-2 border-slate-200 bg-white px-5 py-3 font-bold text-slate-700"
            >
              Voltar ao formulário
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function Adotar() {
  const { id = '' } = useParams()
  const ficha = useFicha(id)
  const [enviado, setEnviado] = useState<{ whatsapp: string } | null>(null)

  if (ficha.isPending) return <Carregando />
  if (ficha.isError) {
    if (ficha.error instanceof ErroApi && ficha.error.status === 404) {
      return (
        <Aviso titulo="Animal não encontrado">
          <p>O endereço pode estar errado ou o animal saiu do site.</p>
        </Aviso>
      )
    }
    return <ErroAoCarregar tentarDeNovo={() => void ficha.refetch()} />
  }

  const animal = ficha.data
  return (
    <>
      <title>{`Adotar ${animal.nome} · SOS Patas`}</title>
      <TituloPagina
        titulo="Pedido de adoção"
        subtitulo="Leva poucos minutos. A equipe analisa e fala com você pelo WhatsApp."
      />
      {enviado ? (
        <Confirmacao animal={animal} whatsapp={enviado.whatsapp} />
      ) : animal.status === 'disponivel' ? (
        <Formulario
          animal={animal}
          aoEnviar={(whatsapp) => {
            setEnviado({ whatsapp })
          }}
        />
      ) : (
        <Aviso
          titulo={
            animal.status === 'adotado'
              ? `${animal.nome} já foi adotad${animal.sexo === 'femea' ? 'a' : 'o'}`
              : `${animal.nome} está em processo de adoção`
          }
        >
          <p>Que tal conhecer outros animais que esperam uma família?</p>
        </Aviso>
      )}
    </>
  )
}
