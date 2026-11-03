# 0070 — Campus com e sem o NULL

- Status: aceita
- Data: 2026-11-03

## Contexto

A história começa com o NULL tomando o sistema do campus e termina com o campus voltando ao
normal ([story.md](../story.md)). O jogador precisa perceber a diferença ao andar pelo
campus. Ficou em aberto se isso seria só falas e música ou também troca de tiles por flag, e
como uma troca de tiles entraria nos mapas gerados da [0058](0058-mapas-gerados-sem-autotile.md)
([open-questions §6](../open-questions.md)).

## Decisão

- **Muda o clima da cena, não o mapa.** O `.tmj` do campus continua um só, e a geração da
  [0058](0058-mapas-gerados-sem-autotile.md) não muda.
- **Quem decide é a flag `campus-restaurado`**, que a quest do confronto já marca. É estado
  do mundo ([0034](0034-vocabulario-de-effect-e-prerequisitos.md)); a cena do campus lê a
  flag ao ser criada e desenha o estado certo ([0027](0027-arquitetura-em-aneis.md)).
- **Com o NULL** (sem a flag):
  - música `bittersweet_story` no campus;
  - um filtro verde leve sobre a tela, com uma interferência de vez em quando (os sons
    `glitch` do acervo).
- **Sem o NULL** (com a flag): sem filtro, e a música volta a ser `town`.
- **Só o campus muda.** Os interiores mantêm a música e a aparência de cada um; o que o
  NULL fez dentro de cada prédio é contado pela quest daquele lugar.

## Consequências

- Uma regra por cena, sem mapa duplicado para manter em sincronia.
- A virada acontece quando o jogador volta ao campus depois do confronto, que é onde a
  cutscene final ([0066](0066-cutscene-e-dado.md)) o deixa.
- Telas que voltam a funcionar dentro dos prédios e outros detalhes por lugar ficam para o
  card "Consequências visuais das quests".
- A implementação entra no card "Final do jogo", que é onde o campus volta ao normal.

## Alternativas descartadas

- **Trocar tiles por flag:** exigiria uma variante de cada mapa na geração, ou camadas
  ligadas por flag, e o jogador perceberia a mudança tanto quanto com um filtro.
- **Só falas:** quem não conversa com ninguém depois do confronto não perceberia nada.
- **Clima também nos interiores:** multiplica o trabalho por quatro lugares para um efeito
  que o campus já entrega.
