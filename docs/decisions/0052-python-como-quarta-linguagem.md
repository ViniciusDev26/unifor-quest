# 0052 — Python como quarta linguagem

- Status: aceita
- Data: 2026-09-23

## Contexto

O MVP previa três linguagens ([0016](0016-go-no-mvp.md)). Python entrou depois por dois
motivos: é a linguagem em que algoritmos e estruturas de dados são ensinados, e o jogo é
sobre isso; e porque nada mais mede tão bem o requisito da
[0003](0003-multi-linguagem-custo-por-adapter.md) quanto escrever mais um adapter contra uma
abstração que já está pronta.

## Decisão

**Python é uma linguagem jogável**, com adapter e servidor de linguagem
([0053](0053-pyright-em-node.md)).

## Consequências

- **Custou um adapter e nada mais.** Nenhuma mudança em `core`, no runner, no protocolo do
  harness ou em quest alguma — só a entrada nova em `LanguageId`. Go tinha custado um
  adapter mais uma extensão de contrato ([0041](0041-command-com-artefato.md)); Java, um
  adapter; Python, um adapter. O requisito da
  [0003](0003-multi-linguagem-custo-por-adapter.md) está medido.
- **Foi o mais barato dos quatro**, e por motivos que valem registrar: JSON está na
  biblioteca padrão, não há etapa de compilação, e o valor já vem na forma certa do
  `json.loads` — uma lista é `list`, um objeto é `dict`. Onde as outras linguagens decodificam
  argumento por argumento, Python passa adiante. A única exceção é struct, que vira
  **dataclass**.
- As dicas de tipo no stub não são checadas em tempo de execução, e isso é intencional: elas
  existem para o jogador ler e para o servidor de linguagem conferir.
- Execução em **0,0 s**, contra 0,3 s do Java e 0,1 s do Go com cache quente.
- Mais um runtime para embutir na distribuição, o que a
  [0045](0045-tamanho-do-pacote-nao-e-restricao.md) já tinha tirado da lista de
  preocupações.

## Alternativas descartadas

- **Parar em três linguagens:** o MVP não pedia a quarta, e recusá-la significaria deixar de
  fora justamente a linguagem em que a disciplina costuma ser ensinada.
