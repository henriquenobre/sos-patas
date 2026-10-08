-- Migration manual: o Drizzle não gera UNIQUE DEFERRABLE.
-- Uma posição por item em cada animal e em cada lista. A conferência fica para o fim da
-- transação, para a API poder trocar duas posições de lugar (RN35) sem conflito no meio.
ALTER TABLE "fotos"
  ADD CONSTRAINT "fotos_animal_ordem_unica" UNIQUE ("animal_id", "ordem") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "conteudo_itens"
  ADD CONSTRAINT "conteudo_itens_lista_ordem_unica" UNIQUE ("lista", "ordem") DEFERRABLE INITIALLY DEFERRED;
