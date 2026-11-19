# 0078 — O autosave grava a cada alteração do código, não só na conclusão

- Status: aceita
- Data: 2026-11-19
- Substitui o gatilho da [0020](0020-autosave-por-quest.md) e o rascunho separado da
  [0072](0072-formato-do-save.md)

## Contexto

A [0020](0020-autosave-por-quest.md) fez da conclusão de uma quest o único momento de salvar,
e aceitou como custo perder **uma quest em andamento**, inclusive o código que o jogador
estava escrevendo. A [0072](0072-formato-do-save.md) tentou reduzir esse custo com um
arquivo de rascunhos à parte, gravado ao fechar o editor, e recusou pôr o código em
andamento no save principal para "não misturar código em andamento com progresso".

O rascunho nunca chegou a ser implementado. Com o "Carregar jogo" pronto
([0077](0077-carregar-retoma-no-predio-da-proxima-quest.md)), ficou visível o que se perde:
quem fecha o jogo no meio de uma quest volta sem o código que estava escrevendo.

## Decisão

**O save é gravado sempre que o jogador muda o código e para de digitar**, além de na
conclusão de cada quest.

- **Um arquivo só.** Não há rascunho separado: o código em andamento vai para o mesmo
  `save.json`, no mesmo formato da 0072, que não muda.
- **Gatilho:** qualquer alteração que o jogador faz no editor, seja digitar, colar ou
  formatar. O jogo grava depois de **800 ms** sem alteração. As trocas que o próprio jogo
  faz no editor, como abrir um projeto, trocar de linguagem ou carregar um save, não
  disparam a gravação.
- **A conclusão continua gravando na hora**, depois de o `onSuccess` entrar em `progress`.
- **Escritas em fila:** uma gravação espera a anterior terminar, e uma gravação antiga
  nunca cai por cima de uma mais nova. Cada quest tem o próprio temporizador; concluir uma
  quest cobre a alteração pendente dela e não descarta a de outra.
- **A falha é avisada uma vez.** Se o disco recusar a escrita, o painel da quest avisa, mas
  não repete o aviso a cada pausa enquanto a falha for a mesma.
- A escrita continua atômica (temporário e `rename`), e um save de versão mais nova
  continua sem ser sobrescrito (0072).

## Por que misturar não é problema

O progresso só muda na conclusão de uma quest. Uma gravação feita durante a digitação leva o
mesmo `progress` da última conclusão mais o código atual. Por isso ela não tem o problema
que a 0020 apontou no autosave por tempo: não há como capturar o mundo no meio de uma
transição. Um arquivo só também é mais simples do que save mais rascunho, com a regra de
qual dos dois vale.

## Consequências

- A perda máxima deixa de ser uma quest em andamento e passa a ser **menos de um segundo
  de digitação**.
- As cutscenes vistas também vão para o disco na primeira alteração seguinte. Quem vê a
  abertura e começa a escrever não revê a abertura ao carregar, o que a 0072 aceitava como
  custo.
- Passa a existir save antes de a primeira quest ser concluída. O "Carregar jogo" fica
  disponível a partir da primeira alteração e retoma na portaria.
- O código guardado de uma quest concluída deixa de ser necessariamente o que passou nos
  testes: é a última versão que o jogador escreveu. Num replay, o save guarda a tentativa
  em andamento. Hoje esse código só serve para reabrir o editor, então nada depende de ele
  ser a solução aprovada.
- O disco recebe uma escrita pequena, de alguns KB, a cada pausa na digitação.
- Fica fora o que nunca foi código: posição do jogador e cena atual. Carregar continua
  retomando pela regra da 0077.

## Alternativas descartadas

- **Rascunho separado, gravado ao fechar o editor (0072):** perde o que foi escrito se o
  jogo fechar com o editor aberto. Também exige dois arquivos e uma regra de qual deles
  vale.
- **Gravar a cada tecla:** o resultado para o jogador é o mesmo do atraso de 800 ms, com
  muito mais escrita.
- **Autosave por tempo:** salva em momentos sem relação com o que o jogador fez, que é
  justamente o que a 0020 recusou.
