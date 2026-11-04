# 0072 — Formato do save

- Status: aceita
- Data: 2026-11-03
- Completa a [0020](0020-autosave-por-quest.md)

## Contexto

A [0020](0020-autosave-por-quest.md) decidiu o gatilho do save: automático, a cada quest
concluída, sem save manual. A [0026](0026-diretorio-de-trabalho-e-save.md) decidiu o lugar:
`userData`. Ficou em aberto o resto ([open-questions §2](../open-questions.md)): o que entra
no arquivo, o formato, como carregar um save de outra versão do jogo, se existe mais de um
save e o que acontece com o código de uma quest ainda não concluída.

Duas pendências de outras ADRs também esperavam por esta: a
[0030](0030-qualquer-linguagem-e-replay-livre.md) já disse que o código por quest e por
linguagem entra no save, e a [0066](0066-cutscene-e-dado.md) deixou para cá a abertura que
toca de novo se o jogador sair antes da primeira quest.

## Decisão

### O que entra

- O `Progress` inteiro: quests concluídas, flags e cutscenes vistas.
- O código do jogador, **por quest e por linguagem**: o texto dos arquivos que ele edita.
  O que o adapter gera sozinho (stub de outros arquivos, o prelude `graph.ts`) não entra;
  o jogo gera de novo ao abrir o projeto ([0005](0005-adapter-por-linguagem.md)).

### Formato

- **JSON, validado por um schema Zod em `core`** (`saveSchema`), como todo dado que entra
  no jogo ([0017](0017-type-safety-total.md), [0019](0019-zod-no-core.md)). O tipo sai do
  schema.
- O save é dado externo e pode ter sido editado à mão ou vir de outra pessoa
  ([0010](0010-sem-docker.md)): entra como `unknown`, e um arquivo que não passa na
  validação é recusado sem quebrar o jogo. O código guardado só roda quando o jogador
  clica em Executar, como qualquer código que ele mesmo escreveu.

### Versão

- O arquivo carrega um campo **`version`**, um inteiro.
- Carregar um save de versão anterior passa por **migrações** em `core`, uma por versão,
  até a atual.
- Um save de versão **mais nova** que a do jogo não é carregado nem sobrescrito: o jogo
  avisa e começa sem ele.

### Um save só

- Existe **um** save. Sem save manual ([0020](0020-autosave-por-quest.md)), vários slots
  não teriam quem os escolhesse, e o jogo inteiro cabe em 20 minutos
  ([0064](0064-jogo-de-ate-20-minutos.md)).
- "Iniciar novo jogo" com um save existente **pergunta antes**. Confirmado, apaga o save e
  os rascunhos.

### Rascunho do código não concluído

- O código de uma quest em andamento vai para um **arquivo de rascunhos separado**, gravado
  quando o jogador fecha o editor da quest.
- O save principal continua sendo gravado só na conclusão, como a
  [0020](0020-autosave-por-quest.md) decidiu. O rascunho não é progresso: perdê-lo custa
  só o código que estava sendo escrito.
- Ao carregar, o código de uma quest numa linguagem vem do rascunho, se houver, e do save,
  se não houver.

### Cutscene vista

- Não há gravação extra ao fim de uma cutscene. Quem fecha o jogo depois da abertura e
  antes da primeira quest vê a abertura de novo ao carregar. É curta, e o gatilho único da
  [0020](0020-autosave-por-quest.md) se mantém.

### Escrita

- Save e rascunhos são gravados de forma **atômica**: arquivo temporário e rename
  ([0020](0020-autosave-por-quest.md)).

## Consequências

- O autosave (card "Autosave por quest") e o "Carregar jogo" do menu passam a ter um
  formato para seguir.
- Mudar a forma de `Progress` ou do código guardado vira uma versão nova com sua migração,
  testável em Node.
- Fechar o editor grava o rascunho; fechar o jogo com o editor aberto pode perder o que foi
  escrito desde a última vez que ele foi fechado.
- A pergunta antes de "Iniciar novo jogo" é a única forma de o jogador perder o save de
  propósito.

## Alternativas descartadas

- **Guardar o projeto inteiro, com os arquivos gerados:** duplica o que o adapter sabe
  gerar e prende o save a uma versão do stub e do prelude.
- **Vários slots de save:** sem save manual não há quem escolha o slot.
- **Gravar o rascunho no save principal:** mudaria o gatilho da 0020 e misturaria código
  em andamento com progresso.
- **Perder o código não concluído:** simples, mas custa justamente o trabalho mais
  recente do jogador.
- **Gravar ao fim de cada cutscene:** um segundo gatilho de save para evitar rever uma cena
  curta.
