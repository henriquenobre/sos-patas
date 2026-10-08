-- Dados de exemplo SÓ PARA DESENVOLVIMENTO: animais, protetores e anúncios do protótipo
-- (fictícios, exceto Apolo e Pelezinho). Apaga animais, protetores e anúncios antes de inserir.
-- O script `pnpm db:seed` recusa rodar este arquivo fora do banco local.
BEGIN;

TRUNCATE animais, protetores, perdidos CASCADE;

-- Usuária de teste: o mesmo e-mail do modo local do login (apps/api/.dev.vars, etapa 4)
INSERT INTO equipe (email, nome) VALUES ('teste@sospatas.local', 'Teste')
ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome, ativo = true;

INSERT INTO protetores (id, nome, whatsapp) VALUES
  ('947a4a1e-31e0-5c2a-ac04-7dedf0cb3ef2', 'Protetora Ana Paula', '35900000000'),
  ('b0eed9eb-3a69-558a-acee-07cadc385619', 'Grupo Amigos dos Gatos', '35900000020');

INSERT INTO animais (id, nome, especie, sexo, nascimento_aprox, porte, castrado, vacinado, vermifugado,
  raca, raca_tipo, cor_pelagem, vacinas, problema_saude, docil, convive_animais, descricao, status,
  data_entrada, data_adocao, responsavel_tipo, protetor_id) VALUES
  ('f54bdcb5-4168-52e2-b923-65299a38e8a1', 'Apolo', 'cao', 'macho', CURRENT_DATE - interval '48 months', 'grande', true, 'sim', 'sim',
   'Pit Bull', 'mestico', 'Preto e caramelo', 'V10 e antirrábica', NULL, true, false,
   'Super dócil e carinhoso. Precisa ser filho único, sem outros animais na casa. Procuramos uma família sem preconceito com a raça.',
   'disponivel', CURRENT_DATE - 420, NULL, 'ong', NULL),
  ('68b92405-09e5-5dec-8914-9b7ed6a13f1d', 'Tobias', 'cao', 'macho', CURRENT_DATE - interval '84 months', 'medio', true, 'sim', 'sim',
   'SRD (vira-lata)', 'mestico', 'Caramelo', 'V10 e antirrábica', NULL, true, true,
   'Caramelo sorridente, calmo, adora passear e se dá bem com outros cães. Ideal para quem busca um companheiro tranquilo.',
   'disponivel', CURRENT_DATE - 760, NULL, 'ong', NULL),
  ('9224776e-b672-519f-b62d-ec936daed230', 'Mel', 'gato', 'femea', CURRENT_DATE - interval '36 months', 'pequeno', true, 'sim', 'sim',
   'SRD', 'mestico', 'Branca', 'V4 e antirrábica', NULL, true, true,
   'Gata branca e peluda, tranquila e independente. Gosta de colo no fim do dia.',
   'disponivel', CURRENT_DATE - 310, NULL, 'protetor', '947a4a1e-31e0-5c2a-ac04-7dedf0cb3ef2'),
  ('07088da1-ffe5-5b04-8347-1d81d2f025c6', 'Nina', 'cao', 'femea', CURRENT_DATE - interval '30 months', 'medio', true, 'sim', 'sem_informacao',
   'SRD (vira-lata)', 'mestico', 'Caramelo', 'V10', NULL, true, NULL,
   'Brincalhona, cheia de energia e muito fotogênica. Ótima com crianças.',
   'disponivel', CURRENT_DATE - 190, NULL, 'ong', NULL),
  ('8e984277-dd04-5732-a0eb-70013e93d24f', 'Thor', 'cao', 'macho', CURRENT_DATE - interval '60 months', 'gigante', true, 'sim', 'sim',
   'Pastor Alemão', 'mestico', 'Preto e castanho', 'V10 e antirrábica', 'Displasia leve no quadril, sem dor. Precisa de acompanhamento.', false, false,
   'Mistura de pastor, desconfiado no início, mas muito leal depois que conhece. Precisa de adotante com experiência e quintal.',
   'disponivel', CURRENT_DATE - 540, NULL, 'ong', NULL),
  ('7acb4867-5521-59cf-8af1-b6385197048a', 'Pelezinho', 'cao', 'macho', CURRENT_DATE - interval '5 months', 'pequeno', false, 'sim', 'sim',
   'SRD (vira-lata)', 'mestico', 'Preto com patas brancas', 'V10', NULL, true, true,
   'Filhote esperto e carinhoso. Vacina V10 e protocolo de saúde em dia.',
   'disponivel', CURRENT_DATE - 25, NULL, 'ong', NULL),
  ('5907636f-6053-58ef-9357-aa39c82b468e', 'Pipoca', 'gato', 'femea', CURRENT_DATE - interval '3 months', 'mini', false, 'nao', 'sim',
   'SRD', 'mestico', 'Cinza e branca', NULL, NULL, true, true,
   'Filhote cinza e branca, de uma ninhada resgatada. Muito curiosa e brincalhona.',
   'disponivel', CURRENT_DATE - 12, NULL, 'ong', NULL),
  ('1df546d9-1045-56f7-8b21-64fd7049901f', 'Ruivo', 'gato', 'macho', CURRENT_DATE - interval '4 months', 'pequeno', false, 'sim', 'sim',
   'SRD', 'mestico', 'Laranja', 'V4 (1ª dose)', NULL, true, true,
   'Filhote laranja de olhos azuis, carinhoso e muito esperto. Se dá bem com outros gatos.',
   'disponivel', CURRENT_DATE - 35, NULL, 'ong', NULL),
  ('c69cd68c-6f5e-5cce-aca9-e4fe7ddd4b47', 'Bolinha', 'cao', 'femea', CURRENT_DATE - interval '2 months', 'mini', false, 'nao', 'sim',
   'SRD (vira-lata)', 'mestico', 'Caramelo claro', NULL, NULL, true, true,
   'Filhotinha peluda e dengosa, vai ficar de porte pequeno.',
   'adotado', CURRENT_DATE - 40, CURRENT_DATE - 3, 'ong', NULL);

INSERT INTO animais_privado (animal_id, lar_nome, lar_tipo, observacoes, adotante_nome, adotante_whatsapp) VALUES
  ('f54bdcb5-4168-52e2-b923-65299a38e8a1', 'Lar da Fernanda (Centro)', 'remunerado', 'Toma vermífugo a cada 3 meses.', NULL, NULL),
  ('68b92405-09e5-5dec-8914-9b7ed6a13f1d', 'Lar do Sr. José (Bela Vista)', 'provisorio', '', NULL, NULL),
  ('9224776e-b672-519f-b62d-ec936daed230', 'Casa da Ana Paula', 'provisorio', '', NULL, NULL),
  ('07088da1-ffe5-5b04-8347-1d81d2f025c6', 'Lar da Claudia', 'provisorio', '', NULL, NULL),
  ('8e984277-dd04-5732-a0eb-70013e93d24f', 'Lar remunerado (Dona Lúcia)', 'remunerado', 'Reativo com outros machos.', NULL, NULL),
  ('7acb4867-5521-59cf-8af1-b6385197048a', 'Lar da Gracia', 'provisorio', '', NULL, NULL),
  ('5907636f-6053-58ef-9357-aa39c82b468e', 'Lar da Claudia', 'provisorio', 'Ninhada de 4.', NULL, NULL),
  ('1df546d9-1045-56f7-8b21-64fd7049901f', 'Lar da Claudia', 'provisorio', '', NULL, NULL),
  ('c69cd68c-6f5e-5cce-aca9-e4fe7ddd4b47', 'Lar da Gracia', 'provisorio', '', 'Fernanda', '35900000010');

-- Anúncios: p1 enviado pelo site e aprovado, p2 criado pela equipe (RN39), p3 aguardando moderação
INSERT INTO perdidos (id, tipo, especie, nome, bairro, data_ocorrido, descricao, contato_nome, contato_whatsapp,
  consentimento_em, origem, status, publicado_em, expira_em, ip_hash) VALUES
  ('dcfbec96-4e79-562a-b463-5958893c0ef0', 'perdido', 'cao', 'Bob', 'Bela Vista', CURRENT_DATE - 4,
   'Filhote preto com peito branco e patas marrons, coleira vermelha. Muito manso, atende pelo nome.',
   'Marcos', '35900000001', now() - interval '4 days', 'site', 'publicado', now() - interval '3 days', now() - interval '3 days' + interval '30 days', 'hash-de-exemplo'),
  ('7a2a80d9-83c3-5627-9783-fd2805df9b86', 'encontrado', 'gato', NULL, 'Centro', CURRENT_DATE - 2,
   'Gato preto adulto, olhos amarelos, muito dócil. Estava perto da praça. Está seguro comigo.',
   'Juliana', '35900000002', now() - interval '2 days', 'equipe', 'publicado', now() - interval '1 days', now() - interval '1 days' + interval '30 days', NULL),
  ('1427b527-483a-5539-b6b0-06da2a0200ba', 'perdido', 'cao', 'Luna', 'Novo Horizonte', CURRENT_DATE - 1,
   'Filhote branca com orelhas marrons e compridas, porte pequeno. Fugiu pelo portão.',
   'Rita', '35900000003', now() - interval '1 days', 'site', 'pendente', NULL, NULL, 'hash-de-exemplo');

COMMIT;
