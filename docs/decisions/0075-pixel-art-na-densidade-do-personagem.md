# 0075 — Interior em pixel art na densidade do personagem, com zoom inteiro

- Status: aceita
- Data: 2026-11-17

## Contexto

A Biblioteca (Quest 2) era uma sala de 24×16 tiles com retângulos coloridos no lugar dos
móveis ([ADR 0058](0058-mapas-gerados-sem-autotile.md)), e o Centro de Convivência e o Bloco
de Tecnologia ainda não tinham interior. Um primeiro rascunho desses dois interiores, com
arte em camadas, tinha duas escolhas que deixam a imagem "borrada":

- **Densidade de pixel misturada.** Os personagens são pixel art de 32px
  (`characters/*.png` é um upscale 4× desenhado com `PLAYER_SCALE = 0.25`, então 1 pixel da
  arte = 1 pixel do jogo). O cenário do CC é desenhado em 2× (`render-cc-pixel-art.py`,
  `save2`). Lado a lado, um pixel do personagem tem metade do tamanho de um pixel do cenário.
- **Zoom fracionado.** A câmera do CC usa zoom 1,45. Com zoom não inteiro, pixels vizinhos
  saem com 1 e 2 pixels de tela, o que serrilha as bordas e embaça texto contra-escalado
  pelo zoom.

Além disso, o canvas de 960×540 é escalado por CSS até o tamanho da janela, e nada no
`index.html` pedia `image-rendering: pixelated`.

## Decisão

Para os três interiores com arte própria: Biblioteca, Centro de Convivência e Bloco de
Tecnologia.

- **1 pixel de arte = 1 pixel do jogo**, a mesma densidade dos personagens. Cada cenário é
  desenhado nessa escala pelo seu script (`render-biblioteca-pixel-art.py`,
  `render-cc-pixel-art.py`, `render-tech-pixel-art.py`, com o que é comum em
  `scripts/pixel_kit.py`), inclusive o texto, com fonte bitmap, sem TrueType com
  antialiasing.
- **Zoom de câmera inteiro (2×)** nas três cenas. Cada pixel vira um bloco exato de 2×2. Em
  2× a tela mostra 30×17 tiles e o personagem ocupa cerca de 12% da altura dela.
- **O CC e o Bloco ganham cena**: `centro-de-convivencia` e `bloco-de-tecnologia` são as
  chaves que `content/campus-doors.ts` já esperava ([ADR 0074](0074-portas-do-campus-sao-dado.md)),
  então registrar as cenas é o que abre essas portas. A Biblioteca continua tocando as
  cutscenes que forem dela ([ADR 0066](0066-cutscene-e-dado.md)).
- **HUD e mapa (M) compensam o zoom** nas três cenas. O mapa é uma miniatura já reduzida
  para o tamanho exato em que aparece, sem escala fracionada na GPU.
- **Mesma geração que o CC.** Um script Python (autoria, fora do runtime) gera os sprites,
  o `layout.json` e o `biblioteca-assets.generated.ts`. `content/maps/src/biblioteca.mjs` lê
  as pegadas do mesmo `layout.json`, então colisão e arte não divergem
  (`npm run check:biblioteca-navigation` confere).
- **Estado no cenário.** A sala tem dois visuais, antes e depois de `acervo-organizado`
  (efeito da própria quest). A cena troca os sprites na frente do jogador.
- **Canvas com `image-rendering: pixelated`**, e a caixa de diálogo e o menu de pausa passam
  a se contra-escalar pelo zoom da câmera.
- **Direção de arte**: pixel art aconchegante, no estilo de jogos de vida no campo. Paleta
  quente, luz vinda do canto superior esquerdo, contornos escuros coloridos (nunca preto
  puro), sombreamento em 3 tons, sombras suaves. Toda a arte é original: nenhum sprite,
  paleta ou layout é copiado de outro jogo.

## Consequências

- O campus externo e a portaria ainda usam os tilesets/objetos antigos (sem zoom). Levá-los
  para esta regra é trabalho separado.
- Quando a janela não é múltipla de 960×540 (ex.: 1366×768), a escala de CSS continua
  fracionada. `pixelated` mantém as bordas duras, mas alguns pixels saem 1px maiores que
  os vizinhos. Escala inteira com bordas pretas fica em aberto.
- Mudar a sala é editar o script, rodar `npm run generate:biblioteca-art`, depois
  `npm run generate:maps` e `npm run sync:map-assets`. Os PNG, o JSON e o `.generated.ts`
  são saída e não se editam à mão.
