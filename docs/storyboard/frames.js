// The 50 storyboard frames. Each one is a game screen: `world` paints the scene at
// 480x270, `ui` adds the interface at 960x540. Dialogue lines are the ones in
// apps/game/src/renderer/src/content/.
;(() => {
  const SB = window.SB
  const { ui, CAST } = SB

  // ---------- objectives, as the HUD shows them ----------
  const OBJ = {
    q1: 'Fale com o Marcos sobre as placas embaralhadas',
    q2: 'Fale com Dona Célia sobre o acervo embaralhado',
    q3: 'Ajude Seu Raimundo a organizar a fila do Centro de Convivência',
    q4: 'Enfrente o NULL no Bloco de Tecnologia',
  }
  const hud = (done, current) => [
    ...done.map((k) => ({ text: OBJ[k], state: 'done' })),
    ...(current ? [{ text: OBJ[current], state: 'current' }] : []),
  ]

  // ---------- Portaria ----------
  const POR = { x: 72, y: 24, w: 336, h: 224 }
  function portaria(k, s = {}) {
    k.backdrop()
    k.floor(POR, '#8a8f9e', '#80859a')
    k.wall(POR, 40, '#cfc6b2')
    k.border(POR)
    const screens = s.screens ?? 'on'
    k.screen(150, 32, 40, 22, screens)
    k.screen(220, 32, 40, 22, screens)
    k.screen(290, 32, 40, 22, screens)
    // Sign panel: the building names the cipher scrambled
    k.board(88, 74, 76, 44)
    const signs = s.signs ?? 'ok'
    const lines =
      signs === 'ok'
        ? ['BIBLIOTECA', 'CONVIVENCIA', 'BLOCO TEC']
        : ['ELEOLRWHFD', 'FRQYLYHQFLD', 'EORFR WHF']
    lines.forEach((t, i) => {
      k.label(126, 82 + i * 12, t, {
        color: signs === 'ok' ? '#ffd76a' : '#ff9e5e',
        size: 6.5,
        bold: true,
      })
    })
    if (s.sparks) {
      k.sparkle(170, 80)
      k.sparkle(162, 112)
    }
    // Guard booth
    if (s.marcos !== false) k.sprite(CAST.marcos, s.marcosX ?? 240, 98, s.marcosDir ?? 'down')
    k.desk(200, 96, 80, 20)
    k.monitor(214, 86, screens === 'null' ? 'null' : 'on')
    // Turnstiles
    const light = s.gate ?? 'red'
    k.turnstile(200, 168, light)
    k.turnstile(240, 168, light)
    k.turnstile(280, 168, light)
    k.door(228, 220)
    k.plant(90, 240)
    k.plant(392, 240)
    k.plant(392, 92)
  }

  // ---------- Biblioteca ----------
  const BIB = { x: 32, y: 20, w: 416, h: 232 }
  const TREE = {
    50: [280, 70],
    30: [210, 116],
    70: [350, 116],
    20: [175, 162],
    40: [245, 162],
    60: [315, 162],
    80: [385, 162],
  }
  const EDGES = [
    [50, 30],
    [50, 70],
    [30, 20],
    [30, 40],
    [70, 60],
    [70, 80],
  ]
  function biblioteca(k, s = {}) {
    k.backdrop()
    k.planks(BIB, '#c89b6d', '#bf9163')
    k.wall(BIB, 40, '#e8dcc0')
    k.border(BIB)
    for (const wx of [70, 140, 380, 420]) k.window(wx, 28, 20, 18)
    // Dona Célia's counter and terminal
    if (s.celia !== false) k.sprite(CAST.celia, 86, 96, 'down')
    k.desk(52, 94, 76, 18, '#7d5a3c', '#5e4129')
    k.monitor(100, 84, s.terminal ?? 'on')
    k.table(56, 176, 54, 14)
    k.table(56, 214, 54, 14)
    k.door(228, 224)
    const tree = s.tree ?? 'fallen'
    if (tree === 'fallen') {
      const pos = Object.values(TREE)
      pos.forEach(([x, y], i) => {
        k.fallenShelf(x - 22 + (i % 2 ? 6 : -4), y + (i % 3) * 3)
      })
    } else {
      // Carpet runners show the tree's branches between shelves
      for (const [a, b] of EDGES) {
        const [ax, ay] = TREE[a]
        const [bx, by] = TREE[b]
        k.l.strokeStyle = '#9c3f3f'
        k.l.lineWidth = 5
        k.l.beginPath()
        k.l.moveTo(ax, ay + 26)
        k.l.lineTo(bx, by)
        k.l.stroke()
      }
      for (const [code, [x, y]] of Object.entries(TREE)) {
        const dim = s.path !== undefined && !s.path.includes(Number(code))
        k.shelf(x - 20, y, 40, 26, dim)
        k.label(x, y - 5, code, {
          color: '#fff3d6',
          size: 6.5,
          bold: true,
          bg: 'rgba(40,24,12,0.8)',
        })
      }
      if (s.path) {
        k.glowLine(s.path.map((c) => [TREE[c][0], TREE[c][1] + 13]))
        const last = s.path[s.path.length - 1]
        k.highlight(TREE[last][0] - 20, TREE[last][1], 40, 26)
      }
    }
  }

  // ---------- Centro de Convivência ----------
  const CC = { x: 32, y: 20, w: 416, h: 232 }
  const STUDENTS = ['hat_girl', 'young_girl', 'grass_boss', 'water_boss', 'fire_boss']
  function convivencia(k, s = {}) {
    k.backdrop()
    k.floor(CC, '#ddd7c9', '#d2cbbb')
    k.wall(CC, 40, '#e0a96d')
    k.border(CC)
    k.board(170, 25, 110, 22, '#3a2a1a')
    k.label(225, 36, 'CARDÁPIO DO DIA', { color: '#ffd76a', size: 6.5, bold: true })
    if (s.raimundo !== false) k.sprite(CAST.raimundo, s.raimundoX ?? 150, 80, 'down')
    k.counter(60, 78, 170)
    k.foodPans(68, 79, 5)
    // RU turnstile with its screen
    k.turnstile(252, 100, s.gate ?? 'red')
    k.screen(238, 64, 28, 16, s.gate === 'green' ? 'ok' : 'error')
    k.table(64, 150, 130, 14)
    k.bench(64, 142, 130)
    k.bench(64, 170, 130)
    k.table(270, 190, 150, 14)
    k.bench(270, 182, 150)
    k.bench(270, 210, 150)
    k.door(228, 224)
    if (s.queue === 'line') {
      STUDENTS.forEach((name, i) => {
        k.sprite(name, 286 + i * 24, 112, 'left')
      })
    } else if (s.queue === 'served') {
      STUDENTS.slice(0, 3).forEach((name, i) => {
        k.sprite(name, 286 + i * 24, 112, 'left')
      })
      k.sprite(STUDENTS[3], 110, 140, 'down')
      k.sprite(STUDENTS[4], 330, 178, 'down')
    } else {
      const spots = [
        [292, 112, 'left'],
        [340, 128, 'up'],
        [306, 150, 'right'],
        [262, 136, 'down'],
        [372, 104, 'left'],
      ]
      STUDENTS.forEach((name, i) => {
        k.sprite(name, spots[i][0], spots[i][1], spots[i][2])
      })
      for (const [x, y] of spots.slice(0, 3))
        k.label(x + 10, y - 36, '!', { color: '#ff9e5e', size: 8, bold: true })
    }
  }

  // ---------- Bloco de Tecnologia ----------
  const TEC = { x: 24, y: 16, w: 432, h: 240 }
  function tecnologia(k, s = {}) {
    k.backdrop('#0b0c12')
    k.floor(TEC, '#1c2030', '#20253a')
    k.wall(TEC, 44, '#121522', '#00000066')
    k.border(TEC, '#0a0b10')
    const mode = s.racks ?? 'null'
    for (let x = 40; x < 440; x += 34) k.rack(x, 22, 26, 38, mode)
    for (let y = 80; y < 220; y += 44) {
      k.rack(36, y, 22, 36, mode)
      k.rack(422, y, 22, 36, mode)
    }
    k.cables(60, 60, 200, 230)
    k.cables(420, 60, 300, 240)
    k.cables(140, 60, 120, 240)
    k.door(228, 228)
  }

  // ---------- Campus ----------
  const SPOTS = {
    POR: { x: 44, door: 176 },
    BIB: { x: 128, door: 150 },
    CC: { x: 200, door: 150 },
    TEC: { x: 272, door: 150 },
  }
  function campus(k, s = {}) {
    const corrupted = s.state !== 'restored'
    k.rect(0, 0, 480, 270, corrupted ? '#5f9a46' : '#6fb34a')
    for (let i = 0; i < 160; i++)
      k.rect(k.random() * 480, k.random() * 270, 2, 2, corrupted ? '#4f8a3c' : '#5ea43e')
    // Road and sidewalks
    k.rect(0, 188, 480, 26, '#5d6170')
    for (let x = 6; x < 480; x += 28) k.rect(x, 200, 14, 2, '#e8e2c8')
    k.rect(0, 180, 480, 8, '#cfcabd')
    k.rect(0, 214, 480, 8, '#cfcabd')
    for (const spot of Object.values(SPOTS))
      k.rect(spot.x - 8, spot.door, 16, 180 - spot.door, '#cfcabd')
    // Buildings
    k.building('block_gray', 412, 150)
    k.building('apartment_red', 458, 150)
    k.building('building_cream', SPOTS.BIB.x, 150)
    k.building('hall_orange', SPOTS.CC.x, 150)
    k.building('tower_dark', SPOTS.TEC.x, 150)
    // Portaria: a small booth with its turnstile
    k.rect(24, 140, 40, 36, '#cfc6b2')
    k.rect(24, 134, 40, 8, '#8b5a33')
    k.rect(38, 158, 12, 18, '#5a3d24')
    if (corrupted) {
      // NULL lights the Bloco de Tecnologia's windows green
      const tx = SPOTS.TEC.x
      for (const [wx, wy] of [
        [tx - 15, 46],
        [tx + 3, 46],
        [tx - 15, 80],
        [tx + 3, 80],
        [tx - 15, 112],
      ])
        k.rect(wx, wy, 10, 8, '#3dff7a')
      k.screen(330, 120, 30, 18, 'null')
    } else {
      k.screen(330, 120, 30, 18, 'on')
    }
    k.rect(343, 140, 4, 40, '#2b2f3f')
    // Trees
    for (const [tx, ty] of [
      [90, 178],
      [186, 236],
      [372, 176],
      [330, 250],
      [460, 236],
      [20, 250],
      [110, 262],
    ])
      k.tree(tx, ty, tx % 3 === 0 ? 'teal_tree_small' : 'green_tree_small', 0.45)
    const labels = {
      POR: 'Portaria',
      BIB: 'Biblioteca',
      CC: 'Convivência',
      TEC: 'Bloco de Tecnologia',
    }
    for (const [id, spot] of Object.entries(SPOTS)) {
      const top = { POR: 128, BIB: 32, CC: 40, TEC: 20 }[id]
      k.label(spot.x, top, labels[id], {
        color: s.target === id ? '#ffe27a' : '#ffffff',
        size: 6,
        bold: true,
        bg: 'rgba(16,17,26,0.75)',
      })
    }
    if (s.target) {
      const t = SPOTS[s.target]
      k.label(t.x, t.door - 8, '▼', { color: '#ffe27a', size: 8, bold: true, glow: true })
    }
    if (s.player) k.sprite(CAST.calouro, s.player[0], s.player[1], s.player[2] ?? 'down')
    for (const extra of s.extras ?? []) k.sprite(extra[0], extra[1], extra[2], extra[3] ?? 'down')
    if (!corrupted) {
      for (let i = 0; i < 12; i++) k.sparkle(20 + k.random() * 440, 20 + k.random() * 150)
    }
  }

  // ---------- quest editor contents ----------
  const ED = {
    placas: {
      title: 'Placas embaralhadas',
      npc: 'Marcos',
      file: 'solution.ts',
      language: 'TypeScript',
      signature: 'decodeSign(text: string, shift: int) -> string',
      lines: [
        {
          speaker: 'Marcos',
          text: 'Ninguém entra no campus com as placas assim. Parece cifra de César: cada letra andou um número fixo de posições.',
        },
        {
          speaker: 'Marcos',
          text: 'Você é de Computação, não é? Decifra pra mim que eu libero a entrada.',
        },
      ],
    },
    arvore: {
      title: 'A árvore do acervo',
      npc: 'Dona Célia',
      file: 'solution.ts',
      language: 'TypeScript',
      signature: 'findBookPath(codes: list<int>, target: int) -> list<int>',
      lines: [
        {
          speaker: 'Dona Célia',
          text: 'O acervo é uma árvore: cada código vai pra esquerda se for menor, pra direita se for maior.',
        },
        {
          speaker: 'Dona Célia',
          text: 'Monta a árvore de novo, na ordem em que os códigos chegaram, e me diz o caminho até o livro. Se ele não estiver lá, caminho vazio.',
        },
      ],
    },
    fila: {
      title: 'Fila do Centro de Convivência',
      npc: 'Seu Raimundo',
      file: 'solution.py',
      language: 'Python',
      signature: 'nextToBeServed(queue: list<string>, served: int) -> string?',
      lines: [
        {
          speaker: 'Seu Raimundo',
          text: 'O sistema do RU travou e essa fila não anda. Cada vez que alguém é atendido, eu perco a conta.',
        },
        {
          speaker: 'Seu Raimundo',
          text: 'Me diz quem está na frente depois que um tanto de gente já foi atendida, sem eu ter que recontar.',
        },
      ],
    },
    confronto: {
      title: 'O confronto',
      npc: 'NULL',
      file: 'solution.ts',
      language: 'TypeScript',
      signature: 'shortestDistance(network: graph, start: string, end: string) -> int',
      lines: [
        { speaker: 'NULL', text: '// me diz a menor distancia da portaria ate mim, pela rede.' },
        {
          speaker: 'NULL',
          text: '// eu ja sei a resposta — a questao e se voce chega nela gastando menos que a minha forca bruta.',
        },
      ],
    },
  }

  const CODE = {
    placasStub: `export function decodeSign(text: string, shift: number): string {
  // Escreva sua solucao aqui.
  throw new Error('Nao implementado')
}`,
    placasBug: `export function decodeSign(text: string, shift: number): string {
  let result = ''
  for (const ch of text) {
    const base = ch >= 'a' && ch <= 'z' ? 97
      : ch >= 'A' && ch <= 'Z' ? 65 : -1
    if (base === -1) {
      result += ch
      continue
    }
    const pos = ch.charCodeAt(0) - base - shift
    result += String.fromCharCode(base + pos)
  }
  return result
}`,
    placasFix: `export function decodeSign(text: string, shift: number): string {
  let result = ''
  for (const ch of text) {
    const base = ch >= 'a' && ch <= 'z' ? 97
      : ch >= 'A' && ch <= 'Z' ? 65 : -1
    if (base === -1) {
      result += ch
      continue
    }
    const pos = (ch.charCodeAt(0) - base - shift + 26) % 26
    result += String.fromCharCode(base + pos)
  }
  return result
}`,
    arvoreBug: `type Shelf = { code: number; left?: Shelf; right?: Shelf }

export function findBookPath(codes: number[], target: number): number[] {
  let root: Shelf | undefined
  for (const code of codes) root = insert(root, code)

  const path: number[] = []
  let node = root
  while (node) {
    path.push(node.code)
    if (node.code === target) return path
    node = target < node.code ? node.left : node.right
  }
  return path
}

function insert(node: Shelf | undefined, code: number): Shelf {
  if (!node) return { code }
  if (code < node.code) node.left = insert(node.left, code)
  else node.right = insert(node.right, code)
  return node
}`,
    fila: `def nextToBeServed(queue: list[str], served: int) -> str | None:
    # quem ja foi atendido saiu da frente da fila
    if served < len(queue):
        return queue[served]
    return None`,
    confronto: `import type { Graph } from './graph.ts'

export function shortestDistance(
  network: Graph, start: string, end: string,
): number {
  const dist = new Map<string, number>([[start, 0]])
  const done = new Set<string>()
  while (true) {
    let here: string | undefined
    for (const [id, d] of dist) {
      if (done.has(id)) continue
      if (here === undefined || d < (dist.get(here) ?? Infinity)) here = id
    }
    if (here === undefined) return -1
    const d = dist.get(here) ?? 0
    if (here === end) return d
    done.add(here)
    for (const edge of network.neighbors(here)) {
      if (d + edge.weight < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, d + edge.weight)
      }
    }
  }
}`,
  }
  CODE.arvoreFix = CODE.arvoreBug.replace(
    / {2}return path\n}\n\nfunction/,
    '  return []\n}\n\nfunction',
  )

  const casesPlacas = [
    'Placa da Biblioteca',
    'Frase com espaco e minusculas',
    'Deslocamento maior',
    'Letra no limite do alfabeto',
    'Sem deslocamento',
  ]
  const casesArvore = [
    'Livro na raiz',
    'Livro a esquerda',
    'Livro a direita',
    'Arvore torta',
    'Livro que nao existe',
    'Acervo vazio',
  ]
  const casesFila = [
    'No meio da fila',
    'Ninguem atendido ainda',
    'Ultimo da fila',
    'Fila ja vazia',
    'Fila vazia desde o inicio',
  ]
  const casesConfronto = [
    'Ate o Bloco de Tecnologia',
    'Ate o Centro de Convivencia',
    'Vizinho direto',
    'Origem e destino iguais',
  ]
  const allOk = (names) => names.map((name) => ({ kind: 'case', ok: true, name }))

  const editorOver = (paintWorld, spec) => ({
    world: paintWorld,
    ui: (ctx) => SB.drawEditor(ctx, spec),
  })

  // ---------- the frames ----------
  const F = []
  const add = (frame) => F.push({ n: F.length + 1, ...frame })

  // ===== Abertura =====
  add({
    act: 'Abertura',
    title: 'Tela de título',
    desc: 'O jogo abre no menu, com a trilha do título. “Carregar jogo” só acende quando existir um save automático.',
    tags: ['Menu', 'Trilha: title_screen'],
    screen: (ctx) => SB.drawTitle(ctx, 0),
  })

  // ===== Portaria =====
  add({
    act: 'Portaria',
    title: 'Primeiro dia',
    desc: 'O jogo começa dentro da portaria. O calouro chega com Davi; Marcos está na guarita, as telas da parede funcionam e a HUD já mostra o primeiro objetivo.',
    tags: ['Cena', 'HUD de objetivo'],
    world: (k) => {
      portaria(k)
      k.sprite(CAST.calouro, 232, 214, 'up')
      k.sprite(CAST.davi, 254, 218, 'up')
    },
    ui: (ctx) => ui.hud(ctx, hud([], 'q1')),
  })
  add({
    act: 'Portaria',
    title: 'As telas apagam',
    desc: 'Todas as telas piscam ao mesmo tempo. A tela tremida e o som de glitch marcam a chegada do NULL.',
    tags: ['Efeito de glitch', 'Som: glitch'],
    world: (k) => {
      portaria(k, { screens: 'null' })
      k.sprite(CAST.calouro, 232, 200, 'up')
      k.sprite(CAST.davi, 256, 204, 'up')
      k.glitch(1.4)
    },
    ui: (ctx) => ui.hud(ctx, hud([], 'q1')),
  })
  add({
    act: 'Portaria',
    title: 'NULL',
    desc: 'Plano fechado na tela da parede: um texto verde pulsa. É a assinatura do vírus em toda tela do campus.',
    tags: ['Close', 'NULL'],
    world: (k) => {
      k.backdrop('#05110a')
      k.rect(40, 30, 400, 210, '#2b2f3f')
      k.rect(52, 42, 376, 186, '#03100a')
      for (let i = 0; i < 40; i++)
        k.rect(60 + k.random() * 350, 50 + k.random() * 170, 8 + k.random() * 30, 2, '#0f3a22')
      k.label(240, 128, 'NULL', { color: '#5dff8f', size: 40, bold: true, glow: true })
      k.label(240, 176, '> acesso total ao sistema do campus', { color: '#2fbf63', size: 7 })
      k.glitch(1)
    },
  })
  add({
    act: 'Portaria',
    title: 'Davi “ajuda”',
    desc: 'Davi corre até o painel de placas e reinicia tudo. Faíscas, e as placas ficam ilegíveis.',
    tags: ['Cena', 'Alívio cômico'],
    world: (k) => {
      portaria(k, { screens: 'null', signs: 'scrambled', sparks: true })
      k.sprite(CAST.davi, 126, 140, 'up')
      k.sprite(CAST.calouro, 220, 196, 'left')
    },
    ui: (ctx) => ui.hud(ctx, hud([], 'q1')),
  })
  add({
    act: 'Portaria',
    title: 'Placas embaralhadas',
    desc: 'Close no painel: os nomes dos prédios viraram sopa de letrinha. “ELEOLRWHFD” é “BIBLIOTECA” deslocada três letras.',
    tags: ['Close', 'Pista do desafio'],
    world: (k) => {
      k.backdrop('#2b2622')
      k.rect(60, 40, 360, 190, '#5a4a36')
      k.rect(72, 52, 336, 166, '#2a2d3d')
      ;['ELEOLRWHFD', 'FRQYLYHQFLD', 'EORFR WHF'].forEach((t, i) => {
        k.label(240, 90 + i * 46, t, { color: '#ff9e5e', size: 18, bold: true })
      })
      k.glitch(0.6)
    },
  })
  add({
    act: 'Portaria',
    title: 'Falar com o Marcos',
    desc: 'Perto do NPC, o jogo mostra a tecla E. As catracas estão vermelhas: ninguém passa.',
    tags: ['Prompt E', 'Catraca travada'],
    world: (k) => {
      portaria(k, { screens: 'null', signs: 'scrambled' })
      k.sprite(CAST.calouro, 240, 140, 'up')
      k.sprite(CAST.davi, 150, 150, 'right')
    },
    ui: (ctx) => {
      ui.hud(ctx, hud([], 'q1'))
      ui.prompt(ctx, 240, 66, 'Falar')
    },
  })
  add({
    act: 'Portaria',
    title: 'Diálogo: Davi',
    desc: 'A conversa passa pela caixa de diálogo antes de o editor abrir.',
    tags: ['Caixa de diálogo'],
    world: (k) => {
      portaria(k, { screens: 'null', signs: 'scrambled' })
      k.sprite(CAST.calouro, 240, 140, 'up')
      k.sprite(CAST.davi, 214, 146, 'right')
    },
    ui: (ctx) =>
      ui.dialogue(
        ctx,
        'Davi',
        'Eu só reiniciei o painel! Juro! Aí apareceu esse NULL e as placas viraram sopa de letrinha.',
      ),
  })
  add({
    act: 'Portaria',
    title: 'Diálogo: Marcos',
    desc: 'Marcos explica a cifra: cada letra andou um número fixo de posições.',
    tags: ['Caixa de diálogo'],
    world: (k) => {
      portaria(k, { screens: 'null', signs: 'scrambled' })
      k.sprite(CAST.calouro, 240, 140, 'up')
      k.sprite(CAST.davi, 214, 146, 'right')
    },
    ui: (ctx) =>
      ui.dialogue(
        ctx,
        'Marcos',
        'Ninguém entra no campus com as placas assim. Parece cifra de César: cada letra andou um número fixo de posições.',
      ),
  })
  add({
    act: 'Portaria',
    title: 'O pedido',
    desc: 'Última fala antes do desafio. Ao fechar a caixa, o editor abre.',
    tags: ['Caixa de diálogo'],
    world: (k) => {
      portaria(k, { screens: 'null', signs: 'scrambled' })
      k.sprite(CAST.calouro, 240, 140, 'up')
      k.sprite(CAST.davi, 214, 146, 'right')
    },
    ui: (ctx) =>
      ui.dialogue(
        ctx,
        'Marcos',
        'Você é de Computação, não é? Decifra pra mim que eu libero a entrada.',
      ),
  })
  add({
    act: 'Portaria',
    title: 'O editor abre',
    desc: 'O editor de verdade: o pedido do NPC e a assinatura à esquerda, linguagem e servidor de linguagem no topo. O stub já vem gerado na linguagem escolhida.',
    tags: ['Editor', 'Stub gerado', 'TypeScript'],
    ...editorOver((k) => portaria(k, { screens: 'null', signs: 'scrambled' }), {
      ...ED.placas,
      code: CODE.placasStub,
      cursor: 2,
      results: [],
    }),
  })
  add({
    act: 'Portaria',
    title: 'Quase',
    desc: 'O jogador executa. Quatro casos passam; o da letra no limite do alfabeto falha, com o esperado e o que veio.',
    tags: ['Editor', 'Testes', 'Falha sem punição'],
    ...editorOver((k) => portaria(k, { screens: 'null', signs: 'scrambled' }), {
      ...ED.placas,
      code: CODE.placasBug,
      marked: [10],
      results: [
        ...allOk(casesPlacas.slice(0, 3)),
        { kind: 'case', ok: false, name: casesPlacas[3], detail: 'esperado "Zebra", veio "@ebra"' },
        { kind: 'case', ok: true, name: casesPlacas[4] },
        { kind: 'summary', text: '4/5 testes passaram' },
      ],
    }),
  })
  add({
    act: 'Portaria',
    title: 'Aritmética modular',
    desc: 'O jogador corrige com “+ 26) % 26” e roda de novo: 5/5. A fala de sucesso do NPC aparece no painel.',
    tags: ['Editor', 'Matemática', '5/5'],
    ...editorOver((k) => portaria(k, { screens: 'null', signs: 'scrambled' }), {
      ...ED.placas,
      code: CODE.placasFix,
      marked: [10],
      markColor: 'rgba(110,231,160,0.14)',
      results: [
        ...allOk(casesPlacas),
        { kind: 'summary', text: '5/5 testes passaram' },
        { kind: 'success', text: 'Voltou tudo ao normal. Pode passar — e leva o minimapa.' },
      ],
    }),
  })
  add({
    act: 'Portaria',
    title: 'O código muda o mundo',
    desc: 'De volta à cena: as placas mostram os nomes certos, as catracas ficam verdes e o minimapa aparece. O primeiro objetivo é riscado na HUD.',
    tags: ['Consequência', 'Minimapa', 'HUD'],
    world: (k) => {
      portaria(k, { screens: 'null', signs: 'ok', gate: 'green' })
      k.sprite(CAST.calouro, 240, 140, 'up')
      k.sprite(CAST.davi, 214, 146, 'right')
      k.sparkle(110, 84)
      k.sparkle(150, 108)
      k.sparkle(200, 158)
      k.sparkle(280, 158)
    },
    ui: (ctx) => {
      ui.minimap(ctx, 'POR')
      ui.hud(ctx, hud(['q1'], 'q2'))
      ui.toast(ctx, 'Minimapa liberado')
    },
  })
  add({
    act: 'Portaria',
    title: 'Diálogo: Davi',
    desc: 'Davi leva o crédito.',
    tags: ['Caixa de diálogo', 'Alívio cômico'],
    world: (k) => {
      portaria(k, { screens: 'null', gate: 'green' })
      k.sprite(CAST.calouro, 240, 140, 'left')
      k.sprite(CAST.davi, 214, 146, 'right')
    },
    ui: (ctx) => ui.dialogue(ctx, 'Davi', 'Viu? Eu ajudei. Indiretamente.'),
  })
  add({
    act: 'Portaria',
    title: 'A porta para o campus',
    desc: 'A porta da portaria agora leva ao campus. Antes do desafio, ela só repetia o aviso do Marcos.',
    tags: ['Prompt E', 'Porta'],
    world: (k) => {
      portaria(k, { screens: 'null', gate: 'green' })
      k.sprite(CAST.calouro, 240, 212, 'down')
      k.sprite(CAST.davi, 300, 130, 'down')
    },
    ui: (ctx) => {
      ui.minimap(ctx, 'POR')
      ui.hud(ctx, hud(['q1'], 'q2'))
      ui.prompt(ctx, 240, 182, 'Sair')
    },
  })

  // ===== Campus → Biblioteca =====
  add({
    act: 'Campus',
    title: 'O campus tomado',
    desc: 'O campus aberto, ainda com o NULL: o painel da rua mostra a assinatura dele e as janelas do Bloco de Tecnologia brilham verde. O minimapa marca a Biblioteca.',
    tags: ['Campus', 'Minimapa', 'Pista visual'],
    world: (k) =>
      campus(k, {
        target: 'BIB',
        player: [44, 196, 'right'],
        extras: [
          ['hat_girl', 210, 226, 'left'],
          ['young_girl', 270, 196, 'up'],
        ],
      }),
    ui: (ctx) => {
      ui.minimap(ctx, 'POR', 'BIB')
      ui.hud(ctx, hud(['q1'], 'q2'))
    },
  })
  add({
    act: 'Campus',
    title: 'Entrar na Biblioteca',
    desc: 'Na frente do prédio, a tecla E troca de cena.',
    tags: ['Prompt E', 'Troca de cena'],
    world: (k) => campus(k, { target: 'BIB', player: [128, 176, 'up'] }),
    ui: (ctx) => {
      ui.minimap(ctx, 'BIB', 'BIB')
      ui.hud(ctx, hud(['q1'], 'q2'))
      ui.prompt(ctx, 128, 140, 'Entrar')
    },
  })

  // ===== Biblioteca =====
  add({
    act: 'Biblioteca',
    title: 'O acervo derrubado',
    desc: 'Estantes no chão, livros espalhados. A trilha muda para a da Biblioteca. Dona Célia está no balcão.',
    tags: ['Cena', 'Trilha: shrine_of_mysteries'],
    world: (k) => {
      biblioteca(k, { tree: 'fallen', terminal: 'null' })
      k.sprite(CAST.calouro, 240, 236, 'up')
    },
    ui: (ctx) => ui.hud(ctx, hud(['q1'], 'q2')),
  })
  add({
    act: 'Biblioteca',
    title: 'Diálogo: Dona Célia',
    desc: 'Ela explica como o acervo funcionava: uma árvore.',
    tags: ['Caixa de diálogo'],
    world: (k) => {
      biblioteca(k, { tree: 'fallen', terminal: 'null' })
      k.sprite(CAST.calouro, 90, 140, 'up')
    },
    ui: (ctx) =>
      ui.dialogue(
        ctx,
        'Dona Célia',
        'O acervo é uma árvore: cada código vai pra esquerda se for menor, pra direita se for maior. Ou era, até hoje cedo.',
      ),
  })
  add({
    act: 'Biblioteca',
    title: 'NULL fala pela primeira vez',
    desc: 'O terminal do balcão interrompe a conversa. O nome do NULL aparece em verde na caixa de diálogo.',
    tags: ['Caixa de diálogo', 'NULL', 'Efeito de glitch'],
    world: (k) => {
      biblioteca(k, { tree: 'fallen', terminal: 'null' })
      k.sprite(CAST.calouro, 90, 140, 'up')
      k.glitch(0.8)
    },
    ui: (ctx) =>
      ui.dialogue(ctx, 'NULL', '// boa sorte, calouro. trinta mil livros e nenhuma arvore de pe.'),
  })
  add({
    act: 'Biblioteca',
    title: 'O pedido',
    desc: 'Dona Célia pede o caminho até o livro, não só se ele existe.',
    tags: ['Caixa de diálogo'],
    world: (k) => {
      biblioteca(k, { tree: 'fallen', terminal: 'null' })
      k.sprite(CAST.calouro, 90, 140, 'up')
    },
    ui: (ctx) =>
      ui.dialogue(
        ctx,
        'Dona Célia',
        'Monta a árvore de novo, na ordem em que os códigos chegaram, e me diz o caminho até o livro. Se ele não estiver lá, caminho vazio.',
      ),
  })
  add({
    act: 'Biblioteca',
    title: 'Árvore binária de busca',
    desc: 'O jogador monta a árvore e desce por ela. Esquece o caso do livro inexistente: devolve o caminho percorrido em vez de vazio.',
    tags: ['Editor', 'Estrutura de dados', 'Testes'],
    ...editorOver((k) => biblioteca(k, { tree: 'fallen', terminal: 'null' }), {
      ...ED.arvore,
      code: CODE.arvoreBug,
      marked: [14],
      resultsHeight: 176,
      results: [
        ...allOk(casesArvore.slice(0, 4)),
        { kind: 'case', ok: false, name: casesArvore[4], detail: 'esperado [], veio [50,70,60]' },
        { kind: 'case', ok: true, name: casesArvore[5] },
        { kind: 'summary', text: '5/6 testes passaram' },
      ],
    }),
  })
  add({
    act: 'Biblioteca',
    title: '6/6',
    desc: 'Troca “return path” por “return []” no fim da busca. Todos os casos passam.',
    tags: ['Editor', '6/6'],
    ...editorOver((k) => biblioteca(k, { tree: 'fallen', terminal: 'null' }), {
      ...ED.arvore,
      code: CODE.arvoreFix,
      marked: [14],
      markColor: 'rgba(110,231,160,0.14)',
      resultsHeight: 204,
      results: [
        ...allOk(casesArvore),
        { kind: 'summary', text: '6/6 testes passaram' },
        {
          kind: 'success',
          text: 'Achou. E olha: no fim desse caminho tem um acesso estranho, vindo do Centro de Convivência.',
        },
      ],
    }),
  })
  add({
    act: 'Biblioteca',
    title: 'A árvore de pé',
    desc: 'As estantes se levantam na forma da árvore que o código montou, cada uma com o seu código. Os tapetes são os galhos.',
    tags: ['Consequência', 'Árvore no cenário'],
    world: (k) => {
      biblioteca(k, { tree: 'standing' })
      k.sprite(CAST.calouro, 280, 236, 'up')
      for (const [x, y] of Object.values(TREE)) k.sparkle(x + 18, y - 2)
    },
    ui: (ctx) => ui.hud(ctx, hud(['q1', 'q2'])),
  })
  add({
    act: 'Biblioteca',
    title: 'O caminho até o livro',
    desc: 'O retorno do código acende no chão: 50 → 70 → 60. O calouro segue o caminho até a estante certa.',
    tags: ['Retorno real do código', 'Caminho no cenário'],
    world: (k) => {
      biblioteca(k, { tree: 'standing', path: [50, 70, 60] })
      k.sprite(CAST.calouro, 315, 214, 'up')
    },
    ui: (ctx) => ui.hud(ctx, hud(['q1', 'q2'])),
  })
  add({
    act: 'Biblioteca',
    title: 'O rastro',
    desc: 'Dentro do livro, um registro de acesso deixado pelo NULL: a origem é o Centro de Convivência.',
    tags: ['Close', 'Pista'],
    world: (k) => {
      k.backdrop('#2b2018')
      k.rect(70, 30, 340, 210, '#f3ead2')
      k.rect(238, 30, 4, 210, '#d8cba8')
      for (let y = 60; y < 220; y += 14) {
        k.rect(90, y, 130 - (y % 3) * 10, 2, '#c9bc98')
        k.rect(258, y, 130 - (y % 5) * 6, 2, '#c9bc98')
      }
      k.rect(256, 120, 140, 46, '#05110a')
      k.label(326, 134, 'acesso: CONVIVENCIA', { color: '#5dff8f', size: 7, bold: true })
      k.label(326, 152, 'assinado: NULL', { color: '#2fbf63', size: 6.5 })
    },
  })
  add({
    act: 'Biblioteca',
    title: 'Diálogo: Dona Célia',
    desc: 'Ela aponta o próximo lugar. A HUD já mostra o novo objetivo.',
    tags: ['Caixa de diálogo', 'HUD'],
    world: (k) => {
      biblioteca(k, { tree: 'standing', terminal: 'on' })
      k.sprite(CAST.calouro, 90, 140, 'up')
    },
    ui: (ctx) => {
      ui.hud(ctx, hud(['q1', 'q2'], 'q3'))
      ui.dialogue(
        ctx,
        'Dona Célia',
        'Achou. E olha: no fim desse caminho tem um acesso estranho, vindo do Centro de Convivência.',
      )
    },
  })

  // ===== Campus → Convivência =====
  add({
    act: 'Campus',
    title: 'Rumo ao RU',
    desc: 'O minimapa passa a marcar o Centro de Convivência. Estudantes reclamam na calçada: o RU está fechado.',
    tags: ['Campus', 'Minimapa'],
    world: (k) => {
      campus(k, {
        target: 'CC',
        player: [150, 196, 'right'],
        extras: [
          ['grass_boss', 188, 172, 'down'],
          ['water_boss', 212, 172, 'down'],
        ],
      })
      k.label(200, 152, '?!', { color: '#ff9e5e', size: 8, bold: true })
    },
    ui: (ctx) => {
      ui.minimap(ctx, 'BIB', 'CC')
      ui.hud(ctx, hud(['q1', 'q2'], 'q3'))
    },
  })

  // ===== Centro de Convivência =====
  add({
    act: 'Centro de Convivência',
    title: 'O RU travado',
    desc: 'A catraca do RU mostra erro e a fila virou bagunça. Seu Raimundo está atrás do balcão.',
    tags: ['Cena', 'Catraca travada'],
    world: (k) => {
      convivencia(k)
      k.sprite(CAST.calouro, 240, 236, 'up')
    },
    ui: (ctx) => ui.hud(ctx, hud(['q1', 'q2'], 'q3')),
  })
  add({
    act: 'Centro de Convivência',
    title: 'Diálogo: Seu Raimundo',
    desc: 'O problema: ele perde a conta de quem é o próximo.',
    tags: ['Caixa de diálogo'],
    world: (k) => {
      convivencia(k)
      k.sprite(CAST.calouro, 150, 124, 'up')
    },
    ui: (ctx) =>
      ui.dialogue(
        ctx,
        'Seu Raimundo',
        'O sistema do RU travou e essa fila não anda. Cada vez que alguém é atendido, eu perco a conta.',
      ),
  })
  add({
    act: 'Centro de Convivência',
    title: 'Em outra linguagem',
    desc: 'Toda quest roda em qualquer linguagem. Aqui o jogador troca para Python, e o stub vem no Python certo.',
    tags: ['Editor', 'Python', 'Multi-linguagem'],
    ...editorOver((k) => convivencia(k), {
      ...ED.fila,
      code: `def nextToBeServed(queue: list[str], served: int) -> str | None:
    # Escreva sua solucao aqui.
    raise NotImplementedError("Nao implementado")`,
      cursor: 2,
      results: [],
    }),
  })
  add({
    act: 'Centro de Convivência',
    title: 'A fila anda',
    desc: 'Uma fila: quem foi atendido sai da frente. Passa de primeira.',
    tags: ['Editor', 'Fila', '5/5'],
    ...editorOver((k) => convivencia(k), {
      ...ED.fila,
      code: CODE.fila,
      results: [
        ...allOk(casesFila),
        { kind: 'summary', text: '5/5 testes passaram' },
        {
          kind: 'success',
          text: 'Agora sim, a fila anda! Sabe o que me contaram? As luzes do Bloco de Tecnologia nunca apagam, nem de madrugada.',
        },
      ],
    }),
  })
  add({
    act: 'Centro de Convivência',
    title: 'Fila organizada',
    desc: 'Os estudantes se alinham na frente da catraca, que fica verde. O RU reabre.',
    tags: ['Consequência', 'NPCs se movem'],
    world: (k) => {
      convivencia(k, { queue: 'line', gate: 'green' })
      k.sprite(CAST.calouro, 150, 124, 'up')
      k.sparkle(252, 70)
      k.sparkle(266, 96)
    },
    ui: (ctx) => {
      ui.hud(ctx, hud(['q1', 'q2', 'q3']))
      ui.toast(ctx, 'RU reaberto')
    },
  })
  add({
    act: 'Centro de Convivência',
    title: 'O boato',
    desc: 'Seu Raimundo conta o boato do campus.',
    tags: ['Caixa de diálogo', 'Pista'],
    world: (k) => {
      convivencia(k, { queue: 'served', gate: 'green' })
      k.sprite(CAST.calouro, 150, 124, 'up')
    },
    ui: (ctx) =>
      ui.dialogue(
        ctx,
        'Seu Raimundo',
        'Agora sim, a fila anda! Sabe o que me contaram? As luzes do Bloco de Tecnologia nunca apagam, nem de madrugada.',
      ),
  })
  add({
    act: 'Centro de Convivência',
    title: 'Diálogo: Seu Raimundo',
    desc: 'O último objetivo aparece na HUD.',
    tags: ['Caixa de diálogo', 'HUD'],
    world: (k) => {
      convivencia(k, { queue: 'served', gate: 'green' })
      k.sprite(CAST.calouro, 150, 124, 'up')
    },
    ui: (ctx) => {
      ui.hud(ctx, hud(['q1', 'q2', 'q3'], 'q4'))
      ui.dialogue(ctx, 'Seu Raimundo', 'Dizem que é fantasma. Eu acho que é coisa de computador.')
    },
  })

  // ===== Campus → Bloco de Tecnologia =====
  add({
    act: 'Campus',
    title: 'As luzes verdes',
    desc: 'O minimapa marca o Bloco de Tecnologia. A trilha muda para a do Bloco de Tecnologia.',
    tags: ['Campus', 'Trilha: dungeon'],
    world: (k) => {
      campus(k, { target: 'TEC', player: [230, 198, 'right'] })
      k.shade(0.18, '#0b1a10')
    },
    ui: (ctx) => {
      ui.minimap(ctx, 'CC', 'TEC')
      ui.hud(ctx, hud(['q1', 'q2', 'q3'], 'q4'))
    },
  })
  add({
    act: 'Campus',
    title: 'A porta do Bloco',
    desc: 'Na porta, as janelas piscam e a tela treme: o NULL sabe que o calouro chegou.',
    tags: ['Prompt E', 'Efeito de glitch'],
    world: (k) => {
      campus(k, { target: 'TEC', player: [272, 176, 'up'] })
      k.shade(0.22, '#0b1a10')
      k.glitch(0.7)
    },
    ui: (ctx) => {
      ui.minimap(ctx, 'TEC', 'TEC')
      ui.hud(ctx, hud(['q1', 'q2', 'q3'], 'q4'))
      ui.prompt(ctx, 272, 140, 'Entrar')
    },
  })

  // ===== Bloco de Tecnologia =====
  add({
    act: 'Bloco de Tecnologia',
    title: 'Ninguém',
    desc: 'Corredor escuro, só racks piscando e cabos no chão. Nenhum NPC.',
    tags: ['Cena', 'Iluminação escura'],
    world: (k) => {
      tecnologia(k)
      k.sprite(CAST.calouro, 240, 236, 'up')
      k.vignette(0.7)
    },
    ui: (ctx) => ui.hud(ctx, hud(['q1', 'q2', 'q3'], 'q4')),
  })
  add({
    act: 'Bloco de Tecnologia',
    title: 'NULL aparece',
    desc: 'No centro da sala, o NULL se monta a partir de texto verde. A trilha muda para a do chefe.',
    tags: ['NULL', 'Trilha: the_evil_one'],
    world: (k) => {
      tecnologia(k)
      k.nullEntity(240, 150, 1.4)
      k.sprite(CAST.calouro, 240, 226, 'up')
      k.vignette(0.6)
    },
    ui: (ctx) => ui.hud(ctx, hud(['q1', 'q2', 'q3'], 'q4')),
  })
  add({
    act: 'Bloco de Tecnologia',
    title: 'Diálogo: NULL',
    desc: 'Ele sentiu cada prédio consertado.',
    tags: ['Caixa de diálogo', 'NULL'],
    world: (k) => {
      tecnologia(k)
      k.nullEntity(240, 140, 1.4)
      k.sprite(CAST.calouro, 240, 200, 'up')
      k.vignette(0.6)
    },
    ui: (ctx) =>
      ui.dialogue(
        ctx,
        'NULL',
        '// entao chegou ate aqui. cada predio que voce consertou, eu senti.',
      ),
  })
  add({
    act: 'Bloco de Tecnologia',
    title: 'O desafio',
    desc: 'O duelo: a menor distância pela rede do campus, gastando menos operações que a força bruta dele.',
    tags: ['Caixa de diálogo', 'NULL', 'Duelo de operações'],
    world: (k) => {
      tecnologia(k)
      k.nullEntity(240, 140, 1.4)
      k.sprite(CAST.calouro, 240, 200, 'up')
      k.vignette(0.6)
      k.glitch(0.5)
    },
    ui: (ctx) =>
      ui.dialogue(
        ctx,
        'NULL',
        '// me diz a menor distancia da portaria ate mim, pela rede. eu ja sei a resposta — a questao e se voce chega nela gastando menos que a minha forca bruta.',
      ),
  })
  add({
    act: 'Bloco de Tecnologia',
    title: 'A rede do campus',
    desc: 'Antes de escrever, o jogador vê a rede: os prédios do campus, ligados por caminhos com peso. O direto da Portaria ao Convivência custa 10; o desvio por Biblioteca e Centro Esportivo custa 6.',
    tags: ['Grafo', 'Pesos'],
    world: (k) => {
      k.backdrop('#0b0c12')
      const N = {
        POR: [60, 200, 'Portaria'],
        BIB: [140, 120, 'Biblioteca'],
        GIN: [240, 80, 'C. Esportivo'],
        CC: [250, 200, 'Convivência'],
        AUD: [340, 150, 'Auditório'],
        TEC: [420, 90, 'Bloco Tec.'],
      }
      const E = [
        ['POR', 'CC', 10],
        ['POR', 'BIB', 2],
        ['BIB', 'GIN', 2],
        ['GIN', 'CC', 2],
        ['CC', 'AUD', 2],
        ['AUD', 'TEC', 2],
      ]
      for (const [a, b, wgt] of E) {
        const [ax, ay] = N[a]
        const [bx, by] = N[b]
        k.l.strokeStyle = wgt > 5 ? '#7a3a44' : '#2f6f4f'
        k.l.lineWidth = 2
        k.l.beginPath()
        k.l.moveTo(ax, ay)
        k.l.lineTo(bx, by)
        k.l.stroke()
        k.label((ax + bx) / 2, (ay + by) / 2 - 7, String(wgt), {
          color: wgt > 5 ? '#ff8b8b' : '#6ee7a0',
          size: 7,
          bold: true,
          bg: 'rgba(11,12,18,0.9)',
        })
      }
      for (const [id, [x, y, name]] of Object.entries(N)) {
        k.rect(x - 9, y - 9, 18, 18, id === 'TEC' ? '#3dff7a' : '#7aa2ff')
        k.rect(x - 7, y - 7, 14, 14, '#10121c')
        k.label(x, y + 18, name, { color: '#e8e8f0', size: 6.5 })
      }
      k.label(240, 22, 'rede do campus', { color: '#9aa0be', size: 7, bold: true })
    },
  })
  add({
    act: 'Bloco de Tecnologia',
    title: 'Dijkstra',
    desc: 'O editor do confronto ganha a barra do duelo: a vida do NULL é o orçamento de operações da força bruta dele. O Graph do jogo conta cada vizinho explorado.',
    tags: ['Editor', 'Grafos', 'Duelo de operações'],
    ...editorOver((k) => tecnologia(k), {
      ...ED.confronto,
      code: CODE.confronto,
      resultsHeight: 196,
      lineHeight: 14,
      results: [{ kind: 'running' }],
      running: true,
      duel: { nullHealth: 1, nullOps: 63, playerOps: null },
    }),
  })
  add({
    act: 'Bloco de Tecnologia',
    title: 'Menos que a força bruta',
    desc: 'Todos os casos passam com 5 operações contra 63. A barra do NULL esvazia.',
    tags: ['Editor', '4/4', 'Complexidade'],
    ...editorOver((k) => tecnologia(k), {
      ...ED.confronto,
      code: CODE.confronto,
      resultsHeight: 196,
      lineHeight: 14,
      results: [
        ...allOk(casesConfronto),
        { kind: 'summary', text: '4/4 testes passaram · 5 operacoes' },
      ],
      duel: { nullHealth: 0.04, nullOps: 63, playerOps: 5 },
    }),
  })
  add({
    act: 'Bloco de Tecnologia',
    title: 'NULL cai',
    desc: 'O NULL se desfaz em blocos verdes.',
    tags: ['Caixa de diálogo', 'NULL derrotado'],
    world: (k) => {
      tecnologia(k)
      k.nullEntity(240, 140, 1.4, 0.55)
      k.sprite(CAST.calouro, 240, 200, 'up')
      k.vignette(0.5)
      k.glitch(1.2)
    },
    ui: (ctx) => ui.dialogue(ctx, 'NULL', '// ...impossivel. nenhuma forca bruta vence isso.'),
  })
  add({
    act: 'Bloco de Tecnologia',
    title: 'As máquinas voltam',
    desc: 'Os racks voltam ao verde normal e as luzes acendem. A sala fica clara pela primeira vez.',
    tags: ['Consequência', 'Campus restaurado'],
    world: (k) => {
      tecnologia(k, { racks: 'ok' })
      k.shade(0.0)
      k.sprite(CAST.calouro, 240, 160, 'down')
      for (let i = 0; i < 10; i++) k.sparkle(60 + i * 40, 90 + (i % 3) * 40)
    },
    ui: (ctx) => {
      ui.hud(ctx, hud(['q1', 'q2', 'q3', 'q4']))
      ui.toast(ctx, 'NULL derrotado')
    },
  })

  // ===== Final =====
  add({
    act: 'Final',
    title: 'O campus de volta',
    desc: 'O campus sem o NULL: o painel da rua volta ao normal, as janelas do Bloco apagam e os estudantes voltam a circular. Trilha: town.',
    tags: ['Campus restaurado', 'Trilha: town'],
    world: (k) =>
      campus(k, {
        state: 'restored',
        player: [272, 196, 'down'],
        extras: [
          ['hat_girl', 160, 226, 'right'],
          ['young_girl', 250, 196, 'left'],
          ['grass_boss', 90, 228, 'up'],
        ],
      }),
    ui: (ctx) => ui.minimap(ctx, 'TEC'),
  })
  add({
    act: 'Final',
    title: 'Davi chega',
    desc: 'Davi aparece na porta, atrasado para tudo.',
    tags: ['Caixa de diálogo', 'Alívio cômico'],
    world: (k) =>
      campus(k, {
        state: 'restored',
        player: [272, 196, 'left'],
        extras: [[CAST.davi, 244, 198, 'right']],
      }),
    ui: (ctx) => ui.dialogue(ctx, 'Davi', 'Ué, as telas voltaram! Perdi alguma coisa?'),
  })
  add({
    act: 'Final',
    title: 'Fim',
    desc: 'A tela final resume a partida: as quatro quests concluídas. A partida inteira cabe em até 20 minutos.',
    tags: ['Tela final'],
    screen: (ctx) =>
      SB.drawEnd(ctx, 'Carlos Vinicius · Daniel Luccio · Guilherme Abrunheiro · Henrique'),
  })

  SB.frames = F
})()
