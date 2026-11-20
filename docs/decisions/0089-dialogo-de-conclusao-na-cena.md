# 0089 — A fala de conclusão acontece no cenário, e a oferta explica o que o código conserta

- Status: aceita
- Data: 2026-11-20
- Complementa a [0027](0027-arquitetura-em-aneis.md), a
  [0030](0030-qualquer-linguagem-e-replay-livre.md) e a
  [0059](0059-npc-oferece-a-quest-mais-adiantada.md)

## Contexto

Toda quest já tinha `dialogue.success`, mas ele só aparecia como texto solto no painel do
editor, sem quem falava, no instante em que os testes passavam. Por isso o jogador não via
o NPC reagir: o Marcos não dizia que a cifra foi decifrada, e ninguém apontava o próximo
lugar. A história ficava muda entre uma quest e outra. Falar com o NPC depois de concluir
reabria o editor, sem nenhuma fala nova. A exceção era o Seu Raimundo, que tinha uma fala
fixa na própria cena.

## Decisão

**A fala de sucesso toca na caixa de diálogo do cômodo, na primeira conclusão, assim que o
painel fecha, depois da consequência no mundo.**

- O `main.ts` guarda a quest recém-concluída (`completedNow`) e entrega as falas uma vez só,
  por `takeSuccessDialogue()`, quando nenhum painel cobre a cena. O cômodo na tela é quem as
  toca:
  - **Portaria:** a câmera vai até o painel de placas, de novo legível, enquanto o Marcos e
    o Davi falam, e depois volta.
  - **Biblioteca:** as falas vêm depois que as estantes se levantam e o caminho acende.
  - **Centro de Convivência:** as falas vêm depois que a fila se alinha.
  - **Bloco de Tecnologia:** as últimas palavras do NULL vêm antes da cutscene `final`.

  Enquanto a consequência acontece, o jogador não anda nem interage. Um replay não toca
  nada, porque o mundo não muda ([0030](0030-qualquer-linguagem-e-replay-livre.md)).
- As falas de oferta, antes do editor, dizem o que a função recebe e devolve e o que o
  retorno dela faz no mundo ([0013](0013-codigo-com-consequencia-no-mundo.md)), para o
  jogador saber por que está escrevendo aquele código.
- As falas de sucesso contam a história: o que foi consertado, o que se descobriu do NULL e
  para onde ir. O NULL provoca o jogador ao fim da Biblioteca e do Centro de Convivência.
- A quest ganha `dialogue.afterwards`, opcional: o que o NPC diz quando o jogador fala com
  ele de novo depois de concluir. A conversa continua levando ao editor, para o replay em
  outra linguagem ([0030](0030-qualquer-linguagem-e-replay-livre.md)). A exceção é o Seu
  Raimundo, que só fala, como já era. A fala que estava fixa na cena dele passou para o
  dado da quest.
- O painel, na primeira conclusão, só diz que os testes passaram e pede para fechar o
  editor. No replay, mostra as falas de sucesso com o nome de quem fala.

## Consequências

- Diálogo continua sendo dado ([0014](0014-quests-declarativas.md)). Mudar o roteiro é
  editar `content/*.ts` e o `docs/story.md`, sem tocar nas cenas.
- O epílogo ganhou mais falas do Davi, que fecham a história.
- Uma cena nova que tenha quest precisa receber `takeSuccessDialogue` e tocar as falas
  depois da sua própria consequência.

## Alternativas descartadas

- **Cutscene de conclusão para cada quest:** a cutscene toca uma vez e não sabe da quest
  ([0066](0066-cutscene-e-dado.md)). Para quatro conversas curtas, a caixa de diálogo
  basta.
- **Falar no painel, com a cena por trás:** o painel cobre o cômodo, e o jogador não veria
  a consequência enquanto o NPC fala dela.
