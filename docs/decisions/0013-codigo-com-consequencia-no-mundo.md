# 0013 — O código precisa ter consequência no mundo

- Status: aceita
- Data: 2026-09-22

## Contexto

O risco central do projeto é o jogo virar "um Code Runner com um personagem andando":
um editor de exercícios embrulhado em pixel art, onde passar nos testes só acende um
"quest concluída".

## Decisão

O **`onSuccess` da quest recebe o retorno real do código do jogador**.

Exemplo: a lista de nós devolvida pelo Dijkstra do jogador é o caminho que o personagem
efetivamente percorre no mapa.

## Consequências

- O desenho de cada quest precisa responder "o que o retorno faz no mundo?" antes de
  qualquer outra coisa.
- O tipo de retorno do desafio vira decisão de gameplay, não só de teste.
- O mundo precisa lidar com retornos válidos porém ruins (uma rota correta mas longa) sem
  quebrar.

## Alternativas descartadas

- **`onSuccess` receber só um booleano de sucesso:** simples, mas é exatamente o jogo que
  não queremos fazer.
