# 0087 — A portaria é pixel art como os outros cômodos, com mobília gerada por IA

- Status: aceita
- Data: 2026-11-20
- Estende a [0075](0075-pixel-art-na-densidade-do-personagem.md) à portaria; usa o
  processo da [0079](0079-predios-do-campus-gerados-por-modelo-de-imagem.md) para a mobília;
  resolve o card #84

## Contexto

A portaria era o último cômodo na cena genérica de interior (`createInteriorScene`): um piso
de tiles chapados, quatro retângulos coloridos como telas e painel, e o Marcos. É o primeiro
lugar que o jogador vê, logo depois do menu, e destoava da Biblioteca, do Centro de
Convivência e do Bloco de Tecnologia, que já eram pixel art na densidade do personagem.

## Decisão

**A portaria é desenhada como os outros cômodos, e a mobília mais detalhada é gerada por um
modelo de imagem.**

### A mobília

`scripts/portaria-props.py` repete o processo dos prédios do campus. Um prompt por móvel vai
ao modelo de imagem, com um recorte do Centro de Convivência anexado como referência de
estilo. A saída bruta fica commitada em `assets/portaria/raw/`. O processamento é
determinístico: tira o fundo magenta e reduz cada imagem à densidade do personagem, com 32
cores e alpha binário.

São sete móveis:
- a guarita do Marcos, com monitores das câmeras, rádio, livro de ocorrências e café;
- a catraca;
- a máquina de lanches;
- o bebedouro;
- a planta;
- as cadeiras de espera;
- o mural.

### O resto do cômodo

`scripts/render-portaria-pixel-art.py` desenha por script tudo o que precisa de texto exato
ou de estado:
- piso de pedra polida e paredes;
- as duas telas, acesas ou com NULL;
- o painel de placas, legível, com ruído ou embaralhado em César+3, que é a primeira quest;
- a faixa de segurança das catracas;
- a faixa-guia até o balcão;
- o capacho "BEM-VINDO";
- colunas, postes de fila, câmeras, relógio, extintor e lixeiras.

O script também gera o `layout.json`, que o `entrada.mjs` lê para o chão e os sólidos, e o
`portaria-assets.generated.ts`, com os objetos, o Marcos, o ponto de conversa, a saída e o
início do jogador.

### A cena

`entrada-scene.ts` funciona como os outros cômodos:
- câmera 2× seguindo o jogador;
- objetos ordenados pela base;
- HUD contra-escalado.

As duas deixas da abertura levam a câmera até as telas e o painel e a devolvem ao jogador. As
telas e o painel ficam no alto da parede, fora de um quadro que segue o jogador. A cutscene
usa as posições novas e passa o Davi por fora da coluna leste.

### A cena genérica sai

`createInteriorScene` não tem mais uso e saiu, junto com `door.ts`, `clampToRoom` e
`isNearNpc`. O arquivo `interior-scene.ts` guarda só o vocabulário comum dos cômodos:
`Conversation`, `CutsceneHost`, `PLAYER_ACTOR`, `Furniture` e `readShapes`.

## Consequências

- O primeiro cômodo do jogo tem o mesmo acabamento dos outros.
- `npm run check:portaria-navigation` confere que, do início do jogador, o balcão do Marcos e
  a saída para o campus são alcançáveis a pé.
- Trocar um móvel é mudar o prompt, rodar `generate` e `process` e renderizar a portaria de
  novo. Mudar o layout é mexer no `render-portaria-pixel-art.py`.
- O Marcos e o Davi continuam com os sprites genéricos até o card #29.

## Alternativas descartadas

- **Desenhar toda a mobília por script, como no Bloco de Tecnologia:** dá mais controle, mas
  monitores, máquina de lanches e mural com esse nível de detalhe custariam muito desenho à
  mão. A mistura funciona porque a mobília gerada é reduzida à mesma densidade e paleta.
- **Gerar o cômodo inteiro numa imagem só:** colisão, estados das telas e do painel e as
  posições da cutscene ficariam presos a uma imagem que não se edita.
- **Manter a portaria pequena, sem câmera seguindo:** cabe tudo na tela, mas não comporta a
  ambientação pedida.
