# Formulário de Interesse em Adoção: SOS Patas

> **Versão 1.1 · rascunho para validação no grupo da ONG (06/10/2026)**, alinhado ao [Termo de Responsabilidade de Adoção](TERMO_ADOCAO.md)
> Preenchido pelo interessado ao tocar em "Quero adotar" na ficha do animal. Depois, a equipe (ou o protetor parceiro) analisa e entra em contato pelo WhatsApp.
> Itens com **\*** são obrigatórios. Perguntas que surgiram do grupo estão marcadas com 🟦.

<!-- inicio-formulario -->

## Animal escolhido

### Animal que você quer adotar
Tipo: preenchido automaticamente
> Vem da ficha (nome, foto e responsável). A pessoa não precisa digitar.

## 1. Sobre você

### 1. Nome completo *
Tipo: texto curto

### 2. Você tem 18 anos ou mais? *
Tipo: escolha única
- Sim
- Não
> Se "Não", o formulário avisa que é preciso um responsável maior de idade.

### 3. WhatsApp *
Tipo: telefone

### 4. Bairro e cidade *
Tipo: texto curto
> Só bairro e cidade. Endereço completo, RG, CPF e local de trabalho ficam **só no termo em papel**.

### 5. Instagram ou Facebook
Tipo: texto curto (opcional)

### 6. Por que você quer adotar este animal? *
Tipo: texto longo

## 2. Sua casa

### 7. Você mora em: *
Tipo: escolha única
- Casa
- Apartamento
- Chácara ou sítio
- Outro

### 8. O imóvel é: *
Tipo: escolha única
- Próprio
- Alugado
- Cedido ou de familiares
> Se "Alugado": **o proprietário permite animais?** (Sim / Não / Não sei)

### 9. Tem espaço adequado para o animal? 🟦 *
Tipo: escolha única
- Sim, quintal ou área externa grande
- Sim, quintal ou área externa pequena
- Não tenho área externa, o animal ficará dentro de casa

### 10. Tem local coberto, protegido de sol e chuva, para o animal? 🟦 *
Tipo: escolha única
- Sim
- Não
- Vou providenciar

### 11. Sua casa é segura para o animal não fugir? *
Tipo: escolha única
- Sim, é murada ou cercada e o portão não tem vãos
- Em parte, preciso fazer ajustes
- Não
> **Para gatos:** "As janelas e sacadas têm tela de proteção?" (Sim / Não / Vou colocar)

### 12. Onde o animal vai ficar na maior parte do tempo? *
Tipo: escolha única
- Dentro de casa
- Dentro e fora de casa
- Solto no quintal
- Preso em canil ou corrente

### 13. Quantas pessoas moram com você, e tem crianças? *
Tipo: texto curto
> Ex.: "4 pessoas, 2 crianças de 5 e 8 anos".

### 14. Todos da casa concordam com a adoção? *
Tipo: escolha única
- Sim
- Não
- Ainda não conversei com todos

## 3. Outros animais

### 15. Você tem outros animais hoje? 🟦 *
Tipo: escolha única
- Sim
- Não
> Se "Sim", aparecem as perguntas 16 a 18.

### 16. Quantos e quais? 🟦
Tipo: texto curto
> Ex.: "2 cães e 1 gato".

### 17. Qual o sexo dos seus animais? 🟦
Tipo: múltipla escolha
- Machos
- Fêmeas
> O sistema compara com o sexo do animal escolhido e avisa a equipe quando são do **mesmo sexo**.

### 18. Eles são castrados e vacinados? 🟦
Tipo: escolha única
- Todos castrados e vacinados
- Só vacinados
- Só castrados
- Nenhum dos dois

### 19. Já teve animais antes? O que aconteceu com eles?
Tipo: texto longo (opcional)

## 4. Cuidados e custos

### 20. Tem condições de vacinar o animal todo ano (a partir de 45 dias de vida) e manter o vermífugo em dia? 🟦 *
Tipo: escolha única
- Sim
- Não

### 21. Se o animal ainda não for castrado, você se compromete a castrar? *
Tipo: escolha única
- Sim
- Sim, mas gostaria de ajuda (castramóvel ou clínica parceira)
- Não
> A castração é obrigatória no termo de adoção (cláusula 6).

### 22. Tem condições de arcar com ração e veterinário quando precisar? *
Tipo: escolha única
- Sim
- Não

### 23. Quantas horas por dia o animal vai ficar sozinho? *
Tipo: escolha única
- Menos de 4 horas
- De 4 a 8 horas
- Mais de 8 horas

### 24. Se você mudar de casa ou viajar, o que fará com o animal? *
Tipo: texto curto

## 5. Compromissos

### 25. Declarações *
Tipo: caixas de confirmação (todas obrigatórias)
- Concordo com o período de adaptação de 15 dias. Se o animal não se adaptar, vou avisar imediatamente e devolvê-lo a quem doou dentro desse prazo.
- Depois dos 15 dias, se eu desistir, vou avisar quem doou e manter o animal como lar provisório até ele encontrar um novo lar.
- Não vou deixar o animal em corrente. Vou oferecer abrigo contra sol e chuva, coleira com placa de identificação, ração e água fresca todos os dias.
- Não vou repassar o animal para outra pessoa sem o conhecimento de quem doou.
- Aceito o acompanhamento pelo WhatsApp e permito a visita de quem doou para conferir as condições do animal.
- Entendo que preencher o formulário não garante a adoção. O pedido será analisado pela equipe ou pelo protetor responsável.
- Declaro que as informações são verdadeiras.
- Autorizo o uso dos meus dados apenas para a análise desta adoção. Se a adoção não for aprovada, eles serão apagados em até 90 dias (LGPD).

<!-- fim-formulario -->

---

## Notas para o desenvolvimento

### Pontos de atenção automáticos (para quem analisa)
Na tela de análise, o sistema destaca em amarelo as respostas que merecem conversa. Isso **não reprova** ninguém sozinho, só chama atenção:

| Condição | Alerta |
|---|---|
| Pergunta 2 = Não | Menor de idade |
| Imóvel alugado e o proprietário não permite ou "Não sei" | Permissão do proprietário |
| Pergunta 10 = Não | Sem local coberto |
| Pergunta 11 = Não, ou gato sem tela | Risco de fuga |
| Pergunta 12 = Preso em canil ou corrente | Animal preso |
| Pergunta 14 ≠ Sim | Família não concorda |
| Tem animais do **mesmo sexo** do escolhido | Mesmo sexo |
| Outros animais sem castração **e** escolhido não castrado | Risco de cria |
| Pergunta 20 ou 22 = Não | Sem condições de vacina ou custos |
| Pergunta 21 = Não | Não pretende castrar |
| Animal escolhido com "convive com outros animais = Não" e pergunta 15 = Sim | Não convive com outros animais |

### Formulário × termo de adoção
| Etapa | Onde | O que coleta |
|---|---|---|
| Interesse (triagem) | Site, este formulário | Perfil, casa, outros animais, cuidados e compromissos |
| Adoção (formalização) | **Termo em papel** | RG, CPF, endereço completo, local de trabalho, assinatura |

Os compromissos do formulário repetem, de forma resumida, as cláusulas do termo. Assim a pessoa já sabe o que vai assinar e evita desistência na hora da entrega.

### Dados e LGPD
- Envio pela mesma estrutura segura dos perdidos (RN21–RN23): validação na API (`POST /api/publico/interesses`), Turnstile e limite por IP.
- Tabela `pedidos_adocao` (somente `authenticated`), com status `novo` → `em_analise` → `aprovado` / `recusado`.
- Pedidos recusados ou sem resposta são apagados em até 90 dias. Se aprovado, os dados seguem para o termo e para `animais_privado` (adotante).
- O endereço completo **não** é pedido aqui, só no termo.

### Pendências com a ONG
- [ ] Validar as perguntas (tirar, mudar ou acrescentar)
- [ ] Quem analisa os pedidos? E, nos animais de protetores parceiros, o protetor recebe o pedido por WhatsApp ou terá login?
- [ ] O prazo de 90 dias para apagar pedidos não aprovados está bom?
- [x] Receber o **termo de adoção** atual → transcrito em [TERMO_ADOCAO.md](TERMO_ADOCAO.md)
- [x] Usar o número do termo como código da adoção? **Não** (06/10/2026)
- [x] Alinhar os campos do animal com o termo? **Sim**, feito no protótipo e no DESENVOLVIMENTO.md (06/10/2026)
