# Playtest cronometrado

O objetivo é conferir se o jogo inteiro cabe em **até 20 minutos**, do menu de título ao
final, para quem nunca viu o jogo ([ADR 0064](decisions/0064-jogo-de-ate-20-minutos.md),
card #39).

## Resumo

| Parte | Tempo | Como foi obtido |
| --- | --- | --- |
| Tudo o que o jogo faz sozinho: cutscenes, transições, execução e créditos | **1 min 40 s** | Medido no Electron real |
| Ler falas e enunciados | 2 a 4 min | Estimado pela contagem de palavras |
| Andar pelo campus e pelos prédios na primeira vez | 1 a 2 min | Estimado a partir do trajeto medido |
| Escrever, rodar e corrigir as quatro soluções | 13 a 23 min | Estimado pelo tamanho das soluções de referência |
| **Total** | **cerca de 18 a 30 min** | |

**Conclusão:** a parte que o jogo controla é curta. Cutscenes, telas e execuções somam menos
de 2 minutos, e nada nelas ameaça o limite. O que decide se o jogo cabe em 20 minutos é o
tempo de escrever as soluções, sobretudo a árvore da Biblioteca e o Dijkstra do confronto.
Para quem já conhece os quatro assuntos, a estimativa fica perto de 20 minutos. Para quem
precisa pensar em cada solução, passa. Só uma sessão com jogadores de verdade fecha a
pergunta (ver [o que falta](#o-que-falta)).

## Como foi medido

- **Build:** `main` em `8f02c27`, depois do #74, rodando no Electron real (`npm run build`),
  sem save, a partir de "Iniciar novo jogo".
- **Quem jogou:** a partida foi conduzida por automação pelo protocolo de depuração do
  Chromium (CDP), com teclas de verdade enviadas à janela. Cada etapa gravou um timestamp.
- **Andar:** os trajetos foram feitos com as setas, pelo caminho mais curto, como um
  jogador que já sabe para onde ir.
- **Conversas:** cada fala foi avançada com E a cada 0,6 s, ou seja, sem tempo de leitura.
  A leitura entra separada, na estimativa.
- **Código:** as soluções de referência em TypeScript (`referenceSolutions` de cada quest)
  foram coladas no editor e executadas pelo botão Executar. Essa parte mede só a execução;
  o tempo de pensar e digitar entra na estimativa.
- **Máquina:** Linux, 32 núcleos, com o cache do toolchain morno.

## O que foi medido

| Momento | Tempo desde "Iniciar novo jogo" | Duração da etapa |
| --- | --- | --- |
| Abertura na portaria (Davi, telas com NULL, painel reiniciado) | 0,6 → 7,3 s | 6,7 s |
| Conversa com o Marcos até o editor abrir (4 falas) | 10,4 s | 3,1 s |
| Executar a quest 1 (5/5 testes) | 11,9 s | 0,3 s |
| Sair da portaria até o campus | 15,1 s | 3,1 s |
| Campus até a Biblioteca | 17,7 s | 2,6 s |
| Andar até a Dona Célia e conversar (4 falas) | 23,4 s | 5,7 s |
| Executar a quest 2 (6/6) e ver as estantes e o caminho | 27,3 s | 3,9 s |
| Biblioteca até o campus | 31,7 s | 4,4 s |
| Campus até o Centro de Convivência | 34,9 s | 3,2 s |
| Andar até o Seu Raimundo e conversar (3 falas) | 40,0 s | 5,1 s |
| Executar a quest 3 (5/5) e ver a fila e a catraca | 44,0 s | 4,0 s |
| Centro de Convivência até o campus | 49,1 s | 5,1 s |
| Campus até o Bloco de Tecnologia | 52,4 s | 3,3 s |
| Andar até o terminal e ouvir o NULL (3 falas) | 56,1 s | 3,7 s |
| Executar a quest 4 (4/4, 19 operações contra 100 do NULL) | 57,6 s | 0,4 s |
| Final: o NULL se desfaz, campus restaurado, Davi fala | 65,1 s | 7,5 s |
| Créditos até voltar ao menu | cerca de 98 s | cerca de 33 s |

- **Execução:** cada Executar levou de 0,3 a 0,4 s, em TypeScript. Na conformance local, as
  outras linguagens rodam os oito cenários entre 2 e 6 s, menos de 1 s por execução com
  cache morno. A primeira compilação de Go com cache frio pode passar de 20 s no Windows
  ([ADR 0022](decisions/0022-go-versao-cache-e-cgo.md)), mas isso acontece uma vez e o
  instalador deve levar o cache semeado.
- **Créditos:** a medição foi repetida carregando o save do fim de jogo, que toca o final
  de novo. Os créditos rolam por uns 29 s, ficam 2,5 s parados e escurecem. Enter, Esc ou
  um clique pulam direto para o menu.

## O que foi estimado

### Leitura

| Texto | Palavras |
| --- | --- |
| Falas (NPCs, NULL, Davi, portas trancadas) | cerca de 315 |
| Enunciados (o "?" de cada desafio) | 246 |
| Dicas, se o jogador ler todas | 296 |

A 200 palavras por minuto, falas e enunciados levam cerca de 3 min; com todas as dicas,
cerca de 4 min. Quem lê só as falas gasta perto de 1 min 30 s.

### Andar

Os trajetos medidos somam uns 20 s de caminhada pelo caminho mais curto. Na primeira vez, o
jogador explora, procura a porta e lê as placas. Uma estimativa de três a cinco vezes o
trajeto ótimo dá de 1 a 2 min.

### Código

O tempo de pensar, digitar e corrigir cada solução é o que mais pesa. Os números abaixo
supõem alguém que conhece o assunto da quest e escreve em TypeScript; cada Executar custa
menos de 1 s, então errar e rodar de novo pesa pouco.

| Quest | Assunto | Solução de referência | Estimativa |
| --- | --- | --- | --- |
| Placas embaralhadas | strings e aritmética modular | 14 linhas | 3 a 5 min |
| A árvore do acervo | árvore binária de busca | 28 linhas | 4 a 7 min |
| Fila do Centro de Convivência | fila | 7 linhas | 1 a 2 min |
| O confronto | grafos e Dijkstra, dentro do orçamento | 26 linhas | 5 a 9 min |
| **Total** | | | **13 a 23 min** |

A própria [história](story.md) previa de 4 a 5 minutos por quest, mais 2 minutos de
abertura e final, o que já dá de 18 a 22 minutos. Os números deste playtest ficam na mesma
faixa.

## O que falta

Este playtest mede tudo o que o jogo faz e estima o que depende do jogador. Ele **não
substitui** uma sessão com quem nunca viu o jogo, que é o critério da ADR 0064. Para fechar
a pergunta:

1. Duas ou três pessoas jogam do menu aos créditos, sem ajuda, cada uma na linguagem que
   preferir.
2. Cronometrar cada quest do momento em que o editor abre até a conclusão, além do tempo
   total.
3. Anotar onde a pessoa travou: no enunciado, no código ou em achar o próximo prédio.

Se a árvore ou o Dijkstra passarem muito dos 5 minutos, o caminho é revisar o desafio ou o
quanto o stub já entrega. Isso está registrado em
[open-questions.md](open-questions.md), item 7.

## Observações da partida

- Na quest 2, as estantes se levantam e o caminho acende em cerca de 2,5 s depois de fechar
  o editor. Na quest 3, a fila se alinha e a catraca fica verde no mesmo intervalo.
- O final, do fechamento do editor do confronto à fala do Davi, leva 7,5 s.
