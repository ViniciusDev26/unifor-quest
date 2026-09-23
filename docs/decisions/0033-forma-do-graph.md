# 0033 — A forma do `Graph`

- Status: aceita
- Data: 2026-09-23

## Contexto

O `TypeSpec` sabia dizer "este parâmetro é um grafo" desde o começo
([ADR 0004](0004-testes-como-dados.md)), mas não existia em lugar nenhum a definição do que
**é** um grafo. O mesmo dado é consumido por quatro coisas: o input dos casos de teste, o
prelude instrumentado de cada linguagem ([ADR 0011](0011-metricas-por-contagem-de-operacoes.md)),
o mapa e a extração do Tiled ([ADR 0012](0012-grafo-do-campus-no-tiled.md)). Sem forma
canônica, cada um inventa a sua.

## Decisão

```text
nó:     id, label, x?, y?
aresta: from, to, weight
```

- O **`id`** é curto e estável (`BIB`); o **`label`** é o que o jogador lê
  (`Biblioteca`). Separar os dois deixa o enunciado falar `BIB` enquanto a tela mostra o
  nome por extenso, e sobrevive a renomear um prédio.
- **`x` e `y` são opcionais**, porque o mapa é Fase B
  ([ADR 0029](0029-fase-a-mecanica-antes-do-conteudo.md)). O espaço fica reservado para não
  ter que refazer o formato quando o campus chegar — e é o que permitirá A\* depois.
- **Arestas são não direcionadas** e declaradas uma vez. Expandir nos dois sentidos é
  trabalho do prelude, em cada linguagem.
- **Peso não é negativo.**
- O schema **valida a coerência**: id de nó duplicado e aresta apontando para nó
  inexistente são erros.

## Consequências

- As quatro pontas passam a falar do mesmo formato.
- A validação de coerência pega o erro mais comum de conteúdo — aresta para um nó que foi
  renomeado — no momento de escrever a quest.
- Peso não negativo vale para Dijkstra; um desafio que precise de peso negativo (Bellman-Ford)
  exigirá rever isso.
- Aresta não direcionada é uma decisão do domínio, não de representação: se algum dia
  existir caminho de mão única no campus, é mudança de contrato.

## Alternativas descartadas

- **Guardar as duas direções de cada aresta:** simplifica o prelude, ao custo de duplicar o
  dado e permitir que as duas metades discordem.
- **Posição obrigatória:** amarraria o formato ao mapa antes de o mapa existir.
- **Grafo como lista de adjacência crua (`{ BIB: { CE: 684 } }`):** compacto, mas não tem
  onde pôr o rótulo nem a posição, e força o adapter a inferir os nós a partir das arestas.
