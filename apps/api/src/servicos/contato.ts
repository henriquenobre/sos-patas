// Limite do formulário "Fale com a ONG" (RN51): 3 mensagens por dia por IP. A tabela
// contato_envios guarda só o hash do IP e a hora; a mensagem vai por e-mail.
import { and, count, eq, gt, lt, sql } from 'drizzle-orm'
import { MAX_CONTATOS_POR_DIA_POR_IP } from '@sospatas/compartilhado'
import { contatoEnvios } from '@sospatas/db'
import type { Db } from '../db'
import { erros } from '../erros'

export async function conferirLimiteContato(db: Db, ipHash: string | null): Promise<void> {
  if (!ipHash) return
  const [envios] = await db
    .select({ n: count() })
    .from(contatoEnvios)
    .where(
      and(
        eq(contatoEnvios.ip_hash, ipHash),
        gt(contatoEnvios.created_at, sql`now() - interval '1 day'`),
      ),
    )
  if ((envios?.n ?? 0) >= MAX_CONTATOS_POR_DIA_POR_IP) {
    throw erros.limite(
      'Recebemos muitas mensagens deste aparelho hoje. Tente amanhã ou escreva direto para o e-mail da ONG.',
    )
  }
}

export async function registrarEnvioContato(db: Db, ipHash: string | null): Promise<void> {
  if (ipHash) await db.insert(contatoEnvios).values({ ip_hash: ipHash })
}

/** Tarefa diária: o registro só serve para o limite do dia. */
export async function apagarEnviosContatoAntigos(db: Db): Promise<number> {
  const apagados = await db
    .delete(contatoEnvios)
    .where(lt(contatoEnvios.created_at, sql`now() - interval '1 day'`))
    .returning({ id: contatoEnvios.id })
  return apagados.length
}
