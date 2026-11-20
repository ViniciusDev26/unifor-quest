# 0088 — Os personagens da história têm sprites próprios, gerados por IA na grade do jogador

- Status: aceita
- Data: 2026-11-20
- Resolve o card #29; usa o processo da
  [0079](0079-predios-do-campus-gerados-por-modelo-de-imagem.md)

## Contexto

Marcos, Davi, Dona Célia e Seu Raimundo usavam personagens genéricos do pacote de assets:
o Davi era um rapaz de chapéu de palha, o Marcos e o Seu Raimundo eram o mesmo rapaz, e a
Dona Célia era uma moça de cabelo roxo. O GDD (§3) descreve cada um. O NULL não entra: o
GDD o faz sem rosto, só texto glitchado nas telas, e isso já está desenhado.

Uma folha de personagem tem 16 quadros (quatro direções, quatro passos), que precisam ser
coerentes entre si e com o jogador, que foi desenhado à mão.

## Decisão

**Cada personagem é gerado numa imagem só, com a folha inteira, e um script determinístico
o leva à grade do jogador.** O script é `scripts/character-sprites.py`.

- **Geração:** um prompt por personagem, a partir da descrição do GDD, com
  `characters/player.png` anexado como referência de layout, proporções e estilo. A folha
  4×4 sai de uma vez, e por isso os 16 quadros saem coerentes entre si. A saída bruta fica
  commitada em `assets/characters/raw/`.
- **Correção:** o que a geração errou num personagem (os óculos e os fones no pescoço do
  Davi, o distintivo do Marcos, os óculos da Dona Célia) é corrigido por edição de imagem
  sobre a folha bruta, com o Qwen-Image-Edit do estúdio (ComfyUI local). O comando `edit`
  guarda o prompt e a semente de cada personagem, e o resultado fica ao lado da bruta, como
  `raw/<nome>-edited.png`, que o `process` prefere. A edição pode quebrar a folha (uma linha
  virar de frente); por isso cada uma é conferida antes de ficar, e a semente é a que
  passou.
- **Processamento:**
  - O fundo magenta sai, junto com a mistura do contorno escuro com o magenta, que deixava
    halos rosados.
  - Cada figura é achada pela silhueta (as 16 maiores manchas opacas, agrupadas em quatro
    linhas e quatro colunas), porque o modelo não respeita uma grade exata: um chapéu cruzava
    a linha entre duas fileiras.
  - Uma escala vale para a folha inteira, levando o personagem à altura do jogador (29
    pixels de arte).
  - A redução pega a cor mais frequente de cada bloco, com mais peso para as cores que se
    destacam da média do bloco, numa paleta única para a folha. A média borrava os
    contornos e os rostos; a maioria simples apagava óculos, bigode e olhos, que ocupam
    parte de um bloco.
  - A cabeça é a mesma nos quatro quadros de uma linha, na altura de cada quadro: o modelo
    redesenha o rosto a cada quadro, e o rosto piscava ao andar.
  - Um detalhe pequeno de cor pode ser fixado por personagem e por linha (`ACCENTS`): o
    distintivo do Marcos é dourado de frente e some de lado e de costas, onde virava uma
    mancha que mudava de quadro a quadro. A cor fixada entra na paleta como está.
  - Cada quadro é centralizado, com os pés na mesma linha do jogador, em pixels de arte de
    4 px. O resultado é uma folha 512×512 na mesma convenção de `player.png`.
- **No jogo:** `assets/characters/<nome>.png` é copiado para `public/characters/`, e as cenas
  apontam para lá:
  - o Marcos na portaria, de pé na ponta esquerda da guarita, à vista de quem fala com ele
    (atrás dela, os monitores o escondiam e a câmera 2× não chegava lá);
  - o Davi na abertura e no epílogo;
  - a Dona Célia na Biblioteca;
  - o Seu Raimundo no Centro de Convivência.

  Os estudantes de fundo continuam com os personagens do pacote.
- **Revisão:** como ninguém revisa a arte antes do merge, um agente separado avaliou as
  folhas contra a referência, quadro a quadro: direção de cada linha, ciclo de caminhada,
  tamanho, contorno, pixels soltos e leitura no tamanho do jogo. Ele barrou duas versões
  (o Davi parecia de máscara e cachecol; o distintivo do Marcos piscava), corrigidas antes
  do merge. As folhas também foram conferidas no jogo, nas três cenas.

## Consequências

- Os quatro personagens da história são reconhecíveis e combinam com o jogador.
- Refazer um personagem é mudar o prompt, rodar `generate` (ou `edit`) e `process` e
  conferir. Ajustar o processamento não exige gerar de novo.
- `edit` depende do estúdio na rede local (`ESTUDIO_URL`); `generate`, da chave do
  OpenRouter. `process` roda em qualquer máquina, a partir do que está commitado.
- A leitura dos detalhes no tamanho do jogo tem limite: cerca de 18×28 pixels de arte.
  Óculos e distintivo ficam com dois ou três pixels, e a saia da Dona Célia, de lado, ainda
  se abre nas pernas ao andar.

## Alternativas descartadas

- **Gerar um quadro por vez:** cada quadro sairia um pouco diferente, e a caminhada
  tremeria.
- **Trocar a cor de personagens do pacote:** mais barato, mas não chega à descrição do GDD
  (farda, avental, coque).
- **Desenhar à mão:** a melhor qualidade possível, mas fora do alcance do projeto agora.
