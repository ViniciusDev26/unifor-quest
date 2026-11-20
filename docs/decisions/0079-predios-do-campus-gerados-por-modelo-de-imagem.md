# 0079 — Os prédios do campus são gerados por um modelo de imagem e reduzidos a pixel art

- Status: aceita (a escala do processamento mudou na
  [0080](0080-campus-em-pixel-art-com-o-layout-real.md))
- Data: 2026-11-19
- Resolve a [questão 5](../open-questions.md) e o card #28; troca a arte, não o layout, da
  [0058](0058-mapas-gerados-sem-autotile.md)

## Contexto

A [0058](0058-mapas-gerados-sem-autotile.md) pôs no campus stamps genéricos de um pacote de
vilarejo de fantasia: casas de telhado verde e um hospital no lugar da Biblioteca, do Centro
de Convivência, do Auditório, do Centro Esportivo e do Bloco de Tecnologia. A colisão, o
nome e a escala estavam certos, mas nenhum deles parecia um prédio de universidade. A
questão 5 ficou em aberto: comprar um pacote pago (comshadow, US$ 3,99, ele mesmo gerado por
IA), esperar um gratuito ou aceitar os stamps como estética definitiva.

Os interiores já são arte própria, desenhada por script
([0075](0075-pixel-art-na-densidade-do-personagem.md)). O campus era o único lugar que ainda
mostrava arte de outro jogo.

## Decisão

**Cada prédio do campus é desenhado por um modelo de imagem a partir de um prompt próprio, e
um script determinístico o reduz à grade de pixels do campus.**

- **Geração** (`scripts/campus-buildings.py generate`): um prompt por prédio, enviado pelo
  OpenRouter ao `openai/gpt-5.4-image-2`, com o stamp antigo anexado só como referência de
  ângulo e enquadramento: vista de frente, telhado visto de cima, sem perspectiva. O fundo é
  magenta puro, para o recorte. A saída de 1024 px fica em `assets/campus-buildings/raw/` e
  **é commitada**: é a fonte, como um pacote de terceiros. A geração custa dinheiro e não é
  determinística, por isso só roda à mão e o build nunca depende dela.
- **Processamento** (`scripts/campus-buildings.py process`): determinístico e sem rede. Tira
  o magenta e a franja rosada, recorta e reduz cada prédio à **densidade do personagem**, com
  paleta de 32 cores, sem dithering, e alpha binário. A primeira versão desta decisão reduzia
  a um pixel por pixel de um mapa sem zoom, salvo 4× maior. Com o campus desenhado como os
  interiores ([0080](0080-campus-em-pixel-art-com-o-layout-real.md)), os prédios passaram a
  ter cerca do dobro do detalhe e a ser posicionados por `render-campus-pixel-art.py`.
- **Os prédios:**

  | Prédio | Tamanho (px) | Desenho |
  | --- | --- | --- |
  | Biblioteca | 232×224 | Concreto branco com brises sobre vidro, laje com ar-condicionado e caixa-d'água |
  | Centro de Convivência | 181×184 | Pavilhão aberto de telha cerâmica, colunas brancas, mesas e lanchonete |
  | Auditório | 232×229 | Bloco de concreto com cobertura em leque e painéis em relevo |
  | Centro Esportivo | 208×175 | Ginásio de cobertura metálica em arco, venezianas e faixa verde |
  | Bloco de Tecnologia | 216×213 | Pele de vidro azul-escuro, painéis metálicos, placas solares e antenas |
  | Portaria (guarita) | 176×128 | Concreto branco, laje em balanço, vidro com balcão e floreira |
  | Portão (os dois pilares) | 21×56 | Pilar de concreto branco com base de pedra e luminária |

- A guarita da portaria entrou na lista depois, com a 0080.

## Consequências

- O campus deixa de mostrar arte de fantasia. Os seis prédios seguem a mesma direção:
  modernismo tropical, concreto claro e vidro, com o contorno escuro dos outros sprites.
- Trocar um prédio é mudar o prompt, rodar `generate <id>` e `process <id>`, e conferir no
  jogo. Ajustar a redução, como a paleta ou o limiar de alpha, não exige gerar de novo.
- A chave do OpenRouter fica fora do repositório. O script a lê de `OPENROUTER_API_KEY`
  só na hora de gerar, e o jogo não a usa em momento nenhum.
- A arte não é desenho de pessoa. Se a disciplina ou a licença pedirem, os créditos podem
  dizer que os prédios do campus foram gerados por modelo de imagem.
- Os stamps antigos continuam em `assets/graphics/graphics/objects/`, porque o pacote
  também fornece os personagens, e não são mais copiados para o jogo.
- Ainda faltam a arte da portaria e um chão de campus com grama e árvores. Ficam para os
  cards de ambientação.

## Alternativas descartadas

- **Comprar o pacote da comshadow:** também é gerado por IA, não é desenhado para este
  campus e custa dinheiro.
- **Manter os stamps de fantasia:** funcionam, mas não parecem universidade, e o resto do
  jogo já tem arte própria.
- **Desenhar os prédios por script, como os interiores (0075):** dá controle total, mas um
  prédio visto de fora, com telhado e fachada, exige muito mais desenho à mão do que um
  cômodo visto de cima.
- **Gerar no ComfyUI local (Z-Image):** testado primeiro. Seguia pior o ponto de vista: saía
  isométrico e alto mesmo pedindo vista frontal.
