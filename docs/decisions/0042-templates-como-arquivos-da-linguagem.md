# 0042 — Templates são arquivos reais da linguagem que geram

- Status: aceita
- Data: 2026-09-23

## Contexto

O primeiro harness de Go nasceu como uma template string dentro de um arquivo TypeScript.
Funcionou, e foi ruim: nenhum destaque de sintaxe, nenhuma checagem do compilador, `gofmt`
e `go vet` sem acesso, e escape manual de crase — que Go usa em toda tag de struct.

A [0005](0005-adapter-por-linguagem.md) já dizia que código Java vive como template no
pacote do adapter. Faltava dizer o que "template" significa.

## Decisão

**O harness de cada linguagem é um arquivo real daquela linguagem**, em `templates/`,
compilável por si só. Em Go:

```text
packages/lang-go/templates/
├─ go.mod
├─ harness.go     # o harness de verdade, com regiao marcada por uq:begin/uq:end invoke
└─ solution.go    # solucao de exemplo, so para o pacote compilar
```

O que varia por desafio — decodificar um argumento por parâmetro e chamar a função — é a
única parte gerada, e ela substitui a região entre os marcadores. O nonce entra no lugar de
dois literais de string.

Um passo `npm run generate` embute os templates num módulo TypeScript
(`src/templates.generated.ts`), porque o adapter é empacotado dentro do processo principal
do Electron, onde o diretório do pacote não existe mais.

## Consequências

- O **compilador da linguagem alvo passa a revisar o harness** a cada build: `go build` e
  `go vet` rodam sobre `templates/`.
- Editor destaca, formata e navega o arquivo como código de verdade, porque é.
- A parte gerada encolheu para uma função de dez linhas.
- Aparece um arquivo gerado versionado, com cabeçalho dizendo que não se edita à mão
  ([0005](0005-adapter-por-linguagem.md)). Commitá-lo evita ordenar geração antes de
  typecheck, teste e build.
- A `solution.go` de exemplo existe só para o pacote de template compilar, e é substituída
  pelo código do jogador em toda execução.
- O mesmo padrão vale para Java quando chegar.

## Alternativas descartadas

- **Template string no TypeScript:** zero configuração, e nada além do olho humano
  verificando o código gerado.
- **Ler o arquivo do disco em runtime:** morre no app empacotado, onde o pacote virou um
  bundle.
