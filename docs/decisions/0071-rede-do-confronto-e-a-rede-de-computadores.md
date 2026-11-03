# 0071 — A rede do confronto é a rede de computadores do campus

- Status: aceita
- Data: 2026-11-03
- Abre uma exceção à [0012](0012-grafo-do-campus-no-tiled.md)

## Contexto

A [0012](0012-grafo-do-campus-no-tiled.md) diz que o grafo do campus mora no mapa e que o
mesmo dado alimenta o desenho, os desafios de grafo e a rota. O grafo do mapa tem 7 nós, um
por lugar.

O confronto ([0068](0068-duelo-de-operacoes.md)) precisa de um grafo em que a força bruta
gaste muito mais que Dijkstra, senão o orçamento não separa as duas. Em grafos pequenos e
quase em linha, como o do mapa, elas empatam ou ficam perto. A quest usava uma rede escrita
à mão, com prédios que não existem no mapa, o que contrariava a 0012 sem dizer.

O roteiro já fala em rede: o NULL pede "a menor distância da portaria até mim, **pela
rede**" ([story.md](../story.md)), e ele é um vírus no sistema do campus.

## Decisão

- **O grafo do confronto é a rede de computadores do campus**, não os caminhos do mapa. Os
  nós são roteadores, switches, pontos de acesso e servidores dos lugares do jogo
  (Portaria, Biblioteca, Centro de Convivência, Bloco de Tecnologia...); os pesos são
  latência.
- **A rede é dado da quest** (`content/bloco-de-tecnologia.ts`), não do mapa. Ela pode ter
  quantos nós o duelo pedir, sem mexer na geração de mapas da
  [0058](0058-mapas-gerados-sem-autotile.md).
- **A 0012 continua valendo para o que é andar pelo campus:** desafio sobre caminhos,
  distância a pé ou rota animada usa o grafo do mapa.

## Consequências

- A rede do duelo tem 16 nós, e o teste de conteúdo garante que o orçamento separa Dijkstra
  da força bruta nela.
- Os nomes dos nós usam lugares que existem no jogo, mais equipamento de rede; nenhum
  prédio inventado aparece como se estivesse no mapa.
- Passam a existir dois grafos do campus, com papéis diferentes: o de caminhos, no mapa, e
  o de rede, na quest 4. Um desafio novo de grafo escolhe um dos dois pelo que ele pede.

## Alternativas descartadas

- **Usar o grafo do mapa como está:** 7 nós não separam Dijkstra da força bruta, e o duelo
  viraria só texto.
- **Aumentar o grafo do mapa com cruzamentos como nós:** mantém uma fonte só, mas prende o
  tamanho do duelo ao desenho do campus e mexe na geração de mapas para servir a uma quest.
