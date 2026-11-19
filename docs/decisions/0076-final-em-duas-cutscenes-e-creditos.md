# 0076 — O final são duas cutscenes, ligadas por um `cue`, e termina nos créditos

- Status: aceita
- Data: 2026-11-19
- Amplia a [0066](0066-cutscene-e-dado.md) e implementa a
  [0070](0070-campus-com-e-sem-null.md)

## Contexto

O card "Final do jogo" pede a sequência: NULL derrotado → campus volta ao normal → Davi
aparece → créditos → volta ao menu. A [história](../story.md) diz que o NULL cai, as telas
do campus voltam e o Davi aparece na porta perguntando se perdeu alguma coisa.

Três decisões anteriores já tocam nisso, e não se encaixam numa cena só:

- a [0066](0066-cutscene-e-dado.md) diz que o final toca "logo depois da quest, ainda no
  Bloco de Tecnologia";
- a [0070](0070-campus-com-e-sem-null.md) diz que a virada do campus "acontece quando o
  jogador volta ao campus depois do confronto, que é onde a cutscene final o deixa";
- o vocabulário de passos da 0066 não tem como trocar de cena.

Além disso, o PR #71 colocou o Davi no Bloco de Tecnologia como NPC com quem se conversa
depois do duelo, o que a 0066 recusa ("Davi é ator, não NPC").

## Decisão

### Duas cutscenes, uma em cada cena

| Cutscene | Cena | O que acontece |
| --- | --- | --- |
| `final` | `bloco-de-tecnologia` | O NULL se desfaz em blocos verdes, a rede volta e a tela escurece. |
| `epilogo` | `campus` | O campus já está sem o NULL. O Davi sai pela porta norte do Bloco, fala e a tela escurece. |

As duas exigem `o-confronto` e moram em `content/bloco-de-tecnologia.ts`, ao lado da quest
que as dispara. Como cada uma só toca na própria cena, `pendingCutscene` encadeia as duas
sem nenhum conceito novo: a `final` toca primeiro porque o jogador está no Bloco, e a
`epilogo` toca quando o campus é criado.

### Trocar de cena é um `cue`, e só pode ser o último passo

A troca de cena é um `cue` da cena, não um passo novo: `volta-ao-campus` no Bloco de
Tecnologia e `creditos` no campus. O dado continua dizendo *quando*, e a cena decide *como*
e *para onde*, como na 0027.

Um `cue` que troca de cena chama `done()` **antes** de `scene.start`. Assim o
`CutscenePlayer` termina a lista, o `main.ts` marca a cutscene como vista e só depois a cena
para. Por isso esse `cue` só pode ser o último passo: um passo depois dele nunca tocaria. O
teste `test/content/final.test.ts` garante isso para as duas cutscenes do final.

### O final espera o painel fechar

Assim como as consequências da [0075](0075-pixel-art-na-densidade-do-personagem.md), a
cutscene `final` só começa quando o painel do editor está fechado (`canPlayCompletion`).
Antes disso o jogador não veria nada. Num replay, quando a cutscene já foi vista, a sala
só passa para o visual restaurado.

### O Davi volta a ser só ator

O Davi deixa de ficar no Bloco de Tecnologia. Ele aparece só no `epilogo`, como ator que
entra por `spawn`, com a mesma folha da abertura (`characters/straw.png`). A fala dele sai
de `dialogue.success` da quest e passa para a cutscene sem mudar o texto, como a 0066 já
previa. No painel, o `success` fica só com a última fala do NULL.

### O campus com e sem o NULL (0070)

A cena do campus lê `campus-restaurado` ao ser criada:

- **sem a flag:** a trilha é `bittersweet_story`, há um verde leve sobre o mapa inteiro e,
  de tempos em tempos, uma interferência com um dos sons `glitch`;
- **com a flag:** a trilha é `town` e não há filtro.

### Créditos

Os créditos têm uma cena própria (`creditos`, `scenes/credits-scene.ts`). Ela mostra "FIM"
e rola as seções de `content/credits.ts`, que são dado e não código de cena. Ao terminar, a
cena volta ao menu. Enter, Esc ou um clique pulam direto para o menu: a cutscene não se
pula (0066), mas os créditos não fazem parte da história. "Iniciar novo jogo" já zera o
progresso, então o menu depois dos créditos não precisa de nada especial.

## Consequências

- O vocabulário de passos não cresce. Um `cue` pode trocar de cena, desde que seja o
  último passo.
- O final dura uns 30 segundos mais os créditos, dentro dos 2 minutos que a história
  reserva para a abertura e o final juntos.
- O check de navegação do Bloco de Tecnologia deixa de conferir o caminho até o Davi.
- O autosave continua gravando só ao concluir uma quest ([0020](0020-autosave-por-quest.md)).
  O save do fim do jogo, portanto, não tem `final` nem `epilogo` em `seenCutscenes`. Quando
  "Carregar jogo" existir, carregar esse save leva de volta ao final. Isso fica para aquele
  card, junto com a questão já anotada na 0066 sobre gravar ao fim de uma cutscene.

## Alternativas descartadas

- **Um passo novo `scene` (ou `goto`) no vocabulário:** daria para trocar de cena em
  qualquer ponto da lista, mas o resto da lista nunca tocaria. O `cue` no último passo faz
  a mesma coisa sem mexer em `core`.
- **O final inteiro no Bloco de Tecnologia, com o Davi entrando pela escadinha:** seria uma
  cutscene só, mas o jogador nunca veria o campus restaurado, que é a promessa da história
  e da 0070.
- **O final inteiro no campus:** perderia o NULL se desfazendo, que é o fechamento do duelo,
  e contrariaria a 0066.
- **Créditos como passos `say` na caixa de diálogo:** texto demais para a caixa, e a lista
  de créditos é conteúdo que muda sem nenhuma relação com a encenação.
