# 0030 — Qualquer linguagem em qualquer quest, com replay livre

- Status: aceita
- Data: 2026-09-23

## Contexto

Multi-linguagem é um dos dois diferenciais do jogo
([ADR 0003](0003-multi-linguagem-custo-por-adapter.md)), mas faltava dizer como ela aparece
para quem joga: a linguagem é escolhida uma vez, no começo da partida, ou por desafio? E
uma quest já concluída fica trancada?

## Decisão

- **Toda quest pode ser resolvida em qualquer linguagem que o jogo suportar.** Não existe
  quest amarrada a uma linguagem, nem escolha única no começo da partida.
- **O jogador pode reabrir uma quest concluída e resolvê-la de novo em outra linguagem.**
- **A conclusão é única.** Rejogar não desconclui a quest e **não reaplica os efeitos**: o
  mundo muda na primeira vez que o jogador passa nos testes, e replay é prática.
- **O save guarda o código por quest e por linguagem**, e não um código por quest.

A única exceção conhecida é a quest que declara `customTests: true`
([ADR 0007](0007-valvula-de-escape-custom-tests.md)): ela só oferece as linguagens para as
quais os testes foram escritos à mão. É mais um motivo para isso continuar sendo exceção.

## Consequências

- **Os efeitos são aplicados só na primeira conclusão.** A engine precisa distinguir
  "concluiu agora" de "já estava concluída", e isso é estado dela, não da quest.
- O save cresce com quests × linguagens, mas é texto-fonte: pequeno perto do resto.
- Ao trocar de linguagem dentro de uma quest, o editor carrega o código salvo daquela
  linguagem, ou o stub gerado, se ainda não houver nenhum.
- **Todo adapter precisa funcionar em toda quest.** Isso é a
  [ADR 0003](0003-multi-linguagem-custo-por-adapter.md) virando requisito de gameplay, e
  aumenta o peso da suite de conformance: um adapter que passa nela tem que servir para o
  catálogo inteiro.
- Resolver a mesma quest em três linguagens vira algo que o jogo pode reconhecer. Se isso
  rende recompensa, conquista ou nada, não está decidido.
- Responde parte da questão do save: o código por quest e por linguagem entra.

## Alternativas descartadas

- **Uma linguagem escolhida uma vez para a partida inteira:** simplifica save e interface,
  e elimina justamente o que torna o jogo diferente — comparar como o mesmo algoritmo se
  escreve em linguagens distintas.
- **Quest trancada depois de concluída:** protege a progressão de confusão, ao custo de
  proibir exatamente a prática que o jogo quer estimular.
