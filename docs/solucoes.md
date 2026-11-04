# Como resolver cada quest

Este documento explica, quest por quest, o problema, o raciocínio e uma solução que passa nos
testes. O código está em TypeScript, mas a lógica é a mesma em qualquer uma das cinco
linguagens do jogo: a assinatura da função muda, o algoritmo não.

Cada código abaixo é a **solução de referência** que está nos dados da quest
(`referenceSolutions`, [ADR 0014](decisions/0014-quests-declarativas.md)). O teste
`apps/game/test/content/reference-solutions.test.ts` executa cada uma pelo adapter de
TypeScript e confere que ela resolve a quest, e também confere que o código deste
documento é idêntico ao dos dados. Se um mudar, o teste falha até o outro acompanhar.

A ordem é a da [história](story.md): portaria, Biblioteca, Centro de Convivência e Bloco de
Tecnologia.

## 1. Placas embaralhadas (Portaria)

**Problema.** As placas da portaria foram cifradas: cada letra foi empurrada `shift`
posições para a frente no alfabeto. A função recebe o texto cifrado e o deslocamento e
devolve o texto original.

```text
decodeSign(text: string, shift: int) → string
decodeSign("Fdpsxv", 3) → "Campus"
```

**Conceito.** Cifra de César, strings e aritmética modular.

**Raciocínio.**

1. Percorra o texto um caractere por vez, montando o resultado.
2. O que não é letra (espaço, número, pontuação) não foi cifrado: copie como está.
3. Para uma letra, descubra a posição dela no alfabeto, de 0 a 25, subtraindo o código de
   `A` (maiúscula) ou de `a` (minúscula). Guardar qual das duas foi usada é o que mantém a
   caixa da letra.
4. Ande `shift` posições para trás e dê a volta no alfabeto com o resto da divisão por 26:
   antes do `A` vem o `Z`.
5. Some de volta o código de `A` ou `a` para ter a letra decifrada.

**Solução.**

```typescript
export function decodeSign(text: string, shift: number): string {
  let decoded = ''
  for (const char of text) {
    const base = char >= 'A' && char <= 'Z' ? 65 : char >= 'a' && char <= 'z' ? 97 : null
    if (base === null) {
      // Not a letter (a space, a digit): it was never shifted.
      decoded += char
      continue
    }
    const position = char.charCodeAt(0) - base
    // % of a negative number is negative in JavaScript: + 26 brings it back to 0..25.
    const original = (((position - shift) % 26) + 26) % 26
    decoded += String.fromCharCode(base + original)
  }
  return decoded
}
```

**Custo.** Uma passada pelo texto: O(n), em que n é o tamanho do texto.

**Erros comuns.**

- **Resto negativo.** Em TypeScript, Java, Go e Elixir (`rem`), `-2 % 26` dá `-2`, não
  `24`. É o caso "Letra no limite do alfabeto" (`Afcsb` → `Zebra`). Somar 26 antes do
  segundo `%` resolve; em Python, o `%` já devolve um resultado positivo.
- **Andar para a frente** em vez de para trás: isso cifra de novo em vez de decifrar.
- **Deslocar o espaço** ou perder a caixa da letra: o caso "Frase com espaço e minúsculas"
  pega os dois.

## 2. A árvore do acervo (Biblioteca)

**Problema.** O acervo é uma árvore binária de busca, e o NULL a derrubou. A função recebe
os códigos dos livros, na ordem em que chegaram, e o código procurado. Ela remonta a árvore
e devolve o caminho da raiz até o livro, ou uma lista vazia se ele não estiver lá.

```text
findBookPath(codes: list<int>, target: int) → list<int>
findBookPath([50, 30, 70, 20, 40, 60, 80], 40) → [50, 30, 40]
```

**Conceito.** Árvore binária de busca: cada código vai para a esquerda se for menor que o
do nó, para a direita se for maior.

**Raciocínio.**

1. Monte a árvore inserindo os códigos **na ordem em que chegaram**. O primeiro é a raiz.
   Cada código seguinte desce a partir da raiz, para a esquerda ou para a direita, até
   achar um lugar vazio.
2. Para buscar, comece na raiz e anote cada código por onde passar.
3. Achou o código: devolva o caminho anotado.
4. Caiu num lugar vazio: o livro não existe, e a resposta é a lista vazia, não o caminho
   parcial.

**Solução.**

```typescript
type Shelf = { code: number; left: Shelf | null; right: Shelf | null }

export function findBookPath(codes: number[], target: number): number[] {
  let root: Shelf | null = null
  for (const code of codes) {
    root = insert(root, code)
  }

  const path: number[] = []
  let current = root
  while (current !== null) {
    path.push(current.code)
    if (target === current.code) {
      return path
    }
    current = target < current.code ? current.left : current.right
  }
  // Fell off the tree: the book is not in the collection.
  return []
}

function insert(shelf: Shelf | null, code: number): Shelf {
  if (shelf === null) {
    return { code, left: null, right: null }
  }
  if (code < shelf.code) {
    shelf.left = insert(shelf.left, code)
  } else {
    shelf.right = insert(shelf.right, code)
  }
  return shelf
}
```

**Custo.** Inserir e buscar custam a altura da árvore, h. Numa árvore equilibrada, h fica
perto de log n; se os códigos chegam já ordenados, a árvore vira uma linha e h = n. É o caso
"Árvore torta" (`[10, 20, 30, 40]`), em que montar a árvore custa O(n²).

**Erros comuns.**

- **Ordenar os códigos** antes de montar: muda a árvore e, com ela, o caminho.
- **Procurar direto na lista**, sem montar a árvore: acha o livro, mas não o caminho que a
  árvore faria.
- **Devolver o caminho parcial** quando o livro não existe, em vez da lista vazia.
- **Esquecer o acervo vazio:** sem raiz, a resposta é a lista vazia.

## 3. Fila do Centro de Convivência

**Problema.** A fila do RU travou. A função recebe a fila, do primeiro ao último, e quantas
pessoas já foram atendidas, e devolve quem está na frente agora, ou nada se a fila acabou.

```text
nextToBeServed(queue: list<string>, served: int) → nullable<string>
nextToBeServed(["Ana", "Bia", "Caio", "Duda"], 2) → "Caio"
```

**Conceito.** Fila: quem chega primeiro é atendido primeiro (FIFO).

**Raciocínio.**

1. Numa fila, só a frente sai. Atender alguém é andar a frente uma posição.
2. Ande a frente `served` vezes, parando se a fila acabar antes.
3. Se ainda sobrou alguém, a resposta é quem está na frente; se não, nada (`null`).

**Solução.**

```typescript
export function nextToBeServed(queue: string[], served: number): string | null {
  // The front of the queue: everyone before it was already served.
  let front = 0
  for (let i = 0; i < served && front < queue.length; i++) {
    front += 1
  }
  return front < queue.length ? (queue[front] ?? null) : null
}
```

**Custo.** O(k), em que k é o número de atendidos. Como a fila é uma lista, dá para pular
direto para a posição `served` em O(1). O laço deixa visível a operação de fila, e o
resultado é o mesmo.

**Erros comuns.**

- **Erro de um a mais:** depois de atender `served` pessoas, a próxima está na posição
  `served`, não `served + 1`, porque a contagem começa do zero.
- **Não tratar a fila que acabou:** com `served` maior ou igual ao tamanho, a resposta é
  `null`. Ler fora da lista quebra em Java, Go e Python e devolve `undefined` em
  TypeScript.

## 4. O confronto (Bloco de Tecnologia)

**Problema.** O NULL pergunta a menor distância da Portaria até ele, pela rede de
computadores do campus ([ADR 0071](decisions/0071-rede-do-confronto-e-a-rede-de-computadores.md)).
A função recebe a rede, a origem e o destino e devolve a soma das latências do caminho mais
rápido. Além de acertar, a solução precisa gastar menos operações que a força bruta do NULL
([ADR 0068](decisions/0068-duelo-de-operacoes.md)).

```text
shortestDistance(network: Graph, start: string, end: string) → int
shortestDistance(rede, "POR", "TEC") → 11
```

**Conceito.** Grafos com peso, caminho mínimo com Dijkstra e eficiência.

**Raciocínio.**

1. O caminho com **menos saltos** não é o mais rápido. Direto pelo Centro de Convivência,
   POR → CCV → SWS → TEC custa 10 + 3 + 2 = 15; dando a volta, POR → BIB → CE → CCV →
   SWS → TEC custa 2 + 2 + 2 + 3 + 2 = 11. Uma busca em largura, que conta saltos, erra.
2. Guarde a melhor distância conhecida até cada nó, começando com 0 na origem.
3. Repita: escolha, entre os nós ainda não fechados, o de menor distância. Se for o destino,
   essa distância é a resposta. Se não, feche-o e veja se passar por ele melhora a
   distância de cada vizinho.
4. Cada nó é expandido no máximo uma vez. É isso que mantém o custo baixo.

**Solução.**

```typescript
import type { Graph } from './graph.ts'

export function shortestDistance(network: Graph, start: string, end: string): number {
  const distance = new Map<string, number>([[start, 0]])
  const done = new Set<string>()

  while (true) {
    let current: string | undefined
    for (const [node, cost] of distance) {
      if (!done.has(node) && (current === undefined || cost < (distance.get(current) ?? Infinity))) {
        current = node
      }
    }
    if (current === undefined) {
      return -1
    }
    const cost = distance.get(current) ?? 0
    if (current === end) {
      return cost
    }
    done.add(current)
    for (const edge of network.neighbors(current)) {
      if (cost + edge.weight < (distance.get(edge.to) ?? Infinity)) {
        distance.set(edge.to, cost + edge.weight)
      }
    }
  }
}
```

**Custo.** Quem conta as operações é o `Graph` do jogo: cada chamada a `neighbors` vale uma
([ADR 0054](decisions/0054-prelude-graph-e-contagem.md)). Nos quatro casos da quest, somados:

| Estratégia | Operações | Contra o orçamento de 100 |
| --- | --- | --- |
| Dijkstra parando no destino (a solução acima) | 19 | vence |
| Dijkstra sem parar no destino | 64 | vence |
| Bellman-Ford | 128 | perde |
| Força bruta, todos os caminhos (a do NULL) | 4177 | perde |

**Erros comuns.**

- **Contar saltos** em vez de somar pesos: dá 15 em vez de 11.
- **Testar todos os caminhos:** acerta as respostas, mas gasta milhares de operações. O
  painel mostra "Todas as respostas certas, mas acima do orçamento do NULL" e a quest não
  conclui.
- **Expandir o mesmo nó mais de uma vez**, por não marcar os já fechados: o número de
  operações sobe e pode estourar o orçamento.
- **Esquecer origem igual ao destino:** a distância é 0, sem andar.
