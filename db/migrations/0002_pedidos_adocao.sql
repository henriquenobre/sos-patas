CREATE TYPE "public"."pedido_status" AS ENUM('pendente', 'aprovado', 'recusado', 'nao_concluido');--> statement-breakpoint
ALTER TYPE "public"."status_animal" ADD VALUE 'em_analise' BEFORE 'adotado';--> statement-breakpoint
CREATE TABLE "pedidos_adocao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"status" "pedido_status" DEFAULT 'pendente' NOT NULL,
	"nome" text NOT NULL,
	"whatsapp" text NOT NULL,
	"bairro_cidade" text NOT NULL,
	"versao_formulario" text NOT NULL,
	"respostas" jsonb NOT NULL,
	"termo_ciente_em" timestamp with time zone NOT NULL,
	"versao_termo" text NOT NULL,
	"consentimento_em" timestamp with time zone NOT NULL,
	"ip_hash" text,
	"observacao_equipe" text DEFAULT '' NOT NULL,
	"analisado_em" timestamp with time zone,
	"analisado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "pedidos_adocao_nome_limite" CHECK (char_length("pedidos_adocao"."nome") <= 100),
	CONSTRAINT "pedidos_adocao_nome_preenchido" CHECK (btrim("pedidos_adocao"."nome") <> ''),
	CONSTRAINT "pedidos_adocao_whatsapp_valido" CHECK ("pedidos_adocao"."whatsapp" ~ '^[0-9]{10,11}$'),
	CONSTRAINT "pedidos_adocao_bairro_cidade_limite" CHECK (char_length("pedidos_adocao"."bairro_cidade") <= 100),
	CONSTRAINT "pedidos_adocao_bairro_cidade_preenchido" CHECK (btrim("pedidos_adocao"."bairro_cidade") <> ''),
	CONSTRAINT "pedidos_adocao_observacao_limite" CHECK (char_length("pedidos_adocao"."observacao_equipe") <= 1000),
	CONSTRAINT "pedidos_adocao_analise" CHECK (("pedidos_adocao"."status" = 'pendente') = ("pedidos_adocao"."analisado_em" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "pedidos_adocao" ADD CONSTRAINT "pedidos_adocao_animal_id_animais_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_adocao" ADD CONSTRAINT "pedidos_adocao_analisado_por_equipe_id_fk" FOREIGN KEY ("analisado_por") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_adocao" ADD CONSTRAINT "pedidos_adocao_updated_by_equipe_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_adocao_um_pendente_por_animal" ON "pedidos_adocao" USING btree ("animal_id") WHERE "pedidos_adocao"."status" = 'pendente';--> statement-breakpoint
CREATE INDEX "pedidos_adocao_status_idx" ON "pedidos_adocao" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "pedidos_adocao_whatsapp_idx" ON "pedidos_adocao" USING btree ("whatsapp");