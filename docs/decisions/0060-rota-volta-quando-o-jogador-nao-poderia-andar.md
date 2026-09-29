# 0060 — A rota volta, quando o jogador não poderia andar por ela

- Status: aceita
- Data: 2026-09-29
- Emenda a [0029](0029-fase-a-mecanica-antes-do-conteudo.md) e retoma o exemplo da
  [0013](0013-codigo-com-consequencia-no-mundo.md)

## Contexto

A 0029 tirou o personagem percorrendo a rota do Dijkstra: andar por um trajeto que o
jogador já podia percorrer a pé é cutscene, não consequência. A 0013 manteve o princípio
("o `onSuccess` recebe o retorno real") mas ficou sem o exemplo.

A [história](../story.md) traz de volta a mesma cena, "A corrida até o Centro de Dados",
num contexto diferente: no Ato 3 o campus está tomado pelo NULL, e os prédios infectados
(revelados pela quest de BFS, "Mapa da infecção") fecham a passagem.

Não dá para a consequência ser a **distância**: os testes já exigem o caminho mínimo, então
toda solução que passa devolve uma rota ótima. O que varia entre soluções corretas é o `ops`
([0011](0011-metricas-por-contagem-de-operacoes.md)), e esse é o terreno do duelo de
operações, não da rota.

## Decisão

O personagem **percorre a rota retornada** pelo código do jogador **quando ela atravessa
uma área que o jogador não consegue percorrer por conta própria** — zona bloqueada,
corrompida ou fechada no estado atual do mundo. Nesse caso a rota do jogador é a única
passagem, e não um atalho animado para um lugar que dava para alcançar a pé.

A objeção da 0029 continua valendo para todo o resto: rota animada por um campus livre
não entra.

## Consequências

- O exemplo do `CLAUDE.md` e da 0012 (grafo alimentando a rota animada) volta a valer,
  restrito a esse caso.
- O vocabulário de `Effect` ([0034](0034-vocabulario-de-effect-e-prerequisitos.md)) vai
  precisar de um efeito que consuma o retorno do desafio em vez de carregar dado fixo.
  A forma dele se decide quando a quest for implementada, não aqui.
- O mapa precisa de áreas intransitáveis dependentes de flag, o que se liga ao campus com
  dois estados (corrompido/restaurado) — ver [open-questions.md](../open-questions.md).
- Quem desenha uma quest de rota tem que responder "por onde o jogador não passaria sem
  isso?" antes de usar o efeito.

## Alternativas descartadas

- **Manter a 0029 sem exceção:** a cena mais forte da história vira "o Centro de Dados
  abriu", e o Dijkstra do jogador não toca no mundo.
- **Rota animada sempre, como no briefing:** é exatamente a cutscene que a 0029 recusou.
- **A distância decidir se o jogador chega antes do NULL:** os testes já forçam o caminho
  mínimo, então a distância não varia entre soluções aprovadas.
