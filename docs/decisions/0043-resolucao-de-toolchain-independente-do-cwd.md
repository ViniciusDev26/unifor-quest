# 0043 — A resolução de toolchain não pode depender do diretório atual

- Status: aceita
- Data: 2026-09-23

## Contexto

Em desenvolvimento, o toolchain vem do ambiente ([0021](0021-runtimes-empacotados-no-instalador.md)),
e a forma óbvia de fazer isso é chamar `go` e deixar o sistema resolver pelo PATH.

Não funciona. Gerenciadores de versão — mise, asdf, nvm e afins — colocam um **shim** no
PATH, e o shim escolhe a versão a partir do **diretório atual**. O runner trabalha num
diretório de cache bem longe do projeto ([0026](0026-diretorio-de-trabalho-e-save.md)), onde
não existe configuração nenhuma. O shim então falha com "no version is set", e é **isso**
que o jogador vê no lugar do erro do compilador dele.

## Decisão

O executável de um toolchain é resolvido **uma vez, para caminho absoluto**, a partir do
diretório da aplicação — e não a cada execução, a partir do diretório de trabalho.

Para Go, a resolução pergunta ao próprio Go onde ele mora:

```text
go env GOROOT   (rodado no diretorio da aplicacao)  ->  <GOROOT>/bin/go
```

Depois disso, nada mais depende do diretório atual.

## Consequências

- Funciona com shim de gerenciador de versão, com instalação direta no sistema e, depois,
  com o runtime embutido no app, sem tratar cada caso.
- A resolução acontece uma vez e fica em cache: não custa nada por execução.
- Se não houver Go nenhum, o nome cru é mantido, e a falha menciona o toolchain em vez de
  esconder o problema.
- Vale para toda linguagem que venha do ambiente. Node não precisa: o jogo usa o binário do
  próprio Electron, que já é absoluto ([0021](0021-runtimes-empacotados-no-instalador.md)).

## Alternativas descartadas

- **Pedir ao jogador que configure uma versão global** (`mise use -g go@…`): empurra um
  problema nosso para quem só queria jogar, e só resolve para quem usa aquele gerenciador.
- **Rodar o compilador com o diretório do projeto como `cwd`:** quebraria o isolamento do
  diretório de trabalho e faria o build do jogador acontecer dentro do repositório.
- **Variável de ambiente apontando o binário:** mais configuração para manter, e não
  resolve sozinha o caso do app empacotado.
