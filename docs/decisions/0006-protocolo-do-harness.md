# 0006 — Protocolo do harness

- Status: aceita
- Data: 2026-09-22

## Contexto

O jogo precisa entender o resultado de uma execução sem saber em que linguagem ela rodou.
O `print` do jogador não pode corromper esse resultado, e o custo de startup de processo é
alto demais para uma execução por caso de teste.

## Decisão

Um único protocolo, igual para toda linguagem. O harness:

1. lê os casos de teste pelo **stdin**;
2. **redireciona o stdout do jogador**, para que `print` não quebre o resultado;
3. roda **todos os testes numa única execução**;
4. emite um **envelope JSON entre marcadores com nonce**:

```json
{
  "results": [{ "name": "...", "passed": true, "actual": [], "ms": 3, "ops": 18 }],
  "playerStdout": "...",
  "error": null
}
```

O código do jogador fica **num arquivo próprio**, para que os números de linha dos erros
batam com os do editor.

## Consequências

- O jogo tem um só parser de resultado, qualquer que seja a linguagem.
- O nonce protege contra um jogador que imprima algo parecido com o envelope.
- Um crash do processo derruba todos os testes de uma vez; o campo `error` precisa dar
  conta desse caso.
- Estado global vazado entre testes é possível, já que todos rodam no mesmo processo.

## Alternativas descartadas

- **Uma execução por caso de teste:** simples de isolar, mas o startup do processo domina
  o custo e torna a rodada lenta demais para um loop de gameplay.
