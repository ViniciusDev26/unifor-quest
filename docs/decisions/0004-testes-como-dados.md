# 0004 — Testes como dados

- Status: aceita
- Data: 2026-09-22

## Contexto

Para satisfazer [0003](0003-multi-linguagem-custo-por-adapter.md), o desafio precisa ser
descrito sem depender de nenhuma linguagem.

## Decisão

Cada desafio declara, em dados:

- o nome da função;
- os parâmetros e o retorno num **sistema de tipos neutro**: `int`, `float`, `bool`,
  `string`, `list<T>`, `map<K,V>`, `nullable<T>`, structs simples e tipos de domínio como
  `Graph`;
- os casos de teste em **JSON** (`name`, `input`, `expected`).

O código do jogador roda **nativamente** na linguagem escolhida. Não existe tradução de
código nem compilação para uma linguagem intermediária. **Só os dados cruzam a fronteira**,
via serialização JSON.

## Consequências

- Uma quest nova custa um arquivo de dados, independente de quantas linguagens existem.
- O sistema de tipos neutro vira um contrato central: ampliá-lo obriga a mexer em todos os
  adapters.
- Comparação de `expected` com `actual` acontece sobre JSON, o que força regras explícitas
  de igualdade (ex.: ordem de listas, precisão de `float`).

## Alternativas descartadas

- **Um arquivo de teste escrito à mão por quest por linguagem:** custo quests × linguagens,
  drift entre as versões de cada linguagem e N formatos de saída para o jogo interpretar.
