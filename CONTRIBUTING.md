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
português:

```text
tipo(escopo): o que muda, no imperativo ou como fato

Corpo opcional: o porquê, não o como. O diff já mostra o como.
```

- **Tipos:** os mesmos da tabela acima, mais `chore` para o que não cabe em nenhum.
- **Escopo:** opcional, a parte do projeto (`quest`, `campus`, `adr`, `storyboard`, `lsp`).
- Commit que registra uma decisão cita a ADR: `docs(adr): 0066 cutscene é dado`.

## Pull request

- **Título** no mesmo formato do commit. É ele que aparece no commit de merge.
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
