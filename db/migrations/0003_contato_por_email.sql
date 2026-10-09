-- Contato do site por e-mail (RN51). Ajuste manual: o e-mail entra com valor padrão para a
-- linha da ONG que já existe, e o padrão sai em seguida (o schema não tem padrão). O WhatsApp
-- da ONG fica vazio.
CREATE TABLE "contato_envios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ong" DROP CONSTRAINT "ong_whatsapp_valido";--> statement-breakpoint
ALTER TABLE "ong" ALTER COLUMN "whatsapp" DROP NOT NULL;--> statement-breakpoint
-- O número usado até aqui era pessoal: o site passa a usar só o e-mail até a ONG ter um WhatsApp próprio
UPDATE "ong" SET "whatsapp" = NULL;--> statement-breakpoint
ALTER TABLE "ong" ADD COLUMN "email" text DEFAULT 'sitesospatas@gmail.com' NOT NULL;--> statement-breakpoint
ALTER TABLE "ong" ALTER COLUMN "email" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "contato_envios_ip_hash_idx" ON "contato_envios" USING btree ("ip_hash","created_at");--> statement-breakpoint
ALTER TABLE "ong" ADD CONSTRAINT "ong_email_minusculo" CHECK ("ong"."email" = lower("ong"."email"));--> statement-breakpoint
ALTER TABLE "ong" ADD CONSTRAINT "ong_email_valido" CHECK ("ong"."email" ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$');--> statement-breakpoint
ALTER TABLE "ong" ADD CONSTRAINT "ong_email_limite" CHECK (char_length("ong"."email") <= 254);--> statement-breakpoint
ALTER TABLE "ong" ADD CONSTRAINT "ong_whatsapp_valido" CHECK ("ong"."whatsapp" IS NULL OR "ong"."whatsapp" ~ '^[0-9]{10,11}$');