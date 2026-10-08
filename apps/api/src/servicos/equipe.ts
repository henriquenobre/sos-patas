import { and, eq } from 'drizzle-orm'
import { equipe } from '@sospatas/db'
import type { Db } from '../db'
import type { Usuaria } from '../dependencias'

/** Segunda barreira do login: o e-mail precisa estar na tabela equipe e ativo (RN43). */
export async function buscarUsuariaAtiva(db: Db, email: string): Promise<Usuaria | null> {
  const [usuaria] = await db
    .select({ id: equipe.id, nome: equipe.nome, email: equipe.email })
    .from(equipe)
    .where(and(eq(equipe.email, email.toLowerCase()), eq(equipe.ativo, true)))
    .limit(1)
  return usuaria ?? null
}
