# 0058 — O campus é um Tiled gerado, sem autotile e sem `gid` em prédio

- Status: aceita
- Data: 2026-09-24

## Contexto

A Fase B começa pelo campus no Tiled ([ADR 0012](0012-grafo-do-campus-no-tiled.md)), e nada
daquilo existia ainda. Os tilesets disponíveis (`assets/graphics/graphics/tilesets/`) são do
estilo clássico de "blob autotile" — o chão de grama/caminho não é um tile só, é um conjunto
de peças que se combinam conforme o vizinho. Reproduzir isso peça por peça, em GIDs escritos
à mão, sem o editor visual do Tiled, é o tipo de coisa que sai errada sem ninguém perceber
até abrir o jogo.

Duas descobertas, lidas direto do `SKILL.md` de tilemaps que vem dentro do próprio pacote do
Phaser (`node_modules/phaser/skills/tilemaps/SKILL.md`), mudaram o desenho:

- O parser de Tiled do Phaser **não suporta tileset do tipo "Collection of Images"** — todo
  tile de uma tile layer precisa vir de uma única imagem. Os prédios em
  `assets/graphics/graphics/objects/` são um PNG por prédio, tamanhos variados: não cabem
  como tileset.
- Tileset **externo (`source`)** também não é suportado — o tileset tem que estar embutido
  no próprio JSON do mapa.

## Decisão

**Os `.tmj` em `content/maps/` são gerados**, pela mesma regra de stub/harness/prelude
([ADR 0005](0005-adapter-por-linguagem.md), [ADR 0042](0042-templates-como-arquivos-da-linguagem.md)):
arquivo real, nunca editado à mão, comparado no CI com o que uma descrição de origem produz
(`scripts/check-maps.mjs`, mesmo padrão de `check-generated.mjs`).

- **`packages/campus`** (sem Phaser, sem Electron — testável em Node, ADR 0027) compila uma
  descrição simples (`content/maps/src/*.mjs`: uma grade de terreno, uma lista de prédios,
  e para o mapa do campus, o grafo) num `.tmj` completo, com o tileset **embutido**.
- **Sem autotile.** O chão de cada tileset usa **um único tile plano**, achado testando
  cada célula 16x16 por cor e conferindo visualmente que ele repete sem costura (`concrete`
  e `asphalt` em `tileset.png` do Lo-Bit City, `floor` em `indoor.png`). Simples,
  verificável, sem risco de um blob sair errado sem ninguém notar. Autotile de verdade fica
  para quando o conteúdo precisar de terreno menos geométrico do que "uma praça pavimentada
  e um caminho reto entre dois pontos".
- **Chão e prédio vêm de pacotes diferentes, de propósito.** O chão do campus é
  `assets/lo-bit-city/tileset.png` (Greywyrd, crédito obrigatório em
  `assets/lo-bit-city/LICENCE.txt`) — concreto e asfalto, porque uma praça pavimentada lê
  melhor do que grama debaixo de prédios que não são casas de fazenda. Os prédios em si
  continuam os stamps do pacote de fantasia (`assets/graphics/graphics/objects/`): trocar
  por algo do próprio Lo-Bit City foi tentado e descartado (ver Alternativas).
- **Prédio não é tile, é objeto.** Cada prédio é um `<object>` numa object layer, **sem
  `gid`**, com uma propriedade `asset` dizendo qual PNG usar — o jogo pré-carrega cada PNG
  com sua própria chave e desenha um `Image` na posição do objeto. O mesmo vale para o que
  não tem imagem nenhuma (a lagoa): um objeto do tipo `shape`, desenhado como uma forma
  preenchida via `Phaser.GameObjects.Graphics`.
- O grafo ([ADR 0012](0012-grafo-do-campus-no-tiled.md)) é mais uma object layer, nós como
  pontos e arestas como objetos com `from`/`to`/`weight` — `extractGraph` lê de volta e
  valida contra o `graphSchema` de `core`.
- O tileset embutido aponta a própria arte-fonte (`../../assets/...`, relativo a
  `content/maps/`), então o `.tmj` abre de verdade no Tiled. O jogo nunca lê esse caminho:
  ele pré-carrega sua própria cópia de `apps/game/src/renderer/public/` — a CSP do renderer
  é `img-src 'self'`, então tudo que carrega em tempo de execução precisa estar sob a raiz
  servida do próprio app, copiada de `assets/` por `scripts/sync-map-assets.mjs`.

## Consequências

- **Custou um pacote e um script, não um autotile compiler.** Mais barato do que o previsto,
  ao custo de o terreno de hoje ser deliberadamente simples — grama e caminhos retos, sem a
  planta do campus reproduzida tile a tile.
- Um prédio novo é uma entrada na lista de `buildings` da descrição, não um tile novo em
  tileset nenhum — mas cada prédio continua sendo um PNG que precisa existir em
  `assets/graphics/graphics/objects/`, e as oito localizações pedidas usam **stamps
  genéricos reaproveitados** (casas, hospital), não arte desenhada para cada uma.
- `apps/game/src/renderer/public/` é gerado (git-ignorado), regenerado por
  `sync:map-assets`, encadeado depois de `build:packages` — rodar `npm run build:packages`
  continua sendo o único passo que alguém precisa lembrar antes de `npm run dev`.
- Centro de Dados, Prédio do Servidor e Sala 404 são as três localizações fictícias do
  pedido original — não existem no mapa real do campus (unifor.br/mapa-campus). Centro de
  Dados é o prédio, posicionado como um anexo perto de onde fica o TEC Unifor real; Prédio
  do Servidor e Sala 404 são interiores, ainda não construídos.
- Prova feita em duas cenas: o campus inteiro (tileset do Lo-Bit City, o grafo, sete pontos) e o
  interior da Biblioteca (`indoor.png`, sem grafo). As seis localizações restantes — Centro
  de Convivência, Auditório, Centro Esportivo, Lagoa (provavelmente sem interior próprio),
  Centro de Dados, Prédio do Servidor e Sala 404 — replicam o mesmo padrão depois de revisão.

## Alternativas descartadas

- **Autotile compiler completo (esquema blob/Wang de 47 tiles):** resolveria terreno
  orgânico de verdade, mas exigiria decifrar o layout exato de subtiles deste pack sem o
  editor visual do Tiled para checar — o tipo de coisa fácil de acertar visualmente e difícil
  de acertar só lendo pixel a pixel. Fica para quando o conteúdo pedir por ele.
- **Prédios como tileset "Collection of Images":** o próprio parser do Phaser recusa.
- **Tileset externo (`source`), referenciando os PNGs originais direto:** também recusado
  pelo parser — todo tileset entra embutido no JSON.
- **Prédios recortados do Lo-Bit City (Greywyrd), no lugar dos stamps de fantasia:** tentado
  a sério — cinco prédios extraídos por componente conectado, depois cortados à mão para
  tirar pedaços de sprite vizinho que grudaram na extração automática, depois com janelas
  compostas por cima para quebrar a superfície lisa. O resultado ficou tecnicamente correto
  (sem fragmento colado, sem furo) mas raso: blocos de cor com pouco relevo, porque as peças
  desse pacote são cidade genérica, não prédio de campus. Revertido a pedido do usuário. A
  busca por um pacote pronto de prédio de campus (biblioteca com colunas, ginásio,
  bloco acadêmico) achou uma opção paga que bate certinho
  (`comshadow.itch.io/modern-university-pixel-art-tileset`, US$ 3,99, gerado por IA) mas
  nenhuma gratuita — registrado em
  [`docs/open-questions.md`](../open-questions.md) para retomar se algum dia fizer sentido
  pagar por ela ou aparecer uma alternativa gratuita à altura.
