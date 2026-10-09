// Pedido de adoção (RN14, RN15, RN47, RN50): formulário versão 1.1 + ciência do termo.
// Um schema plano (um campo por pergunta), para os erros aparecerem embaixo de cada campo.
// As regras dependem da espécie do animal (a pergunta das telas só vale para gatos).
import { z } from 'zod'
import { DECLARACOES, valoresDe } from '../adocao/formulario'
import type { Especie } from '../dominio'
import { LIMITES } from '../limites'
import {
  MENSAGEM_OBRIGATORIO,
  opcao,
  opcaoOuNulo,
  textoObrigatorio,
  textoOpcional,
  textoOuNulo,
  turnstileToken,
  whatsapp,
} from './comuns'

const L = LIMITES.pedidos_adocao

const escolha = <P extends Parameters<typeof valoresDe>[0]>(pergunta: P) =>
  opcao(valoresDe(pergunta), 'Escolha uma opção')

/** Perguntas 1 a 24 e as declarações (25). */
const camposFormulario = {
  nome: textoObrigatorio(L.nome),
  maior_idade: escolha('maior_idade'),
  whatsapp,
  bairro_cidade: textoObrigatorio(L.bairro_cidade),
  instagram_facebook: textoOuNulo(L.texto_curto),
  motivo: textoObrigatorio(L.texto_longo),
  moradia: escolha('moradia'),
  imovel: escolha('imovel'),
  proprietario_permite: opcaoOuNulo(valoresDe('proprietario_permite')),
  espaco: escolha('espaco'),
  local_coberto: escolha('local_coberto'),
  casa_segura: escolha('casa_segura'),
  telas_janelas: opcaoOuNulo(valoresDe('telas_janelas')),
  onde_fica: escolha('onde_fica'),
  moradores: textoObrigatorio(L.texto_curto),
  todos_concordam: escolha('todos_concordam'),
  tem_animais: escolha('tem_animais'),
  animais_quantos: textoOuNulo(L.texto_curto),
  animais_sexo: z
    .array(z.enum(valoresDe('animais_sexo')))
    .nullish()
    .transform((valor) => (valor?.length ? [...new Set(valor)] : null)),
  animais_castrados_vacinados: opcaoOuNulo(valoresDe('animais_castrados_vacinados')),
  historico_animais: textoOuNulo(L.texto_longo),
  vacinar_vermifugar: escolha('vacinar_vermifugar'),
  castrar: escolha('castrar'),
  arcar_custos: escolha('arcar_custos'),
  horas_sozinho: escolha('horas_sozinho'),
  mudanca_viagem: textoObrigatorio(L.texto_curto),
  /** Uma caixa por declaração, todas marcadas */
  declaracoes: z
    .array(z.boolean(), { error: 'Marque todas as declarações' })
    .refine(
      (marcadas) => marcadas.length === DECLARACOES.length && marcadas.every(Boolean),
      'Marque todas as declarações',
    ),
}

type FormularioBase = z.output<z.ZodObject<typeof camposFormulario>>

/** Perguntas que só valem em algumas situações: obrigatórias quando valem, nulas quando não. */
function aplicarCondicionais(especie: Especie) {
  return (dados: FormularioBase, ctx: z.RefinementCtx) => {
    const faltou = (campo: string) => {
      ctx.addIssue({ code: 'custom', path: [campo], message: MENSAGEM_OBRIGATORIO })
    }
    if (dados.imovel === 'alugado' && !dados.proprietario_permite) faltou('proprietario_permite')
    if (especie === 'gato' && !dados.telas_janelas) faltou('telas_janelas')
    if (dados.tem_animais === 'sim') {
      if (!dados.animais_quantos) faltou('animais_quantos')
      if (!dados.animais_sexo) faltou('animais_sexo')
      if (!dados.animais_castrados_vacinados) faltou('animais_castrados_vacinados')
    }
  }
}

function limparCondicionais(especie: Especie) {
  return <T extends FormularioBase>(dados: T): T => ({
    ...dados,
    proprietario_permite: dados.imovel === 'alugado' ? dados.proprietario_permite : null,
    telas_janelas: especie === 'gato' ? dados.telas_janelas : null,
    animais_quantos: dados.tem_animais === 'sim' ? dados.animais_quantos : null,
    animais_sexo: dados.tem_animais === 'sim' ? dados.animais_sexo : null,
    animais_castrados_vacinados:
      dados.tem_animais === 'sim' ? dados.animais_castrados_vacinados : null,
  })
}

/** Passo 1 do site: as perguntas e as declarações (sem o termo). */
export const formularioAdocaoEntrada = (especie: Especie) =>
  z
    .object(camposFormulario)
    .superRefine(aplicarCondicionais(especie))
    .transform(limparCondicionais(especie))

/** O pedido completo que chega à API: formulário + ciência do termo (RN47) + Turnstile. */
export const pedidoAdocaoEntrada = (especie: Especie) =>
  z
    .object({
      ...camposFormulario,
      ciente_termo: z.literal(true, {
        error: 'Marque que leu o termo de adoção e está ciente dos compromissos',
      }),
      turnstile_token: turnstileToken,
    })
    .superRefine(aplicarCondicionais(especie))
    .transform(limparCondicionais(especie))

export type FormularioAdocaoEntrada = z.input<ReturnType<typeof formularioAdocaoEntrada>>
export type PedidoAdocaoEntrada = z.input<ReturnType<typeof pedidoAdocaoEntrada>>
export type PedidoAdocaoDados = z.output<ReturnType<typeof pedidoAdocaoEntrada>>

/** Respostas guardadas em pedidos_adocao.respostas (tudo menos nome, WhatsApp e bairro). */
export type RespostasAdocao = Omit<
  PedidoAdocaoDados,
  'nome' | 'whatsapp' | 'bairro_cidade' | 'declaracoes' | 'ciente_termo' | 'turnstile_token'
>

/** Separa as colunas próprias e as respostas que vão para o jsonb. */
export function separarPedido(dados: PedidoAdocaoDados): {
  nome: string
  whatsapp: string
  bairro_cidade: string
  respostas: RespostasAdocao
} {
  const {
    nome,
    whatsapp: numero,
    bairro_cidade,
    declaracoes: _declaracoes,
    ciente_termo: _ciente,
    turnstile_token: _token,
    ...respostas
  } = dados
  return { nome, whatsapp: numero, bairro_cidade, respostas }
}

/** Anotação interna de quem analisa o pedido (T28). */
export const observacaoPedidoEntrada = z.object({
  observacao: textoOpcional(L.observacao_equipe),
})
