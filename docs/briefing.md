# UNIFOR Quest — Briefing do Projeto

## 1. Conceito

Jogo desenvolvido para uma disciplina da faculdade, ambientado no campus da **Universidade de Fortaleza (UNIFOR)**.

É uma aventura/exploração **2D top-down**, inspirada visualmente em jogos clássicos de exploração do Game Boy Advance.

O jogador controla um estudante que explora o campus, conversa com NPCs, recebe missões e resolve desafios.

O diferencial do jogo tem duas partes:

1. **Programação é jogabilidade.** Em determinadas missões, o jogador abre um editor de código dentro do jogo, escreve a solução e executa. Se passar nos testes, a missão é concluída e **o resultado do código altera o mundo do jogo**.
2. **Multi-linguagem.** O jogador pode resolver os desafios em várias linguagens de programação, e a base do projeto é pensada para que adicionar uma linguagem nova seja barato.

A ideia é transformar conceitos de programação, algoritmos e estruturas de dados em mecânicas reais de gameplay, e não apenas em elementos temáticos.

---

## 2. Plataforma

**Desktop, com Electron.** Alvo inicial: **Windows x64**.

O desktop permite executar localmente os compiladores e runtimes das linguagens suportadas, algo que o navegador limita.

---

## 3. Stack tecnológica

* **Electron** como aplicação desktop
* **TypeScript** (strict) como linguagem principal
* **Vite** como bundler do renderer
* **Phaser** para o jogo 2D
* **Monaco Editor** para o editor de código (não vamos criar um editor do zero)
* **Tiled** para os mapas
* **Node 24 LTS**
* **Monorepo com npm workspaces**
* **Biome** para lint e formatação

---

## 4. Arquitetura conceitual

```text
Electron
│
├── Renderer
│   ├── Phaser
│   │   ├── Mundo, mapas (Tiled), player, NPCs, interações
│   │   └── Quest Engine (estado, diálogos, progressão)
│   │
│   └── Monaco Editor
│
├── Preload (contextBridge)
│   └── API mínima: runCode, save, load
│
└── Main Process
    └── Code Runner
        └── Executor + adapters por linguagem
```

A Quest Engine fica no renderer, junto do Phaser, porque é lógica de jogo. O main process só expõe o necessário: executar código e persistir o save.

O renderer nunca executa diretamente o código do jogador. Segurança padrão do Electron: `contextIsolation: true`, `nodeIntegration: false`.

Fluxo de uma execução:

```text
Jogador escreve código no Monaco
        ↓
IPC (preload)
        ↓
Code Runner
        ↓
Adapter da linguagem gera stub/harness
        ↓
Executor compila (se preciso) e roda todos os testes numa execução
        ↓
Envelope JSON com o resultado
        ↓
IPC
        ↓
Quest Engine: missão concluída ou falhou → mundo muda
```

---

## 5. Multi-linguagem

Linguagens planejadas inicialmente: **TypeScript, JavaScript, Java e Go**.

Requisito de arquitetura: **o custo de adicionar uma linguagem deve ser proporcional a um adapter, nunca ao número de quests.**

### Testes como dados

Cada desafio é descrito sem linguagem nenhuma:

* nome da função;
* parâmetros e retorno num **sistema de tipos neutro** (`int`, `float`, `bool`, `string`, `list<T>`, `map<K,V>`, `nullable<T>`, structs simples e tipos de domínio como `Graph`);
* casos de teste em JSON (`name`, `input`, `expected`).

O código do jogador roda **nativamente** na linguagem escolhida. Não existe tradução de código nem linguagem intermediária. Só os dados cruzam a fronteira, via JSON.

### Adapter por linguagem

Cada linguagem tem um adapter que:

* mapeia os tipos neutros para os tipos da linguagem;
* gera o stub que o jogador vê no editor;
* gera o harness que roda os testes;
* fornece o prelude (ex.: `Graph` instrumentado);
* converte erros do compilador em marcações no Monaco.

Os arquivos gerados nunca são editados à mão.

### Protocolo do harness

Igual para toda linguagem:

1. Lê os casos de teste pelo stdin.
2. Redireciona o stdout do jogador, para que `print` não quebre o resultado.
3. Roda **todos os testes numa única execução**.
4. Emite um envelope JSON entre marcadores com nonce:

```json
{
  "results": [{ "name": "...", "passed": true, "actual": [], "ms": 3, "ops": 18 }],
  "playerStdout": "...",
  "error": null
}
```

O jogo só entende esse envelope, independentemente da linguagem.

O código do jogador fica num arquivo próprio, para que as linhas dos erros batam com as do editor.

### Exceção

Uma quest que realmente precisa de verificação customizada pode declarar `customTests: true` e trazer testes escritos à mão, só para as linguagens que suportar.

### Validação

Uma **suite de conformance** que todo adapter precisa passar antes de entrar no jogo. As duas primeiras linguagens implementadas devem ser bem diferentes (**TypeScript e Java**), para validar a abstração cedo.

---

## 6. Execução de código

O Code Runner fica no main process, atrás de uma interface `Executor`. Para cada execução:

1. Criar diretório temporário.
2. Gerar os arquivos (código do jogador, harness, prelude).
3. Compilar, quando necessário.
4. Executar todos os testes.
5. Aplicar timeout separado para compilação e execução.
6. Encerrar a **árvore de processos** inteira ao estourar o limite (no Windows, matar o processo pai não mata os filhos).
7. Retornar o envelope para o jogo.

**Sem Docker.** O jogador roda o próprio código na própria máquina, então o risco real é loop infinito, consumo de memória e processos órfãos, não código malicioso. Docker no Windows complicaria demais a distribuição.

**Em aberto:** empacotar os runtimes localmente (tamanho do instalador, Windows Defender) ou usar um executor remoto self-hosted como o Piston.

---

## 7. Jogabilidade

O jogador:

1. Explora o campus.
2. Encontra NPCs e conversa com eles.
3. Recebe missões.
4. Encontra o local ou objeto necessário.
5. Abre o desafio de programação.
6. Escolhe a linguagem e escreve o código no Monaco.
7. Executa e recebe o resultado dos testes.
8. Corrige, se necessário.
9. Ao passar, a missão é concluída.
10. Novas áreas, missões e interações são desbloqueadas.

O jogo não pode virar "um Code Runner com um personagem andando". **O resultado do código tem que causar consequências no mundo.** O `onSuccess` de cada quest recebe o **retorno real** do código do jogador.

---

## 8. O campus como grafo

O campus é modelado como um grafo desenhado **no Tiled**, numa object layer:

```text
Prédios/pontos = vértices
Caminhos       = arestas
Distâncias     = pesos
```

O mesmo dado:

* posiciona os prédios no mapa;
* é o input dos desafios de BFS, DFS, Dijkstra e, eventualmente, A*;
* define a rota que o personagem percorre quando o jogador resolve um desafio.

---

## 9. Conceitos de computação

O projeto precisa demonstrar:

* **Grafos:** BFS, DFS, Dijkstra, eventualmente A*.
* **Estruturas de dados:** arrays, listas, pilhas, filas, hash maps, árvores, grafos.
* **Algoritmos:** busca, ordenação, recursão, caminho mínimo, travessia.
* **Matemática:** distância entre pontos, coordenadas, geometria, probabilidade.
* **Complexidade:** comparação entre soluções para o mesmo problema.

As métricas de complexidade usam **contagem de operações**, não tempo. O tempo de execução é dominado pelo startup do processo e pelo ruído do sistema. Estruturas instrumentadas fornecidas pelo jogo (ex.: `Graph.neighbors()` contado) geram métricas confiáveis, como "nós explorados".

---

## 10. Exemplo de missão

NPC:

> "Preciso chegar da Biblioteca ao Centro Esportivo. Encontre o caminho mais curto."

O desafio declara:

```text
shortestPath(graph: Graph, start: string, destination: string) → nullable<list<string>>
```

O jogador implementa a função na linguagem que escolher. Os testes verificam:

```text
✓ Caso simples
✓ Caminho com múltiplas opções
✓ Caminho inexistente
✓ Nós repetidos
✓ Grafo maior

5/5 testes passaram
Nós explorados: 18
```

Depois disso, o personagem atravessa o campus **pela rota que o código retornou**.

**algoritmo → código do jogador → resultado → gameplay.**

---

## 11. Quests

As quests são **declarativas**: dados, não lógica espalhada pelas cenas. Cada quest define:

* NPC;
* pré-requisitos (flags);
* diálogos;
* desafio (assinatura tipada, casos de teste, solução de referência);
* `onSuccess`, que recebe o resultado real e altera o mundo.

Cada quest tem uma solução de referência que precisa passar nos próprios testes.

---

## 12. Progressão

```text
Fase 1  Arrays / Strings / Funções
   ↓
Fase 2  Busca / Ordenação
   ↓
Fase 3  Pilhas / Filas / Hash Maps
   ↓
Fase 4  Árvores
   ↓
Fase 5  Grafos
   ↓
Fase 6  Dijkstra / algoritmos mais complexos
```

A conclusão das missões desbloqueia novas áreas, NPCs, missões, itens, diálogos e partes da história.

---

## 13. Recompensas

* XP;
* itens;
* acesso a novas áreas;
* novas missões e personagens;
* novos diálogos;
* alterações no mundo do jogo.

Informações sobre a solução reforçam o aspecto educacional sem transformar o jogo numa prova:

```text
Testes: 5/5
Nós explorados: 18
Distância encontrada: 684m
```

---

## 14. Visão artística

* 2D, top-down;
* inspirado em jogos clássicos de exploração;
* pixel art;
* campus da UNIFOR estilizado;
* personagens simples, cores vibrantes, interface limpa.

Atmosfera leve, descontraída, universitária, acessível e divertida.

No início, tilesets livres (CC0) podem ser usados até o ciclo principal estar provado.

---

## 15. Estrutura do monorepo (planejada)

```text
apps/game/                 # Electron + Phaser + Monaco
packages/core/             # tipos e contratos
packages/runner/           # Executor e implementações
packages/lang-typescript/  # adapter TS
packages/lang-java/        # adapter Java
packages/lang-go/          # adapter Go
packages/conformance/      # suite que todo adapter precisa passar
content/quests/            # uma pasta por quest
content/maps/              # arquivos Tiled
tools/codegen/             # gera stub/harness por quest × linguagem
```

Regras de dependência: `core` não depende de nada; adapters dependem só de `core`; nenhum pacote importa de `apps/`.

---

## 16. MVP

Priorizar uma **fatia vertical pequena e funcional**:

* um trecho pequeno do campus;
* três quests:
  1. tutorial com arrays/strings;
  2. BFS destravando uma porta;
  3. Dijkstra da Biblioteca ao Centro Esportivo, com o personagem andando pela rota;
* TypeScript e Java suportados.

Fora do MVP:

* todas as linguagens;
* todo o campus;
* dezenas de missões;
* combate;
* multiplayer;
* gráficos detalhados;
* sandbox sofisticado.

O ciclo que o MVP precisa provar:

```text
Explorar → NPC → Quest → Monaco → Escrever código → Executar
→ Testes → Sucesso → Mundo muda → Progressão
```

Se esse ciclo funcionar bem, o resto do projeto é produção de conteúdo em cima dele.
