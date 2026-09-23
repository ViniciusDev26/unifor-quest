# 0012 — O grafo do campus é desenhado no Tiled

- Status: aceita
- Data: 2026-09-22

## Contexto

O campus aparece em três lugares: no mapa que o jogador vê, no input dos desafios de grafo
e na rota que o personagem percorre. Se esses três forem dados separados, eles divergem.

## Decisão

O grafo do campus é desenhado **no Tiled**, numa **object layer**:

```text
Prédios/pontos = vértices
Caminhos       = arestas
Distâncias     = pesos
```

O **mesmo dado** posiciona os prédios no mapa, alimenta os desafios de BFS, DFS, Dijkstra
(e eventualmente A*) e define a rota animada do personagem.

## Consequências

- Uma fonte de verdade: mover um prédio no Tiled muda mapa, desafio e rota juntos.
- Level design de conteúdo algorítmico vira trabalho de editor visual, não de JSON à mão.
- É preciso uma etapa que extraia o grafo do arquivo do Tiled e o valide (arestas soltas,
  pesos ausentes, vértices duplicados).
- O formato do Tiled passa a ser uma dependência do pipeline de conteúdo.

## Alternativas descartadas

- **Grafo em arquivo próprio, separado do mapa:** dois dados para manter em sincronia, com
  divergência garantida.
