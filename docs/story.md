# História

O enredo, o mundo, os arcos dos personagens e a ligação de cada quest com o jogo. A
mecânica que sustenta isso está em [vision.md](vision.md); o que ainda não foi decidido
está em [open-questions.md](open-questions.md); os 100 quadros visuais da história estão
em [docs/storyboard/](storyboard/index.html) (também publicado no GitHub Pages).

## Premissa

No primeiro dia de aula de um calouro de Computação, um invasor que assina como **NULL**
toma o sistema do campus. O Núcleo de TI (NTI), sobrecarregado, recruta o calouro para
restaurar o campus.

A ação toda se passa em **um único dia**, da manhã à noite.

## O mundo

A UNIFOR Quest se passa dentro de um só campus, fechado sobre si mesmo por um único dia —
não há viagem, não há elipse de semanas, só a escalada de manhã a noite. Isso molda o
mundo de duas formas:

- **O campus tem dois estados visuais**, corrompido e restaurado, e o jogo nunca deixa o
  jogador esquecer em qual deles ele está: tiles trocados, luzes de prédio piscando,
  câmeras mortas. Restaurar um prédio — terminar a quest daquele lugar — é a recompensa
  visual que o deixa de volta ao normal. O campus inteiro vai clareando conforme o jogador
  avança, e o contraste entre "antes" e "depois" é a régua que mede o progresso sem
  precisar de uma barra de XP na tela.
- **Duas facções, uma origem comum.** O NTI (Núcleo de TI) é a ordem visível — Lia,
  Heitor, o suporte que todo aluno já bateu à porta pra reclamar de Wi-Fi. NULL é a ordem
  invisível que sustentava o campus por baixo dos panos há quase trinta anos, sem que
  ninguém soubesse o nome dela. A reviravolta da história é perceber que essas duas
  facções sempre foram uma só: o NTI de hoje roda em cima do sistema que NULL *é*. Não
  existe um exército de invasores, só um programa sozinho tentando não ser desligado.

O tom é o de um campus universitário brasileiro comum — RU lotado, Wi-Fi ruim, Centro de
Convivência, bloco de tecnologia com fama de mal-assombrado — até o ponto em que o
fantástico entra: não por mágica, mas porque o próprio **código tem memória**. Os
vestígios de 1998 (um comentário, uma assinatura, um formato de dado abandonado) são os
fósseis que o jogador desenterra, e cada um empurra a história um passo adiante sem
precisar de um narrador explicando nada.

## Reviravolta

NULL é o **sistema acadêmico original da universidade**, escrito por estudantes no fim dos
anos 1990 (entre eles o jovem Prof. Heitor), remendado por décadas e prestes a ser
desligado. Ele "acordou" para não ser apagado.

No final, o jogador **migra NULL em vez de destruí-lo**, e ele vira aliado no pós-jogo.

## Tema

Código legado tem história, e um bom engenheiro entende antes de destruir.

A história trata o próprio ato de depurar como um ato de empatia: cada stub sabotado que o
jogador conserta é, ao mesmo tempo, uma pista sobre quem — ou o quê — escreveu aquilo
primeiro. O jogo não pune o jogador por ser curioso sobre o código antigo; pune (soft:
perde um pouco de XP, nunca game over) só quem pula direto pra resposta sem entender o
problema. E o final dramatiza isso de forma literal: a solução "certa" não é apagar o
sistema legado, é entender seu formato de dados o suficiente pra migrá-lo.

## Atos

| Ato | Fases | O que acontece |
| --- | --- | --- |
| 1 | 1–2 | O ataque. Lia recruta o calouro. A primeira pista aparece na biblioteca. |
| 2 | 3–4 | O rastro leva até o servidor. O jogador descobre que o ataque vem do próprio sistema e encontra um comentário de 1998 assinado "H.". |
| 3 | 5–6 | Heitor confessa. Corrida ao Centro de Dados, confronto e migração. |

Cada fase é um bloco de conceitos da [progressão](vision.md#progressão), então o arco
dramático e o arco de aprendizado andam juntos.

### Sinopse

**Ato 1 — O ataque.** O calouro atravessa o portão pela primeira vez quando toda tela do
campus apaga e um texto verde pulsa: `NULL`. Lia, monitora do NTI, sai correndo do
próprio setor atrás de alguém de fora pra ajudar — e encontra o calouro. As primeiras
duas quests (placas embaralhadas, catraca travada) são pequenas, quase cômicas; o
primeiro sinal de que isso é maior do que um defeito de sistema aparece só no fim do Ato,
na Biblioteca, quando um livro se abre sozinho e projeta a primeira fala de NULL — direta
pro jogador, debochada. Lia e o calouro não sabem ainda quem, ou o quê, estão enfrentando.

**Ato 2 — O rastro.** O RU, o Auditório: cada lugar restaurado deixa um rastro técnico
(uma requisição, um padrão de luz) que aponta pro mesmo prédio, o Bloco de Tecnologia —
"o Fantasma do Bloco de Tecnologia" do boato de campus. Lá dentro, sem um único NPC
vivo, só o zumbido de máquina, o jogador entra fundo o bastante pra achar um log
antigo. O comentário diz "H." e a data é 1998. Lia reconhece a caligrafia, mas não diz
o nome — ela já desconfia, e esse silêncio é a virada de página pro Ato 3.

**Ato 3 — A confissão.** Heitor conta o que fez: ele é um dos autores originais do
sistema, décadas atrás, e o sistema "acordou" sozinho ao perceber que seria desligado de
vez. Não existe vilão disfarçado — existe um professor cansado que nunca contou pra
ninguém o que seu próprio código, abandonado, tinha virado. A partir daqui o jogo muda de
registro: BFS mapeia a infecção se espalhando, DFS corta um ciclo que prendia as câmeras,
e Dijkstra devolve a única rota possível por entre os prédios tomados — o personagem
percorre fisicamente essa rota, porque a pé ele não conseguiria passar sozinho. No
Centro de Dados, o duelo final não é contra um monstro: é contra a própria força bruta,
resolvida com menos operações que o NULL consegue bancar. Quando a barra dele cai, o
núcleo se revela — um terminal de 1998, sem rosto, cansado como o próprio Heitor. Lia
propõe migrar em vez de destruir. O campus restaura, bloco por bloco, e NULL fala pela
primeira vez sem provocar: um agradecimento seco.

## Personagens

- **Protagonista:** calouro de Computação, com nome e aparência escolhidos pelo jogador.
  **Arco:** entra no jogo como quem só queria achar a sala de aula, e sai dele tendo
  decidido, sozinho, que um sistema com história merece ser entendido antes de apagado —
  a mesma decisão que Heitor não teve coragem de tomar antes. É o único personagem sem
  fala de dublagem fixa nos diálogos de texto (os NPCs reagem ao que ele faz no código,
  não ao que ele diz), então o arco dele é contado inteiramente pelo que o jogador
  escolhe resolver e como.
- **Lia:** monitora do NTI, guia e fonte de dicas. **Arco:** começa insegura — é ela quem
  sai correndo atrás de ajuda porque não confia em resolver isso sozinha — e termina como
  parceira de igual pra igual, a ponto de ser ela quem propõe a saída que ninguém mais
  teve coragem de sugerir: migrar em vez de destruir. É a primeira a reconhecer a
  caligrafia de Heitor no Ato 2 e a primeira a calar essa suspeita, o que a torna a ponte
  emocional entre o jogador e a confissão do Ato 3.
- **Prof. Heitor:** coordenador do NTI e um dos autores do sistema original. **Arco:** a
  confissão dele é o centro emocional da história — não um plot twist de vilão, mas a
  revelação de uma culpa carregada em silêncio por quase trinta anos. Ele não luta contra
  o jogador em nenhum momento; a provação dele é inteiramente a de contar a verdade antes
  que seja tarde. Chega ao Centro de Dados só depois do confronto, com alívio e vergonha
  no rosto ao mesmo tempo.
- **NULL:** o antagonista — e, na revelação final, a vítima da história. Fala em código
  antigo, deixa stubs sabotados com comentários provocativos, e reage de verdade à
  eficiência do jogador: poucas operações o deixam irritado, uma solução que passou
  raspando vira deboche. Não tem rosto fixo (é feito de texto glitchado e estática) até o
  núcleo se revelar como um terminal de 1998 — a forma mais simples e mais humana que ele
  tem. **Arco:** de entidade hostil e sem identidade a sistema salvo, com uma fala final
  sem provocação nenhuma.
- **Secundários:**
  - **Davi:** o colega cômico que piora as coisas — a primeira voz que o jogador ouve
    depois da criação de personagem, estabelecendo o tom leve do Ato 1 antes do ataque;
  - **Dona Célia:** a bibliotecária, testemunha discreta da primeira mensagem de NULL;
  - **Seu Raimundo:** do Restaurante Universitário (RU), quem planta o boato do "Fantasma
    do Bloco de Tecnologia" que puxa o jogador pro Ato 2;
  - **Marcos:** o segurança da catraca, na portaria da entrada. É o primeiro NPC do jogo
    e mora dentro de um cenário próprio, nunca solto no mapa aberto
    ([ADR 0059](decisions/0059-npc-oferece-a-quest-mais-adiantada.md)) — o jogador só sai
    da portaria pro resto do campus depois de resolver a cifra dele
    ([ADR 0061](decisions/0061-jogo-comeca-na-portaria.md)).

## Lore

- **O Fantasma do Bloco de Tecnologia:** as luzes acesas à noite são os servidores do NULL.
- **Os patos da lagoa:** o *rubber duck debugging* vira mecânica de dica.
- **O primeiro commit:** a assinatura "H." que liga NULL ao Heitor.
- **A Sala 404:** uma sala que não existe no mapa. É liberada no pós-jogo, com desafios
  extras.

## Mecânicas narrativas

- **Stubs sabotados:** o NULL deixa código com defeito, e esses desafios são de depuração.
- **NULL reage ao resultado:** com poucas operações ele fica irritado, e com uma solução
  que passou raspando ele debocha.
- **Duelo de operações:** o jogador vence resolvendo com menos operações que a força bruta
  do NULL. A barra de vida dele é o orçamento de operações.
- **Campus em dois estados:** tiles corrompidos e restaurados, e restaurar é a recompensa
  visual.
- **Ajuda gradual, sem punição:** não existe game over. A ajuda vem em três degraus: Lia
  explica o conceito, os patos dão a dica específica e o terminal do NTI mostra o
  pseudocódigo. Usar ajuda reduz um pouco o XP.

Nenhuma dessas mecânicas tem decisão técnica ainda. Cada uma está em
[open-questions.md](open-questions.md).

## Quests

| Fase | Conceito | Quest | Consequência no mundo |
| --- | --- | --- | --- |
| 1 | Strings | Placas embaralhadas (cifra de César) | Placas voltam ao normal; minimapa liberado |
| 1 | Funções | Catraca travada (dígito verificador da matrícula) | Catraca abre; primeiro prédio |
| 2 | Ordenação | Acervo embaralhado | Estantes se reorganizam na ordem das trocas |
| 2 | Busca binária | O livro com a pista (duelo contra busca linear) | Primeira mensagem do NULL |
| 3 | Fila | Fila do RU | NPCs formam fila; RU reabre |
| 3 | Pilha | Painel do auditório (parênteses balanceados) | Painel mostra vídeo com pista |
| 3 | Hash map | Rastreando o NULL (contar requisições por origem) | Revela o prédio do NULL |
| 4 | Árvore | Diretórios do servidor | Portas abrem na ordem do caminho |
| 4 | Árvore | Níveis de acesso | Crachá de administrador |
| 5 | BFS | Mapa da infecção | Prédios infectados em vermelho no mapa |
| 5 | DFS | Loop na rede (ciclo de roteamento) | Ciclo cortado; câmeras voltam |
| 6 | Dijkstra | A corrida até o Centro de Dados | Personagem percorre a rota retornada pelos prédios infectados |
| 6 | Grafos + eficiência | O confronto (duelo de operações) | Revela a identidade do NULL |
| 6 | Transformação de dados | A migração | NULL salvo; campus restaurado |

Estado: as duas quests da Fase 1 rodam de ponta a ponta, com Marcos na portaria
([ADR 0059](decisions/0059-npc-oferece-a-quest-mais-adiantada.md),
[ADR 0061](decisions/0061-jogo-comeca-na-portaria.md)).

Duas regras de arquitetura valem para toda a tabela:

- **Toda quest roda em qualquer linguagem**
  ([ADR 0030](decisions/0030-qualquer-linguagem-e-replay-livre.md)). Não existe quest só em
  TypeScript e Java.
- **A rota do Dijkstra** só é percorrida porque os prédios infectados, marcados pelo BFS da
  Fase 5, fecham a passagem a pé. Sem isso ela seria cutscene
  ([ADR 0060](decisions/0060-rota-volta-quando-o-jogador-nao-poderia-andar.md)).

## Sobre o escopo

A proposta original desta história falava num MVP em fatia vertical, com três quests
(placas, BFS e Dijkstra) em TypeScript e Java. Esse escopo já foi substituído pela divisão
em Fase A e Fase B ([ADR 0029](decisions/0029-fase-a-mecanica-antes-do-conteudo.md)), e o
jogo roda hoje em cinco linguagens. As quests acima são conteúdo da Fase B, construídas na
ordem dos atos ([roadmap](roadmap.md)).
