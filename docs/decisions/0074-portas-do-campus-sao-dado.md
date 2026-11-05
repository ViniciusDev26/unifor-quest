# 0074 — As portas dos prédios do campus são dado

- Status: aceita
- Data: 2026-11-05
- Amplia a [0059](0059-npc-oferece-a-quest-mais-adiantada.md) e ajusta a regra da
  [0061](0061-jogo-comeca-na-portaria.md) para as portas do campus

## Contexto

A [história](../story.md) anda em ordem: o NULL travou as portas, e cada lugar abre depois do
anterior. O campus não sabia disso. `ENTERABLE`, em `campus-scene.ts`, era um mapa
`buildingId -> cena` ([0059](0059-npc-oferece-a-quest-mais-adiantada.md)), só com a Biblioteca
e os portões e sem nenhum requisito.

A única porta trancada do jogo era a saída da portaria. A
[0061](0061-jogo-comeca-na-portaria.md) resolveu com `canLeave` em `main.ts`, e explicou por
quê: o nome da flag é conteúdo, então quem decide que flag libera o quê é o `main.ts`, não a
cena. Repetir isso por prédio deixaria a regra de cada porta escrita à mão num arquivo que não
roda em Node, sem nenhum teste que a alcance.

Os interiores do Centro de Convivência e do Bloco de Tecnologia ainda não existem, e o Phaser
não ajuda: `scene.start` com uma chave não registrada interrompe a cena atual e não inicia
nenhuma outra. O resultado é uma tela preta.

## Decisão

### A tabela de portas é conteúdo

`content/campus-doors.ts` exporta `campusDoors`, de `buildingId` para `CampusDoor`:

```ts
export type CampusDoor = {
  scene: string
  lock?: { requires: Requirements; lines: readonly DialogueLine[] }
}
```

- `scene` é a chave da cena atrás da porta.
- `lock` junta o requisito e a fala, então não existe porta trancada sem fala. Sem `lock`, a
  porta está sempre aberta.
- `requires` é o mesmo `Requirements` de quest e cutscene
  ([0034](0034-vocabulario-de-effect-e-prerequisitos.md),
  [0066](0066-cutscene-e-dado.md)), conferido com `requirementsMet`. `core` não muda.

| Prédio | Cena | Abre com |
| --- | --- | --- |
| Biblioteca | `biblioteca` | sempre aberta |
| Portões | `entrada` | sempre abertos |
| Centro de Convivência | `centro-de-convivencia` | `acervo-organizado` |
| Bloco de Tecnologia | `bloco-de-tecnologia` | `bloco-tecnologia-revelado` |

### O `main.ts` continua ligando tudo

- **Nenhuma cena importa de `content/`.** A cena declara o tipo `CampusDoor`, e o `main.ts`
  entrega a tabela e o progresso:
  `createCampusScene({ doors: campusDoors, progress: () => progress })`. O arquivo de conteúdo
  importa só o tipo, que some no build.
- **A cena não conhece nome de flag**, como a 0061 pedia. O que muda na regra da 0061, só para
  as portas do campus, é onde o nome da flag fica escrito: na tabela de conteúdo, não em
  `main.ts`. A saída da portaria continua com `canLeave`.
- `progress` é o mesmo `() => Progress` que o painel e a HUD recebem. É por ele que o campus
  vai ler `campus-restaurado` ([0070](0070-campus-com-e-sem-null.md)).

### Apertar E perto de um prédio

1. **Trancada:** a caixa de diálogo mostra `lines`. Enquanto ela está aberta, E só avança a
   fala e Esc não pausa, como nos interiores.
2. **Aberta, com cena registrada:** entra, como antes.
3. **Aberta, sem cena registrada:** nada acontece. A cena confere
   `this.scene.manager.keys[door.scene]` antes de `scene.start`. `getScene` não serve: a tipagem
   diz que ele nunca devolve `null`, mas devolve.

Com o jogo pausado, E não faz nada. O Phaser não zera `time.paused` quando a cena para, então
sair pausado deixaria o relógio do campus parado. A caixa de diálogo precisa desse relógio para
armar o E, e a fala da próxima porta trancada nunca fecharia.

## Consequências

- Registrar uma cena com a chave da tabela abre a porta, sem mexer no campus. É o que os
  interiores do Centro de Convivência e do Bloco de Tecnologia precisam fazer.
- A ordem das portas se testa em Node: `campus-doors.test.ts` joga a história quest a quest e
  confere quais portas seguem trancadas.
- Um `buildingId` errado na tabela vira uma porta que não faz nada, sem erro nenhum. Quem pega
  isso é um teste que compara a tabela com o mapa.
- A fala de porta trancada é roteiro: está em `story.md`, como a fala do Marcos na saída da
  portaria.

## Alternativas descartadas

- **Uma função por porta em `main.ts`, como o `canLeave`:** mantém a 0061 ao pé da letra, mas
  cada porta nova vira código, e a ordem da história não dá para testar sem abrir o jogo.
- **A cena importar a tabela direto:** evita mexer no bloco de imports do `main.ts`, mas seria
  a primeira cena a importar de `content/`, e quem liga conteúdo e cena é o `main.ts`.
- **`requires.quests` em vez de `requires.flags`:** funciona, mas a
  [0034](0034-vocabulario-de-effect-e-prerequisitos.md) usa justamente a porta destravada como
  exemplo de flag que o mundo lê.
- **Trava na Biblioteca por uniformidade:** ninguém chega ao campus sem `minimapa-liberado`,
  então ela nunca dispararia e a fala dela nunca seria lida.
- **Schema Zod em `core`:** a tabela é escrita em TypeScript e compilada junto, não entra pela
  fronteira ([0017](0017-type-safety-total.md)), e `Requirements` e `DialogueLine` já vêm de
  `core`.
