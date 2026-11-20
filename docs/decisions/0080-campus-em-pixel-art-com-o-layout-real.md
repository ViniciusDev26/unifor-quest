# 0080 — O campus é pixel art como os interiores, com o layout do campus real

- Status: aceita
- Data: 2026-11-19
- Estende a [0075](0075-pixel-art-na-densidade-do-personagem.md) ao campus; troca o desenho
  do campus da [0058](0058-mapas-gerados-sem-autotile.md) e a escala dos prédios da
  [0079](0079-predios-do-campus-gerados-por-modelo-de-imagem.md)

## Contexto

Mesmo com os prédios novos da 0079, o campus continuava um piso de concreto quadriculado do
Lo-Bit City, com uma elipse azul no lugar da lagoa, faixas cinza como caminhos e nada entre os
prédios. A câmera não tinha zoom. Biblioteca, Centro de Convivência e Bloco de Tecnologia já
eram pixel art na densidade do personagem, com câmera 2× (0075). Por isso, sair de um prédio
para o campus encolhia o jogador e trocava o estilo. A disposição seguia o mapa do campus de
forma frouxa: os lugares ficavam numa grade 3×3 de lotes.

## Decisão

**O campus é desenhado como os interiores e segue o layout do campus real.**

### Como é feito

- `scripts/render-campus-pixel-art.py` desenha o mundo de 2240×1600 px, um pixel de arte por
  pixel do jogo:
  - grama;
  - calçadas;
  - a Praça Central com a fonte;
  - as avenidas e o muro;
  - o Estacionamento Solar;
  - pista de atletismo, piscina e quadras;
  - o lago;
  - árvores, bosques, palmeiras, bancos, postes, placas;
  - os blocos de aula.
- Os seis prédios com porta (portaria, Biblioteca, Centro de Convivência, Auditório, Bloco de
  Tecnologia e Centro Esportivo) são as imagens da 0079. Agora são reduzidas à densidade do
  personagem, com uns 230 px de largura nos maiores, e não mais a um pixel por pixel de um mapa
  sem zoom.
- A guarita da portaria entrou na lista de prédios gerados. A saída da portaria aparece no
  campus como um prédio de verdade, e não mais como dois pilares.
- Os blocos de aula e a Reitoria são desenhados pelo script, sem modelo de imagem. São prédios
  de dois ou três andares, com a faixa pintada na cor do "bairro" do campus real (amarelo, roxo,
  verde ou azul) e o nome na porta. São só cenário.
- As saídas do gerador ficam commitadas:
  - `assets/campus/pixel-world/`, com o chão, um PNG por objeto, `layout.json` e `overview.png`;
  - `campus-assets.generated.ts`, com objetos, portas e pontos de saída;
  - `docs/campus-pixel-preview.png`.

### Colisão e portas

- `content/maps/src/campus.mjs` lê o `layout.json`. O chão vira a camada de tiles que a cena
  mantém escondida e que diz onde dá para andar. Cada prédio da história é um objeto
  `building` com a base sólida. Todo outro sólido, como bloco, árvore, banco ou fonte, é uma
  `shape`, elipse ou retângulo, como nos interiores.
- A porta de cada prédio é um ponto logo abaixo da fachada (`CAMPUS_DOORS`). E abre a porta a
  até 38 px dele, e a dica na base da tela diz o que acontece: entrar ou "porta travada".
- Ao lado das duas portas trancadas há uma tela que mostra `NULL` até o campus ser restaurado.
  É a tela que a fala da porta já citava.
- Quem sai de um prédio aparece no ponto de saída dele (`CAMPUS_ENTRANCES`). O Centro de
  Convivência e o Bloco de Tecnologia têm também a saída norte, atrás do prédio. As cenas e o
  `storyStops` leem esses pontos do arquivo gerado, e nenhuma coordenada do campus fica
  escrita à mão fora do gerador.
- O epílogo acontece na porta da frente do Bloco de Tecnologia, e não mais na de trás.

### Cena

- `campus-scene.ts` tem:
  - câmera com zoom 2× seguindo o jogador;
  - objetos ordenados pela base;
  - HUD contra-escalado;
  - M para o mapa do campus, com o nome de cada prédio e a posição do jogador;
  - F3 para as colisões.
- O filtro verde do NULL e a troca de música continuam (0070).

### O layout

O site da Unifor recusou conexão, então o layout veio do OpenStreetMap, com o norte para
cima:
- a Av. Washington Soares a oeste, com a portaria;
- a Biblioteca logo depois da entrada, com a Praça Central ao sul e o Centro de Convivência
  colado a leste;
- o Teatro, que é o Auditório do jogo, no bosque a noroeste;
- os blocos de tecnologia a leste do Centro de Convivência;
- ginásio, piscina e estádio mais a leste;
- o Estacionamento Solar ao norte;
- um lago pequeno no canto nordeste;
- a Av. Valmir Pontes ao sul.

As distâncias foram encurtadas para a caminhada entre duas portas durar poucos segundos (0064).

### Conferência

`npm run check:campus-navigation` parte da porta da portaria. Ele confere se toda porta e
todo ponto de saída são alcançáveis a pé com o mesmo pé do jogador. Uma árvore posta pelo
gerador no lugar errado não fecha uma porta sem ninguém ver.

## Consequências

- O jogador tem o mesmo tamanho e o mesmo estilo dentro e fora dos prédios.
- O Lo-Bit City deixa de ser usado no jogo e sai dos créditos. O pacote continua em `assets/`.
- O grafo do campus (0012) tem os nós nas portas, e as arestas seguem as calçadas. Nenhuma
  quest lê esse grafo hoje: o duelo usa a rede de computadores (0071).
- Mudar o campus é mudar o gerador e rodá-lo de novo. As posições ficam todas no começo do
  script.
- O M do campus mostra o campus inteiro com os nomes. Ele atende parte do que o card do
  minimapa (#16) pede, mas não é um minimapa na tela.

## Alternativas descartadas

- **Manter o mapa de tiles e enfeitar:** continua com zoom 1, densidade diferente dos
  interiores e pouco detalhe.
- **Gerar o campus inteiro como uma imagem só, num modelo de imagem:** fica bonito rápido, mas
  colisão, portas e grafo teriam de ser desenhados por cima de uma imagem que não se edita.
  Cada ajuste pediria gerar tudo de novo.
