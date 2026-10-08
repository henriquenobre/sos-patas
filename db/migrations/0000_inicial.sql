CREATE TYPE "public"."conteudo_lista" AS ENUM('perguntas', 'como_adotar_passos', 'como_adotar_antes', 'como_adotar_vantagens', 'inicio_marcos', 'inicio_numeros', 'inicio_fotos', 'inicio_como_funcionamos', 'ajude_formas');--> statement-breakpoint
CREATE TYPE "public"."especie" AS ENUM('cao', 'gato');--> statement-breakpoint
CREATE TYPE "public"."lar_tipo" AS ENUM('provisorio', 'remunerado');--> statement-breakpoint
CREATE TYPE "public"."perdido_origem" AS ENUM('site', 'equipe');--> statement-breakpoint
CREATE TYPE "public"."perdido_status" AS ENUM('pendente', 'publicado');--> statement-breakpoint
CREATE TYPE "public"."perdido_tipo" AS ENUM('perdido', 'encontrado');--> statement-breakpoint
CREATE TYPE "public"."pix_tipo" AS ENUM('cnpj', 'cpf', 'email', 'telefone', 'aleatoria');--> statement-breakpoint
CREATE TYPE "public"."porte" AS ENUM('mini', 'pequeno', 'medio', 'grande', 'gigante');--> statement-breakpoint
CREATE TYPE "public"."raca_tipo" AS ENUM('puro', 'mestico');--> statement-breakpoint
CREATE TYPE "public"."responsavel_tipo" AS ENUM('ong', 'protetor');--> statement-breakpoint
CREATE TYPE "public"."sexo" AS ENUM('macho', 'femea');--> statement-breakpoint
CREATE TYPE "public"."sim_nao_sem_informacao" AS ENUM('sim', 'nao', 'sem_informacao');--> statement-breakpoint
CREATE TYPE "public"."status_animal" AS ENUM('disponivel', 'adotado');--> statement-breakpoint
CREATE TABLE "animais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"especie" "especie" NOT NULL,
	"sexo" "sexo" NOT NULL,
	"nascimento_aprox" date NOT NULL,
	"porte" "porte" NOT NULL,
	"raca" text,
	"raca_tipo" "raca_tipo",
	"cor_pelagem" text,
	"castrado" boolean NOT NULL,
	"vacinado" "sim_nao_sem_informacao" NOT NULL,
	"vacinas" text,
	"vermifugado" "sim_nao_sem_informacao" NOT NULL,
	"problema_saude" text,
	"docil" boolean,
	"convive_animais" boolean,
	"descricao" text DEFAULT '' NOT NULL,
	"status" "status_animal" DEFAULT 'disponivel' NOT NULL,
	"data_entrada" date DEFAULT CURRENT_DATE NOT NULL,
	"data_adocao" date,
	"responsavel_tipo" "responsavel_tipo" DEFAULT 'ong' NOT NULL,
	"protetor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "animais_nome_limite" CHECK (char_length("animais"."nome") <= 40),
	CONSTRAINT "animais_nome_preenchido" CHECK (btrim("animais"."nome") <> ''),
	CONSTRAINT "animais_raca_limite" CHECK (char_length("animais"."raca") <= 60),
	CONSTRAINT "animais_cor_pelagem_limite" CHECK (char_length("animais"."cor_pelagem") <= 60),
	CONSTRAINT "animais_vacinas_limite" CHECK (char_length("animais"."vacinas") <= 120),
	CONSTRAINT "animais_problema_saude_limite" CHECK (char_length("animais"."problema_saude") <= 300),
	CONSTRAINT "animais_descricao_limite" CHECK (char_length("animais"."descricao") <= 500),
	CONSTRAINT "animais_responsavel_protetor" CHECK (("animais"."responsavel_tipo" = 'ong' AND "animais"."protetor_id" IS NULL) OR ("animais"."responsavel_tipo" = 'protetor' AND "animais"."protetor_id" IS NOT NULL)),
	CONSTRAINT "animais_data_adocao" CHECK (("animais"."status" = 'adotado') = ("animais"."data_adocao" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "animais_privado" (
	"animal_id" uuid PRIMARY KEY NOT NULL,
	"lar_nome" text,
	"lar_tipo" "lar_tipo",
	"observacoes" text DEFAULT '' NOT NULL,
	"adotante_nome" text,
	"adotante_whatsapp" text,
	CONSTRAINT "animais_privado_lar_nome_limite" CHECK (char_length("animais_privado"."lar_nome") <= 80),
	CONSTRAINT "animais_privado_observacoes_limite" CHECK (char_length("animais_privado"."observacoes") <= 1000),
	CONSTRAINT "animais_privado_adotante_nome_limite" CHECK (char_length("animais_privado"."adotante_nome") <= 80),
	CONSTRAINT "animais_privado_adotante_whatsapp_valido" CHECK ("animais_privado"."adotante_whatsapp" IS NULL OR "animais_privado"."adotante_whatsapp" ~ '^[0-9]{10,11}$')
);
--> statement-breakpoint
CREATE TABLE "conteudo_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lista" "conteudo_lista" NOT NULL,
	"titulo" text,
	"texto" text NOT NULL,
	"foto_path" text,
	"ordem" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "conteudo_itens_ordem_valida" CHECK ("conteudo_itens"."ordem" >= 0),
	CONSTRAINT "conteudo_itens_sem_titulo" CHECK ("conteudo_itens"."lista" NOT IN ('como_adotar_antes', 'inicio_fotos') OR "conteudo_itens"."titulo" IS NULL),
	CONSTRAINT "conteudo_itens_titulo_obrigatorio" CHECK ("conteudo_itens"."lista" NOT IN ('perguntas', 'como_adotar_passos', 'inicio_marcos', 'inicio_numeros', 'inicio_como_funcionamos', 'ajude_formas') OR ("conteudo_itens"."titulo" IS NOT NULL AND btrim("conteudo_itens"."titulo") <> '')),
	CONSTRAINT "conteudo_itens_titulo_limite" CHECK ("conteudo_itens"."titulo" IS NULL OR char_length("conteudo_itens"."titulo") <= CASE lista WHEN 'perguntas' THEN 150 WHEN 'como_adotar_passos' THEN 60 WHEN 'como_adotar_vantagens' THEN 60 WHEN 'inicio_marcos' THEN 20 WHEN 'inicio_numeros' THEN 20 WHEN 'inicio_como_funcionamos' THEN 40 WHEN 'ajude_formas' THEN 40 ELSE 0 END),
	CONSTRAINT "conteudo_itens_texto_preenchido" CHECK (btrim("conteudo_itens"."texto") <> ''),
	CONSTRAINT "conteudo_itens_texto_limite" CHECK (char_length("conteudo_itens"."texto") <= CASE lista WHEN 'perguntas' THEN 1000 WHEN 'como_adotar_passos' THEN 600 WHEN 'como_adotar_antes' THEN 200 WHEN 'como_adotar_vantagens' THEN 200 WHEN 'inicio_marcos' THEN 300 WHEN 'inicio_numeros' THEN 80 WHEN 'inicio_fotos' THEN 120 WHEN 'inicio_como_funcionamos' THEN 150 WHEN 'ajude_formas' THEN 300 END),
	CONSTRAINT "conteudo_itens_foto" CHECK (("conteudo_itens"."lista" IN ('inicio_fotos')) = ("conteudo_itens"."foto_path" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "conteudo_textos" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "conteudo_textos_chave_valida" CHECK ("conteudo_textos"."chave" IN ('inicio.chamada_titulo', 'inicio.chamada_texto', 'inicio.historia', 'inicio.missao', 'inicio.esperando_texto', 'como_adotar.subtitulo', 'como_adotar.aviso_protetor', 'como_adotar.vantagens_rodape', 'ajude.introducao')),
	CONSTRAINT "conteudo_textos_valor_limite" CHECK (char_length("conteudo_textos"."valor") <= CASE chave WHEN 'inicio.chamada_titulo' THEN 60 WHEN 'inicio.chamada_texto' THEN 200 WHEN 'inicio.historia' THEN 2000 WHEN 'inicio.missao' THEN 400 WHEN 'inicio.esperando_texto' THEN 200 WHEN 'como_adotar.subtitulo' THEN 100 WHEN 'como_adotar.aviso_protetor' THEN 500 WHEN 'como_adotar.vantagens_rodape' THEN 200 WHEN 'ajude.introducao' THEN 300 END),
	CONSTRAINT "conteudo_textos_obrigatorio" CHECK ("conteudo_textos"."chave" NOT IN ('inicio.chamada_titulo', 'inicio.chamada_texto', 'inicio.historia', 'inicio.missao', 'inicio.esperando_texto', 'como_adotar.subtitulo', 'como_adotar.aviso_protetor') OR btrim("conteudo_textos"."valor") <> '')
);
--> statement-breakpoint
CREATE TABLE "equipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipe_email_unique" UNIQUE("email"),
	CONSTRAINT "equipe_email_minusculo" CHECK ("equipe"."email" = lower("equipe"."email")),
	CONSTRAINT "equipe_email_limite" CHECK (char_length("equipe"."email") <= 254),
	CONSTRAINT "equipe_nome_limite" CHECK (char_length("equipe"."nome") <= 40),
	CONSTRAINT "equipe_nome_preenchido" CHECK (btrim("equipe"."nome") <> '')
);
--> statement-breakpoint
CREATE TABLE "fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"path_miniatura" text NOT NULL,
	"path_completa" text NOT NULL,
	CONSTRAINT "fotos_ordem_valida" CHECK ("fotos"."ordem" BETWEEN 0 AND 2)
);
--> statement-breakpoint
CREATE TABLE "ong" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"nome_completo" text NOT NULL,
	"whatsapp" text NOT NULL,
	"instagram" text NOT NULL,
	"facebook" text,
	"pix_tipo" "pix_tipo" NOT NULL,
	"pix_chave" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "ong_linha_unica" CHECK ("ong"."id" = 1),
	CONSTRAINT "ong_whatsapp_valido" CHECK ("ong"."whatsapp" ~ '^[0-9]{10,11}$'),
	CONSTRAINT "ong_nome_completo_limite" CHECK (char_length("ong"."nome_completo") <= 120),
	CONSTRAINT "ong_instagram_limite" CHECK (char_length("ong"."instagram") <= 30),
	CONSTRAINT "ong_instagram_sem_arroba" CHECK (position('@' in "ong"."instagram") = 0),
	CONSTRAINT "ong_facebook_url" CHECK ("ong"."facebook" IS NULL OR (char_length("ong"."facebook") <= 200 AND "ong"."facebook" LIKE 'https://%')),
	CONSTRAINT "ong_pix_chave_limite" CHECK (char_length("ong"."pix_chave") <= 100),
	CONSTRAINT "ong_pix_chave_preenchida" CHECK (btrim("ong"."pix_chave") <> '')
);
--> statement-breakpoint
CREATE TABLE "perdidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "perdido_tipo" NOT NULL,
	"especie" "especie" NOT NULL,
	"nome" text,
	"bairro" text NOT NULL,
	"data_ocorrido" date NOT NULL,
	"descricao" text NOT NULL,
	"contato_nome" text NOT NULL,
	"contato_whatsapp" text NOT NULL,
	"consentimento_em" timestamp with time zone NOT NULL,
	"origem" "perdido_origem" DEFAULT 'site' NOT NULL,
	"status" "perdido_status" DEFAULT 'pendente' NOT NULL,
	"publicado_em" timestamp with time zone,
	"expira_em" timestamp with time zone,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "perdidos_nome_limite" CHECK (char_length("perdidos"."nome") <= 40),
	CONSTRAINT "perdidos_bairro_limite" CHECK (char_length("perdidos"."bairro") <= 60),
	CONSTRAINT "perdidos_bairro_preenchido" CHECK (btrim("perdidos"."bairro") <> ''),
	CONSTRAINT "perdidos_descricao_limite" CHECK (char_length("perdidos"."descricao") <= 300),
	CONSTRAINT "perdidos_descricao_preenchida" CHECK (btrim("perdidos"."descricao") <> ''),
	CONSTRAINT "perdidos_contato_nome_limite" CHECK (char_length("perdidos"."contato_nome") <= 30),
	CONSTRAINT "perdidos_contato_nome_preenchido" CHECK (btrim("perdidos"."contato_nome") <> ''),
	CONSTRAINT "perdidos_contato_whatsapp_valido" CHECK ("perdidos"."contato_whatsapp" ~ '^[0-9]{10,11}$'),
	CONSTRAINT "perdidos_datas_publicacao" CHECK (("perdidos"."status" = 'publicado') = ("perdidos"."publicado_em" IS NOT NULL AND "perdidos"."expira_em" IS NOT NULL)),
	CONSTRAINT "perdidos_ip_hash_so_site" CHECK ("perdidos"."origem" = 'site' OR "perdidos"."ip_hash" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "perdidos_fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"perdido_id" uuid NOT NULL,
	"path" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protetores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"whatsapp" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "protetores_nome_limite" CHECK (char_length("protetores"."nome") <= 60),
	CONSTRAINT "protetores_nome_preenchido" CHECK (btrim("protetores"."nome") <> ''),
	CONSTRAINT "protetores_whatsapp_valido" CHECK ("protetores"."whatsapp" ~ '^[0-9]{10,11}$')
);
--> statement-breakpoint
ALTER TABLE "animais" ADD CONSTRAINT "animais_protetor_id_protetores_id_fk" FOREIGN KEY ("protetor_id") REFERENCES "public"."protetores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animais" ADD CONSTRAINT "animais_updated_by_equipe_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animais_privado" ADD CONSTRAINT "animais_privado_animal_id_animais_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudo_itens" ADD CONSTRAINT "conteudo_itens_updated_by_equipe_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudo_textos" ADD CONSTRAINT "conteudo_textos_updated_by_equipe_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_animal_id_animais_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ong" ADD CONSTRAINT "ong_updated_by_equipe_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perdidos" ADD CONSTRAINT "perdidos_updated_by_equipe_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perdidos_fotos" ADD CONSTRAINT "perdidos_fotos_perdido_id_perdidos_id_fk" FOREIGN KEY ("perdido_id") REFERENCES "public"."perdidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protetores" ADD CONSTRAINT "protetores_updated_by_equipe_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "animais_vitrine_idx" ON "animais" USING btree ("status","data_entrada");--> statement-breakpoint
CREATE INDEX "perdidos_status_expira_idx" ON "perdidos" USING btree ("status","expira_em");