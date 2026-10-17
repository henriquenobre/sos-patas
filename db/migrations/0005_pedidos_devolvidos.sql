-- Adoção devolvida tira o pedido de "Aprovados" (RN49, 17/10/2026). Ajuste dos dados que já
-- existem: pedido aprovado com o animal de volta como disponível é uma adoção que não aconteceu
-- ou foi devolvida antes desta regra; passa para não concluído (aba Recusados do T27).
UPDATE "pedidos_adocao" p
SET "status" = 'nao_concluido', "updated_at" = now()
FROM "animais" a
WHERE a."id" = p."animal_id" AND p."status" = 'aprovado' AND a."status" = 'disponivel';
