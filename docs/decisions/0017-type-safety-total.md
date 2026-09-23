# 0017 — Type safety total, inclusive nas fronteiras

- Status: aceita
- Data: 2026-09-22

## Contexto

TypeScript strict já estava ligado desde o scaffold, mas strict sozinho não garante nada
onde o dado **entra** no programa. E este projeto é feito de fronteiras assim:

- o **envelope JSON** devolvido por um processo externo ([0006](0006-protocolo-do-harness.md));
- os **casos de teste em JSON**, lidos do disco ([0004](0004-testes-como-dados.md));
- o **arquivo do Tiled**, de onde sai o grafo do campus ([0012](0012-grafo-do-campus-no-tiled.md));
- o **payload de IPC** entre renderer e main ([0008](0008-quest-engine-no-renderer.md));
- o **save**;
- o mapeamento **`TypeSpec` → tipos de outra linguagem**, feito pelos adapters
  ([0005](0005-adapter-por-linguagem.md)).

Um único `as` em qualquer um desses pontos apaga a garantia de tudo que vem depois dele.

## Decisão

O código é **100% type safe até onde a linguagem permitir**.

1. **Sem `any`**, explícito ou implícito. Sem non-null assertion (`!`). Sem `as` usado para
   calar o compilador — `as const` e narrowing legítimo continuam valendo.
2. **Dado externo entra como `unknown`** e só vira um tipo depois de passar por validação
   em runtime que pode **falhar**. Vale para todas as fronteiras listadas acima.
3. **Uniões discriminadas com exaustividade checada pelo compilador**, pelo idioma do
   `never`. A regra de lint equivalente do Biome (`useExhaustiveSwitchCases`) está em
   nursery e depende de inferência de tipos própria, então a garantia fica com o `tsc`.
4. Nos adapters, type safety significa **mapeamento total e explícito** de `TypeSpec` para
   os tipos da linguagem alvo: nada de cair em `Object`, `interface{}` ou `any` como
   escape genérico.
5. A regra é **verificável**, não aspiracional: `tsconfig.base.json` e `biome.json`
   carregam o enforcement e o build quebra.

Enforcement em vigor:

```text
tsconfig.base.json  strict, noUncheckedIndexedAccess, noImplicitReturns,
                    noImplicitOverride, exactOptionalPropertyTypes,
                    noPropertyAccessFromIndexSignature, useUnknownInCatchVariables,
                    noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch

biome.json          noExplicitAny, noImplicitAnyLet, noUnsafeDeclarationMerging,
                    noNonNullAssertion  (todas como erro)
```

## Consequências

- `packages/core` vai precisar de **validadores em runtime**, e isso esbarra na regra
  "`core` não depende de nada": ou escrevemos os validadores à mão, ou a regra passa a
  significar "não depende de outros pacotes do monorepo" e adotamos uma lib de schema.
  Em aberto — ver [../open-questions.md](../open-questions.md).
- `exactOptionalPropertyTypes` e `noPropertyAccessFromIndexSignature` custam verbosidade.
  Já pegaram um caso real no scaffold (`process.env['ELECTRON_RENDERER_URL']`).
- Todo adapter novo precisa **provar mapeamento total de tipos**; isso vira item da suite
  de conformance ([0015](0015-validar-com-typescript-e-java.md)).
- Validar na fronteira tem custo de execução, pequeno perto do startup de processo
  ([0011](0011-metricas-por-contagem-de-operacoes.md)).
- `customTests` ([0007](0007-valvula-de-escape-custom-tests.md)) continua sendo o ponto
  onde a garantia é mais fraca, porque o teste é escrito à mão.

## Alternativas descartadas

- **Confiar em cast na fronteira, porque "o JSON foi gerado pelo nosso próprio harness":**
  o processo pode morrer no meio da escrita, o jogador pode imprimir qualquer coisa no
  stdout, e o compilador da outra linguagem não conhece os nossos tipos. É exatamente onde
  o cast falha.
- **Só `strict: true` e disciplina:** sem enforcement, a regra dura até o primeiro prazo
  apertado.
