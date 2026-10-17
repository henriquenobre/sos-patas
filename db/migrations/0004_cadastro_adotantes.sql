-- Cadastro de quem adotou (RN53) e pedidos guardados sem prazo (RN15). Ajuste manual: antes de
-- apagar as colunas do adotante em animais_privado, cada adotante de animal adotado entra em
-- adotantes (um cadastro por WhatsApp; o bairro vem do pedido aprovado, se ainda existir) e a
-- adoção entra em adocoes, ligada ao pedido.
CREATE TABLE "adocoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adotante_id" uuid NOT NULL,
	"animal_id" uuid,
	"animal_nome" text NOT NULL,
	"pedido_id" uuid,
	"data_adocao" date NOT NULL,
	"data_devolucao" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "adocoes_animal_nome_limite" CHECK (char_length("adocoes"."animal_nome") <= 40),
	CONSTRAINT "adocoes_animal_nome_preenchido" CHECK (btrim("adocoes"."animal_nome") <> ''),
	CONSTRAINT "adocoes_devolucao_depois" CHECK ("adocoes"."data_devolucao" IS NULL OR "adocoes"."data_devolucao" >= "adocoes"."data_adocao")
);
--> statement-breakpoint
CREATE TABLE "adotantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"whatsapp" text,
	"bairro_cidade" text,
	"observacoes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "adotantes_nome_limite" CHECK (char_length("adotantes"."nome") <= 100),
	CONSTRAINT "adotantes_nome_preenchido" CHECK (btrim("adotantes"."nome") <> ''),
	CONSTRAINT "adotantes_whatsapp_valido" CHECK ("adotantes"."whatsapp" IS NULL OR "adotantes"."whatsapp" ~ '^[0-9]{10,11}$'),
	CONSTRAINT "adotantes_bairro_cidade_limite" CHECK (char_length("adotantes"."bairro_cidade") <= 100),
	CONSTRAINT "adotantes_observacoes_limite" CHECK (char_length("adotantes"."observacoes") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "animais_privado" DROP CONSTRAINT "animais_privado_adotante_nome_limite";--> statement-breakpoint
ALTER TABLE "animais_privado" DROP CONSTRAINT "animais_privado_adotante_whatsapp_valido";--> statement-breakpoint
ALTER TABLE "adocoes" ADD CONSTRAINT "adocoes_adotante_id_adotantes_id_fk" FOREIGN KEY ("adotante_id") REFERENCES "public"."adotantes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adocoes" ADD CONSTRAINT "adocoes_animal_id_animais_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animais"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adocoes" ADD CONSTRAINT "adocoes_pedido_id_pedidos_adocao_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos_adocao"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adocoes" ADD CONSTRAINT "adocoes_updated_by_equipe_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adotantes" ADD CONSTRAINT "adotantes_updated_by_equipe_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adocoes_adotante_idx" ON "adocoes" USING btree ("adotante_id");--> statement-breakpoint
CREATE UNIQUE INDEX "adocoes_uma_em_andamento_por_animal" ON "adocoes" USING btree ("animal_id") WHERE "adocoes"."data_devolucao" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "adotantes_whatsapp_unico" ON "adotantes" USING btree ("whatsapp") WHERE "adotantes"."whatsapp" IS NOT NULL;--> statement-breakpoint
-- Adotantes atuais, sem repetir o mesmo WhatsApp (fica o nome da adoção mais recente)
INSERT INTO "adotantes" ("nome", "whatsapp", "bairro_cidade")
SELECT DISTINCT ON (ap."adotante_whatsapp") ap."adotante_nome", ap."adotante_whatsapp",
  (SELECT p."bairro_cidade" FROM "pedidos_adocao" p
   WHERE p."animal_id" = a."id" AND p."status" = 'aprovado' AND p."whatsapp" = ap."adotante_whatsapp"
   ORDER BY p."created_at" DESC LIMIT 1)
FROM "animais_privado" ap
JOIN "animais" a ON a."id" = ap."animal_id"
WHERE a."status" = 'adotado' AND ap."adotante_nome" IS NOT NULL AND ap."adotante_whatsapp" IS NOT NULL
ORDER BY ap."adotante_whatsapp", a."data_adocao" DESC;--> statement-breakpoint
INSERT INTO "adotantes" ("nome")
SELECT DISTINCT ap."adotante_nome"
FROM "animais_privado" ap
JOIN "animais" a ON a."id" = ap."animal_id"
WHERE a."status" = 'adotado' AND ap."adotante_nome" IS NOT NULL AND ap."adotante_whatsapp" IS NULL;--> statement-breakpoint
INSERT INTO "adocoes" ("adotante_id", "animal_id", "animal_nome", "pedido_id", "data_adocao")
SELECT ad."id", a."id", a."nome",
  (SELECT p."id" FROM "pedidos_adocao" p
   WHERE p."animal_id" = a."id" AND p."status" = 'aprovado'
   ORDER BY p."created_at" DESC LIMIT 1),
  a."data_adocao"
FROM "animais" a
JOIN "animais_privado" ap ON ap."animal_id" = a."id"
JOIN "adotantes" ad ON (ap."adotante_whatsapp" IS NOT NULL AND ad."whatsapp" = ap."adotante_whatsapp")
  OR (ap."adotante_whatsapp" IS NULL AND ad."whatsapp" IS NULL AND ad."nome" = ap."adotante_nome")
WHERE a."status" = 'adotado' AND ap."adotante_nome" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "animais_privado" DROP COLUMN "adotante_nome";--> statement-breakpoint
ALTER TABLE "animais_privado" DROP COLUMN "adotante_whatsapp";