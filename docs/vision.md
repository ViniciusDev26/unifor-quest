# Visão

## Conceito

UNIFOR Quest é uma aventura de exploração **2D top-down** ambientada no campus da
**Universidade de Fortaleza**, feita para uma disciplina da faculdade e inspirada
visualmente nos jogos clássicos de exploração do Game Boy Advance. O jogador controla um
estudante que anda pelo campus, conversa com NPCs, recebe missões e resolve desafios.

O diferencial tem duas partes:

1. **Programação é jogabilidade.** Em determinadas missões o jogador abre um editor de
   código dentro do jogo, escreve a solução e executa. Passando nos testes, a missão é
   concluída e **o resultado do código altera o mundo**.
2. **Multi-linguagem.** O jogador escolhe em que linguagem resolver, e a base do projeto é
   desenhada para que adicionar uma linguagem nova seja barato
   ([ADR 0003](decisions/0003-multi-linguagem-custo-por-adapter.md)).

O objetivo é transformar algoritmos e estruturas de dados em mecânica real, não em tema.

A história é a de um calouro que, no primeiro dia de aula, conserta lugar por lugar um
campus travado por um vírus chamado NULL, até derrotá-lo. O jogo inteiro dura até 20
minutos ([ADR 0064](decisions/0064-jogo-de-ate-20-minutos.md)). Enredo, personagens e
quests estão em [story.md](story.md).

## Ciclo principal

```text
Explorar → NPC → Quest → Monaco → Escrever código → Executar
→ Testes → Sucesso → Mundo muda → Progressão
```

Em detalhe, o jogador:

1. explora o campus;
2. encontra um NPC e conversa;
3. recebe a missão;
4. encontra o local ou objeto necessário;
5. abre o desafio de programação;
6. escolhe a linguagem e escreve o código no Monaco;
7. executa e recebe o resultado dos testes;
8. corrige, se precisar;
9. conclui a missão ao passar;
10. desbloqueia novas áreas, missões e interações.

## O código tem consequência

A regra que separa este jogo de um site de exercícios: **o jogo não pode virar um Code
Runner com um personagem andando**. O `onSuccess` de cada quest recebe o **retorno real**
do código do jogador ([ADR 0013](decisions/0013-codigo-com-consequencia-no-mundo.md)).

Exemplo canônico — um NPC pede:

> "Preciso chegar da Biblioteca ao Centro Esportivo. Encontre o caminho mais curto."

O desafio declara:

```text
shortestPath(graph: Graph, start: string, destination: string) → nullable<list<string>>
```

Os testes verificam caso simples, caminho com múltiplas opções, caminho inexistente, nós
repetidos e grafo maior. Passando, **o personagem atravessa o campus pela rota que o
código retornou**. Isso só vale quando a rota passa por onde o jogador não conseguiria
andar sozinho; caso contrário seria cutscene
([ADR 0060](decisions/0060-rota-volta-quando-o-jogador-nao-poderia-andar.md)):

```text
algoritmo → código do jogador → resultado → gameplay
```

## O campus como grafo

O campus é modelado como grafo: prédios são vértices, caminhos são arestas, distâncias são
pesos. É o mesmo dado que posiciona os prédios, alimenta os desafios de grafo e desenha a
rota percorrida ([ADR 0012](decisions/0012-grafo-do-campus-no-tiled.md)).

## Progressão

Uma quest por lugar, quatro no total ([story.md](story.md#quests)):

```text
Portaria               Strings
   ↓
Biblioteca             Ordenação
   ↓
Centro de Convivência  Fila
   ↓
Bloco de Tecnologia    Grafos / Dijkstra / eficiência
```

Concluir uma missão abre o próximo lugar.

## Recompensas

- acesso ao próximo lugar;
- novos diálogos;
- alterações no mundo do jogo.

Não existe game over: errar o código é só rodar de novo.

O retorno sobre a solução reforça o lado educacional sem transformar o jogo numa prova:

```text
Testes: 5/5
Nós explorados: 18
Distância encontrada: 684m
```

## Conceitos de computação que o jogo precisa demonstrar

- **Strings:** manipulação de texto (cifra de César).
- **Ordenação.**
- **Estruturas de dados:** listas e filas.
- **Grafos:** caminho mínimo com Dijkstra.
- **Complexidade:** vencer a força bruta do NULL com menos operações.

Complexidade é medida por **contagem de operações**, não por tempo
([ADR 0011](decisions/0011-metricas-por-contagem-de-operacoes.md)).

## Visão artística

- 2D, top-down;
- inspirado em jogos clássicos de exploração;
- pixel art;
- campus da UNIFOR estilizado;
- personagens simples, cores vibrantes, interface limpa.

Atmosfera leve, descontraída, universitária, acessível e divertida.

No início, tilesets livres (CC0) podem ser usados até o ciclo principal estar provado.
