# 0034 — Vocabulário inicial de `Effect` e pré-requisitos por quest e flag

- Status: aceita
- Data: 2026-09-23

## Contexto

A [ADR 0027](0027-arquitetura-em-aneis.md) decidiu que o `onSuccess` é uma lista de efeitos
declarativos, com o tipo em `core`, e que ampliar esse vocabulário é mudança de engine.
Faltava o conteúdo do vocabulário. E os pré-requisitos da quest eram uma lista de flags
soltas, sem relação com as quests já concluídas.

## Decisão

### `Effect` começa com uma variante só: `setFlag`

Uma porta destravada é expressável como uma flag que o mundo lê. Enquanto for assim, não
existe variante dedicada: a união cresce quando um caso real provar que flag não basta,
seguindo a mesma direção da [ADR 0024](0024-runtimes-podados-ao-minimo.md) — acrescenta-se
depois, se faltar.

**Marcar a quest como concluída não é um efeito.** A engine já sabe disso; fazer cada quest
declarar seria cerimônia repetida em toda quest, e um esquecimento viraria uma quest que
conclui sem concluir.

### `requires` tem duas listas

```text
requires: { quests: [...], flags: [...] }
```

- **`quests`** referencia ids de quests que precisam estar concluídas. A engine já
  acompanha isso, então não é preciso inventar uma flag por quest.
- **`flags`** fica para estado de mundo que não é quest.

## Consequências

- Um vocabulário com uma variante só parece pouco, e é intencional: o mecanismo está de pé
  e a extensão é uma linha na união mais um caso no interpretador.
- Depender de uma quest por id elimina a indireção "quest conclui → seta flag → outra quest
  exige a flag", e com ela a chance de digitar o nome da flag errado.
- Renomear o id de uma quest passa a quebrar quem depende dela. É um erro detectável ao
  validar o conteúdo.
- `onSuccess` continua sendo aplicado só na primeira conclusão
  ([ADR 0030](0030-qualquer-linguagem-e-replay-livre.md)), o que é responsabilidade da
  engine, não da quest.

## Alternativas descartadas

- **Já definir `unlock`, `grantXp`, `giveItem` e companhia:** seria projetar vocabulário
  para quests que ainda não existem, e cada variante não usada é código morto no
  interpretador.
- **Só flags, sem `quests` no `requires`:** mantém uma lista só, ao custo de toda quest ter
  que declarar uma flag de conclusão — que é justamente a cerimônia recusada acima.
