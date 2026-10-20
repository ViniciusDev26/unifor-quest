# História

O enredo, os personagens e as quests do jogo. O jogo inteiro cabe em **até 20 minutos**, do
menu ao final ([ADR 0064](decisions/0064-jogo-de-ate-20-minutos.md)). A mecânica que sustenta
a história está em [vision.md](vision.md).

## Premissa

É o primeiro dia de aula de um calouro de Computação na UNIFOR. Ainda de manhã, um vírus
que assina como **NULL** toma o sistema do campus: as telas apagam, as portas travam e os
serviços param. O calouro sabe programar, então passa a manhã consertando o campus lugar
por lugar, até chegar ao esconderijo do NULL e derrotá-lo.

O tom é leve: um campus universitário brasileiro comum, com RU lotado e Wi-Fi ruim, atacado
por um vilão que provoca o jogador pela tela.

## A jornada

**1. Portaria.** O calouro chega junto com Davi, um colega de turma falante. Toda tela da
entrada apaga e um texto verde pulsa: `NULL`. Davi tenta "dar um jeito" e só piora as
coisas. Marcos, o segurança, não deixa ninguém passar enquanto o sistema não voltar. O
calouro abre o editor, resolve o primeiro desafio e a portaria libera a entrada no campus
([ADR 0061](decisions/0061-jogo-comeca-na-portaria.md)).

**2. Biblioteca.** O acervo de Dona Célia é organizado como uma árvore: cada código vai
para a esquerda se for menor, para a direita se for maior. O NULL derrubou a árvore, e ela
não encontra mais nada. Num dos terminais aparece a primeira mensagem dele, direto para o
jogador, debochando. O calouro reconstrói a árvore com código e acha o livro, e no fim do
caminho fica um rastro do NULL que aponta para o Centro de Convivência.

**3. Centro de Convivência.** O RU travou e a fila virou caos. Seu Raimundo reclama e,
entre uma bronca e outra, conta o boato do campus: as luzes do Bloco de Tecnologia nunca
apagam, nem de madrugada. Quando o calouro reabre o RU, o rastro fica completo: o NULL
está lá.

**4. Bloco de Tecnologia.** O lugar está vazio, só com o zumbido das máquinas. O NULL
aparece em texto glitchado e desafia o calouro. O duelo final é de código: o jogador vence
quando a solução dele é mais eficiente que a força bruta do NULL. O NULL cai, as telas do
campus voltam e Davi aparece na porta perguntando se perdeu alguma coisa.

## Personagens

- **O calouro:** o jogador. A história dele é contada pelo código que escreve.
- **Davi:** colega de turma e o alívio cômico. Abre e fecha o jogo.
- **Marcos:** segurança da portaria e o primeiro NPC do jogo, dentro de um cenário próprio
  ([ADR 0059](decisions/0059-npc-oferece-a-quest-mais-adiantada.md)).
- **Dona Célia:** a bibliotecária. Presencia a primeira mensagem do NULL.
- **Seu Raimundo:** do Centro de Convivência (o RU, como é chamado na UNIFOR). Conta o boato
  que leva ao Bloco de Tecnologia.
- **NULL:** o vírus. Não tem rosto, fala em texto glitchado e provoca o jogador a cada
  lugar.

## Quests

Uma quest por lugar, quatro no total. Cada uma está num arquivo de
`apps/game/src/renderer/src/content/`, e a ordem da história está em `story.ts`.

| # | Lugar | NPC | Quest | Conceito | Consequência no mundo |
| --- | --- | --- | --- | --- | --- |
| 1 | Portaria | Marcos | Placas embaralhadas (cifra de César) | Strings e aritmética modular | A portaria libera a saída para o campus; minimapa liberado |
| 2 | Biblioteca | Dona Célia | A árvore do acervo | Árvore binária de busca | O livro é encontrado; o rastro aponta para o Centro de Convivência |
| 3 | Centro de Convivência | Seu Raimundo | Fila do Centro de Convivência | Fila | O RU reabre; o Bloco de Tecnologia é revelado |
| 4 | Bloco de Tecnologia | NULL | O confronto (duelo de operações) | Grafos, Dijkstra e eficiência | NULL derrotado; o campus volta ao normal |

Estado: as quatro quests existem como dado. Só a da portaria está ligada a uma cena de
verdade, com o Marcos ([ADR 0059](decisions/0059-npc-oferece-a-quest-mais-adiantada.md),
[ADR 0061](decisions/0061-jogo-comeca-na-portaria.md)). As outras três esperam o NPC em cena
na Biblioteca e os interiores do Centro de Convivência e do Bloco de Tecnologia.

## Diálogos

O roteiro do jogo, na ordem em que o jogador vê. Cada conversa aparece na caixa de diálogo
antes de o editor abrir; a fala de quem pede o desafio volta no painel do editor, e a fala
de sucesso aparece quando os testes passam. O texto de cada fala é o mesmo das quests em
`apps/game/src/renderer/src/content/`.

### 1. Portaria

*O calouro e Davi entram na portaria. As telas da parede apagam e mostram `NULL` em verde.
Davi corre até o painel de placas e o reinicia; as placas ficam ilegíveis.*

**Ao falar com o Marcos**

> **Davi:** Eu só reiniciei o painel! Juro! Aí apareceu esse NULL e as placas viraram sopa
> de letrinha.
>
> **Marcos:** Ninguém entra no campus com as placas assim. Parece cifra de César: cada letra
> andou um número fixo de posições.
>
> **Marcos:** Você é de Computação, não é? Decifra pra mim que eu libero a entrada.

**Se tentar sair antes de resolver**

> **Marcos:** Ainda não. Resolve a cifra das placas primeiro.

**Ao resolver**

> **Marcos:** Voltou tudo ao normal. Pode passar — e leva o minimapa.
>
> **Davi:** Viu? Eu ajudei. Indiretamente.

### 2. Biblioteca

*Estantes no chão, livros espalhados. Dona Célia está no balcão; o terminal ao lado dela
mostra `NULL`.*

**Ao falar com Dona Célia**

> **Dona Célia:** O acervo é uma árvore: cada código vai pra esquerda se for menor, pra
> direita se for maior. Ou era, até hoje cedo.
>
> **NULL:** // boa sorte, calouro. trinta mil livros e nenhuma arvore de pe.
>
> **Dona Célia:** Monta a árvore de novo, na ordem em que os códigos chegaram, e me diz o
> caminho até o livro. Se ele não estiver lá, caminho vazio.

**Ao resolver**

*As estantes se levantam na forma da árvore, e o caminho até o livro acende no chão.*

> **Dona Célia:** Achou. E olha: no fim desse caminho tem um acesso estranho, vindo do
> Centro de Convivência.

### 3. Centro de Convivência

*A catraca do RU mostra erro e a fila virou bagunça. Seu Raimundo está atrás do balcão.*

**Ao falar com Seu Raimundo**

> **Seu Raimundo:** O sistema do RU travou e essa fila não anda. Cada vez que alguém é
> atendido, eu perco a conta.
>
> **Seu Raimundo:** Me diz quem está na frente depois que um tanto de gente já foi
> atendida, sem eu ter que recontar.

**Ao resolver**

*Os estudantes se alinham na frente da catraca, que fica verde.*

> **Seu Raimundo:** Agora sim, a fila anda! Sabe o que me contaram? As luzes do Bloco de
> Tecnologia nunca apagam, nem de madrugada.
>
> **Seu Raimundo:** Dizem que é fantasma. Eu acho que é coisa de computador.

### 4. Bloco de Tecnologia

*Sala escura, só racks piscando. No centro, o NULL se monta a partir de texto verde.*

**Ao entrar**

> **NULL:** // entao chegou ate aqui. cada predio que voce consertou, eu senti.
>
> **NULL:** // me diz a menor distancia da portaria ate mim, pela rede. eu ja sei a
> resposta — a questao e se voce chega nela gastando menos que a minha forca bruta.

**Ao resolver**

*A barra do NULL esvazia e ele se desfaz em blocos verdes. As telas do campus voltam.*

> **NULL:** // ...impossivel. nenhuma forca bruta vence isso.
>
> **Davi:** Ué, as telas voltaram! Perdi alguma coisa?

As falas do NULL são escritas como comentário de código, em minúsculas e sem acento: é a voz
de um programa.

## Ritmo

- Cada quest leva uns 4 a 5 minutos, contando andar, conversar, escrever e rodar. Abertura
  e final somam uns 2 minutos.
- Cada conversa tem poucas falas. Não há cutscene longa.
- Não há game over: errar o código é só rodar de novo
  ([ADR 0030](decisions/0030-qualquer-linguagem-e-replay-livre.md) garante o replay em
  qualquer linguagem).
