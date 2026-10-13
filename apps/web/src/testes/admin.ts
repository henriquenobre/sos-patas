// Dados de exemplo da área da ONG para os testes do front (todos fictícios).
import {
  hojeNoBrasil,
  somarDias,
  type AnimalAdmin,
  type AnimalAdminResumo,
  type ListaProtetores,
  type ResumoAdmin,
  type UsuariaLogada,
} from '@sospatas/compartilhado'

/** Data relativa a hoje (os testes valem em qualquer dia). */
export const diasAtras = (dias: number) => somarDias(hojeNoBrasil(), -dias)

export const EU: UsuariaLogada = { id: 'u1', nome: 'Gracia', email: 'gracia@exemplo.com' }

export const RESUMO: ResumoAdmin = {
  disponiveis: 7,
  esperando_muito: 3,
  adotados_no_mes: 2,
  perdidos_pendentes: 0,
  pedidos_pendentes: 4,
}

export const PROTETORES: ListaProtetores = {
  protetores: [
    {
      id: '947a4a1e-31e0-5c2a-ac04-7dedf0cb3ef2',
      nome: 'Protetora Ana Paula',
      whatsapp: '35900000000',
      animais: 1,
      animais_disponiveis: 1,
      alteracao: { em: '2026-10-01T12:00:00Z', por: 'Claudia' },
    },
  ],
}

export const APOLO: AnimalAdminResumo = {
  id: 'f54bdcb5-4168-52e2-b923-65299a38e8a1',
  nome: 'Apolo',
  especie: 'cao',
  sexo: 'macho',
  nascimento_aprox: diasAtras(4 * 365 + 10),
  porte: 'grande',
  status: 'disponivel',
  data_entrada: diasAtras(420),
  data_adocao: null,
  responsavel_tipo: 'ong',
  protetor: null,
  lar_nome: 'Lar da Claudia',
  foto: null,
  pedido: null,
}

export const ANIMAL_COMPLETO: AnimalAdmin = {
  id: APOLO.id,
  nome: 'Apolo',
  especie: 'cao',
  sexo: 'macho',
  nascimento_aprox: '2022-06-15',
  porte: 'grande',
  status: 'disponivel',
  data_entrada: diasAtras(420),
  data_adocao: null,
  responsavel_tipo: 'ong',
  raca: 'Pit Bull',
  raca_tipo: 'mestico',
  cor_pelagem: 'Preto e caramelo',
  castrado: true,
  vacinado: 'sim',
  vacinas: 'V10',
  vermifugado: 'sim',
  problema_saude: null,
  docil: true,
  convive_animais: false,
  descricao: 'Super dócil.',
  protetor: null,
  fotos: [
    { id: 'foto-1', ordem: 0, miniatura: '/f/1-thumb.webp', completa: '/f/1.webp' },
    { id: 'foto-2', ordem: 1, miniatura: '/f/2-thumb.webp', completa: '/f/2.webp' },
  ],
  privado: {
    lar_nome: 'Lar da Claudia',
    lar_tipo: 'provisorio',
    observacoes: '',
    adotante_nome: null,
    adotante_whatsapp: null,
  },
  pedido_aprovado: null,
  alteracao: { em: '2026-10-07T15:00:00Z', por: 'Claudia' },
}

/** O mínimo para a moldura da área da ONG abrir. */
export const API_ADMIN = {
  '/admin/eu': EU,
  '/admin/resumo': RESUMO,
  '/admin/protetores': PROTETORES,
}
