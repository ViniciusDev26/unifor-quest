# 0036 — `core` é o domínio; `packages/engine` sai do desenho

- Status: aceita
- Data: 2026-09-23
- Altera: [0027](0027-arquitetura-em-aneis.md)

## Contexto

A [0027](0027-arquitetura-em-aneis.md) separou `core` (contratos e regras puras, sem
estado) de `packages/engine` (o domínio com estado), para que os adapters de linguagem não
arrastassem gameplay junto.

Na prática, o que aconteceu foi outra coisa: `core` ficou com os contratos e **duas** regras
genéricas — comparar JSON e validar um valor contra um tipo —, e todas as regras de jogo
foram empurradas para um pacote que nunca foi escrito. Um domínio anêmico, e a separação
sem sentido: não havia o que separar.

Há uma evidência concreta de que isso era um problema, e não uma questão de gosto. A
[0006](0006-protocolo-do-harness.md) diz que o harness emite `passed` por caso de teste; a
[0032](0032-igualdade-e-validacao-de-valor.md) diz que a decisão de passou ou não passou é
do jogo. As duas se contradizem, e a contradição passou despercebida **porque a regra que
decide se a quest foi resolvida não existia em lugar nenhum**.

## Decisão

**`core` é o domínio.** `packages/engine` não será criado.

As regras de jogo vivem em `core/src/rules`, como funções puras sobre os tipos do domínio:

| Regra | O que decide |
| --- | --- |
| `evaluateSubmission` | se o jogador resolveu o desafio, comparando caso a caso |
| `isQuestAvailable` | se a quest aparece, dadas as quests concluídas e as flags |
| `completeQuest` | o progresso novo, os efeitos e se foi a **primeira** conclusão |
| `applyEffect` | a transição de estado de um efeito |
| `languagesFor` | em que linguagens o desafio pode ser resolvido |
| `validateQuest` | se os casos de teste batem com a assinatura declarada |

O estado do jogador é o value object `Progress` — quests concluídas e flags — e as regras
nunca o modificam: recebem um e devolvem outro.

Os anéis da [0027](0027-arquitetura-em-aneis.md) colapsam para **`core` → adapters e runner
→ cascas**. Tudo o mais continua: portas em `core`, framework só em `apps/`, a engine
rodando sem janela.

## Consequências

- Um domínio rico num lugar só, em vez de dois pacotes pela metade.
- **`lang-java` e `lang-go` passam a depender de um pacote que contém progressão de quest.**
  É o custo aceito: são funções puras, nada entra no runtime de quem não usa, e a
  alternativa custava um pacote a mais para resolver um problema conceitual.
- Domínio rico aqui não quer dizer método em objeto: os tipos vêm de `z.infer` e as regras
  são funções puras sobre eles. O que importa é que **as regras existem e vivem no domínio**,
  e não espalhadas pelas cenas ou pelo runner.
- A contradição entre [0006](0006-protocolo-do-harness.md) e
  [0032](0032-igualdade-e-validacao-de-valor.md) fica resolvida pela
  [0037](0037-o-jogo-compara-o-harness-reporta.md).
- O passo 8 do [roadmap](../roadmap.md) deixa de ser "escrever `packages/engine`" e passa a
  ser ligar as regras que já existem à quest hello world.

## Alternativas descartadas

- **Manter os dois pacotes e mover as regras para `engine`:** defensável, e separaria por
  audiência — `core` como linguagem comum dos adapters, `engine` como domínio. Custa um
  pacote a mais para proteger uma fronteira que, neste tamanho de projeto, não é atacada
  por ninguém.
- **Deixar como estava:** um pacote de contratos chamado de domínio, com as regras
  aparecendo depois em qualquer lugar que precisasse delas — que é exatamente como uma
  regra acaba duplicada em dois lugares com respostas diferentes.
