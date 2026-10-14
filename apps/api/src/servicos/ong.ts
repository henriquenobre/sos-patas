// Dados da ONG (T23): contatos e PIX, numa linha só (id = 1). Aparecem no rodapé, nas páginas
// de conteúdo, no card do PIX e, para os animais da ONG, no WhatsApp da ficha (RN31, RN51).
import { and, eq, ne } from 'drizzle-orm'
import type { OngAdmin, ongEntrada } from '@sospatas/compartilhado'
import { animais, equipe, ong } from '@sospatas/db'
import type { z } from 'zod'
import type { Db } from '../db'
import type { Usuaria } from '../dependencias'

type OngDados = z.output<typeof ongEntrada>

export async function buscarOngAdmin(db: Db): Promise<OngAdmin> {
  const [linha] = await db
    .select({
      nome_completo: ong.nome_completo,
      email: ong.email,
      whatsapp: ong.whatsapp,
      instagram: ong.instagram,
      facebook: ong.facebook,
      pix_tipo: ong.pix_tipo,
      pix_chave: ong.pix_chave,
      updated_at: ong.updated_at,
      alterado_por: equipe.nome,
    })
    .from(ong)
    .leftJoin(equipe, eq(equipe.id, ong.updated_by))
    .where(eq(ong.id, 1))
  if (!linha) throw new Error('Banco sem a linha da tabela ong (rodar o seed_conteudo.sql)')
  const { updated_at, alterado_por, ...dados } = linha
  return { ...dados, alteracao: { em: updated_at.toISOString(), por: alterado_por } }
}

/**
 * Grava os dados e devolve os ids dos animais da ONG que estão no site: a ficha deles mostra
 * o WhatsApp da ONG, então a cópia guardada precisa ser apagada.
 */
export async function salvarOng(
  db: Db,
  dados: OngDados,
  usuaria: Usuaria,
): Promise<{ ong: OngAdmin; animaisDaOng: string[] }> {
  await db
    .update(ong)
    .set({ ...dados, updated_by: usuaria.id })
    .where(eq(ong.id, 1))
  const daOng = await db
    .select({ id: animais.id })
    .from(animais)
    .where(and(eq(animais.responsavel_tipo, 'ong'), ne(animais.status, 'adotado')))
  return { ong: await buscarOngAdmin(db), animaisDaOng: daOng.map((animal) => animal.id) }
}
