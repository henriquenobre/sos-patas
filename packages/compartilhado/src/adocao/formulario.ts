// Formulário de adoção, versão 1.1 (docs/formulario/FORMULARIO_ADOCAO.md), aprovado pela ONG
// em 08/10/2026. Textos iguais aos do documento. Mudou uma pergunta: criar a versão seguinte,
// sem apagar esta (os pedidos antigos continuam sendo lidos com a versão deles).

export const VERSAO_FORMULARIO = '1.1'

/** Opções de cada pergunta de escolha: valor guardado → texto mostrado. */
export const OPCOES = {
  maior_idade: { sim: 'Sim', nao: 'Não' },
  moradia: {
    casa: 'Casa',
    apartamento: 'Apartamento',
    chacara: 'Chácara ou sítio',
    outro: 'Outro',
  },
  imovel: { proprio: 'Próprio', alugado: 'Alugado', cedido: 'Cedido ou de familiares' },
  proprietario_permite: { sim: 'Sim', nao: 'Não', nao_sei: 'Não sei' },
  espaco: {
    grande: 'Sim, quintal ou área externa grande',
    pequeno: 'Sim, quintal ou área externa pequena',
    sem_area: 'Não tenho área externa, o animal ficará dentro de casa',
  },
  local_coberto: { sim: 'Sim', nao: 'Não', vou_providenciar: 'Vou providenciar' },
  casa_segura: {
    sim: 'Sim, é murada ou cercada e o portão não tem vãos',
    em_parte: 'Em parte, preciso fazer ajustes',
    nao: 'Não',
  },
  telas_janelas: { sim: 'Sim', nao: 'Não', vou_colocar: 'Vou colocar' },
  onde_fica: {
    dentro: 'Dentro de casa',
    dentro_fora: 'Dentro e fora de casa',
    solto_quintal: 'Solto no quintal',
    preso: 'Preso em canil ou corrente',
  },
  todos_concordam: { sim: 'Sim', nao: 'Não', ainda_nao: 'Ainda não conversei com todos' },
  tem_animais: { sim: 'Sim', nao: 'Não' },
  animais_sexo: { macho: 'Machos', femea: 'Fêmeas' },
  animais_castrados_vacinados: {
    todos: 'Todos castrados e vacinados',
    so_vacinados: 'Só vacinados',
    so_castrados: 'Só castrados',
    nenhum: 'Nenhum dos dois',
  },
  vacinar_vermifugar: { sim: 'Sim', nao: 'Não' },
  castrar: {
    sim: 'Sim',
    sim_com_ajuda: 'Sim, mas gostaria de ajuda (castramóvel ou clínica parceira)',
    nao: 'Não',
  },
  arcar_custos: { sim: 'Sim', nao: 'Não' },
  horas_sozinho: {
    menos_4: 'Menos de 4 horas',
    de_4_a_8: 'De 4 a 8 horas',
    mais_8: 'Mais de 8 horas',
  },
} as const

export type PerguntaEscolha = keyof typeof OPCOES

/** Lista de valores aceitos de uma pergunta de escolha (para o zod). */
export const valoresDe = <P extends PerguntaEscolha>(pergunta: P) =>
  Object.keys(OPCOES[pergunta]) as [
    keyof (typeof OPCOES)[P] & string,
    ...(keyof (typeof OPCOES)[P] & string)[],
  ]

/** Enunciado de cada pergunta, com o número do documento. */
export const PERGUNTAS = {
  nome: '1. Nome completo',
  maior_idade: '2. Você tem 18 anos ou mais?',
  whatsapp: '3. WhatsApp',
  bairro_cidade: '4. Bairro e cidade',
  instagram_facebook: '5. Instagram ou Facebook',
  motivo: '6. Por que você quer adotar este animal?',
  moradia: '7. Você mora em:',
  imovel: '8. O imóvel é:',
  proprietario_permite: 'O proprietário permite animais?',
  espaco: '9. Tem espaço adequado para o animal?',
  local_coberto: '10. Tem local coberto, protegido de sol e chuva, para o animal?',
  casa_segura: '11. Sua casa é segura para o animal não fugir?',
  telas_janelas: 'As janelas e sacadas têm tela de proteção?',
  onde_fica: '12. Onde o animal vai ficar na maior parte do tempo?',
  moradores: '13. Quantas pessoas moram com você, e tem crianças?',
  todos_concordam: '14. Todos da casa concordam com a adoção?',
  tem_animais: '15. Você tem outros animais hoje?',
  animais_quantos: '16. Quantos e quais?',
  animais_sexo: '17. Qual o sexo dos seus animais?',
  animais_castrados_vacinados: '18. Eles são castrados e vacinados?',
  historico_animais: '19. Já teve animais antes? O que aconteceu com eles?',
  vacinar_vermifugar:
    '20. Tem condições de vacinar o animal todo ano (a partir de 45 dias de vida) e manter o vermífugo em dia?',
  castrar: '21. Se o animal ainda não for castrado, você se compromete a castrar?',
  arcar_custos: '22. Tem condições de arcar com ração e veterinário quando precisar?',
  horas_sozinho: '23. Quantas horas por dia o animal vai ficar sozinho?',
  mudanca_viagem: '24. Se você mudar de casa ou viajar, o que fará com o animal?',
} as const

/** Blocos do formulário, na ordem do documento (a área da ONG mostra as respostas assim). */
export const BLOCOS = [
  {
    titulo: '1. Sobre você',
    perguntas: ['nome', 'maior_idade', 'whatsapp', 'bairro_cidade', 'instagram_facebook', 'motivo'],
  },
  {
    titulo: '2. Sua casa',
    perguntas: [
      'moradia',
      'imovel',
      'proprietario_permite',
      'espaco',
      'local_coberto',
      'casa_segura',
      'telas_janelas',
      'onde_fica',
      'moradores',
      'todos_concordam',
    ],
  },
  {
    titulo: '3. Outros animais',
    perguntas: [
      'tem_animais',
      'animais_quantos',
      'animais_sexo',
      'animais_castrados_vacinados',
      'historico_animais',
    ],
  },
  {
    titulo: '4. Cuidados e custos',
    perguntas: ['vacinar_vermifugar', 'castrar', 'arcar_custos', 'horas_sozinho', 'mudanca_viagem'],
  },
] as const satisfies readonly { titulo: string; perguntas: readonly (keyof typeof PERGUNTAS)[] }[]

/** 25. Declarações: todas obrigatórias. A última é o consentimento LGPD (RN15). */
export const DECLARACOES = [
  'Concordo com o período de adaptação de 15 dias. Se o animal não se adaptar, vou avisar imediatamente e devolvê-lo a quem doou dentro desse prazo.',
  'Depois dos 15 dias, se eu desistir, vou avisar quem doou e manter o animal como lar provisório até ele encontrar um novo lar.',
  'Não vou deixar o animal em corrente. Vou oferecer abrigo contra sol e chuva, coleira com placa de identificação, ração e água fresca todos os dias.',
  'Não vou repassar o animal para outra pessoa sem o conhecimento de quem doou.',
  'Aceito o acompanhamento pelo WhatsApp e permito a visita de quem doou para conferir as condições do animal.',
  'Entendo que preencher o formulário não garante a adoção. O pedido será analisado pela equipe ou pelo protetor responsável.',
  'Declaro que as informações são verdadeiras.',
  'Autorizo o uso dos meus dados apenas para a análise desta adoção. Se a adoção não for aprovada, eles serão apagados em até 90 dias (LGPD).',
] as const
