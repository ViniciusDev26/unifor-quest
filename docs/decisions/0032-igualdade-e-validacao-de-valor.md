# 0032 — Regras de igualdade e de validação de valor

- Status: aceita
- Data: 2026-09-23

## Contexto

Comparar o que o código do jogador devolveu com o `expected` do caso de teste parece
trivial e não é. Se cada adapter decidir por conta própria, TypeScript e Java divergem em
silêncio — e a suite de conformance não tem com o que arbitrar. As regras precisam ser uma
só, em `core` ([ADR 0019](0019-zod-no-core.md)).

O mesmo vale na direção oposta: nada hoje verifica se os casos de teste de uma quest batem
com a assinatura que ela declara.

## Decisão

### Igualdade (`jsonEquals`)

- **Listas são ordenadas.** Uma rota fora de ordem é uma rota errada. Um desafio cuja
  resposta seja genuinamente sem ordem precisará dizer isso; esse mecanismo ainda não
  existe.
- **Objetos são comparados por conteúdo**, nunca por ordem de chave.
- **Campo a mais reprova.** Costuma ser bug, não generosidade.
- **Números são comparados exatamente.** Sem tolerância de ponto flutuante: nenhum desafio
  da Fase A devolve número real ([ADR 0029](0029-fase-a-mecanica-antes-do-conteudo.md)).
  Quando existir um, a tolerância é decisão nova, não um padrão silencioso.

### Validação de valor (`validateValue`)

Verifica um valor JSON contra um `TypeSpec` e devolve os problemas encontrados, cada um com
um caminho (`$.edges[2].weight`). É o que pega quest quebrada na hora de escrevê-la, e não
na cara do jogador.

- `int` aceita só número inteiro; `3.5` é rejeitado.
- `float` aceita inteiro também: um inteiro é um real válido.
- `struct` rejeita campo desconhecido, pelo mesmo motivo da igualdade.
- **Chave de `map` é sempre `string`**, e isso passou a estar no próprio `TypeSpec`: a
  variante `map` carrega `key: { kind: 'string' }`, não um `TypeSpec` qualquer. Objeto JSON
  não tem outro tipo de chave, e estado inválido que não se representa não precisa ser
  validado ([ADR 0017](0017-type-safety-total.md)).

## Consequências

- Os adapters não decidem nada sobre comparação: eles produzem o envelope, e a decisão de
  passou ou não passou é do jogo.
- Ampliar a chave de `map` para outros tipos é mudança de contrato, com ADR, e toca todos
  os adapters ([ADR 0004](0004-testes-como-dados.md)).
- O caminho nos problemas de validação é o que torna o erro útil para quem escreve conteúdo.
- **O empate continua sem solução, e não é problema de igualdade.** Se um grafo admite dois
  caminhos mínimos diferentes, o jogador acerta e o jogo reprova. Isso se resolve no
  desenho da quest — grafo sem empate, ou critério de desempate no enunciado — não aqui.

## Alternativas descartadas

- **Tolerância de float desde já:** resolveria um problema que a Fase A não tem, e fixar o
  valor sem um caso real seria chute.
- **Cada adapter comparando por conta própria:** mais rápido por adapter, e garante
  divergência entre linguagens.
- **Ignorar campo a mais:** tolerante com quem devolve estrutura errada por acidente.
