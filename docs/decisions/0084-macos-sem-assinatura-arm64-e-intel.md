# 0084 — macOS sem assinatura de desenvolvedor, com um dmg para Apple Silicon e outro para Intel

- Status: aceita
- Data: 2026-11-20
- Resolve o macOS e o Apple Silicon da [questão 1](../open-questions.md) e o card #36

## Contexto

A questão 1 apontava o macOS como o maior risco técnico do empacotamento. Os pontos em
aberto eram:
- assinar e notarizar cada binário embutido;
- os entitlements que o runtime endurecido exige para rodar uma JVM e um binário recém-compilado;
- gerar um build arm64 separado ou um universal.

Assinar e notarizar exigem uma conta Apple Developer, de US$ 99 por ano. O projeto não tem.
No Windows a situação é a mesma: sem certificado, o SmartScreen avisa.

## Decisão

**Os instaladores não são assinados por um desenvolvedor. No macOS saem dois dmg, um arm64 e
um x64, cada um com os runtimes da própria arquitetura.**

- **Assinatura ad-hoc no macOS.** O Apple Silicon não executa código sem assinatura
  nenhuma. Os binários dos runtimes já vêm assinados ad-hoc pelo linker de quem os compilou,
  e o Go assina ad-hoc o que compila na hora. O app em si é assinado ad-hoc pelo
  `codesign` da Apple, num hook `afterPack` (`apps/game/packaging/after-pack.cjs`), e não
  pelo electron-builder: o assinador dele abre todos os arquivos do app ao mesmo tempo para
  achar os binários, e com as dezenas de milhares de arquivos dos runtimes estourava o limite
  de descritores (EMFILE) no CI, mesmo com o `ulimit` alto.
- **Sem runtime endurecido e sem notarização.** Sem conta, não há como notarizar. Sem runtime
  endurecido, não há entitlement a conceder para a JVM (código gerado em memória) nem para os
  binários que o Go compila. Assim o risco técnico da questão 1 deixa de existir.
- **Dois dmg** (`--mac --arm64` e `--mac --x64`), cada um montado numa máquina da própria
  arquitetura. Os caches da [0083](0083-caches-pre-aquecidos-no-instalador.md) só podem ser
  gerados ali. Um build universal levaria JDK, Go, Python e Erlang das duas arquiteturas,
  quase o dobro do tamanho, para um Mac que só usa metade.
- **Windows sem assinatura.** O instalador NSIS sai sem certificado.
- **O README ensina a abrir o jogo** na primeira vez:
  - macOS: Ajustes do Sistema > Privacidade e Segurança > Abrir Mesmo Assim, ou
    `xattr -dr com.apple.quarantine` no app;
  - Windows: "Mais informações" > "Executar assim mesmo".

## Consequências

- Quem baixa o jogo vê o aviso do sistema na primeira abertura e precisa liberar uma vez.
- **O que não foi testado:** o build de macOS é gerado e testado no CI, onde nada vem da
  internet com quarentena. Num Mac de verdade, a quarentena do download pode valer também
  para os binários embutidos quando o jogo os executa. Se acontecer, o `xattr -dr` do README
  remove a quarentena de todos de uma vez. Isso precisa ser conferido no primeiro teste num
  Mac.
- Se o projeto ganhar uma conta Apple Developer, assinar e notarizar passa a ser uma mudança
  de configuração: identidade, `hardenedRuntime: true`, entitlements para a JVM e para
  executar código compilado, e notarização com segredos no CI. Isso valeria uma ADR nova.

## Alternativas descartadas

- **Pagar a conta Apple Developer:** decisão do projeto, por custo, num jogo de disciplina.
- **Sem assinatura nenhuma** (`identity: null`): o app não abre no Apple Silicon.
- **Build universal:** um download só, mas com os runtimes dobrados.
- **Só Apple Silicon:** deixaria de fora os Macs Intel ainda em uso.
