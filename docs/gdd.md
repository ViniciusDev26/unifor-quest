# Game Design Document (GDD)

> Trazido do rascunho original (Google Docs) em 2026-10-01, com correções pontuais pra
> bater com a história e a arquitetura atuais do projeto. Onde este documento e os outros
> divergirem, valem **[docs/story.md](story.md)** (narrativa canônica) e
> **[docs/vision.md](vision.md)** (mecânica canônica) — o GDD é a visão geral de alto
> nível, não a fonte da verdade linha a linha. ADRs citadas estão em
> [docs/decisions/](decisions/README.md).

**Título do jogo:** UNIFOR Quest

**Integrantes:**
- Carlos Vinicius
- Daniel Luccio
- Guilherme Abrunheiro
- Henrique

## 1. Visão geral

**Gênero:** Ação, Aventura, Puzzle

**Plataforma(s):** Desktop — Windows (primária), Linux e macOS, via Electron
([ADR 0001](decisions/0001-plataforma-desktop-electron.md),
[ADR 0025](decisions/0025-suporte-a-linux-e-macos.md)).

**Público-alvo:** Livre

**Resumo do conceito:** Um jogo de aventura e exploração em 2D ambientado no campus da
Universidade de Fortaleza (UNIFOR), no qual o jogador assume o papel de um estudante que
percorre a universidade, interage com personagens e resolve desafios para avançar. O
diferencial está na integração entre exploração e programação: determinadas missões
exigem que o jogador desenvolva soluções utilizando linguagens reais — hoje, TypeScript,
Go, Java, Python e Elixir — com os resultados do código influenciando diretamente a
progressão no mundo do jogo. Adicionar uma linguagem custa um adapter, nunca reescrever
quests ([ADR 0003](decisions/0003-multi-linguagem-custo-por-adapter.md)). Dessa forma,
conceitos de programação, algoritmos e estruturas de dados são transformados em elementos
de gameplay, criando uma experiência que combina entretenimento, exploração e
aprendizado.

**Visão artística:** 2D em perspectiva top-down e pixel art, inspirado em jogos clássicos
de exploração e aventura. O campus da UNIFOR é representado de forma estilizada, com
cores vibrantes, personagens e cenários de formas simples e facilmente reconhecíveis —
atmosfera leve, descontraída, universitária, acessível e divertida
([visão artística completa](vision.md#visão-artística)).

## 2. Mecânicas de jogo

- **Jogabilidade central:**
  - O jogador controla um personagem em visão 2D top-down e explora o campus da UNIFOR,
    conversa com NPCs, recebe missões e interage com o ambiente.
  - As missões principais são desafios de programação. O jogador tem um editor de código
    de verdade dentro do jogo — toolchain, servidor de linguagem e projeto reais, não um
    juiz online ([ADR 0046](decisions/0046-ambiente-de-programacao-de-verdade.md)) — e
    escreve a solução para o problema apresentado pelo NPC. O código roda nativamente e é
    avaliado por casos de teste. Resolver corretamente desbloqueia novas áreas, missões
    ou interações no campus.
  - A exploração também serve para encontrar personagens, objetos e informações
    necessárias pra resolver certos desafios — programação e exploração ficam
    integradas, não são duas camadas separadas.
- **Objetivos e progressão:**
  - O objetivo principal é completar as missões disponíveis e avançar pela história. As
    missões têm dificuldade crescente e introduzem conceitos de programação aos poucos.
  - O progresso é dividido em fases: primeiro estruturas básicas (arrays, strings,
    funções), depois busca e ordenação, depois filas, pilhas e tabelas hash, depois
    árvores, e por fim grafos (BFS, DFS, Dijkstra) — ver [progressão](vision.md#progressão)
    e a [tabela de quests](story.md#quests).
  - Algumas áreas do campus só abrem depois que a missão correspondente é resolvida, o
    que torna as habilidades de programação adquiridas necessárias pra continuar
    explorando.
- **Sistema de recompensas:**
  - Concluir missões recompensa o jogador com pontos de experiência, acesso a novas
    áreas, novas missões e diálogos.
  - O próprio **retorno do código altera o mundo**
    ([ADR 0013](decisions/0013-codigo-com-consequencia-no-mundo.md)): a rota que o
    Dijkstra do jogador devolve é o caminho que o personagem percorre pelo campus
    bloqueado, por exemplo.
  - O jogo mostra o desempenho do jogador nos desafios — quantos testes passaram e a
    **eficiência da solução, medida em contagem de operações, não em tempo de execução**
    ([ADR 0011](decisions/0011-metricas-por-contagem-de-operacoes.md)): tempo de
    execução é ruído de startup de processo, não um sinal confiável de complexidade.
- **Aplicação de conceitos de computação:**
  - Os conceitos de computação são as próprias mecânicas do jogo, não elementos teóricos
    à parte.
    - Estruturas de dados: arrays, listas, pilhas, filas, tabelas hash, árvores e grafos
      para resolver os problemas dos NPCs.
    - Algoritmos: ordenação, busca, recursão, caminhos mínimos e outros algoritmos do
      curso.
    - Matemática: distância, coordenadas, geometria e probabilidade em desafios
      secundários.
    - Análise de desempenho: comparar soluções diferentes pro mesmo problema, mostrando
      complexidade e eficiência de algoritmos.

## 3. Mundo e narrativa

- **Cenário:**
  - O jogo se passa inteiramente dentro do campus da UNIFOR, representado de forma
    estilizada em pixel art: jardins amplos, blocos de aula, biblioteca, Centro de
    Convivência (o RU, chamado assim na UNIFOR), área esportiva e espaços de convivência
    ligados por calçadas arborizadas.
  - A ação acontece ao longo de **um único dia**, o primeiro dia de aula do protagonista
    — manhã, tarde e noite, com a passagem do tempo marcada pela paleta de cores de cada
    fase.
  - O campus existe em dois estados: **corrompido** (placas ilegíveis, portas travadas,
    telas com glitch, tiles distorcidos, NPCs confusos) e **restaurado** (o campus como
    deveria ser, vivo e colorido). Cada missão concluída restaura a área correspondente —
    essa transição é a principal recompensa visual do jogo.
- **História e personagens:** (desenvolvido inteiro em [docs/story.md](story.md); resumo
  aqui)
  - **Premissa:** o protagonista, calouro de Computação, chega pro primeiro dia de aula e
    encontra o campus em pane: um invasor que assina como NULL tomou o sistema da
    universidade. O Núcleo de TI (NTI), sobrecarregado, recruta o calouro pra restaurar o
    campus.
  - **Ato 1 — O ataque** (Fases 1–2): o jogo começa com o calouro *dentro da portaria*,
    não no pátio aberto — Lia o encontra ali e explica o ataque antes de qualquer outra
    coisa. Marcos, o segurança, é o único NPC da Fase 1 e mora dentro dessa portaria, não
    solto no mapa ([ADR 0059](decisions/0059-npc-oferece-a-quest-mais-adiantada.md)): ele
    oferece as duas primeiras quests (placas embaralhadas com cifra de César, catraca
    travada com dígito verificador), e o jogador só sai pro resto do campus depois de
    decifrar as placas
    ([ADR 0061](decisions/0061-jogo-comeca-na-portaria.md)). O Ato termina na Biblioteca,
    onde a **primeira comunicação direta de NULL** acontece — um livro se abre sozinho e
    projeta uma mensagem debochada. Até esse ponto, NULL é só um boato e um texto que
    piscou nas telas; a biblioteca é onde ele fala pela primeira vez.
  - **Ato 2 — O rastro** (Fases 3–4): com a ajuda de Lia e do Prof. Heitor, coordenador do
    NTI, o jogador restaura o Centro de Convivência (RU) e o Auditório, e rastreia a
    origem dos ataques até o Bloco de Tecnologia — o prédio do "Fantasma do Bloco de
    Tecnologia" do boato de campus. Lá dentro, sem um único NPC vivo, descobre que o
    ataque parte do próprio sistema da universidade e encontra, nos arquivos mais
    antigos, um comentário de código de 1998 assinado "H.". Lia reconhece a caligrafia,
    mas não diz o nome.
  - **Ato 3 — A verdade** (Fases 5–6): Heitor confessa que, como estudante, ajudou a
    escrever o primeiro sistema acadêmico da universidade — remendado por décadas,
    prestes a ser desligado, e NULL é esse sistema, que "acordou" pra não ser apagado.
    O jogador corre até o Centro de Dados (a rota do Dijkstra é percorrida de verdade,
    porque os prédios infectados fecham a passagem a pé —
    [ADR 0060](decisions/0060-rota-volta-quando-o-jogador-nao-poderia-andar.md)), vence
    NULL num duelo de eficiência e, em vez de apagá-lo, escolhe migrá-lo. O campus volta
    ao normal e NULL se torna aliado no pós-jogo.
  - **Tema central:** sistemas antigos não são inimigos. Código legado tem história, e um
    bom engenheiro entende antes de destruir.
  - **Personagens principais:**
    - **Protagonista (o calouro):** estudante de Computação no primeiro dia, nome e
      aparência escolhidos pelo jogador. Arco: de calouro perdido a quem decide, sozinho,
      que um sistema com história merece ser entendido antes de apagado.
    - **Lia (monitora do NTI):** veterana esperta, ansiosa, humor seco; guia e fonte de
      dicas. Arco: de insegura e sobrecarregada a parceira de igual pra igual — é ela
      quem propõe a migração.
    - **Prof. Heitor (coordenador do NTI):** professor veterano, calmo, antiquado.
      Esconde que escreveu o sistema original; a confissão dele é o centro emocional do
      jogo.
    - **NULL (antagonista):** o sistema acadêmico original. Fala em código antigo,
      provoca em comentários nos stubs sabotados, reage à eficiência das soluções do
      jogador. Arco: de ameaça sem rosto a figura trágica — um sistema com medo de ser
      esquecido.
  - **Personagens secundários:**
    - **Davi:** colega calouro, alívio cômico, estabelece o tom leve antes do ataque;
    - **Dona Célia:** bibliotecária, testemunha discreta da primeira mensagem de NULL;
    - **Seu Raimundo:** do Centro de Convivência (RU), fonte de fofocas e pistas — é
      quem planta o boato do Fantasma do Bloco de Tecnologia;
    - **Marcos:** segurança da catraca, desconfiado de tecnologia. Único NPC da Fase 1,
      mora dentro da portaria.
- **Elementos de lore:**
  - **História do sistema:** fim dos anos 1990, um grupo de estudantes — entre eles o
    jovem Heitor — escreveu o primeiro sistema acadêmico como projeto de laboratório. O
    temporário virou permanente: cada novo setor ganhou um módulo remendado sobre o
    anterior, até virar um labirinto que ninguém entendia por completo. A substituição
    anunciada é o gatilho da história.
  - **O Fantasma do Bloco de Tecnologia:** luzes piscando de madrugada — são os
    servidores de NULL. Citado como boato no Ato 2 (não no Ato 1), confirmado como
    verdade ao entrar no prédio.
  - **Os patos da lagoa:** quem explica o bug pros patos encontra a solução —
    *rubber duck debugging* como mecânica de dica.
  - **O primeiro commit:** a assinatura "H." no código mais antigo, achada no Ato 2.
  - **A Sala 404:** uma sala que não existe no mapa. Liberada no pós-jogo, com desafios
    extras e um "museu" do sistema antigo.
  - **Ambientação:** cartazes de eventos acadêmicos, murais com piadas de programação,
    avisos do NTI cada vez mais desesperados ao longo do dia, grafites de NULL que somem
    quando a área é restaurada.

## 4. Níveis e ambientes

- **Estrutura dos níveis:** o campus é um mundo contínuo, sem telas de carregamento entre
  áreas. As áreas abrem conforme a história avança, seguindo seis fases de conceitos de
  computação ([roadmap completo](roadmap.md)):
  - **Fase 1 — Portaria e Praça Central:** arrays, strings e funções. O jogo começa
    dentro da portaria (não na praça); resolver a cifra de Marcos libera a saída pro
    campus e o minimapa.
  - **Fase 2 — Biblioteca:** busca e ordenação. Primeira comunicação direta de NULL.
  - **Fase 3 — Centro de Convivência (RU) e Auditório:** pilhas, filas e tabelas hash.
    Revela a localização do Bloco de Tecnologia.
  - **Fase 4 — Bloco de Tecnologia (prédio do servidor):** árvores. Concede o crachá de
    administrador.
  - **Fase 5 — Centro Esportivo e mapa do campus:** grafos (BFS e DFS). Define a rota
    até o Centro de Dados.
  - **Fase 6 — Centro de Dados:** Dijkstra e confronto final. Leva ao final e ao
    pós-jogo.
  - Cada fase segue a mesma estrutura: chegada (área corrompida, NPCs explicam o
    problema) → missões principais (obrigatórias, cada uma restaura uma parte da área) →
    missões secundárias (opcionais, mesmos conceitos com outra roupagem, ou matemática) →
    confronto (em algumas fases, duelo de eficiência contra NULL) → restauração.
  - **Bloqueio e liberdade:** catracas, portas e zonas de glitch impedem a passagem até a
    missão necessária ser concluída. Em áreas já abertas, o jogador circula livremente e
    pode voltar pra completar missões secundárias — toda quest roda em qualquer
    linguagem, com replay livre
    ([ADR 0030](decisions/0030-qualquer-linguagem-e-replay-livre.md)).
  - **Pós-jogo:** campus totalmente aberto, Sala 404 liberada, NULL (agora aliado) oferece
    desafios extras e versões mais difíceis das missões.
- **Design dos ambientes:** todo ambiente tem duas versões visuais (corrompida e
  restaurada) e ao menos um terminal que abre o editor de código.
  - **Portaria (Fase 1):** pequeno interior onde o jogo começa — Marcos, a catraca, o
    painel de placas. Sai pro campus só depois da cifra resolvida.
  - **Praça Central / Campus:** hub que conecta todos os prédios, acessado a partir da
    portaria.
  - **Biblioteca (Fase 2):** estantes altas, mesas de estudo, luz quente das janelas;
    corrompida, livros espalhados e estantes fora de ordem — a missão de ordenação se
    reflete no cenário, as estantes se reorganizam na ordem das trocas do algoritmo.
  - **Centro de Convivência / RU (Fase 3):** balcão, mesas compridas, movimento de
    estudantes; corrompido, aglomeração caótica. A missão de fila organiza os NPCs numa
    fila animada.
  - **Auditório (Fase 3):** poltronas em degraus, palco, um painel que corrompido exibe
    código quebrado em loop e restaurado mostra um vídeo com uma pista.
  - **Bloco de Tecnologia / prédio do servidor (Fase 4):** corredores frios, salas
    trancadas, racks piscando, mais escuro que o resto do campus — labirinto que a missão
    de árvore de diretórios abre porta por porta.
  - **Lagoa (opcional):** área verde e tranquila com patos — sistema de dicas e missões
    secundárias de matemática.
  - **Centro Esportivo e mapa do campus (Fase 5):** quadras, pista, arquibancadas. O
    campus vira tabuleiro: BFS marca em vermelho os prédios infectados, o grafo do campus
    aparece sobre o mundo.
  - **Centro de Dados (Fase 6):** salas de servidores e um núcleo central pulsante,
    iluminação vinda das telas, ambientação noturna. Destino da corrida final, arena do
    confronto, cenário da migração.
  - **Sala 404 (pós-jogo):** "museu" do sistema antigo, terminais velhos, disquetes,
    telas monocromáticas. Desafios extras e a história completa de NULL.
- **Desafios e obstáculos:**
  - Desafios de programação (núcleo do jogo): implementar uma função a partir de uma
    descrição; depurar código de NULL (stub sabotado, com comentários provocativos);
    duelo de eficiência (resolver com menos operações que a força bruta de NULL — a
    barra de vida dele é o orçamento de operações); consequências encadeadas (o retorno
    de uma missão alimenta a seguinte).
  - Obstáculos do ambiente: portas e catracas travadas; zonas de glitch (tiles
    corrompidos que impedem ou embaralham o movimento); placas e diálogos cifrados; NPCs
    em pânico; terminais escondidos.
  - **Curva de dificuldade:** cada fase introduz um conceito novo e o combina com os
    anteriores. Duelos de eficiência só aparecem depois que o conceito foi praticado.
  - **Falhar sem punição:** não existe game over
    ([ADR 0020](decisions/0020-autosave-por-quest.md) cobre o autosave). Um teste que
    falha mostra qual caso quebrou e o valor esperado, sem limite de tentativas. A ajuda é
    gradual — Lia explica o conceito, os patos dão uma dica específica, um terminal do
    NTI mostra o pseudocódigo — e usar ajuda reduz um pouco o XP, mas nunca bloqueia o
    avanço.

## 5. Arte e áudio

- **Estilo visual:** 2D top-down, pixel art, inspirado em jogos clássicos de exploração;
  campus estilizado, cores vibrantes, personagens e cenários de formas simples; atmosfera
  leve, descontraída, universitária ([vision.md](vision.md#visão-artística)). No início,
  tilesets livres (CC0) valem até o ciclo principal estar provado.
- **Design de Personagens:** _(a preencher — aparência e personalidade dos personagens
  principais)_
- **Trilha Sonora e Efeitos Sonoros:** _(a preencher — como a música e os efeitos
  sonoros contribuem para a atmosfera do jogo)_

## 6. Interface do usuário (UI)

- **Layout e Design:**
  - *Implementado:* dentro de uma quest, o editor Monaco ocupa o centro da tela, com uma
    barra lateral mostrando o diálogo do NPC e a assinatura da função, uma barra superior
    com o seletor de linguagem e o status do servidor de linguagem (LSP), e um painel de
    resultado dos testes abaixo do editor.
  - *Planejado, ainda não implementado:* uma tela inicial 2D antes do jogo começar — nome
    do jogo com um logo estilizado (referência: um terminal de código flutuando sobre o
    campus ao entardecer, com a rota de um grafo desenhada no chão), e um menu simples
    com **Iniciar novo jogo** e **Carregar jogo** (expansível depois, se precisar). Isso
    muda onde o jogo hoje começa direto na portaria
    ([ADR 0061](decisions/0061-jogo-comeca-na-portaria.md)) — quando essa tela for
    construída, vai precisar de uma ADR própria pra registrar essa mudança de fluxo de
    boot.
- **Funcionalidade:**
  - *Implementado:* o jogador interage com a UI da quest pelo teclado (digitar código) e
    mouse (clicar em Executar, trocar de linguagem); os resultados de cada caso de teste
    aparecem com um ✓ ou ✗ e o valor esperado vs. o que veio, sem precisar reler código.
  - *Planejado:* no menu inicial, navegação por **setas do teclado + Enter**, ou por
    clique do mouse — as duas sempre disponíveis, nunca uma exclusiva da outra.
    **Carregar jogo** lê o autosave que já existe por quest concluída
    ([ADR 0020](decisions/0020-autosave-por-quest.md)) — não existe save manual, o menu só
    dá acesso a ele.
- **Acessibilidade:** navegação por teclado (setas + Enter) sempre em paralelo ao mouse,
  nunca só uma das duas. O indicador de teste passou/falhou já usa ✓/✗ além de
  verde/vermelho — seguro pra daltonismo sem precisar mudar nada. Zoom/tamanho de fonte
  ajustável, suporte a leitor de tela e remapeamento de teclas ficam **fora de escopo**
  desta entrega — decisão da equipe, não uma omissão.

## 7. Considerações técnicas

- **Motor de jogo:** não é um motor único — Electron (empacotamento desktop) + Phaser
  (a cena 2D) + Monaco (o editor) + Vite (build do renderer), em TypeScript strict, Node
  24 LTS, npm workspaces, Biome e Vitest. Ver [Stack em CLAUDE.md](../CLAUDE.md#stack) e
  [docs/architecture.md](architecture.md).
- **Otimização:** execução do código do jogador roda no processo principal, atrás de um
  `Executor` com timeout e kill da árvore de processos inteira
  ([ADR 0009](decisions/0009-execucao-no-main-process.md)); os runtimes de cada
  linguagem vêm embutidos no instalador, sem servidor remoto e sem instalação pelo
  jogador ([ADR 0021](decisions/0021-runtimes-empacotados-no-instalador.md)).

## 8. Cronograma e orçamento

- **Fases de Desenvolvimento:** _(a preencher — divisão do projeto em fases, com marcos
  e entregas)_
- **Metodologia:** _(a preencher — Cascata? Scrum?)_
- **Equipe:** _(a preencher — papéis e responsabilidades dos membros da equipe)_

O mais próximo que existe hoje, no nível técnico, é [docs/roadmap.md](roadmap.md) (ordem
de construção do MVP) — mas isso não substitui o cronograma/equipe formais acima, ainda
não definidos.
