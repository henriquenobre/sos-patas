-- Animais da chamada do Início escolhidos pela equipe (RN54, 17/10/2026): foto 1 ou 2; null =
-- automático. Nenhum animal escolhido ao aplicar: o Início continua igual até a equipe escolher.
ALTER TABLE "animais" ADD COLUMN "destaque_inicio" smallint;--> statement-breakpoint
CREATE UNIQUE INDEX "animais_destaque_inicio_unico" ON "animais" USING btree ("destaque_inicio") WHERE "animais"."destaque_inicio" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "animais" ADD CONSTRAINT "animais_destaque_inicio_valido" CHECK ("animais"."destaque_inicio" IS NULL OR "animais"."destaque_inicio" BETWEEN 1 AND 2);