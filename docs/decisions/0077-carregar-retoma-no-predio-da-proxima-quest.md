# 0077 — Carregar o jogo retoma dentro do prédio da próxima quest

- Status: aceita
- Data: 2026-11-19
- Amplia a [0072](0072-formato-do-save.md) e a [0020](0020-autosave-por-quest.md)

## Contexto

O card "Menu: Carregar jogo" (#27) habilita o botão que a
[0062](0062-menu-inicial-pausa-e-trilha-sonora.md) deixou desligado. A
[0072](0072-formato-do-save.md) definiu o que o save guarda: o `Progress` inteiro e o
código do jogador por quest e por linguagem. A posição do jogador não está entre essas
coisas, e nenhuma decisão anterior diz **onde** o jogo recomeça ao carregar.

O autosave só grava quando uma quest é concluída ([0020](0020-autosave-por-quest.md)).
Por isso, um save sempre corresponde a um momento entre uma quest e a próxima.

## Decisão

### Onde o jogo recomeça

O jogo carregado começa **dentro do prédio da próxima quest**, na entrada da cena desse
prédio:

| Concluídas | Retoma em |
| --- | --- |
| nenhuma | portaria (`entrada`) |
| a da portaria | Biblioteca |
| até a da Biblioteca | Centro de Convivência |
| até a do Centro de Convivência | Bloco de Tecnologia |
| todas | Bloco de Tecnologia, onde o final que ainda falta tocar acontece |

- **Escolher a quest é uma regra pura em `core`**: `resumeQuest(quests, progress)`
  devolve a primeira quest da história que está disponível e ainda não foi concluída. Se
  todas já foram concluídas, devolve a última. Ela se testa em Node, como as outras regras.
- **Ligar a quest à cena é conteúdo**: `storyStops`, em `content/story.ts`, diz a cena de
  cada quest. Uma parada pode trazer também `campusReturn`, o ponto onde o jogador aparece
  no campus ao sair. Isso vale para a Biblioteca, que não define esse ponto sozinha: um
  jogo carregado nunca passou pela porta do campus que o teria definido.
- **O save continua sem posição.** Para retomar não é preciso guardar onde o jogador estava,
  e o formato da 0072 não muda.

### O que o carregamento restaura

- `progress` e `code` vêm do save. A HUD de objetivo é recalculada a partir deles.
- O painel de cada quest abre com o código salvo de cada linguagem, aplicado sobre o
  projeto que o adapter gera ([0047](0047-projeto-em-vez-de-arquivo.md)). Um painel que já
  estava aberto na sessão é trocado pelo conteúdo do save (`restore`).
- O autosave **mescla** o código da quest concluída com o que o save já tinha. Assim, uma
  linguagem que veio do save e não foi aberta nesta sessão continua guardada
  ([0030](0030-qualquer-linguagem-e-replay-livre.md)).

### O menu

- O jogo lê o save **antes** de abrir o menu, numa única ida e volta pelo IPC. O menu já
  nasce sabendo se há o que carregar.
- "Carregar jogo" só fica habilitado com um save válido. Nos outros casos, o botão aparece
  desligado e explica o motivo: "nenhum jogo salvo", "salvo por uma versão mais nova" ou
  "arquivo de save inválido". Isso cumpre o que a 0072 pede para um save de versão mais
  nova: avisar e não carregar.
- **"Iniciar novo jogo" com um save existente pergunta antes**, como a 0072 decidiu. O
  menu troca para "Começar de novo apaga o jogo salvo. Isso não tem volta.", com "Voltar"
  selecionado. Confirmado, o save é apagado (canal `save:delete`) e os editores abertos
  voltam ao stub. Sem save no disco, não há pergunta.
- O menu esconde a HUD de objetivo sempre que aparece, seja voltando da pausa ou dos
  créditos.

## Consequências

- O card #27 está fechado sem mexer no formato do save.
- Um save de fim de jogo, carregado, toca de novo o final e os créditos, porque o autosave
  não grava cutscenes vistas ([0076](0076-final-em-duas-cutscenes-e-creditos.md)). É o
  comportamento esperado: o jogo retoma "onde parou", e parou antes do final.
- Uma quest nova na história precisa de uma entrada em `storyStops`. O teste
  `test/content/story-stops.test.ts` falha se faltar a entrada ou se a cena não for de um
  prédio com porta no campus.
- O rascunho do código não concluído, também previsto na 0072, continua sem
  implementação. Até ele existir, carregar recupera o código só até a última quest
  concluída, e o novo jogo não tem rascunho para apagar.

## Alternativas descartadas

- **Na porta do prédio da próxima quest, do lado de fora, no campus:** faz o jogador
  passar pelo campus antes de entrar, mas acrescenta um passo a cada carregamento num jogo
  de 20 minutos ([0064](0064-jogo-de-ate-20-minutos.md)).
- **Sempre no campus, entre os portões:** é o mais simples, mas faz o jogador atravessar o
  campus de novo para chegar ao mesmo lugar, e a HUD sozinha não compensa.
- **Guardar a posição no save:** mudaria a 0072 por um ganho pequeno. Com o autosave só na
  conclusão, a posição salva seria a da quest que acabou, que é justamente o lugar de onde o
  jogador quer sair.
