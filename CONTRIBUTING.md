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
- **Decisão nova** vem com a ADR, a atualização do `CLAUDE.md` e do
  `docs/architecture.md` **no mesmo PR** (regra do [CLAUDE.md](CLAUDE.md)).
- **Card no board:** o PR entra no [Unifor Quest Kanban](https://github.com/users/ViniciusDev26/projects/5)
  em *In review*, com a Etapa e a prioridade do card que ele resolve.

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
