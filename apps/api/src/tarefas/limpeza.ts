// Tarefa diária (Cron Trigger, 03:00 de Brasília; docs/ARQUITETURA.md, seção 7, RN16).
// Apaga pedidos de adoção antigos vencidos (RN15), anúncios de perdidos vencidos ou esquecidos, com as
// fotos (RN25, RN27), e o registro de envios do "Fale com a ONG" com mais de 1 dia (RN51).
import { sql } from 'drizzle-orm'
import { DIAS_GUARDA_PEDIDO_ADOCAO, VERSOES_FORMULARIO_COM_PRAZO } from '@sospatas/compartilhado'
import type { Db } from '../db'
import { apagarEnviosContatoAntigos } from '../servicos/contato'
import { apagarPerdidosVencidos, type BucketsPerdidos } from '../servicos/perdidos'

/**
 * RN15: desde 17/10/2026 os pedidos ficam guardados sem prazo. Só os enviados com o
 * consentimento antigo (formulário 1.0 a 1.2, que prometia apagar) são apagados 90 dias depois
 * da decisão (recusados e não concluídos) ou da adoção (aprovados, com o animal adotado).
 */
export async function apagarPedidosVencidos(db: Db): Promise<number> {
  const dias = sql.raw(String(DIAS_GUARDA_PEDIDO_ADOCAO))
  const versoes = sql.raw(VERSOES_FORMULARIO_COM_PRAZO.map((v) => `'${v}'`).join(', '))
  const apagados = await db.execute<{ id: string }>(sql`
    DELETE FROM pedidos_adocao p
    WHERE p.versao_formulario IN (${versoes})
      AND ((p.status IN ('recusado', 'nao_concluido')
            AND p.analisado_em < now() - make_interval(days => ${dias}))
        OR (p.status = 'aprovado' AND EXISTS (
              SELECT 1 FROM animais a
              WHERE a.id = p.animal_id
                AND a.status = 'adotado'
                AND a.data_adocao < CURRENT_DATE - ${dias}::int)))
    RETURNING p.id`)
  return apagados.length
}

export async function executarTarefasDiarias(
  db: Db,
  buckets: BucketsPerdidos,
): Promise<Record<string, number>> {
  const pedidosApagados = await apagarPedidosVencidos(db)
  const perdidos = await apagarPerdidosVencidos(db, buckets)
  const enviosContatoApagados = await apagarEnviosContatoAntigos(db)
  return {
    pedidosApagados,
    perdidosVencidosApagados: perdidos.publicados,
    perdidosPendentesApagados: perdidos.pendentes,
    enviosContatoApagados,
  }
}
