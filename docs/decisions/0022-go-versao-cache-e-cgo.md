# 0022 — Go: versão corrente, cache pré-aquecido e cgo desabilitado

- Status: aceita
- Data: 2026-09-22

## Contexto

A [ADR 0021](0021-runtimes-empacotados-no-instalador.md) decidiu embutir os runtimes no
instalador. Go não tem um equivalente ao `jlink`, e traz três particularidades:

- **não existe LTS** — o projeto segue versões correntes, com forte garantia de
  compatibilidade;
- desde o Go 1.20 a distribuição **não traz mais a biblioteca padrão pré-compilada**: ela
  é compilada sob demanda e guardada no `GOCACHE`. A primeira compilação numa máquina fria
  é lenta;
- qualquer pacote que toque **cgo** exige um compilador C instalado, o que a
  [0021](0021-runtimes-empacotados-no-instalador.md) proíbe.

## Decisão

1. **Versão: a última estável do Go** (hoje 1.27.1), acompanhada ao longo do projeto. Não
   há versão fixada por LTS a seguir.
2. **O instalador leva um `GOCACHE` pré-aquecido**, gerado no build, para que a primeira
   execução na máquina do jogador não pague a compilação da biblioteca padrão.
3. **`CGO_ENABLED=0`, sempre.**

## Consequências

- O cache embarcado fica dentro do app, que é **somente leitura**. Ele é semeado num
  diretório gravável de cache, definido pela [0026](0026-diretorio-de-trabalho-e-save.md),
  e re-semeado se o sistema apagar esse diretório.
- O cache do Go é indexado por versão do compilador, plataforma e flags de build. Ele
  precisa ser gerado **no pipeline de build, para windows/amd64, com exatamente as mesmas
  flags** usadas em runtime — senão é ignorado em silêncio e o esforço não aparece em
  lugar nenhum, só a lentidão volta.
- Toda atualização de Go **invalida o cache** e obriga a regerá-lo no build.
- O cache aumenta o instalador. Quanto, precisa ser medido.
- Código do jogador que dependa de cgo não compila. Irrelevante para desafios de
  algoritmo, mas é uma restrição declarada, e o adapter precisa dar uma mensagem melhor do
  que o erro cru do toolchain.
- Acompanhar a última versão significa que atualizar Go é rotina, não evento — e cada
  atualização pede regeração do cache e uma passada na conformance.

## Alternativas descartadas

- **Fixar uma versão antiga por estabilidade:** não há LTS em Go, e a garantia de
  compatibilidade da linguagem torna o ganho pequeno perto de ficar para trás.
- **Deixar o cache esquentar na primeira execução do jogador:** a primeira impressão do
  recurso central do jogo seria justamente a mais lenta.
- **Permitir cgo:** exigiria um compilador C na máquina do jogador, contra a
  [0021](0021-runtimes-empacotados-no-instalador.md).
