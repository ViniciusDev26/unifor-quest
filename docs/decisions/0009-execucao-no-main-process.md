# 0009 — Execução de código no main process, atrás de um `Executor`

- Status: aceita
- Data: 2026-09-22

## Contexto

Rodar o código do jogador exige processos filhos, arquivos temporários e compiladores —
nada disso está disponível no renderer com `nodeIntegration: false`
([0008](0008-quest-engine-no-renderer.md)). O código do jogador também pode simplesmente
nunca terminar.

## Decisão

O Code Runner fica no **main process**, atrás de uma interface **`Executor`**. Cada
execução:

1. cria um diretório temporário;
2. gera os arquivos (código do jogador, harness, prelude);
3. compila, quando necessário;
4. executa todos os testes;
5. aplica **timeout separado para compilação e execução**;
6. encerra a **árvore de processos inteira** ao estourar o limite — no Windows, matar o
   processo pai não mata os filhos;
7. devolve o envelope para o jogo.

## Consequências

- O backend de execução é substituível por trás da interface. Isso permitiu adiar a
  escolha, resolvida depois pela [0021](0021-runtimes-empacotados-no-instalador.md):
  runtimes embutidos no instalador, sem servidor.
- Encerrar árvore de processos é código específico por sistema operacional.
- Diretórios temporários precisam de limpeza, inclusive depois de um timeout.

## Alternativas descartadas

- **Executar no renderer:** exigiria afrouxar a segurança padrão do Electron.
