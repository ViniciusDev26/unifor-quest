# História

O enredo, os personagens e as quests do jogo. O jogo inteiro cabe em **até 20 minutos**, do
menu ao final ([ADR 0064](decisions/0064-jogo-de-ate-20-minutos.md)). A mecânica que sustenta
a história está em [vision.md](vision.md).

## Premissa

É o primeiro dia de aula de um calouro de Computação na UNIFOR. Ainda de manhã, um vírus
que assina como **NULL** toma o sistema do campus: as telas apagam, as portas travam e os
serviços param. O calouro sabe programar, então passa a manhã consertando o campus lugar
por lugar, até chegar ao esconderijo do NULL e derrotá-lo. Enquanto o NULL está no
sistema, o campus fica com um filtro verde de interferência e uma música tensa.

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
antes de o editor abrir, e a fala de quem pede o desafio volta no painel do editor. A fala
de sucesso toca no cenário quando o jogador fecha o editor, depois que o mundo muda
([ADR 0089](decisions/0089-dialogo-de-conclusao-na-cena.md)). Ela conta o que se descobriu
e aponta o próximo lugar. Falar de novo com o NPC depois traz a fala "depois". O texto de cada fala é o mesmo das quests em
`apps/game/src/renderer/src/content/`.

### 1. Portaria

*O calouro e Davi entram na portaria. As telas da parede apagam e mostram `NULL` em verde.
Davi corre até o painel de placas e o reinicia; as placas ficam ilegíveis.*

**Ao falar com o Marcos**

> **Davi:** Eu só reiniciei o painel! Juro! Aí apareceu esse NULL e as placas viraram sopa
> de letrinha.
>
> **Marcos:** Calma, Davi. Não foi só aqui: o rádio diz que as telas do campus inteiro
> apagaram, todas com esse tal de NULL.
>
> **Marcos:** Ninguém entra no campus com as placas assim. Parece cifra de César: cada letra
> andou um número fixo de posições.
>
> **Marcos:** Você é de Computação, não é? Decifra pra mim que eu libero a entrada.
>
> **Marcos:** Escreve uma função que recebe o texto da placa e o deslocamento e devolve o
> nome original. O que ela devolver eu mando direto pro painel.

**Se tentar sair antes de resolver**

> **Marcos:** Ainda não. Resolve a cifra das placas primeiro.

**Ao resolver**

*A câmera vai até o painel de placas, legível de novo.*

> **Marcos:** Olha só: Biblioteca, Centro Esportivo, Auditório Central... Todas as placas
> legíveis de novo. Você decifrou a cifra!
>
> **Davi:** Viu? Eu ajudei. Indiretamente.
>
> **Marcos:** Ajudou a embaralhar, isso sim. Mas o problema é maior: esse NULL não apagou só
> a portaria. O rádio não para, o campus inteiro está travando.
>
> **Marcos:** A Dona Célia ligou da Biblioteca agora há pouco, desesperada: o acervo dela
> virou bagunça. Começa por lá.
>
> **Marcos:** Leva o minimapa, que ele mostra pra onde ir. E a entrada está liberada: pode
> passar.
>
> **Davi:** Eu fico aqui vigiando o painel, pra ele não reiniciar sozinho. Vai na frente!

**Depois**

> **Marcos:** As placas estão em ordem, graças a você. Se quiser decifrar de novo em outra
> linguagem, o painel está aí.

### 2. Biblioteca

*Estantes no chão, livros espalhados. Dona Célia está no balcão; o terminal ao lado dela
mostra `NULL`.*

**Ao falar com Dona Célia**

> **Dona Célia:** O acervo é uma árvore: cada código vai pra esquerda se for menor, pra
> direita se for maior. Ou era, até hoje cedo.
>
> **NULL:** // boa sorte, calouro. trinta mil livros e nenhuma arvore de pe.
>
> **Dona Célia:** Escreve uma função que monta a árvore de novo, na ordem em que os códigos
> chegaram, e devolve o caminho da raiz até o código do livro.
>
> **Dona Célia:** Com a árvore certa, as estantes voltam pro lugar, e o caminho que você
> devolver acende no chão até o livro. Se ele não estiver lá, devolve o caminho vazio.

**Ao resolver**

*As estantes se levantam na forma da árvore, e o caminho até o livro acende no chão.*

> **Dona Célia:** Achou! As estantes de pé de novo, cada código no seu galho. Trinta anos
> catalogando e eu nunca tinha visto o acervo tão bem organizado.
>
> **Dona Célia:** Mas olha o registro do terminal: no fim desse caminho tem um acesso
> estranho. O NULL entrou aqui vindo do Centro de Convivência.
>
> **NULL:** // arvore de pe. e dai? o ru continua travado. ninguem almoca hoje.
>
> **Dona Célia:** Ouviu isso? Vai até o Centro de Convivência e procura o Seu Raimundo. Se o
> NULL passou por lá, ele sabe de alguma coisa.

**Depois**

> **Dona Célia:** Cada livro no seu lugar, graças a você. Quer remontar a árvore em outra
> linguagem? O catálogo está aberto.

### 3. Centro de Convivência

**Se tentar entrar antes de resolver a Biblioteca**

> **Porta:** Travada. A tela ao lado só mostra NULL em verde. Melhor passar na Biblioteca
> primeiro.

*A catraca do RU mostra erro e a fila virou bagunça. Seu Raimundo está atrás do balcão.*

**Ao falar com Seu Raimundo**

> **Seu Raimundo:** O sistema do RU travou e essa fila não anda. Cada vez que alguém é
> atendido, eu perco a conta.
>
> **Seu Raimundo:** Me diz quem está na frente depois que um tanto de gente já foi
> atendida, sem eu ter que recontar.
>
> **Seu Raimundo:** Faz uma função que recebe a fila e quantos já foram atendidos e devolve
> quem é o próximo. Se não sobrou ninguém, devolve nulo.
>
> **Seu Raimundo:** Com essa resposta, a catraca volta a chamar um por um e o povo se alinha
> sozinho.

**Ao resolver**

*Os estudantes se alinham na frente da catraca, que fica verde.*

> **Seu Raimundo:** Agora sim, a fila anda! Catraca verde, todo mundo almoçando. Você salvou
> o feijão de hoje.
>
> **Seu Raimundo:** Sabe o que me contaram? As luzes do Bloco de Tecnologia nunca apagam, nem
> de madrugada. E hoje cedo, antes de tudo travar, as telas de lá piscaram verde.
>
> **NULL:** // a fila andou. eu continuo aqui. bloco de tecnologia. venha, se for capaz.
>
> **Seu Raimundo:** Viu? Dizem que é fantasma. Eu acho que é coisa de computador. Se for lá,
> toma cuidado.

**Depois**

> **Seu Raimundo:** A fila está andando direitinho, obrigado! Agora vai pro Bloco de
> Tecnologia e acaba com esse NULL. Depois, o almoço é por minha conta.

### 4. Bloco de Tecnologia

**Se tentar entrar antes de reabrir o Centro de Convivência**

> **Porta:** Travada. A tela ao lado só mostra NULL, mas lá dentro as luzes continuam acesas.

*Sala escura, só racks piscando. No centro, o NULL se monta a partir de texto verde.*

**Ao entrar**

> **NULL:** // entao chegou ate aqui. cada predio que voce consertou, eu senti.
>
> **NULL:** // me diz a menor distancia da portaria ate mim, pela rede. eu ja sei a
> resposta — a questao e se voce chega nela gastando menos que a minha forca bruta.
>
> **NULL:** // cada vizinho que voce consulta e uma operacao. gaste menos que as minhas cem e
> eu perco o controle da rede. gaste mais, e o campus continua meu.

**Se acertar, mas gastar mais que ele**

> **NULL:** // correto. e lento. minha forca bruta ainda e mais rapida.

**Ao resolver**

*A barra do NULL esvazia. Fechado o editor, ele fala pela última vez:*

> **NULL:** // ...impossivel. voce nao testou todos os caminhos. e mesmo assim chegou
> primeiro.
>
> **NULL:** // sempre o no mais proximo primeiro... nenhuma forca bruta vence isso.
>
> **NULL:** // as telas... eram minhas...

*O NULL se desfaz em blocos verdes. As telas do campus voltam. O verde que cobria o campus
some, e a música volta a ser a da cidade. Davi sai do Bloco de Tecnologia:*

> **Davi:** Ué, as telas voltaram! Perdi alguma coisa?
>
> **Davi:** Peraí, deixa eu adivinhar: você consertou o campus inteiro com código enquanto
> eu vigiava o painel.
>
> **Davi:** O Marcos disse que o rádio voltou, a Dona Célia achou o livro e o RU está
> servindo. E o NULL?
>
> **Davi:** Sumiu? Então bora pra aula, calouro. É só o primeiro dia!

As falas do NULL são escritas como comentário de código, em minúsculas e sem acento: é a voz
de um programa.

## Ritmo

- Cada quest leva uns 4 a 5 minutos, contando andar, conversar, escrever e rodar. Abertura
  e final somam uns 2 minutos.
- Cada conversa tem poucas falas, no máximo seis. Não há cutscene longa.
- Não há game over: errar o código é só rodar de novo
  ([ADR 0030](decisions/0030-qualquer-linguagem-e-replay-livre.md) garante o replay em
  qualquer linguagem).
