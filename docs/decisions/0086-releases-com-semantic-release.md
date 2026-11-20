# 0086 — Releases com semantic-release a partir dos commits, e instaladores gerados no CI

- Status: aceita
- Data: 2026-11-20
- Resolve o card #38; usa o Conventional Commits do [CONTRIBUTING](../../CONTRIBUTING.md)
  e o GitHub Flow da [0067](0067-github-flow-com-merge-commit.md)

## Contexto

Os instaladores das quatro plataformas existem
([0081](0081-electron-builder.md) a [0085](0085-linux-em-appimage.md)), mas cada um precisa
ser montado numa máquina da própria plataforma, por causa dos caches da
[0083](0083-caches-pre-aquecidos-no-instalador.md). Faltavam três decisões:
- quando sai uma versão;
- que número ela leva;
- onde ficam os instaladores.

O repositório já escreve todo commit em Conventional Commits.

## Decisão

**A versão sai dos commits, pelo semantic-release, e os instaladores são gerados pelo CI e
anexados ao release do GitHub.** Tudo fica em `.github/workflows/release.yml` e
`.releaserc.json`.

- **Quando sai:** depois que o CI passa num commit da `main`, o workflow `Release` roda o
  semantic-release sobre esse commit.
  - `feat` gera versão minor.
  - `fix` e `perf` geram patch.
  - `BREAKING CHANGE` gera major.
  - Os outros tipos não geram versão sozinhos. Um merge só com `docs` ou `build` não lança
    nada.
- **O número:** a tag é `v<versão>`. Não havia tag nenhuma, então a primeira versão é a
  1.0.0. O `package.json` não é commitado com a versão: o workflow aplica o número ao app só
  na hora de empacotar, e nenhum commit de bot entra na `main`.
- **As notas:** o release do GitHub traz as notas agrupadas em Features, Bug Fixes,
  Performance e Packaging, em inglês, como tudo o que o CI produz. `docs`, `refactor`, `test`, `ci` e `chore` ficam de
  fora. Não há `CHANGELOG.md`: o histórico dos releases é o changelog.
- **Os instaladores:** o release nasce como **rascunho**. Quatro jobs geram os instaladores
  e os anexam ao release, cada um na máquina da própria plataforma:

  | Alvo | Máquina | Instalador |
  | --- | --- | --- |
  | Linux x64 | `ubuntu-22.04` | AppImage |
  | Windows x64 | `windows-latest` | NSIS |
  | macOS arm64 | `macos-15` | dmg |
  | macOS x64 | `macos-15-intel` | dmg |

  Com os quatro anexados, o último job publica o release. Se um falhar, o release fica em
  rascunho, sem um instalador faltando à vista de todos.
- **Sem comentários do bot:** o semantic-release não comenta nos PRs e issues nem abre issue
  quando falha. O primeiro release comentaria em todo PR da história do projeto.
- **Commits conferidos no PR:** o job `commits` do CI roda o commitlint em todos os
  commits do PR (`commitlint.config.mjs`), com os tipos do CONTRIBUTING. Um tipo errado
  descoberto depois do merge já estaria na `main`; no PR, basta reescrever a mensagem. O
  check entra no ruleset como obrigatório.
- **Teste em PR:** um PR que mexe no empacotamento roda os mesmos quatro jobs e guarda os
  instaladores como artefatos do workflow, sem publicar nada. O mesmo vale para o
  `workflow_dispatch`. É o único lugar onde o empacotamento de Windows e macOS roda antes de
  um release.

## Consequências

- Lançar uma versão é fazer merge de um PR com `feat` ou `fix`. Não há passo manual.
- O tipo do commit passa a ter efeito, e não é só convenção. O CONTRIBUTING explica qual
  tipo gera o quê.
- Cada release custa quatro máquinas de CI por uns 20 a 30 minutos, a maior parte baixando e
  aquecendo os runtimes. Os downloads ficam em cache do Actions, chaveados pelo
  `runtimes.lock.json`.
- Os instaladores dos PRs somem dos artefatos em 7 dias. Os dos releases ficam para sempre.

## Alternativas descartadas

- **Tag manual (`v*`) disparando o build:** funciona, mas o número fica a critério de quem
  lembra de criar a tag, e as notas seriam escritas à mão.
- **Commitar a versão e um `CHANGELOG.md` de volta na `main`** (`@semantic-release/git`):
  cria um commit de bot a cada release, que precisa passar pela proteção da `main` e pelo
  CI de novo, só para repetir o que o release já mostra.
- **Publicar o release antes dos instaladores:** por alguns minutos, ou para sempre se um
  build falhar, o release ficaria sem o instalador de alguma plataforma.
