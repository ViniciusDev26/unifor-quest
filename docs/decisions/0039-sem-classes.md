# 0039 — Sem classes: funções, closures e composição

- Status: aceita
- Data: 2026-09-23

## Contexto

O código nasceu com duas classes — o executor local e a cena do Phaser, esta última por
herança de `Phaser.Scene`. Não havia regra escrita, então a escolha era caso a caso.

## Decisão

**Não usamos classes.** Estado privado mora em **closure**, e o que precisa de várias
operações devolve um objeto de funções:

```text
createLocalExecutor(options) -> { run }
createWorldScene({ onTalk }) -> { config, showCompleted }
createQuestPanel(...)        -> { element, open }
```

**Composição no lugar de herança**, sempre. Isso vale inclusive contra o estilo das
bibliotecas: o Phaser é orientado a classes e a documentação dele ensina
`class X extends Phaser.Scene`, mas ele também aceita a cena como objeto de configuração
com funções — e é essa a forma usada aqui.

As regras de domínio já eram funções puras sobre dados vindos de `z.infer`
([ADR 0036](0036-core-e-o-dominio.md)), então nada muda ali.

## Consequências

- Não existe `this`, e com isso somem os erros de `this` perdido em callback — que foi
  exatamente o que quebrou a primeira versão da cena.
- O que é privado é privado de verdade, por escopo, sem depender de `#` ou de convenção.
- Trocar uma implementação é trocar a função que a cria: nada depende do formato de um
  construtor.
- Interoperar com bibliotecas orientadas a classes exige usar a via alternativa delas,
  quando existe. Se um dia não existir, a exceção precisa de um ADR.
- `new Error(...)` continua normal: a regra é sobre as nossas abstrações, não sobre os tipos
  embutidos da linguagem.

## Alternativas descartadas

- **Classes onde a biblioteca sugere:** seguiria o caminho de menor atrito de cada
  biblioteca, ao custo de dois estilos convivendo no mesmo código.
- **Classes só para coisas com estado:** é justamente onde a closure resolve melhor, e o
  critério "tem estado?" vira discussão em toda revisão.
