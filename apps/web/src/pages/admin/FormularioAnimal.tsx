// T10 · Cadastrar animal (/admin/animais/novo) e T11 · Editar animal (/admin/animais/:id).
// Formulário em uma tela, em blocos, com escolhas em botões grandes. Os campos de saúde são os
// mesmos do termo de adoção. O bloco amarelo vai para animais_privado e nunca aparece no site.
// Na edição, "Outras ações": ver no site, marcar como adotado (RN07, RN08, RN30), voltar para
// disponível (RN30, RN49) e excluir (RN05, RN09).
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LIMITES,
  MAX_FOTOS_ANIMAL,
  ROTULOS,
  animalEntrada,
  formatarWhatsapp,
  hojeNoBrasil,
  idadeParaFormulario,
  nascimentoAproximado,
  textoAdaptacao,
  type AnimalAdmin,
  type AnimalEntrada,
  type Criado,
  type UnidadeIdade,
} from '@sospatas/compartilhado'
import { atualizarAdmin, useAnimalAdmin, useProtetores } from '../../api/admin'
import { ErroApi, chamarAdmin } from '../../api/cliente'
import { CampoTexto, Escolha } from '../../components/Campos'
import { Carregando, ErroAoCarregar } from '../../components/Estados'
import { BotoesModal, Modal } from '../../components/Modal'
import { useAreaAdmin } from '../../components/admin/contexto'
import { FotosAnimal } from '../../components/admin/FotosAnimal'
import { ModalAdocao } from '../../components/admin/ModalAdocao'
import { ModalProtetor } from '../../components/admin/ModalProtetor'
import { AlteradoPor, BarraSalvar, TituloAdmin } from '../../components/admin/Navegacao'
import {
  fotosMudaram,
  fotosSalvas,
  sincronizarFotos,
  type FotoNoFormulario,
} from '../../lib/fotos-animal'

const L = LIMITES.animais
const P = LIMITES.animais_privado
const ID_FORMULARIO = 'formulario-animal'

type SimNao = 'sim' | 'nao'
type SimNaoNaoSei = SimNao | 'nao_sei'

/** O que a tela guarda enquanto a pessoa preenche (tudo em texto, como nos campos). */
type Campos = {
  nome: string
  especie?: string
  sexo?: string
  idade: string
  unidade: UnidadeIdade
  porte?: string
  raca: string
  raca_tipo?: string
  cor_pelagem: string
  descricao: string
  castrado?: SimNao
  vacinado?: string
  vacinas: string
  vermifugado?: string
  tem_problema?: SimNao
  problema_saude: string
  docil: SimNaoNaoSei
  convive: SimNaoNaoSei
  responsavel_tipo: string
  protetor_id: string
  lar_nome: string
  lar_tipo?: string
  data_entrada: string
  observacoes: string
}

const SIM_NAO = { sim: 'Sim', nao: 'Não' }
const SIM_NAO_NAO_SEI = { sim: 'Sim', nao: 'Não', nao_sei: 'Não sei' }
const UNIDADES: Record<UnidadeIdade, string> = { anos: 'anos', meses: 'meses' }

const paraSimNao = (valor: boolean | null): SimNaoNaoSei =>
  valor === true ? 'sim' : valor === false ? 'nao' : 'nao_sei'
const deSimNao = (valor: SimNaoNaoSei | undefined): boolean | null | undefined =>
  valor === 'sim' ? true : valor === 'nao' ? false : valor === 'nao_sei' ? null : undefined

function camposIniciais(animal: AnimalAdmin | undefined, hoje: string): Campos {
  if (!animal) {
    return {
      nome: '',
      idade: '',
      unidade: 'anos',
      raca: '',
      cor_pelagem: '',
      descricao: '',
      vacinas: '',
      problema_saude: '',
      docil: 'nao_sei',
      convive: 'nao_sei',
      responsavel_tipo: 'ong',
      protetor_id: '',
      lar_nome: '',
      data_entrada: hoje,
      observacoes: '',
    }
  }
  const idade = idadeParaFormulario(animal.nascimento_aprox, hoje)
  return {
    nome: animal.nome,
    especie: animal.especie,
    sexo: animal.sexo,
    idade: String(idade.quantidade),
    unidade: idade.unidade,
    porte: animal.porte,
    raca: animal.raca ?? '',
    raca_tipo: animal.raca_tipo ?? undefined,
    cor_pelagem: animal.cor_pelagem ?? '',
    descricao: animal.descricao,
    castrado: animal.castrado ? 'sim' : 'nao',
    vacinado: animal.vacinado,
    vacinas: animal.vacinas ?? '',
    vermifugado: animal.vermifugado,
    tem_problema: animal.problema_saude ? 'sim' : 'nao',
    problema_saude: animal.problema_saude ?? '',
    docil: paraSimNao(animal.docil),
    convive: paraSimNao(animal.convive_animais),
    responsavel_tipo: animal.responsavel_tipo,
    protetor_id: animal.protetor?.id ?? '',
    lar_nome: animal.privado.lar_nome ?? '',
    lar_tipo: animal.privado.lar_tipo ?? undefined,
    data_entrada: animal.data_entrada,
    observacoes: animal.privado.observacoes,
  }
}

/**
 * Monta o corpo de POST/PUT /animais e confere com o mesmo schema da API. Na edição, a data de
 * nascimento só é recalculada se a idade mudou (senão "4 anos" arredondado mudaria a data).
 */
function montarEntrada(
  campos: Campos,
  original: AnimalAdmin | undefined,
  idadeMudou: boolean,
  hoje: string,
): { entrada?: AnimalEntrada; erros: Record<string, string> } {
  const erros: Record<string, string> = {}
  let nascimento: string | undefined
  if (original && !idadeMudou) {
    nascimento = original.nascimento_aprox
  } else {
    const quantidade = Number(campos.idade.trim())
    const limite = campos.unidade === 'anos' ? 30 : 11
    if (campos.idade.trim() === '' || !Number.isInteger(quantidade)) {
      erros.idade = 'Informe a idade aproximada (só o número)'
    } else if (quantidade < 0 || quantidade > limite) {
      erros.idade =
        campos.unidade === 'meses' ? 'Com 12 meses ou mais, use "anos"' : 'Confira a idade'
    } else {
      nascimento = nascimentoAproximado(quantidade, campos.unidade, hoje)
    }
  }
  if (campos.tem_problema === undefined) erros.tem_problema = 'Escolha uma opção'
  if (campos.tem_problema === 'sim' && !campos.problema_saude.trim()) {
    erros.problema_saude = 'Conte qual é o problema de saúde'
  }

  const entrada = {
    nome: campos.nome,
    especie: campos.especie,
    sexo: campos.sexo,
    nascimento_aprox: nascimento,
    porte: campos.porte,
    raca: campos.raca,
    raca_tipo: campos.raca_tipo ?? null,
    cor_pelagem: campos.cor_pelagem,
    castrado: campos.castrado === undefined ? undefined : campos.castrado === 'sim',
    vacinado: campos.vacinado,
    vacinas: campos.vacinas,
    vermifugado: campos.vermifugado,
    problema_saude: campos.tem_problema === 'sim' ? campos.problema_saude : null,
    docil: deSimNao(campos.docil),
    convive_animais: deSimNao(campos.convive),
    descricao: campos.descricao,
    data_entrada: campos.data_entrada || undefined,
    responsavel_tipo: campos.responsavel_tipo,
    protetor_id: campos.responsavel_tipo === 'protetor' ? campos.protetor_id || null : null,
    privado: {
      lar_nome: campos.lar_nome,
      lar_tipo: campos.lar_tipo ?? null,
      observacoes: campos.observacoes,
    },
  }
  const conferido = animalEntrada.safeParse(entrada)
  if (!conferido.success) {
    for (const problema of conferido.error.issues) {
      const campo = problema.path.map(String).join('.')
      erros[campo === 'nascimento_aprox' ? 'idade' : campo] ??= problema.message
    }
  }
  if (Object.keys(erros).length > 0) return { erros }
  return { entrada: entrada as unknown as AnimalEntrada, erros }
}

/** Erros da API: o nome do campo da API vira o nome do campo da tela. */
const campoDaTela = (campo: string) => (campo === 'nascimento_aprox' ? 'idade' : campo)

function mostrarPrimeiroErro() {
  setTimeout(() => {
    try {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: 'center' })
    } catch {
      // Ambiente sem rolagem (testes): segue
    }
  }, 0)
}

function Bloco({
  titulo,
  children,
  privado = false,
}: {
  titulo: string
  children: ReactNode
  privado?: boolean
}) {
  return (
    <section
      className={`space-y-5 rounded-2xl p-4 ${
        privado
          ? 'border-2 border-dashed border-amarelo bg-amarelo-claro'
          : 'bg-white ring-1 ring-slate-200'
      }`}
    >
      <h2 className={`font-extrabold ${privado ? 'text-[#9A5B00]' : 'text-azul'}`}>{titulo}</h2>
      {children}
    </section>
  )
}

function Faixa({ cor, children }: { cor: 'amarelo' | 'verde' | 'vermelho'; children: ReactNode }) {
  const classes = {
    amarelo: 'bg-amarelo-claro text-[#7A4A00]',
    verde: 'bg-emerald-50 text-emerald-800',
    vermelho: 'bg-vermelho-claro text-vermelho',
  }[cor]
  return <div className={`rounded-xl p-3 text-sm ${classes}`}>{children}</div>
}

type Acao = 'adotar' | 'devolver' | 'excluir' | null

/** "Outras ações" da edição (T11). */
function OutrasAcoes({ animal }: { animal: AnimalAdmin }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const [acao, setAcao] = useState<Acao>(null)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState('')
  const hoje = hojeNoBrasil()
  const aprovado = animal.pedido_aprovado
  const pedidoPendente = animal.status === 'em_analise' && !aprovado
  const podeAdotar = animal.status === 'disponivel' || Boolean(aprovado)
  const podeDevolver = animal.status === 'adotado' || Boolean(aprovado)

  async function executar(metodo: 'POST' | 'DELETE', caminho: string, aviso: string) {
    setFalha('')
    setEnviando(true)
    try {
      await chamarAdmin(metodo, caminho)
      // Sai da tela antes de recarregar: o animal excluído não existe mais para ser lido
      await navigate('/admin')
      avisar(aviso)
      await atualizarAdmin(queryClient)
    } catch (erro) {
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
    }
  }

  const fechar = () => {
    setAcao(null)
    setFalha('')
  }
  const textoFalha = falha && (
    <p
      role="alert"
      className="mt-3 rounded-xl bg-vermelho-claro p-3 text-sm font-bold text-vermelho"
    >
      {falha}
    </p>
  )

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <h2 className="font-extrabold text-slate-700">Outras ações</h2>

      {animal.status === 'adotado' && animal.data_adocao && (
        <Faixa cor="verde">
          <p className="font-bold">{textoAdaptacao(animal.data_adocao, hoje)}</p>
          {animal.privado.adotante_nome && (
            <p>
              Adotado por {animal.privado.adotante_nome}
              {animal.privado.adotante_whatsapp &&
                ` · ${formatarWhatsapp(animal.privado.adotante_whatsapp)}`}
            </p>
          )}
          {animal.pedido_da_adocao && (
            <Link
              to={`/admin/pedidos/${animal.pedido_da_adocao.id}`}
              className="mt-1 inline-block font-extrabold underline"
            >
              📋 Ver o formulário de adoção (para imprimir)
            </Link>
          )}
        </Faixa>
      )}
      {pedidoPendente && (
        <Faixa cor="amarelo">
          <p>
            Há um pedido de adoção de {animal.nome} aguardando análise. {animal.nome} está fora do
            site até a equipe aprovar ou recusar.
          </p>
          <Link to="/admin/pedidos" className="mt-1 inline-block font-extrabold underline">
            Ver os pedidos
          </Link>
        </Faixa>
      )}
      {aprovado && (
        <Faixa cor="amarelo">
          Pedido aprovado de <b>{aprovado.nome}</b>: combine a entrega pelo WhatsApp. Na entrega,
          use "Marcar como adotado".
        </Faixa>
      )}

      {animal.status === 'disponivel' && (
        <a
          href={`/animais/${animal.id}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 w-full items-center justify-center rounded-xl bg-azul-claro py-3 font-extrabold text-azul"
        >
          Ver no site ↗
        </a>
      )}
      {podeAdotar && (
        <button
          type="button"
          onClick={() => {
            setAcao('adotar')
          }}
          className="min-h-11 w-full rounded-xl bg-emerald-50 py-3 font-extrabold text-emerald-700"
        >
          Marcar como adotado ✓
        </button>
      )}
      {podeDevolver && (
        <button
          type="button"
          onClick={() => {
            setAcao('devolver')
          }}
          className="min-h-11 w-full rounded-xl bg-slate-100 py-3 font-extrabold text-slate-700"
        >
          {aprovado ? 'A adoção não aconteceu: voltar para disponível' : 'Voltar para disponível'}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setAcao('excluir')
        }}
        className="min-h-11 w-full rounded-xl py-3 font-extrabold text-vermelho ring-2 ring-vermelho-claro"
      >
        Excluir animal
      </button>
      <p className="text-xs text-slate-500">
        Use "Excluir" só para cadastro errado ou falecimento. Adoção deve ser marcada como
        "Adotado".
      </p>

      {acao === 'adotar' && (
        <ModalAdocao
          animal={{ id: animal.id, nome: animal.nome, protetor: animal.protetor?.nome ?? null }}
          inicial={aprovado}
          aoFechar={fechar}
          aoConcluir={() => {
            void navigate('/admin?aba=adotado')
          }}
        />
      )}
      {acao === 'devolver' && (
        <Modal
          titulo={`${animal.nome} volta para o site?`}
          aoFechar={enviando ? undefined : fechar}
        >
          <p className="text-slate-600">
            {aprovado
              ? `O pedido de ${aprovado.nome} fica como "não concluído" e ${animal.nome} aparece de novo na vitrine.`
              : `${animal.nome} aparece de novo na vitrine. O nome e o WhatsApp de quem adotou serão apagados.`}
          </p>
          {textoFalha}
          <BotoesModal
            aoCancelar={fechar}
            rotulo="Voltar para disponível"
            enviando={enviando}
            aoConfirmar={() =>
              void executar(
                'POST',
                `/animais/${animal.id}/devolucao`,
                `${animal.nome} voltou para disponíveis`,
              )
            }
          />
        </Modal>
      )}
      {acao === 'excluir' && (
        <Modal
          titulo={`Excluir ${animal.nome}?`}
          corTitulo="text-vermelho"
          aoFechar={enviando ? undefined : fechar}
        >
          <p className="text-slate-600">
            Esta ação não pode ser desfeita. O cadastro e <b>todas as fotos</b> serão apagados.
          </p>
          <div className="mt-3">
            <Faixa cor="amarelo">
              Se {animal.nome} foi adotado, use <b>"Marcar como adotado"</b>. Assim a adoção entra
              nas estatísticas da ONG.
            </Faixa>
          </div>
          {textoFalha}
          <BotoesModal
            aoCancelar={fechar}
            rotulo="Excluir"
            cor="bg-vermelho"
            enviando={enviando}
            aoConfirmar={() =>
              void executar('DELETE', `/animais/${animal.id}`, `${animal.nome} foi excluído`)
            }
          />
        </Modal>
      )}
    </section>
  )
}

function Formulario({ animal }: { animal?: AnimalAdmin }) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { avisar, mensagemDeErro } = useAreaAdmin()
  const protetores = useProtetores()
  const hoje = hojeNoBrasil()
  const [campos, setCampos] = useState<Campos>(() => camposIniciais(animal, hoje))
  const [idadeMudou, setIdadeMudou] = useState(false)
  const [fotos, setFotos] = useState<FotoNoFormulario[]>(() => fotosSalvas(animal?.fotos ?? []))
  const [erros, setErros] = useState<Record<string, string>>({})
  const [falha, setFalha] = useState(
    () => (location.state as { falha?: string } | null)?.falha ?? '',
  )
  const [enviando, setEnviando] = useState(false)
  const [novoProtetor, setNovoProtetor] = useState(false)

  function mudar(campo: keyof Campos) {
    return (valor: string) => {
      if (campo === 'idade' || campo === 'unidade') setIdadeMudou(true)
      setCampos((atual) => ({ ...atual, [campo]: valor }))
    }
  }

  async function salvar() {
    if (enviando) return
    const { entrada, erros: novos } = montarEntrada(campos, animal, idadeMudou, hoje)
    setErros(novos)
    setFalha('')
    if (!entrada) {
      mostrarPrimeiroErro()
      return
    }

    setEnviando(true)
    let id = animal?.id
    try {
      if (id) {
        await chamarAdmin('PUT', `/animais/${id}`, entrada)
      } else {
        id = (await chamarAdmin<Criado>('POST', '/animais', entrada)).id
      }
    } catch (erro) {
      if (erro instanceof ErroApi && Object.keys(erro.campos).length > 0) {
        setErros(
          Object.fromEntries(
            Object.entries(erro.campos).map(([campo, mensagem]) => [campoDaTela(campo), mensagem]),
          ),
        )
        mostrarPrimeiroErro()
      }
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
      return
    }

    const originais = animal?.fotos ?? []
    try {
      if (fotosMudaram(originais, fotos)) await sincronizarFotos(id, originais, fotos)
    } catch (erro) {
      // Os dados já foram salvos: mostra as fotos que a API tem, para tentar de novo. No
      // cadastro, abre a edição do animal novo (a mensagem vai junto no endereço)
      const aviso = `Os dados foram salvos, mas as fotos não. ${mensagemDeErro(erro)}`
      await atualizarAdmin(queryClient)
      if (!animal) {
        void navigate(`/admin/animais/${id}`, { replace: true, state: { falha: aviso } })
        return
      }
      const atual = queryClient.getQueryData<AnimalAdmin>(['admin', 'animais', 'um', id])
      setFotos(fotosSalvas(atual?.fotos ?? []))
      setFalha(aviso)
      setEnviando(false)
      return
    }

    await atualizarAdmin(queryClient)
    const noSite = !animal || animal.status === 'disponivel'
    avisar(
      animal ? 'Salvo e publicado ✓' : `${campos.nome.trim()} publicado no site ✓`,
      noSite ? `/animais/${id}` : undefined,
    )
    void navigate('/admin')
  }

  const listaProtetores = protetores.data?.protetores ?? []
  const fotosPermitidas = animal?.status === 'adotado' ? 1 : MAX_FOTOS_ANIMAL

  return (
    <div className="mx-auto max-w-xl">
      <title>{`${animal ? `Editar ${animal.nome}` : 'Cadastrar animal'} · Área da ONG · SOS Patas`}</title>
      <TituloAdmin titulo={animal ? `Editar ${animal.nome}` : 'Cadastrar animal'} />
      {animal && <AlteradoPor {...animal.alteracao} />}
      {animal && animal.status !== 'disponivel' && (
        <p className="mt-2 inline-block rounded-full bg-slate-200 px-3 py-1 text-sm font-bold text-slate-700">
          {ROTULOS.status_animal[animal.status]}: não aparece no site
        </p>
      )}
      {falha && (
        <p role="alert" className="mt-3 rounded-xl bg-vermelho-claro p-3 font-bold text-vermelho">
          {falha}
        </p>
      )}

      <form
        id={ID_FORMULARIO}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void salvar()
        }}
        className="mt-4 space-y-6"
      >
        <Bloco titulo="📷 Fotos">
          <FotosAnimal
            fotos={fotos}
            aoMudar={setFotos}
            maximo={fotosPermitidas}
            nome={campos.nome}
          />
        </Bloco>

        <Bloco titulo="🐾 Sobre o animal">
          <CampoTexto
            rotulo="Nome"
            valor={campos.nome}
            aoMudar={mudar('nome')}
            erro={erros.nome}
            limite={L.nome}
            placeholder="Ex.: Apolo"
          />
          <Escolha
            rotulo="Espécie"
            compacto
            opcoes={{ cao: '🐶 Cão', gato: '🐱 Gato' }}
            valor={campos.especie}
            aoMudar={mudar('especie')}
            erro={erros.especie}
          />
          <Escolha
            rotulo="Sexo"
            compacto
            opcoes={ROTULOS.sexo}
            valor={campos.sexo}
            aoMudar={mudar('sexo')}
            erro={erros.sexo}
          />
          {/* Dica fora do CampoTexto: dentro dele, quebrava em linhas e desalinhava o select */}
          <div>
            <div className="grid grid-cols-[1fr_auto] items-start gap-2">
              <CampoTexto
                rotulo="Idade aproximada"
                tipo="numero"
                valor={campos.idade}
                aoMudar={mudar('idade')}
                erro={erros.idade}
                limite={2}
                placeholder="Ex.: 4"
              />
              <select
                aria-label="Idade em anos ou meses"
                value={campos.unidade}
                onChange={(evento) => {
                  mudar('unidade')(evento.target.value)
                }}
                className="mt-7.5 min-h-[52px] rounded-xl border-2 border-slate-200 bg-white px-3 font-bold focus:border-azul focus:outline-none"
              >
                {Object.entries(UNIDADES).map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">
              O site calcula a idade sozinho com o passar do tempo.
            </p>
          </div>
          <Escolha
            rotulo="Porte"
            compacto
            opcoes={ROTULOS.porte}
            valor={campos.porte}
            aoMudar={mudar('porte')}
            erro={erros.porte}
          />
          <CampoTexto
            rotulo="Raça"
            obrigatorio={false}
            valor={campos.raca}
            aoMudar={mudar('raca')}
            erro={erros.raca}
            limite={L.raca}
            placeholder="Ex.: SRD (vira-lata), Pit Bull…"
          />
          <Escolha
            rotulo="Raça pura ou mestiço?"
            obrigatorio={false}
            compacto
            opcoes={{ puro: 'Pura', mestico: 'Mestiço' }}
            valor={campos.raca_tipo}
            aoMudar={mudar('raca_tipo')}
          />
          <CampoTexto
            rotulo="Cor da pelagem"
            obrigatorio={false}
            valor={campos.cor_pelagem}
            aoMudar={mudar('cor_pelagem')}
            erro={erros.cor_pelagem}
            limite={L.cor_pelagem}
            placeholder="Ex.: Caramelo, preto e branco…"
          />
          <CampoTexto
            rotulo="Descrição"
            obrigatorio={false}
            multilinha
            valor={campos.descricao}
            aoMudar={mudar('descricao')}
            erro={erros.descricao}
            limite={L.descricao}
            placeholder="Jeito, manias, cuidados especiais…"
            dica={`${String(campos.descricao.length)}/${String(L.descricao)} caracteres`}
          />
        </Bloco>

        <Bloco titulo="💉 Saúde">
          <Escolha
            rotulo="Castrado?"
            compacto
            opcoes={SIM_NAO}
            valor={campos.castrado}
            aoMudar={mudar('castrado')}
            erro={erros.castrado}
          />
          <Escolha
            rotulo="Vacinado?"
            compacto
            opcoes={ROTULOS.sim_nao_sem_informacao}
            valor={campos.vacinado}
            aoMudar={mudar('vacinado')}
            erro={erros.vacinado}
          />
          {campos.vacinado === 'sim' && (
            <CampoTexto
              rotulo="Quais vacinas?"
              obrigatorio={false}
              valor={campos.vacinas}
              aoMudar={mudar('vacinas')}
              erro={erros.vacinas}
              limite={L.vacinas}
              placeholder="Ex.: V10 e antirrábica"
            />
          )}
          <Escolha
            rotulo="Vermifugado nos últimos 3 meses?"
            compacto
            opcoes={ROTULOS.sim_nao_sem_informacao}
            valor={campos.vermifugado}
            aoMudar={mudar('vermifugado')}
            erro={erros.vermifugado}
          />
          <Escolha
            rotulo="Tem algum problema de saúde?"
            compacto
            opcoes={{ nao: 'Não', sim: 'Sim' }}
            valor={campos.tem_problema}
            aoMudar={mudar('tem_problema')}
            erro={erros.tem_problema}
          />
          {campos.tem_problema === 'sim' && (
            <CampoTexto
              rotulo="Qual problema de saúde?"
              multilinha
              valor={campos.problema_saude}
              aoMudar={mudar('problema_saude')}
              erro={erros.problema_saude}
              limite={L.problema_saude}
              dica="Aparece na ficha do animal."
            />
          )}
        </Bloco>

        <Bloco titulo="💛 Temperamento">
          <Escolha
            rotulo="É dócil?"
            obrigatorio={false}
            compacto
            opcoes={SIM_NAO_NAO_SEI}
            valor={campos.docil}
            aoMudar={mudar('docil')}
          />
          <Escolha
            rotulo="Convive com outros animais?"
            obrigatorio={false}
            compacto
            opcoes={SIM_NAO_NAO_SEI}
            valor={campos.convive}
            aoMudar={mudar('convive')}
          />
        </Bloco>

        <Bloco titulo="📞 Responsável (aparece no site)">
          <Escolha
            rotulo="Quem é o responsável?"
            compacto
            opcoes={ROTULOS.responsavel_tipo}
            valor={campos.responsavel_tipo}
            aoMudar={mudar('responsavel_tipo')}
            erro={erros.responsavel_tipo}
          />
          {campos.responsavel_tipo === 'protetor' ? (
            <div>
              <label htmlFor="protetor" className="font-extrabold text-slate-800">
                Qual protetor?
                <span className="text-vermelho" aria-hidden="true">
                  {' '}
                  *
                </span>
              </label>
              <select
                id="protetor"
                value={campos.protetor_id}
                onChange={(evento) => {
                  mudar('protetor_id')(evento.target.value)
                }}
                aria-invalid={Boolean(erros.protetor_id)}
                aria-describedby={erros.protetor_id ? 'protetor-erro' : undefined}
                className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-bold focus:border-azul focus:outline-none aria-[invalid=true]:border-vermelho"
              >
                <option value="">Escolha…</option>
                {listaProtetores.map((protetor) => (
                  <option key={protetor.id} value={protetor.id}>
                    {protetor.nome} · {formatarWhatsapp(protetor.whatsapp)}
                  </option>
                ))}
              </select>
              {erros.protetor_id && (
                <p id="protetor-erro" className="mt-1.5 text-sm font-bold text-vermelho">
                  {erros.protetor_id}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setNovoProtetor(true)
                }}
                className="mt-2 min-h-11 w-full rounded-xl py-2.5 font-extrabold text-azul ring-2 ring-azul-claro"
              >
                ＋ Novo protetor
              </button>
              <p className="mt-1 text-xs text-slate-500">
                O protetor é cadastrado uma vez e reaproveitado nos próximos animais.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-fundo p-3 text-sm text-slate-600">
              A ficha mostra o contato da SOS Patas (altere em ☰ Mais → Dados da ONG).
            </p>
          )}
        </Bloco>

        <Bloco titulo="🔒 Só a equipe vê (não aparece no site)" privado>
          <CampoTexto
            rotulo="Onde o animal está (lar temporário)"
            obrigatorio={false}
            valor={campos.lar_nome}
            aoMudar={mudar('lar_nome')}
            erro={erros['privado.lar_nome']}
            limite={P.lar_nome}
            placeholder="Ex.: Lar da Claudia"
          />
          <Escolha
            rotulo="Tipo de lar"
            obrigatorio={false}
            compacto
            opcoes={{ provisorio: 'Provisório', remunerado: 'Remunerado' }}
            valor={campos.lar_tipo}
            aoMudar={mudar('lar_tipo')}
          />
          <CampoTexto
            rotulo="Data de entrada na ONG"
            tipo="date"
            max={hoje}
            valor={campos.data_entrada}
            aoMudar={mudar('data_entrada')}
            erro={erros.data_entrada}
            dica='Usada no destaque "Esperando há mais tempo".'
          />
          <CampoTexto
            rotulo="Observações internas"
            obrigatorio={false}
            multilinha
            valor={campos.observacoes}
            aoMudar={mudar('observacoes')}
            erro={erros['privado.observacoes']}
            limite={P.observacoes}
          />
        </Bloco>
      </form>

      {animal && (
        <div className="mt-6">
          <OutrasAcoes animal={animal} />
        </div>
      )}

      <BarraSalvar
        cancelar="/admin"
        rotulo={animal ? 'Salvar alterações' : 'Publicar no site'}
        formulario={ID_FORMULARIO}
        enviando={enviando}
      />

      {novoProtetor && (
        <ModalProtetor
          aoFechar={() => {
            setNovoProtetor(false)
          }}
          aoCriar={(protetor) => {
            setNovoProtetor(false)
            setCampos((atual) => ({ ...atual, protetor_id: protetor.id }))
            setErros(({ protetor_id: _resolvido, ...resto }) => resto)
          }}
        />
      )}
    </div>
  )
}

export function CadastrarAnimal() {
  return <Formulario />
}

export function EditarAnimal() {
  const { id } = useParams()
  const animal = useAnimalAdmin(id)
  if (animal.isPending) return <Carregando />
  if (animal.isError) {
    if (animal.error instanceof ErroApi && animal.error.status === 404) {
      return (
        <div className="py-12 text-center">
          <title>Animal não encontrado · Área da ONG · SOS Patas</title>
          <h1 className="font-titulo text-2xl font-bold text-azul-escuro">
            Não encontramos este animal
          </h1>
          <p className="mt-2 text-slate-600">Ele pode ter sido excluído.</p>
          <Link to="/admin" className="mt-4 inline-block font-extrabold text-azul underline">
            Voltar para a lista
          </Link>
        </div>
      )
    }
    return <ErroAoCarregar tentarDeNovo={() => void animal.refetch()} />
  }
  return <Formulario key={animal.data.id} animal={animal.data} />
}
