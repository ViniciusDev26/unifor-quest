# Roadmap

## Escopo do MVP

Uma **fatia vertical pequena e funcional**, que prove o ciclo inteiro de ponta a ponta:

```text
Explorar → NPC → Quest → Monaco → Escrever código → Executar
→ Testes → Sucesso → Mundo muda → Progressão
```

Dentro do MVP:

- um **trecho pequeno do campus**;
- **três quests**:
  1. tutorial com arrays/strings;
  2. BFS destravando uma porta;
  3. Dijkstra da Biblioteca ao Centro Esportivo, com o personagem andando pela rota;
- **TypeScript, Java e Go** suportados
  ([ADR 0015](decisions/0015-validar-com-typescript-e-java.md),
  [ADR 0016](decisions/0016-go-no-mvp.md)).

Fora do MVP:

- as demais linguagens;
- todo o campus;
- dezenas de missões;
- combate;
- multiplayer;
- gráficos detalhados;
- sandbox sofisticado.

Se esse ciclo funcionar bem, o resto do projeto é produção de conteúdo em cima dele.

## Ordem de construção

A ordem segue uma regra: **provar o caminho mais arriscado primeiro**. O maior risco não é
o jogo 2D, é a abstração multi-linguagem.

0. **Scaffold** — concluído. Monorepo, Electron + Vite + Phaser, preload, Biome.
1. **`packages/core`** — concluído. `TypeSpec`, `Challenge`, `Quest` e o envelope do
   harness, como schemas Zod com os tipos saindo de `z.infer`. Falta o `onSuccess`
   (depende do vocabulário de efeitos), a validação de valores contra um `TypeSpec` e as
   regras de igualdade dos testes.
2. **`packages/runner`** — a interface `Executor`, com timeout e encerramento de árvore de
   processos, e um backend inicial.
3. **`packages/lang-typescript`** — primeiro adapter completo: mapeamento de tipos, stub,
   harness, prelude, diagnostics.
4. **`packages/conformance`** — a suite que define o que é um adapter válido, rodando
   contra o adapter de TypeScript.
5. **`packages/lang-java`** — segundo adapter, escolhido por ser o mais distante possível
   do primeiro. É aqui que a abstração é de fato validada, e é aqui que ela quebra se
   estiver errada.
6. **`packages/lang-go`** — terceiro adapter, o primeiro escrito **contra** a abstração em
   vez de junto com ela. Quanto custar para escrevê-lo é a medição do requisito da
   [ADR 0003](decisions/0003-multi-linguagem-custo-por-adapter.md)
   ([ADR 0016](decisions/0016-go-no-mvp.md)).
7. **IPC `runCode`** — ligar Monaco → preload → runner → envelope → volta, ainda sem jogo
   em volta.
8. **Quest Engine e quest 1** — o tutorial de arrays/strings, com diálogo, desafio e
   conclusão.
9. **Mapa no Tiled e extração do grafo** — trecho do campus, object layer, validação.
10. **Quest 2 (BFS)** — primeiro `onSuccess` que muda o mundo: a porta destrava.
11. **Quest 3 (Dijkstra)** — o personagem percorre a rota que o código retornou, e as
    métricas de `ops` aparecem para o jogador.
12. **Save/load** — autosave a cada quest concluída
    ([ADR 0020](decisions/0020-autosave-por-quest.md)); formato e local ainda dependem
    da questão do formato do save em [open-questions.md](open-questions.md).

Os passos 1 a 6 existem para derrubar o risco de arquitetura antes de qualquer
investimento em conteúdo. Os passos 8 a 11 constroem o ciclo do jogo em cima de algo já
provado.

A ordem entre as linguagens não muda: TypeScript e Java definem a abstração, Go a testa
([ADR 0015](decisions/0015-validar-com-typescript-e-java.md),
[ADR 0016](decisions/0016-go-no-mvp.md)).
