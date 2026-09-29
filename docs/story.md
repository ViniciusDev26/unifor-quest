# História

O enredo, os personagens e a ligação de cada quest com o mundo. A mecânica que sustenta
isso está em [vision.md](vision.md); o que ainda não foi decidido está em
[open-questions.md](open-questions.md).

## Premissa

No primeiro dia de aula de um calouro de Computação, um invasor que assina como **NULL**
toma o sistema do campus. O Núcleo de TI (NTI), sobrecarregado, recruta o calouro para
restaurar o campus.

A ação toda se passa em **um único dia**, da manhã à noite.

## Reviravolta

NULL é o **sistema acadêmico original da universidade**, escrito por estudantes no fim dos
anos 1990 (entre eles o jovem Prof. Heitor), remendado por décadas e prestes a ser
desligado. Ele "acordou" para não ser apagado.

No final, o jogador **migra NULL em vez de destruí-lo**, e ele vira aliado no pós-jogo.

## Tema

Código legado tem história, e um bom engenheiro entende antes de destruir.

## Atos

| Ato | Fases | O que acontece |
| --- | --- | --- |
| 1 | 1–2 | O ataque. Lia recruta o calouro. A primeira pista aparece na biblioteca. |
| 2 | 3–4 | O rastro leva até o servidor. O jogador descobre que o ataque vem do próprio sistema e encontra um comentário de 1998 assinado "H.". |
| 3 | 5–6 | Heitor confessa. Corrida ao Centro de Dados, confronto e migração. |

Cada fase é um bloco de conceitos da [progressão](vision.md#progressão), então o arco
dramático e o arco de aprendizado andam juntos.

## Personagens

- **Protagonista:** calouro, com nome e aparência escolhidos pelo jogador.
- **Lia:** monitora do NTI, guia e fonte de dicas. O arco dela vai da insegurança a uma
  parceria de igual para igual. É ela quem propõe a migração.
- **Prof. Heitor:** coordenador do NTI e um dos autores do sistema original. A confissão
  dele é o centro emocional da história.
- **NULL:** o antagonista. Fala em código antigo, deixa código sabotado com comentários
  provocativos e reage à eficiência das soluções do jogador.
- **Secundários:**
  - **Davi:** o colega cômico que piora as coisas;
  - **Dona Célia:** a bibliotecária;
  - **Seu Raimundo:** do Restaurante Universitário (RU), fonte de pistas;
  - **Marcos:** o segurança da catraca, na entrada do campus. É o primeiro NPC do jogo.

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

Estado: as duas quests da Fase 1 estão em construção, com o Marcos na entrada
([ADR 0059](decisions/0059-npc-oferece-a-quest-mais-adiantada.md)).

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
