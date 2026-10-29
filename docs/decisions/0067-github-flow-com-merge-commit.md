# 0067 — GitHub Flow, com merge commit e CI obrigatório

- Status: aceita
- Data: 2026-10-29

## Contexto

O fluxo de trabalho nunca foi escrito. Na prática, todos os PRs saíram de um branch curto e
foram direto para `main`, com merge commit. Existia um branch `develop` no remoto, mas
nenhum PR o usou, e ele ficou para trás.

O `main` não tinha proteção: um push direto, ou um merge com o CI vermelho, passava. E dois
PRs verdes cada um podem quebrar o `main` juntos, sem conflito de texto: um torna um campo
de schema obrigatório, o outro acrescenta conteúdo sem ele.

## Decisão

- **GitHub Flow:** `main` é o único branch permanente. Todo trabalho sai de `main` num
  branch curto e volta por pull request. Não há `develop`, `release/*` nem `hotfix/*`.
- **Merge commit**, não squash nem rebase. Um PR pode juntar commits que se sustentam
  sozinhos, e cada um continua achável no `git log` e no `git blame`.
- **Ruleset no `main`:** pull request obrigatório, sem aprovação exigida; os checks
  `lint, tipos e documentacao` e `testes` nas três plataformas obrigatórios; branch
  atualizado com o `main` antes do merge; sem force push e sem apagar o branch.
- **Todo PR tem um card** no board do projeto, criado antes do branch. O card é uma issue
  do repositório, e o PR a fecha com `Closes #N`: o card mostra o PR ligado e vai para
  *Done* sozinho no merge. O board é o registro do trabalho, e trabalho sem card não
  aparece nele.
- **Quem pega um card se põe como responsável** na issue, para o board mostrar quem
  está fazendo o quê e ninguém pegar o mesmo trabalho.
- Convenções de branch, commit, PR e card ficam no [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Consequências

- O `main` só recebe código cujo CI rodou sobre o resultado do merge.
- Quando o `main` anda, os PRs abertos precisam de *Update branch* e de mais uma rodada de
  CI (uns 3,5 minutos, por causa de Windows e macOS). Com dois autores, isso é raro.
- Commits de trabalho ("wip", "corrige lint") vão para o histórico do `main`. Quem quiser
  evitar arruma o branch antes de abrir o PR.
- Até uma correção de uma linha ganha card. É o preço de o board mostrar tudo que foi
  feito.
- O branch `develop` do remoto fica sem uso.

## Alternativas descartadas

- **Git Flow com `develop`:** a cerimônia serve a releases versionadas em paralelo, e o
  jogo tem uma entrega só.
- **Squash:** um commit por PR, mas junta mudanças sem relação num commit só e perde as
  mensagens de cada uma.
- **Rebase e histórico linear:** histórico limpo, mas um branch com merge do `main` para
  resolver conflito não pode ser rebaseado sem refazer a resolução.
- **Card como draft issue:** não se liga a PR. O card parecia parado em *In review* sem
  PR, e o PR precisava de um item próprio no board, duplicando o trabalho.
- **Aprovação obrigatória:** com dois autores, nenhum mergearia o próprio PR sem esperar o
  outro.
