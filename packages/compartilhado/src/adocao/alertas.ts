// Alertas automáticos para quem analisa o pedido (FORMULARIO_ADOCAO.md, "Pontos de atenção").
// Só chamam atenção para uma conversa: nunca reprovam o pedido sozinhos (RN49).
import type { Sexo } from '../dominio'
import type { RespostasAdocao } from '../schemas/pedido'

export type AnimalDoPedido = {
  sexo: Sexo
  castrado: boolean
  convive_animais: boolean | null
}

export type Alerta = { codigo: string; texto: string }

export function alertasDoPedido(respostas: RespostasAdocao, animal: AnimalDoPedido): Alerta[] {
  const alertas: Alerta[] = []
  const alertar = (codigo: string, texto: string) => {
    alertas.push({ codigo, texto })
  }
  const temAnimais = respostas.tem_animais === 'sim'

  if (respostas.maior_idade === 'nao') alertar('menor_idade', 'Menor de idade')
  if (respostas.imovel === 'alugado' && respostas.proprietario_permite !== 'sim') {
    alertar('proprietario', 'Permissão do proprietário')
  }
  if (respostas.local_coberto === 'nao') alertar('sem_local_coberto', 'Sem local coberto')
  if (respostas.casa_segura === 'nao' || respostas.telas_janelas === 'nao') {
    alertar('risco_fuga', 'Risco de fuga')
  }
  if (respostas.onde_fica === 'preso') alertar('animal_preso', 'Animal preso')
  if (respostas.todos_concordam !== 'sim') alertar('familia', 'Família não concorda')
  if (temAnimais && respostas.animais_sexo?.includes(animal.sexo)) {
    alertar('mesmo_sexo', 'Mesmo sexo')
  }
  const outrosSemCastracao =
    respostas.animais_castrados_vacinados === 'so_vacinados' ||
    respostas.animais_castrados_vacinados === 'nenhum'
  if (temAnimais && outrosSemCastracao && !animal.castrado) alertar('risco_cria', 'Risco de cria')
  if (respostas.vacinar_vermifugar === 'nao' || respostas.arcar_custos === 'nao') {
    alertar('sem_condicoes', 'Sem condições de vacina ou custos')
  }
  if (respostas.castrar === 'nao') alertar('nao_castrar', 'Não pretende castrar')
  if (animal.convive_animais === false && temAnimais) {
    alertar('nao_convive', 'Não convive com outros animais')
  }
  return alertas
}
