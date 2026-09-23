import { type Challenge, challengeSchema, type LanguageId } from '@unifor-quest/core'

/**
 * What every adapter has to get right.
 *
 * This is the contract of a language adapter expressed as behaviour instead of prose: an
 * adapter that passes belongs in the game, one that does not, does not (ADR 0015). It is
 * also where a difference between languages shows up as a failing test rather than as
 * "passou em Java, falhou em Go" on a player's screen.
 */

export type Expectation =
  | { kind: 'solved' }
  | { kind: 'failed' }
  /** Ran, but the answer was wrong: no error, just a mismatch. */
  | { kind: 'wrongAnswer' }
  | { kind: 'error'; contains: string }
  | { kind: 'stdout'; contains: string }
  | { kind: 'opsAbove'; count: number }

export type Scenario = {
  name: string
  challenge: Challenge
  /** The player's project, per language. A single entry means a single file. */
  solutions: Partial<Record<LanguageId, { path: string; contents: string }[]>>
  expect: Expectation[]
}

const greet = challengeSchema.parse({
  functionName: 'greet',
  parameters: [{ name: 'name', type: { kind: 'string' } }],
  returns: { kind: 'string' },
  cases: [
    { name: 'Nome simples', input: ['Vini'], expected: 'Ola, Vini!' },
    { name: 'Nome vazio', input: [''], expected: 'Ola, !' },
  ],
  referenceSolutions: { typescript: 'x' },
})

const summarize = challengeSchema.parse({
  functionName: 'summarize',
  parameters: [
    { name: 'count', type: { kind: 'int' } },
    { name: 'ratio', type: { kind: 'float' } },
    { name: 'flag', type: { kind: 'bool' } },
    { name: 'tags', type: { kind: 'list', element: { kind: 'string' } } },
    { name: 'scores', type: { kind: 'map', key: { kind: 'string' }, value: { kind: 'int' } } },
    { name: 'missing', type: { kind: 'nullable', inner: { kind: 'int' } } },
  ],
  returns: { kind: 'list', element: { kind: 'string' } },
  cases: [
    {
      name: 'Todos os tipos',
      input: [3, 1.5, true, ['a', 'b'], { x: 10 }, null],
      expected: ['3', '1.5', 'true', '2', '10', 'nulo'],
    },
  ],
  referenceSolutions: { typescript: 'x' },
})

const campus = {
  nodes: [
    { id: 'BIB', label: 'Biblioteca' },
    { id: 'RU', label: 'Restaurante' },
    { id: 'CE', label: 'Centro Esportivo' },
  ],
  edges: [
    { from: 'BIB', to: 'RU', weight: 300 },
    { from: 'RU', to: 'CE', weight: 384 },
  ],
}

const reachable = challengeSchema.parse({
  functionName: 'reachable',
  parameters: [
    { name: 'graph', type: { kind: 'graph' } },
    { name: 'start', type: { kind: 'string' } },
  ],
  returns: { kind: 'int' },
  cases: [{ name: 'Campus inteiro', input: [campus, 'BIB'], expected: 3 }],
  referenceSolutions: { typescript: 'x' },
})

const one = (path: string, contents: string) => [{ path, contents }]

export const scenarios: Scenario[] = [
  {
    name: 'o projeto que o adapter entrega roda e diz que nao foi implementado',
    challenge: greet,
    solutions: {},
    expect: [{ kind: 'failed' }, { kind: 'error', contains: 'implementado' }],
  },
  {
    name: 'uma solucao correta resolve o desafio, e o que ela imprime e capturado',
    challenge: greet,
    solutions: {
      typescript: one(
        'solution.ts',
        'export function greet(name: string): string {\n  console.log("oi")\n  return `Ola, ${name}!`\n}\n',
      ),
      go: one(
        'solution.go',
        'package main\n\nimport "fmt"\n\nfunc greet(name string) string {\n\tfmt.Println("oi")\n\treturn "Ola, " + name + "!"\n}\n',
      ),
      java: one(
        'Solution.java',
        'public class Solution {\n    public static String greet(String name) {\n        System.out.println("oi");\n        return "Ola, " + name + "!";\n    }\n}\n',
      ),
      python: one(
        'solution.py',
        'def greet(name: str) -> str:\n    print("oi")\n    return f"Ola, {name}!"\n',
      ),
    },
    expect: [{ kind: 'solved' }, { kind: 'stdout', contains: 'oi' }],
  },
  {
    name: 'uma resposta errada falha sem erro de execucao',
    challenge: greet,
    solutions: {
      typescript: one(
        'solution.ts',
        'export function greet(name: string): string {\n  return name\n}\n',
      ),
      go: one(
        'solution.go',
        'package main\n\nfunc greet(name string) string {\n\treturn name\n}\n',
      ),
      java: one(
        'Solution.java',
        'public class Solution {\n    public static String greet(String name) {\n        return name;\n    }\n}\n',
      ),
      python: one('solution.py', 'def greet(name: str) -> str:\n    return name\n'),
    },
    expect: [{ kind: 'wrongAnswer' }],
  },
  {
    name: 'uma excecao do jogador chega como erro, com a mensagem dele',
    challenge: greet,
    solutions: {
      typescript: one(
        'solution.ts',
        "export function greet(name: string): string {\n  throw new Error('quebrou')\n}\n",
      ),
      go: one(
        'solution.go',
        'package main\n\nfunc greet(name string) string {\n\tpanic("quebrou")\n}\n',
      ),
      java: one(
        'Solution.java',
        'public class Solution {\n    public static String greet(String name) {\n        throw new IllegalStateException("quebrou");\n    }\n}\n',
      ),
      python: one('solution.py', 'def greet(name: str) -> str:\n    raise ValueError("quebrou")\n'),
    },
    expect: [{ kind: 'failed' }, { kind: 'error', contains: 'quebrou' }],
  },
  {
    name: 'um laco infinito e interrompido e vira erro',
    challenge: greet,
    solutions: {
      typescript: one(
        'solution.ts',
        'export function greet(name: string): string {\n  while (true) {}\n}\n',
      ),
      go: one('solution.go', 'package main\n\nfunc greet(name string) string {\n\tfor {\n\t}\n}\n'),
      java: one(
        'Solution.java',
        'public class Solution {\n    public static String greet(String name) {\n        while (true) {}\n    }\n}\n',
      ),
      python: one('solution.py', 'def greet(name: str) -> str:\n    while True:\n        pass\n'),
    },
    expect: [{ kind: 'failed' }, { kind: 'error', contains: 'demorou' }],
  },
  {
    name: 'o projeto do jogador pode ter mais de um arquivo',
    challenge: greet,
    solutions: {
      typescript: [
        { path: 'helper.ts', contents: 'export const prefixo = (): string => "Ola, "\n' },
        {
          path: 'solution.ts',
          contents:
            'import { prefixo } from "./helper.ts"\n\nexport function greet(name: string): string {\n  return prefixo() + name + "!"\n}\n',
        },
      ],
      go: [
        { path: 'go.mod', contents: 'module quest\n\ngo 1.21\n' },
        {
          path: 'solution.go',
          contents:
            'package main\n\nfunc greet(name string) string {\n\treturn prefixo() + name + "!"\n}\n',
        },
        {
          path: 'helper.go',
          contents: 'package main\n\nfunc prefixo() string {\n\treturn "Ola, "\n}\n',
        },
      ],
      java: [
        {
          path: 'Solution.java',
          contents:
            'public class Solution {\n    public static String greet(String name) {\n        return Helper.prefixo() + name + "!";\n    }\n}\n',
        },
        {
          path: 'Helper.java',
          contents:
            'public class Helper {\n    static String prefixo() {\n        return "Ola, ";\n    }\n}\n',
        },
      ],
      python: [
        { path: 'helper.py', contents: 'def prefixo() -> str:\n    return "Ola, "\n' },
        {
          path: 'solution.py',
          contents:
            'from helper import prefixo\n\n\ndef greet(name: str) -> str:\n    return prefixo() + name + "!"\n',
        },
      ],
    },
    expect: [{ kind: 'solved' }],
  },
  {
    name: 'todos os tipos do sistema neutro atravessam a fronteira',
    challenge: summarize,
    solutions: {
      typescript: one(
        'solution.ts',
        `export function summarize(
  count: number,
  ratio: number,
  flag: boolean,
  tags: string[],
  scores: Record<string, number>,
  missing: number | null
): string[] {
  return [
    String(count),
    String(ratio),
    String(flag),
    String(tags.length),
    String(scores['x']),
    missing === null ? 'nulo' : String(missing)
  ]
}
`,
      ),
      go: one(
        'solution.go',
        `package main

import (
\t"fmt"
\t"strconv"
)

func summarize(count int, ratio float64, flag bool, tags []string, scores map[string]int, missing *int) []string {
\tausente := "nulo"
\tif missing != nil {
\t\tausente = strconv.Itoa(*missing)
\t}
\treturn []string{
\t\tstrconv.Itoa(count),
\t\tstrconv.FormatFloat(ratio, 'g', -1, 64),
\t\tfmt.Sprintf("%t", flag),
\t\tstrconv.Itoa(len(tags)),
\t\tstrconv.Itoa(scores["x"]),
\t\tausente,
\t}
}
`,
      ),
      java: one(
        'Solution.java',
        `import java.util.List;
import java.util.Map;

public class Solution {
    public static List<String> summarize(
        int count,
        double ratio,
        boolean flag,
        List<String> tags,
        Map<String, Integer> scores,
        Integer missing
    ) {
        String ratioText = ratio == Math.floor(ratio)
            ? String.valueOf((long) ratio)
            : String.valueOf(ratio);
        return List.of(
            String.valueOf(count),
            ratioText,
            String.valueOf(flag),
            String.valueOf(tags.size()),
            String.valueOf(scores.get("x")),
            missing == null ? "nulo" : String.valueOf(missing)
        );
    }
}
`,
      ),
      python: one(
        'solution.py',
        `def summarize(
    count: int,
    ratio: float,
    flag: bool,
    tags: list[str],
    scores: dict[str, int],
    missing: int | None,
) -> list[str]:
    return [
        str(count),
        str(ratio),
        "true" if flag else "false",
        str(len(tags)),
        str(scores["x"]),
        "nulo" if missing is None else str(missing),
    ]
`,
      ),
    },
    expect: [{ kind: 'solved' }],
  },
  {
    name: 'o grafo instrumentado conta os nos explorados',
    challenge: reachable,
    solutions: {
      typescript: one(
        'solution.ts',
        `import type { Graph } from './graph.ts'

export function reachable(graph: Graph, start: string): number {
  const vistos = new Set([start])
  const fila = [start]
  while (fila.length > 0) {
    const atual = fila.shift()
    if (atual === undefined) break
    for (const aresta of graph.neighbors(atual)) {
      if (!vistos.has(aresta.to)) {
        vistos.add(aresta.to)
        fila.push(aresta.to)
      }
    }
  }
  return vistos.size
}
`,
      ),
      go: one(
        'solution.go',
        `package main

func reachable(graph Graph, start string) int {
\tvistos := map[string]bool{start: true}
\tfila := []string{start}
\tfor len(fila) > 0 {
\t\tatual := fila[0]
\t\tfila = fila[1:]
\t\tfor _, aresta := range graph.Neighbors(atual) {
\t\t\tif !vistos[aresta.To] {
\t\t\t\tvistos[aresta.To] = true
\t\t\t\tfila = append(fila, aresta.To)
\t\t\t}
\t\t}
\t}
\treturn len(vistos)
}
`,
      ),
      java: one(
        'Solution.java',
        `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.Set;

public class Solution {
    public static int reachable(Graph graph, String start) {
        Set<String> vistos = new HashSet<>();
        vistos.add(start);
        Deque<String> fila = new ArrayDeque<>();
        fila.add(start);

        while (!fila.isEmpty()) {
            String atual = fila.poll();
            for (Graph.Edge aresta : graph.neighbors(atual)) {
                if (vistos.add(aresta.to())) {
                    fila.add(aresta.to());
                }
            }
        }

        return vistos.size();
    }
}
`,
      ),
      python: one(
        'solution.py',
        `from graph import Graph


def reachable(graph: Graph, start: str) -> int:
    vistos = {start}
    fila = [start]
    while fila:
        atual = fila.pop(0)
        for aresta in graph.neighbors(atual):
            if aresta.to not in vistos:
                vistos.add(aresta.to)
                fila.append(aresta.to)
    return len(vistos)
`,
      ),
    },
    expect: [{ kind: 'solved' }, { kind: 'opsAbove', count: 0 }],
  },
]
