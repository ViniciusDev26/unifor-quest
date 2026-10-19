# 0064 — Jogo de até 20 minutos

- Status: aceita
- Data: 2026-10-19

## Contexto

A história tinha três atos, seis fases, 14 quests, oito personagens com nome e um dia
inteiro de campus. Pelo cálculo de 4 a 5 minutos por quest (andar, conversar, escrever e
rodar), isso passava de uma hora de jogo.

O jogo é trabalho de disciplina e precisa ser jogado do começo ao fim numa sessão.

## Decisão

- **O jogo inteiro dura até 20 minutos**, do menu de título ao final, para quem nunca viu o
  jogo.
- **A história foi reescrita para caber nisso** ([story.md](../story.md)). O calouro
  enfrenta NULL, um vírus que trava o campus no primeiro dia de aula. São quatro lugares
  (Portaria, Biblioteca, Centro de Convivência, Bloco de Tecnologia) e uma quest em cada.
  O elenco é Davi, Marcos, Dona Célia, Seu Raimundo e NULL. Não há guia fixo: quem conduz
  o jogador é a HUD de objetivo ([ADR 0063](0063-hud-de-objetivo-reaproveita-a-cadeia-de-quests.md)).
- **As quatro quests:** placas embaralhadas (strings), acervo embaralhado (ordenação), fila
  do Centro de Convivência (fila) e o confronto (grafos, Dijkstra e eficiência).
- **O conteúdo é organizado por lugar, não por fase.** `content/fase-1.ts` a `fase-6.ts`
  viram `entrada.ts`, `biblioteca.ts`, `centro-de-convivencia.ts` e
  `bloco-de-tecnologia.ts`, com a ordem da história em `story.ts`.
- **Conversas curtas.** Cada uma tem poucas falas, sem cutscene longa.

## Consequências

- Saem do jogo as outras dez quests, os interiores do Auditório e do Centro de Dados, e as
  mecânicas que só a versão longa usava (stubs sabotados, ajuda em degraus com XP, criação
  de personagem, pós-jogo). Os itens correspondentes saem de
  [open-questions.md](../open-questions.md).
- Para terminar a história, faltam dois interiores (Centro de Convivência e Bloco de
  Tecnologia) e três NPCs em cena.
- Nenhuma quest atual devolve uma rota que o personagem percorra. A
  [ADR 0060](0060-rota-volta-quando-o-jogador-nao-poderia-andar.md) continua valendo como
  regra, mas hoje não se aplica a nenhuma quest.
- O storyboard desenhava a versão longa e foi apagado. Precisa ser refeito para a história
  nova; até lá, `docs/storyboard/index.html` é só um aviso.

## Alternativas descartadas

- **Manter a história longa e cortar só quests:** sobrariam lugares, personagens e atos sem
  quest nenhuma, e o tempo iria embora andando entre um diálogo e outro.
- **Teto maior (40–60 min):** não cabe numa apresentação de disciplina, e cada interior a
  mais custa mapa, NPC e arte.
