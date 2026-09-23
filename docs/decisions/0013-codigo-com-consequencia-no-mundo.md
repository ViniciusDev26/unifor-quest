# 0013 — O código precisa ter consequência no mundo

- Status: aceita
- Data: 2026-09-22

## Contexto

O risco central do projeto é o jogo virar "um Code Runner com um personagem andando":
um editor de exercícios embrulhado em pixel art, onde passar nos testes só acende um
"quest concluída".

## Decisão

O **`onSuccess` da quest recebe o retorno real do código do jogador**.

O exemplo original era a rota do Dijkstra virando o caminho que o personagem percorre.
Esse caso foi descartado pela [0029](0029-fase-a-mecanica-antes-do-conteudo.md) — andar
por um trajeto que o jogador já podia percorrer a pé é cutscene, não consequência. **O
princípio continua valendo e esta decisão segue de pé**; o que falta é uma quest que use
o retorno de um jeito que mude o mundo de verdade.

## Consequências

- O desenho de cada quest precisa responder "o que o retorno faz no mundo?" antes de
  qualquer outra coisa.
- O tipo de retorno do desafio vira decisão de gameplay, não só de teste.
- O mundo precisa lidar com retornos válidos porém ruins (uma rota correta mas longa) sem
  quebrar.

## Alternativas descartadas

- **`onSuccess` receber só um booleano de sucesso:** simples, mas é exatamente o jogo que
  não queremos fazer.
