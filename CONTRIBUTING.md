# Como contribuir

O fluxo de trabalho do repositório: GitHub Flow, com merge commit e CI obrigatório
([ADR 0067](docs/decisions/0067-github-flow-com-merge-commit.md)). Para rodar o projeto, veja o
[README](README.md).

## Fluxo

`main` é o único branch permanente e está sempre verde. Todo trabalho passa por um branch
curto e um pull request:

```bash
git switch main && git pull
git switch -c feat/cutscene-player
# ... commits ...
git push -u origin feat/cutscene-player
gh pr create --base main
```

1. **Branch a partir de `main`**, atualizado.
2. **Commits** pequenos, cada um com uma mudança que se sustenta sozinha.
3. **PR para `main`.** O CI roda sozinho.
4. **Merge commit** quando o CI passar, e o branch é apagado.

Não existe `develop`, `release/*` nem `hotfix/*`: correção urgente é um branch `fix/` como
qualquer outro.

## Nome do branch

`tipo/descricao-curta`, com o mesmo tipo do commit principal:

| Tipo | Para quê | Exemplo |
| --- | --- | --- |
| `feat/` | Funcionalidade ou conteúdo novo | `feat/exemplos-e-dicas-na-quest` |
| `fix/` | Correção de bug | `fix/porta-da-biblioteca` |
| `docs/` | Só documentação, ADR incluída | `docs/adr-cutscenes` |
| `refactor/` | Mudança de estrutura sem mudar comportamento | `refactor/campus-scene-sem-cast` |
| `test/` | Só testes | `test/conformance-elixir` |
| `build/` / `ci/` | Dependências, toolchain, workflows | `ci/ruleset-do-main` |

## Commits

[Conventional Commits](https://www.conventionalcommits.org/pt-br/), com a descrição em
português. **O commit não é só convenção:** o semantic-release lê cada um depois do merge
para decidir se sai uma versão, que número ela leva e o que vai nas notas do release
([ADR 0086](docs/decisions/0086-releases-com-semantic-release.md)).

```text
tipo(escopo): o que muda, no imperativo ou como fato

Corpo opcional: o porquê, não o como. O diff já mostra o como.

Closes #42
```

- **Escopo:** opcional, a parte do projeto (`quest`, `campus`, `cenas`, `save`, `lsp`,
  `empacotamento`, `adr`). Nas notas, ele aparece em negrito na frente da descrição.
- **Descrição:** é a linha que entra nas notas do release, então é escrita para quem lê o
  release, e não para quem lê o diff. Escreva "porta da Biblioteca abre de novo depois da
  pausa", e não "corrige bug".
- **`Closes #N`** no corpo fecha o card quando o commit chega à `main`, e o número também
  aparece nas notas.
- Commit que registra uma decisão cita a ADR: `docs(adr): 0066 cutscene é dado`.

### O tipo decide a versão

| Tipo | Para quê | Versão | Nas notas |
| --- | --- | --- | --- |
| `feat` | Funcionalidade ou conteúdo novo que o jogador vê | minor (1.**1**.0) | Features |
| `fix` | Correção de um bug que chegou à `main` | patch (1.0.**1**) | Bug Fixes |
| `perf` | Mais rápido, sem mudar o comportamento | patch | Performance |
| `build` | Empacotamento, runtimes, dependências | nenhuma | Packaging, quando sai versão |
| `docs` | Só documentação, ADR incluída | nenhuma | não aparece |
| `refactor` | Estrutura nova, mesmo comportamento | nenhuma | não aparece |
| `test` | Só testes | nenhuma | não aparece |
| `ci` | Workflows e scripts de checagem | nenhuma | não aparece |
| `chore` | O que não cabe em nenhum outro | nenhuma | não aparece |

- **Uma versão por merge, não por commit:** os commits de um PR são lidos juntos, e vale o
  maior. Um PR com três `fix` e um `feat` gera uma minor.
- **Um PR só com tipos que não geram versão** (`docs`, `ci`, `refactor`...) é mergeado sem
  release. Ele entra nas notas da próxima versão que sair, se o tipo aparecer nas notas.
- **Mudança que quebra compatibilidade** gera major (**2**.0.0). Marque com `!` depois do tipo
  ou com um rodapé `BREAKING CHANGE:` no corpo, explicando o que quebra. Num jogo, isso
  significa, por exemplo, um save antigo que deixa de abrir:

  ```text
  feat(save)!: save guarda a posição do jogador

  BREAKING CHANGE: saves da versão 1 não abrem mais; o jogo começa de novo.
  ```

- **`fix` é para bug que o jogador poderia ter encontrado,** ou seja, que chegou à `main`.
  Um ajuste no que o próprio PR ainda está fazendo não é `fix`: é o mesmo tipo da mudança, ou
  vai junto no commit dela. Senão, as notas anunciam a correção de um bug que nunca saiu.
- **O tipo errado tem efeito:** um `feat` escrito como `chore` não gera versão, e um `fix`
  escrito como `docs` some das notas. Na dúvida, pergunte o que o jogador percebe.

### O CI confere

O job `commits` do CI passa o [commitlint](https://commitlint.js.org) em todos os commits do
PR, com as regras de `commitlint.config.mjs`: um dos tipos da tabela, cabeçalho de até 100
caracteres e descrição em qualquer caixa (português e nomes próprios). Um commit fora do
padrão reprova o PR. Para conferir antes do push:

```bash
npm run check:commits
```

Para corrigir, reescreva a mensagem: `git commit --amend` no último commit, ou
`git rebase -i origin/main` com `reword` nos outros, e depois `git push --force-with-lease`.

Os instaladores das quatro plataformas são gerados e anexados ao release automaticamente.

## Pull request

- **Título** no mesmo formato do commit, com o tipo da mudança principal. Ele fica no corpo
  do commit de merge, mas não decide a versão: o semantic-release ignora o merge e lê os
  commits que o PR traz.
- **Descrição:** o que muda e por quê, e as ADRs envolvidas.
- **Uma mudança por PR.** Duas mudanças sem relação vão em dois PRs, ou ao menos em
  commits separados.
- **Decisão nova** vem com a ADR, a atualização do `AGENTS.md` e do
  `docs/architecture.md` **no mesmo PR** (regra do [AGENTS.md](AGENTS.md)).
- **Card no board:** todo PR fecha a issue do seu card com `Closes #N` (veja abaixo).

## Card no board

**Nenhum PR existe sem um card.** O [Unifor Quest Kanban](https://github.com/users/ViniciusDev26/projects/5)
é o registro do trabalho: o que falta, quem está fazendo e o que já entrou. Trabalho sem
card some do quadro e ninguém sabe que ele existiu.

**Card é issue do repositório**, não draft issue: só a issue se liga ao PR.

1. **Antes do branch**, ache a issue do trabalho no board. Se não existir, crie uma, mesmo
   para algo pequeno (uma correção, um ajuste de doc, uma mudança de CI), e ponha no board:

   ```bash
   gh issue create --title "..." --body "..." --project "Unifor Quest Kanban" --assignee @me
   ```

2. Preencha **Etapa** e **Priority** no card novo:

   | Etapa | Para quê |
   | --- | --- |
   | 1. Jogo jogável | As 4 quests ligadas a cena, do início ao fim |
   | 2. Save | Autosave e carregar jogo |
   | 3. Polimento | Arte, áudio, consequências visuais, UX |
   | 4. Fechamento | Playtest e documentação de entrega |
   | 5. Distribuição | Empacotamento e release; só com o jogo pronto |

   Priority vai de **P0** (bloqueia o jogo jogável de ponta a ponta) a **P3** (só quando o
   jogo estiver pronto). Trabalho de processo, como este documento, fica sem Etapa.
3. **Ao pegar o card, ponha-se como responsável** (*Assignees* na issue). É assim que o
   board mostra quem está fazendo o quê. Card com responsável já tem dono: não pegue sem
   falar com a pessoa. Se desistir, tire seu nome e devolva o card para *To Do*.

   ```bash
   gh issue edit N --add-assignee @me
   ```

4. Mova o card conforme o trabalho anda:

   | Status | Quando |
   | --- | --- |
   | Backlog | O trabalho existe, mas não foi escolhido |
   | To Do | É o próximo a ser feito |
   | In progress | O responsável se atribuiu e abriu o branch |
   | In review | O PR está aberto |
   | Done | O PR foi mergeado: o board move sozinho |

5. **Na descrição do PR**, escreva `Closes #N` com o número da issue. O card passa a mostrar
   o PR ligado, e o merge fecha a issue e leva o card para *Done*. Não adicione o PR ao
   board: o card já representa o trabalho.

O mesmo vale para decisão: uma ADR nova tem um card "Decisão: ..." que fecha quando ela
entra.

## O que o `main` exige

O ruleset `main` garante:

| Regra | Efeito |
| --- | --- |
| Pull request obrigatório | Ninguém dá push direto no `main`. Aprovação não é exigida. |
| Checks obrigatórios | `lint, tipos e documentacao` e `testes` em Ubuntu, Windows e macOS precisam passar. |
| Branch atualizado | Se o `main` andou, clique em *Update branch* e espere o CI de novo. |
| Sem force push e sem apagar | O histórico do `main` não é reescrito. |

O dono do repositório está na bypass list, para emergência. Fora disso, o merge espera o CI.

O storyboard (`storyboard no GitHub Pages`) aparece como *skipped* nos PRs e é normal: ele
só publica depois do merge.

## Antes do push

O hook `.husky/pre-push` roda `lint`, `typecheck` e `test`, os mesmos gates do CI.
Se ele falhar, o CI também falharia. Correções de formatação: `npx biome check --write .`.

## Conflitos

Traga o `main` para o branch com merge, não com rebase: o branch já está no remoto e o
rebase exigiria force push.

```bash
git fetch origin
git merge origin/main
```

O conflito mais comum é o número de ADR: dois PRs abertos ao mesmo tempo pegam o mesmo
número. Quem mergeia por último renumera a sua e as referências a ela. O `npm run
check:adrs` acusa número repetido.
