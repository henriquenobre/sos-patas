-- Conteúdo inicial do site (docs/DESENVOLVIMENTO.md, seção 5, "Conteúdo inicial (seed)").
-- Textos copiados do protótipo (prototipo/index.html); história, marcos, números e fotos
-- enviados pela ONG em 07/10/2026. Pode rodar de novo sem estragar nada: não sobrescreve o
-- que a equipe já editou e só preenche uma lista se ela estiver vazia.
-- Os ids são fixos: os de inicio_fotos dão nome aos arquivos site/historia/{id}.webp no R2
-- (etapa 14; mapa em db/seed/fotos_historia.json).
BEGIN;

INSERT INTO ong (id, nome_completo, whatsapp, instagram, facebook, pix_tipo, pix_chave) VALUES
  (1, 'Sociedade de Proteção aos Animais de Passos/MG', '35988439614', 'sospatas.ong', 'https://www.facebook.com/sospatasmg', 'cnpj', '26.515.895/0001-90')
ON CONFLICT (id) DO NOTHING;

INSERT INTO conteudo_textos (chave, valor) VALUES
  ('inicio.chamada_titulo', 'Toda patinha merece um lar.'),
  ('inicio.chamada_texto', 'Conheça os cães e gatos da SOS Patas que estão esperando uma família em Passos e região.'),
  ('inicio.historia', E'A SOS Patas nasceu em 2015, em um grupo de WhatsApp. A ideia foi da protetora Stephanie Christiene, e logo um grupo de pessoas abraçou a causa de ajudar os animais em situação de rua de Passos.\n\nComo o próprio nome diz, pensamos em um socorro imediato: casos urgentes, animais nas ruas precisando de ajuda. Foram muitos casos tristes. Um deles foi o de um cão amarrado com arame em uma cerca, que se debateu tanto que quase cortou o pescoço. Chegamos a tempo: ele sobreviveu e foi adotado.\n\nEm 2016 fizemos a primeira feira de adoção. De lá para cá já foram mais de 100 feiras, com cerca de 8 animais adotados em cada uma, e quase mil animais ganharam um lar, sem contar as adoções pelas redes sociais.\n\nEssa história foi construída por muita gente: a pastora Dalva (que nos deixou em 2020), Gracia, Tarlei, Deide, Adriana e tantos outros voluntários, alguns ainda conosco e outros que já não estão mais.'),
  ('inicio.esperando_texto', 'Adultos já sabem conviver, são mais calmos e chegam prontos para dar carinho. Adotar um deles é mudar uma vida para sempre.'),
  ('inicio.missao', 'Proteger animais abandonados e maltratados, providenciar atendimento veterinário e encontrar lares amorosos.'),
  ('como_adotar.subtitulo', 'Simples e responsável'),
  ('como_adotar.vantagens_rodape', 'A ONG confere na lista de adoções feitas pelo site.'),
  ('como_adotar.aviso_protetor', 'Alguns animais do site são de protetores independentes. Nesses casos, a adoção, o termo e a devolução (se o animal não se adaptar) são combinados diretamente com o protetor. A SOS Patas ajuda na divulgação, mas não é responsável por essas adoções.'),
  ('ajude.introducao', 'A SOS Patas é formada só por voluntários e vive de doações. Toda ajuda faz diferença.')
ON CONFLICT (chave) DO NOTHING;

-- perguntas
INSERT INTO conteudo_itens (id, lista, titulo, texto, foto_path, ordem)
SELECT v.id::uuid, 'perguntas', v.titulo, v.texto, v.foto_path, v.ordem FROM (VALUES
  ('17e9b6a2-5cca-5b8f-b363-db8fce2ce5d0', 'Não posso mais ficar com meu animal. Vocês recebem?', 'Não temos abrigo para receber animais. Você pode divulgar o animal e procurar um novo lar com responsabilidade. Abandonar animais é crime (Lei 9.605/1998).', NULL, 0),
  ('4d6277eb-edd6-50f8-b3cf-570cfca4c952', 'E se o animal não se adaptar?', 'Existe um período de adaptação de 15 dias. Se não der certo, avise e devolva o animal a quem doou (a SOS Patas ou o protetor parceiro) dentro desse prazo. Depois dos 15 dias, se desistir, avise quem doou e mantenha o animal como lar provisório até ele encontrar um novo lar, porque a ONG não tem abrigo. Nunca repasse nem abandone.', NULL, 1),
  ('b3867dfd-6f2b-5111-8acc-1757e981618a', 'Tem alguma vantagem adotar pelo site?', 'Sim! Quem adota pelo site tem prioridade na castração gratuita quando houver castramóvel e desconto em clínicas parceiras. A ONG confere na lista de adoções feitas pelo site.', NULL, 2),
  ('976f6e6b-be9d-5a5a-8323-0da68697527f', 'O animal é de um protetor parceiro. Quem é o responsável?', 'O próprio protetor. A adoção, o termo e uma eventual devolução são combinados diretamente com ele. A SOS Patas só ajuda a divulgar.', NULL, 3),
  ('a4ebc0a3-90c5-5971-9e8d-47a3c3b30cdb', 'Os animais são castrados e vacinados?', 'Cada ficha mostra a situação de castração, vacinas e vermífugo de cada animal. Filhotes podem ainda não ter idade para castrar.', NULL, 4),
  ('ecd26605-30f8-5f19-8786-a749f3c94782', 'Posso adotar se moro em apartamento?', 'Depende do animal. Na ficha você vê o porte e o temperamento, e a equipe avalia pelo formulário de interesse.', NULL, 5),
  ('764028f3-b3ec-53a6-9f6d-a9352e293f60', 'Como posso ajudar a ONG?', 'Com doações pelo PIX (CNPJ 26.515.895/0001-90), oferecendo lar temporário ou compartilhando os animais nas redes sociais.', NULL, 6),
  ('2a394a64-198e-55b3-858b-9f469138d7b8', 'Sou protetor independente. Posso divulgar um animal aqui?', 'Fale com a SOS Patas pelo WhatsApp. Animais de protetores parceiros aparecem no site com o nome do responsável.', NULL, 7)
) AS v (id, titulo, texto, foto_path, ordem)
WHERE NOT EXISTS (SELECT 1 FROM conteudo_itens WHERE lista = 'perguntas');

-- como_adotar_passos
INSERT INTO conteudo_itens (id, lista, titulo, texto, foto_path, ordem)
SELECT v.id::uuid, 'como_adotar_passos', v.titulo, v.texto, v.foto_path, v.ordem FROM (VALUES
  ('f0a17227-d877-5d59-a0fa-230252713b23', 'Escolha o animal', 'Navegue pela vitrine, use os filtros e abra a ficha para ver saúde e temperamento.', NULL, 0),
  ('baaa25fd-e22f-5060-98ec-b164349afb9d', 'Preencha o formulário de interesse', 'Toque em "Quero adotar" e responda algumas perguntas sobre você, sua casa e sua rotina. Leva poucos minutos.', NULL, 1),
  ('0ae866ff-05c3-5dd7-b9a8-e430b4a326c3', 'Análise', 'A equipe da SOS Patas (ou o protetor parceiro responsável pelo animal) analisa o formulário e entra em contato pelo WhatsApp.', NULL, 2),
  ('7e213f20-2ab9-55d8-a9e6-94bdd0b7c7ec', 'Termo de responsabilidade', 'Você assina o termo de responsabilidade de adoção e fica com uma via.', NULL, 3),
  ('bdf84215-4372-5777-927c-dc563b5420e9', 'Período de adaptação: 15 dias', 'Nos primeiros 15 dias, acompanhamos a adaptação pelo WhatsApp e, se necessário, com uma visita. Se o animal não se adaptar, avise e devolva a quem doou dentro desse prazo. Depois dos 15 dias, se desistir, avise quem doou e mantenha o animal como lar provisório até um novo lar. Nunca repasse para outra pessoa nem abandone.', NULL, 4)
) AS v (id, titulo, texto, foto_path, ordem)
WHERE NOT EXISTS (SELECT 1 FROM conteudo_itens WHERE lista = 'como_adotar_passos');

-- como_adotar_antes
INSERT INTO conteudo_itens (id, lista, titulo, texto, foto_path, ordem)
SELECT v.id::uuid, 'como_adotar_antes', v.titulo, v.texto, v.foto_path, v.ordem FROM (VALUES
  ('bfcf40a6-e06a-5652-95c0-fef44ba2d68c', NULL, 'Um animal vive de 10 a 15 anos ou mais.', NULL, 0),
  ('7f3ac5e4-11ed-5f81-bf99-c70cf2b0d56e', NULL, 'Há custos com ração, vacinas e veterinário.', NULL, 1),
  ('5ea03d82-a9cb-5e49-a289-da1277227b0d', NULL, 'Sua casa precisa ser segura (portão, telas para gatos).', NULL, 2),
  ('db20c8b0-6358-532b-af97-fc33c3f4d3f4', NULL, 'Todos na casa precisam estar de acordo.', NULL, 3),
  ('594d91a9-7351-52a9-b916-3d9c94b14deb', NULL, 'O animal não pode ficar em corrente e precisa de abrigo, coleira com placa de identificação, ração e água fresca.', NULL, 4),
  ('57b05504-4057-5d21-8691-be948f720e2e', NULL, 'A castração é um compromisso do termo de adoção.', NULL, 5)
) AS v (id, titulo, texto, foto_path, ordem)
WHERE NOT EXISTS (SELECT 1 FROM conteudo_itens WHERE lista = 'como_adotar_antes');

-- como_adotar_vantagens
INSERT INTO conteudo_itens (id, lista, titulo, texto, foto_path, ordem)
SELECT v.id::uuid, 'como_adotar_vantagens', v.titulo, v.texto, v.foto_path, v.ordem FROM (VALUES
  ('04b6ba8e-4310-5a50-ad41-9e19d5bf8655', 'Prioridade na castração gratuita', 'quando houver castramóvel em Passos.', NULL, 0),
  ('d986148f-c56b-5f82-8ae4-08dbed39d4f1', 'Desconto em clínicas veterinárias parceiras', 'para castração.', NULL, 1)
) AS v (id, titulo, texto, foto_path, ordem)
WHERE NOT EXISTS (SELECT 1 FROM conteudo_itens WHERE lista = 'como_adotar_vantagens');

-- inicio_marcos
INSERT INTO conteudo_itens (id, lista, titulo, texto, foto_path, ordem)
SELECT v.id::uuid, 'inicio_marcos', v.titulo, v.texto, v.foto_path, v.ordem FROM (VALUES
  ('5cfc36ed-30be-5a07-9012-69d0b2f3a3ec', '2015', 'Nasce o grupo de WhatsApp que deu origem à SOS Patas, por iniciativa da protetora Stephanie Christiene.', NULL, 0),
  ('bd1ce815-4647-561b-a1de-1b268ea0cbcc', '5 de julho de 2016', 'Assembleia de fundação da ONG.', NULL, 1),
  ('0bba77fb-9c33-5e3f-95a8-b2d8b2eb6c6d', '2016', 'Primeira feira de adoção.', NULL, 2),
  ('15b5d424-e79b-5185-80e7-c14a8d24278f', 'Hoje', 'Mais de 100 feiras de adoção e mais de mil animais com um novo lar, somando as feiras e as redes sociais.', NULL, 3)
) AS v (id, titulo, texto, foto_path, ordem)
WHERE NOT EXISTS (SELECT 1 FROM conteudo_itens WHERE lista = 'inicio_marcos');

-- inicio_numeros
INSERT INTO conteudo_itens (id, lista, titulo, texto, foto_path, ordem)
SELECT v.id::uuid, 'inicio_numeros', v.titulo, v.texto, v.foto_path, v.ordem FROM (VALUES
  ('fc8a2fe3-cd74-551c-a4ff-6437374945d0', 'Desde 2015', 'cuidando dos animais de Passos', NULL, 0),
  ('4a798ec9-caa6-530d-844e-76abf428c2ba', '+100', 'feiras de adoção', NULL, 1),
  ('b17d301f-50c5-562c-8590-787577cdf120', '+1.000', 'animais adotados', NULL, 2)
) AS v (id, titulo, texto, foto_path, ordem)
WHERE NOT EXISTS (SELECT 1 FROM conteudo_itens WHERE lista = 'inicio_numeros');

-- inicio_fotos
INSERT INTO conteudo_itens (id, lista, titulo, texto, foto_path, ordem)
SELECT v.id::uuid, 'inicio_fotos', v.titulo, v.texto, v.foto_path, v.ordem FROM (VALUES
  ('a091baf8-91c6-5bec-b4aa-e0d82e5c1eb9', NULL, 'Voluntários em feira de adoção', 'site/historia/a091baf8-91c6-5bec-b4aa-e0d82e5c1eb9.webp', 0), -- historia-4.jpg
  ('31ed179a-92d7-5cd2-909f-a6a615f88839', NULL, 'Assembleia de fundação da ONG, 5 de julho de 2016', 'site/historia/31ed179a-92d7-5cd2-909f-a6a615f88839.webp', 1), -- historia-1.jpg
  ('8ece0e7c-94b3-5f98-81ef-ba8de5f9b212', NULL, 'Equipe da SOS Patas em 2016', 'site/historia/8ece0e7c-94b3-5f98-81ef-ba8de5f9b212.webp', 2), -- historia-2.jpg
  ('f4a76c21-2ef5-5453-b994-f7f3ab42a260', NULL, 'Feira de adoção', 'site/historia/f4a76c21-2ef5-5453-b994-f7f3ab42a260.webp', 3), -- historia-3.jpg
  ('9b824f2e-b6d9-5716-8c8b-fc7fdba8381f', NULL, 'Feira de adoção na praça', 'site/historia/9b824f2e-b6d9-5716-8c8b-fc7fdba8381f.webp', 4) -- historia-5.jpg
) AS v (id, titulo, texto, foto_path, ordem)
WHERE NOT EXISTS (SELECT 1 FROM conteudo_itens WHERE lista = 'inicio_fotos');

-- inicio_como_funcionamos
INSERT INTO conteudo_itens (id, lista, titulo, texto, foto_path, ordem)
SELECT v.id::uuid, 'inicio_como_funcionamos', v.titulo, v.texto, v.foto_path, v.ordem FROM (VALUES
  ('7b3c28d3-827e-5fee-b8cd-f3947363edb1', '100% voluntários', 'Toda a equipe é formada por voluntários.', NULL, 0),
  ('8db8a46c-0641-5c09-9852-09988e0a910e', 'Sem abrigo', 'Os animais ficam em lares temporários até a adoção.', NULL, 1),
  ('c8ad1ca1-cedd-5185-8cdb-4e8a0c2996e7', 'Sem transporte próprio', 'Os deslocamentos dependem de voluntários.', NULL, 2),
  ('96246aa0-1fd9-5df6-a363-711ef5b14b91', 'Vive de doações', 'Atendimento, remédios, exames e castrações têm custo.', NULL, 3)
) AS v (id, titulo, texto, foto_path, ordem)
WHERE NOT EXISTS (SELECT 1 FROM conteudo_itens WHERE lista = 'inicio_como_funcionamos');

-- ajude_formas
INSERT INTO conteudo_itens (id, lista, titulo, texto, foto_path, ordem)
SELECT v.id::uuid, 'ajude_formas', v.titulo, v.texto, v.foto_path, v.ordem FROM (VALUES
  ('9da9c932-6ed4-5106-964d-b559f8e6db21', 'Seja lar temporário', 'Acolha um animal em casa até ele ser adotado. Fale com a ONG pelo WhatsApp.', NULL, 0),
  ('8d4799dd-b23e-598f-b9a2-46d3f7482e5e', 'Compartilhe', 'Divulgar os animais nas redes ajuda muito. Siga @sospatas.ong no Instagram e a página https://www.facebook.com/sospatasmg no Facebook.', NULL, 1)
) AS v (id, titulo, texto, foto_path, ordem)
WHERE NOT EXISTS (SELECT 1 FROM conteudo_itens WHERE lista = 'ajude_formas');

COMMIT;
