window.SB = (() => {
  // Renderer for the storyboard frames: every frame is drawn as a game screen.
  // The world is painted at 480x270 (16px tiles, 32px characters, the same proportions as the
  // game) and scaled 2x with no smoothing; the interface (dialogue box, objective HUD, quest
  // editor) is drawn on top at 960x540, using the game's own colours and layout.

  const W = 960
  const H = 540
  const LW = 480
  const LH = 270

  const UI = {
    bg: '#1d1f2b',
    panel: '#252838',
    line: '#343850',
    text: '#e8e8f0',
    muted: '#9aa0be',
    ok: '#6ee7a0',
    fail: '#ff8b8b',
    accent: '#7aa2ff',
    hint: '#6b7099',
    nullGreen: '#5dff8f',
  }

  const SPRITES = [
    'player',
    'young_guy',
    'blond',
    'purple_girl',
    'straw',
    'hat_girl',
    'young_girl',
    'grass_boss',
    'water_boss',
    'fire_boss',
    'apartment_red',
    'block_gray',
    'building_cream',
    'hall_orange',
    'tower_dark',
    'green_tree_small',
    'teal_tree_small',
  ]

  /** Who plays whom: the cast maps story characters to the game's character sheets. */
  const CAST = {
    calouro: 'player',
    marcos: 'young_guy',
    davi: 'blond',
    celia: 'purple_girl',
    raimundo: 'straw',
  }

  const images = {}

  function loadAssets(base) {
    return Promise.all(
      SPRITES.map(
        (name) =>
          new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
              images[name] = img
              resolve()
            }
            img.onerror = reject
            img.src = `${base}/${name}.png`
          }),
      ),
    )
  }

  function spriteImage(name) {
    return images[name]
  }

  // Deterministic noise, so a frame looks the same on every load.
  function rng(seed) {
    let a = seed >>> 0
    return () => {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const DIR = { down: 0, left: 1, right: 2, up: 3 }

  /**
   * The drawing kit a frame receives. World calls take low-res coordinates (480x270);
   * labels queued with `label` are drawn crisp at full resolution after the world is scaled.
   */
  function createKit(seed) {
    const low = document.createElement('canvas')
    low.width = LW
    low.height = LH
    const l = low.getContext('2d')
    l.imageSmoothingEnabled = false
    const random = rng(seed)
    const labels = []
    const after = []

    const rect = (x, y, w, h, color) => {
      l.fillStyle = color
      l.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    }

    const kit = {
      l,
      random,
      rect,
      label(x, y, text, opts = {}) {
        labels.push({ x, y, text, ...opts })
      },
      /** Runs `fn(ctx)` on the full-resolution canvas after the world is drawn. */
      overlay(fn) {
        after.push(fn)
      },

      // ---------- surfaces ----------
      backdrop(color = UI.bg) {
        rect(0, 0, LW, LH, color)
      },
      floor(R, c1, c2, size = 16) {
        for (let y = R.y; y < R.y + R.h; y += size) {
          for (let x = R.x; x < R.x + R.w; x += size) {
            const odd = ((x - R.x) / size + (y - R.y) / size) % 2 === 1
            rect(x, y, Math.min(size, R.x + R.w - x), Math.min(size, R.y + R.h - y), odd ? c2 : c1)
          }
        }
      },
      planks(R, c1, c2) {
        for (let y = R.y; y < R.y + R.h; y += 8) {
          const row = (y - R.y) / 8
          rect(R.x, y, R.w, 8, row % 2 ? c1 : c2)
          for (let x = R.x + ((row * 23) % 40); x < R.x + R.w; x += 40)
            rect(x, y, 1, 8, c1 === c2 ? c1 : '#0000001a')
        }
      },
      wall(R, h, color, trim = '#00000033') {
        rect(R.x, R.y, R.w, h, color)
        rect(R.x, R.y + h - 3, R.w, 3, trim)
        rect(R.x, R.y, R.w, 2, '#ffffff22')
      },
      border(R, color = '#3a3226') {
        l.strokeStyle = color
        l.lineWidth = 6
        l.strokeRect(R.x - 3, R.y - 3, R.w + 6, R.h + 6)
      },
      shade(alpha, color = '#000') {
        l.globalAlpha = alpha
        rect(0, 0, LW, LH, color)
        l.globalAlpha = 1
      },
      vignette(strength = 0.55) {
        const g = l.createRadialGradient(LW / 2, LH / 2, 60, LW / 2, LH / 2, 300)
        g.addColorStop(0, 'rgba(0,0,0,0)')
        g.addColorStop(1, `rgba(0,0,0,${strength})`)
        l.fillStyle = g
        l.fillRect(0, 0, LW, LH)
      },

      // ---------- props ----------
      screen(x, y, w, h, state = 'on') {
        rect(x - 2, y - 2, w + 4, h + 4, '#2b2f3f')
        if (state === 'on') {
          rect(x, y, w, h, '#3d6fd6')
          rect(x, y, w, 3, '#6d93e6')
          rect(x + 3, y + h - 5, w - 6, 2, '#a9c1f2')
        } else if (state === 'null') {
          rect(x, y, w, h, '#05110a')
          for (let i = 0; i < 4; i++)
            rect(x + random() * (w - 6), y + random() * (h - 2), 6, 1, '#1f7a43')
          kit.label(x + w / 2, y + h / 2 + 1, 'NULL', {
            color: UI.nullGreen,
            size: Math.min(13, h * 0.9),
            bold: true,
            glow: true,
          })
        } else if (state === 'error') {
          rect(x, y, w, h, '#4a1018')
          kit.label(x + w / 2, y + h / 2 + 1, 'ERRO', {
            color: UI.fail,
            size: Math.min(11, h * 0.8),
            bold: true,
          })
        } else if (state === 'ok') {
          rect(x, y, w, h, '#164a2c')
          kit.label(x + w / 2, y + h / 2 + 1, 'OK', {
            color: UI.ok,
            size: Math.min(11, h * 0.8),
            bold: true,
          })
        } else {
          rect(x, y, w, h, '#0b0c12')
        }
      },
      desk(x, y, w, h, top = '#9a6b45', front = '#7a5236') {
        rect(x, y, w, 5, top)
        rect(x, y + 5, w, h - 5, front)
        rect(x, y + h - 2, w, 2, '#00000040')
      },
      monitor(x, y, state = 'on') {
        kit.screen(x, y, 14, 9, state)
        rect(x + 5, y + 11, 4, 3, '#2b2f3f')
      },
      turnstile(x, y, light = 'red') {
        rect(x - 4, y - 14, 8, 16, '#8d95a8')
        rect(x - 4, y - 14, 8, 2, '#b8bfcf')
        rect(x + 4, y - 9, 14, 3, '#c9cfdc')
        rect(x - 2, y - 12, 4, 3, light === 'green' ? '#34d27a' : '#e0454f')
        rect(x - 5, y + 1, 10, 2, '#00000040')
      },
      door(x, y, open = false) {
        rect(x - 2, y - 2, 28, 30, '#5a3d24')
        rect(x, y, 24, 28, open ? '#1a1410' : '#8b5a33')
        if (!open) {
          rect(x + 3, y + 3, 8, 10, '#9c6a3f')
          rect(x + 13, y + 3, 8, 10, '#9c6a3f')
          rect(x + 18, y + 15, 2, 3, '#e8c76a')
        }
      },
      plant(x, y) {
        rect(x - 5, y - 6, 10, 8, '#8a5a3b')
        rect(x - 7, y - 16, 14, 11, '#3f8f3f')
        rect(x - 4, y - 21, 8, 7, '#57b157')
        rect(x - 9, y - 12, 4, 4, '#2f7a33')
      },
      window(x, y, w, h) {
        rect(x - 2, y - 2, w + 4, h + 4, '#f2ead6')
        rect(x, y, w, h, '#8fd0f2')
        rect(x, y, w, 3, '#c6ecff')
        rect(x + w / 2 - 1, y, 2, h, '#f2ead6')
      },
      board(x, y, w, h, color = '#2a2d3d') {
        rect(x - 2, y - 2, w + 4, h + 4, '#5a4a36')
        rect(x, y, w, h, color)
      },
      shelf(x, y, w = 40, h = 26, dim = false) {
        rect(x, y, w, h, '#5c3d22')
        rect(x + 2, y + 2, w - 4, h - 4, '#3b2716')
        const colors = ['#c0504d', '#4f81bd', '#9bbb59', '#e8b04b', '#8064a2', '#4bacc6', '#d9d9d9']
        for (let row = 0; row < 2; row++) {
          const sy = y + 3 + row * ((h - 4) / 2)
          let sx = x + 3
          while (sx < x + w - 4) {
            const bw = 2 + Math.floor(random() * 2)
            const bh = (h - 4) / 2 - 2 - Math.floor(random() * 2)
            rect(
              sx,
              sy + ((h - 4) / 2 - 2 - bh),
              bw,
              bh,
              colors[Math.floor(random() * colors.length)],
            )
            sx += bw + (random() < 0.2 ? 1 : 0)
          }
          rect(x + 2, sy + (h - 4) / 2 - 2, w - 4, 2, '#5c3d22')
        }
        if (dim) {
          l.globalAlpha = 0.35
          rect(x, y, w, h, '#000')
          l.globalAlpha = 1
        }
      },
      fallenShelf(x, y, w = 44) {
        rect(x, y + 14, w, 9, '#5c3d22')
        rect(x + 2, y + 16, w - 4, 5, '#3b2716')
        kit.scatterBooks(x - 6, y + 4, w + 12, 26, 9)
      },
      scatterBooks(x, y, w, h, n) {
        const colors = ['#c0504d', '#4f81bd', '#9bbb59', '#e8b04b', '#8064a2', '#4bacc6']
        for (let i = 0; i < n; i++) {
          const bx = x + random() * w
          const by = y + random() * h
          const horizontal = random() < 0.5
          rect(
            bx,
            by,
            horizontal ? 6 : 3,
            horizontal ? 3 : 6,
            colors[Math.floor(random() * colors.length)],
          )
        }
      },
      table(x, y, w, h) {
        rect(x, y, w, h, '#b07c4f')
        rect(x, y, w, 2, '#c99568')
        rect(x, y + h, w, 3, '#7a5236')
      },
      bench(x, y, w) {
        rect(x, y, w, 4, '#8b5a33')
        rect(x, y + 4, w, 2, '#5a3d24')
      },
      counter(x, y, w) {
        rect(x, y, w, 6, '#d6dbe3')
        rect(x, y + 6, w, 12, '#9aa3b5')
        rect(x, y + 16, w, 2, '#00000040')
      },
      foodPans(x, y, n) {
        const colors = ['#e8d27a', '#c0504d', '#7fb35a', '#d98c4a', '#f0e6d2']
        for (let i = 0; i < n; i++) {
          rect(x + i * 18, y, 15, 5, '#7d8597')
          rect(x + i * 18 + 1, y + 1, 13, 3, colors[i % colors.length])
        }
      },
      rack(x, y, w = 22, h = 34, mode = 'null') {
        rect(x, y, w, h, '#14161f')
        rect(x + 1, y + 1, w - 2, h - 2, '#1f2330')
        for (let sy = y + 3; sy < y + h - 3; sy += 5) {
          rect(x + 2, sy, w - 4, 3, '#2a2f40')
          for (let i = 0; i < 3; i++) {
            const on = random() < 0.6
            const color =
              mode === 'ok'
                ? '#34d27a'
                : mode === 'null'
                  ? random() < 0.7
                    ? '#3dff7a'
                    : '#ff4d5e'
                  : '#e0454f'
            if (on) rect(x + 3 + i * 3, sy + 1, 1, 1, color)
          }
        }
      },
      cables(x1, y1, x2, y2, color = '#0e1018') {
        l.strokeStyle = color
        l.lineWidth = 2
        l.beginPath()
        l.moveTo(x1, y1)
        l.bezierCurveTo(x1, (y1 + y2) / 2 + 20, x2, (y1 + y2) / 2 - 10, x2, y2)
        l.stroke()
      },

      // ---------- characters ----------
      sprite(name, x, y, dir = 'down', opts = {}) {
        const img = images[name]
        if (img === undefined) return
        const frame = opts.frame ?? 0
        const size = opts.size ?? 32
        l.globalAlpha = opts.alpha ?? 1
        rect(x - 8, y - 2, 16, 3, '#00000033')
        l.drawImage(
          img,
          frame * 128,
          DIR[dir] * 128,
          128,
          128,
          Math.round(x - size / 2),
          Math.round(y - size + 3),
          size,
          size,
        )
        l.globalAlpha = 1
      },
      building(name, x, y, scale = 1) {
        const img = images[name]
        if (img === undefined) return
        const w = img.naturalWidth * scale
        const h = img.naturalHeight * scale
        rect(x - w / 2 - 2, y - 3, w + 6, 5, '#00000030')
        l.drawImage(img, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h))
      },
      tree(x, y, kind = 'green_tree_small', scale = 0.5) {
        kit.building(kind, x, y, scale)
      },

      /** NULL: a silhouette made of green glyph blocks, glitching sideways row by row. */
      nullEntity(x, y, scale = 1, fade = 0) {
        const glow = l.createRadialGradient(x, y - 30 * scale, 4, x, y - 30 * scale, 70 * scale)
        glow.addColorStop(0, `rgba(61,255,122,${0.35 * (1 - fade)})`)
        glow.addColorStop(1, 'rgba(61,255,122,0)')
        l.fillStyle = glow
        l.fillRect(x - 80 * scale, y - 110 * scale, 160 * scale, 140 * scale)
        const head = { cx: x, cy: y - 52 * scale, r: 10 * scale }
        for (let gy = y - 66 * scale; gy < y; gy += 3) {
          const shift = random() < 0.15 ? (random() - 0.5) * 10 * scale : 0
          for (let gx = x - 24 * scale; gx < x + 24 * scale; gx += 3) {
            const t = (gy - (y - 40 * scale)) / (40 * scale)
            const halfBody = (10 + Math.max(0, t) * 12) * scale
            const inHead = Math.hypot(gx - head.cx, gy - head.cy) < head.r
            const inBody = gy > y - 40 * scale && Math.abs(gx - x) < halfBody
            if (!(inHead || inBody)) continue
            if (random() < 0.12 + fade * 0.8) continue
            const c = random()
            rect(gx + shift, gy, 2, 2, c < 0.7 ? '#3dff7a' : c < 0.9 ? '#a8ffc6' : '#0f7a3a')
          }
        }
        if (fade < 0.6) {
          rect(x - 5 * scale, y - 54 * scale, 3 * scale, 2 * scale, '#eafff1')
          rect(x + 2 * scale, y - 54 * scale, 3 * scale, 2 * scale, '#eafff1')
        }
      },

      // ---------- effects ----------
      glitch(level = 1) {
        const strips = Math.round(6 * level)
        for (let i = 0; i < strips; i++) {
          const sy = Math.floor(random() * LH)
          const sh = 2 + Math.floor(random() * 6)
          const dx = Math.round((random() - 0.5) * 24 * level)
          l.drawImage(low, 0, sy, LW, sh, dx, sy, LW, sh)
          if (random() < 0.5) {
            l.globalAlpha = 0.25
            rect(0, sy, LW, sh, random() < 0.5 ? '#3dff7a' : '#ff3d6e')
            l.globalAlpha = 1
          }
        }
      },
      sparkle(x, y) {
        rect(x, y - 3, 1, 7, '#fff6c2')
        rect(x - 3, y, 7, 1, '#fff6c2')
        rect(x - 1, y - 1, 3, 3, '#ffffff')
      },
      glowLine(points, color = '#ffe27a') {
        after.push((ctx) => {
          ctx.save()
          ctx.strokeStyle = color
          ctx.shadowColor = color
          ctx.shadowBlur = 14
          ctx.lineWidth = 5
          ctx.lineCap = 'round'
          ctx.setLineDash([2, 10])
          ctx.beginPath()
          points.forEach(([px, py], i) => {
            i === 0 ? ctx.moveTo(px * 2, py * 2) : ctx.lineTo(px * 2, py * 2)
          })
          ctx.stroke()
          ctx.restore()
        })
      },
      highlight(x, y, w, h, color = '#ffe27a') {
        after.push((ctx) => {
          ctx.save()
          ctx.strokeStyle = color
          ctx.shadowColor = color
          ctx.shadowBlur = 16
          ctx.lineWidth = 3
          ctx.strokeRect(x * 2 - 3, y * 2 - 3, w * 2 + 6, h * 2 + 6)
          ctx.restore()
        })
      },
    }

    return { kit, low, labels, after }
  }

  // ---------- interface, at full resolution ----------

  function wrap(ctx, text, maxWidth) {
    const words = text.split(' ')
    const lines = []
    let line = ''
    for (const word of words) {
      const test = line === '' ? word : `${line} ${word}`
      if (ctx.measureText(test).width > maxWidth && line !== '') {
        lines.push(line)
        line = word
      } else {
        line = test
      }
    }
    if (line !== '') lines.push(line)
    return lines
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  const MONO = 'ui-monospace, Menlo, Consolas, monospace'
  const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif'

  const ui = {
    /** The game's dialogue box: bottom of the screen, speaker in blue, "E para continuar". */
    dialogue(ctx, speaker, text) {
      const m = 12
      const h = 118
      const top = H - h - m
      ctx.fillStyle = 'rgba(29,31,43,0.94)'
      ctx.fillRect(m, top, W - m * 2, h)
      ctx.strokeStyle = UI.line
      ctx.lineWidth = 2
      ctx.strokeRect(m + 1, top + 1, W - m * 2 - 2, h - 2)
      const isNull = speaker === 'NULL'
      ctx.font = `bold 16px ${MONO}`
      ctx.fillStyle = isNull ? UI.nullGreen : UI.accent
      ctx.textBaseline = 'top'
      ctx.fillText(speaker, m * 2 + 4, top + 12)
      ctx.font = `19px ${MONO}`
      ctx.fillStyle = isNull ? '#b8ffd0' : UI.text
      wrap(ctx, text, W - m * 4 - 8)
        .slice(0, 3)
        .forEach((line, i) => {
          ctx.fillText(line, m * 2 + 4, top + 38 + i * 24)
        })
      ctx.font = `13px ${MONO}`
      ctx.fillStyle = UI.hint
      ctx.textAlign = 'right'
      ctx.fillText('E para continuar', W - m * 2 - 4, top + h - 22)
      ctx.textAlign = 'left'
    },

    /** The objective HUD: top-right, "OBJETIVO", completed items struck through. */
    hud(ctx, items) {
      const x = W - 12 - 320
      const y = 12
      ctx.font = `14px ${SANS}`
      const lines = items.flatMap((item) =>
        wrap(ctx, item.text, 290).map((t, i) => ({ ...item, t, first: i === 0 })),
      )
      const h = 36 + lines.length * 19 + 6
      ctx.fillStyle = 'rgba(16,17,26,0.88)'
      roundRect(ctx, x, y, 320, h, 8)
      ctx.fill()
      ctx.strokeStyle = UI.line
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.textBaseline = 'top'
      ctx.font = `bold 11px ${SANS}`
      ctx.fillStyle = UI.muted
      ctx.fillText('O B J E T I V O', x + 14, y + 12)
      ctx.font = `14px ${SANS}`
      lines.forEach((line, i) => {
        const ly = y + 34 + i * 19
        ctx.fillStyle = line.state === 'done' ? UI.muted : UI.accent
        ctx.fillText(line.t, x + 14, ly)
        if (line.state === 'done') {
          const w = ctx.measureText(line.t).width
          ctx.fillRect(x + 14, ly + 8, w, 1.5)
        }
      })
    },

    /** The "E" prompt the game shows near an NPC or a door. */
    prompt(ctx, lx, ly, label) {
      const x = lx * 2
      const y = ly * 2
      ctx.font = `bold 14px ${MONO}`
      const w = ctx.measureText(label).width + 44
      ctx.fillStyle = 'rgba(16,17,26,0.9)'
      roundRect(ctx, x - w / 2, y - 30, w, 28, 6)
      ctx.fill()
      ctx.strokeStyle = UI.accent
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = UI.text
      roundRect(ctx, x - w / 2 + 6, y - 25, 20, 18, 3)
      ctx.fill()
      ctx.fillStyle = UI.bg
      ctx.textBaseline = 'middle'
      ctx.fillText('E', x - w / 2 + 11, y - 15)
      ctx.fillStyle = UI.text
      ctx.fillText(label, x - w / 2 + 34, y - 15)
      ctx.beginPath()
      ctx.moveTo(x - 6, y - 2)
      ctx.lineTo(x + 6, y - 2)
      ctx.lineTo(x, y + 5)
      ctx.closePath()
      ctx.fillStyle = 'rgba(16,17,26,0.9)'
      ctx.fill()
    },

    /** A short banner at the top centre: what the quest just changed in the world. */
    toast(ctx, text, color = UI.ok) {
      ctx.font = `bold 17px ${SANS}`
      const w = ctx.measureText(text).width + 48
      const x = (W - w) / 2
      ctx.fillStyle = 'rgba(16,17,26,0.92)'
      roundRect(ctx, x, 18, w, 40, 8)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = color
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillText(text, W / 2, 39)
      ctx.textAlign = 'left'
    },

    /** The minimap, unlocked by the first quest: buildings as blocks, the player as a dot. */
    minimap(ctx, here, target) {
      const x = 12
      const y = 12
      const w = 190
      const h = 108
      ctx.fillStyle = 'rgba(16,17,26,0.88)'
      roundRect(ctx, x, y, w, h, 8)
      ctx.fill()
      ctx.strokeStyle = UI.line
      ctx.stroke()
      ctx.fillStyle = '#3f7a37'
      ctx.fillRect(x + 8, y + 8, w - 16, h - 16)
      ctx.fillStyle = '#5d6170'
      ctx.fillRect(x + 8, y + 70, w - 16, 10)
      const spots = { POR: [24, 60], BIB: [62, 40], CC: [104, 44], TEC: [158, 34] }
      for (const [id, [sx, sy]] of Object.entries(spots)) {
        ctx.fillStyle = id === target ? '#ffe27a' : id === 'TEC' ? '#1d2a22' : '#d9cdb4'
        ctx.fillRect(x + sx - 7, y + sy - 8, 14, 16)
        ctx.font = `bold 9px ${MONO}`
        ctx.fillStyle = UI.text
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(id, x + sx, y + sy + 10)
      }
      const [px, py] = spots[here] ?? [24, 60]
      ctx.fillStyle = UI.accent
      ctx.beginPath()
      ctx.arc(x + px, y + py + 26, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.textAlign = 'left'
    },
  }

  // ---------- quest editor ----------

  const TS_KEYWORDS =
    /^(export|function|const|let|for|of|if|else|return|while|type|import|from|new|null|undefined|true|false|break|continue|def|in|is|None|not|and|or)$/

  function highlight(line) {
    const tokens = []
    const re = /(\/\/.*$|#.*$)|('[^']*'|"[^"]*")|(\b\d+\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|(.)/g
    for (let m = re.exec(line); m !== null; m = re.exec(line)) {
      if (m[1]) tokens.push([m[1], '#6a9955'])
      else if (m[2]) tokens.push([m[2], '#ce9178'])
      else if (m[3]) tokens.push([m[3], '#b5cea8'])
      else if (m[4]) {
        const word = m[4]
        const next = line.slice(re.lastIndex).trimStart()[0]
        if (TS_KEYWORDS.test(word)) tokens.push([word, '#c586c0'])
        else if (
          /^(string|number|boolean|Map|Set|Shelf|Graph|Edge|str|int|list|Infinity)$/.test(word)
        )
          tokens.push([word, '#4ec9b0'])
        else if (next === '(') tokens.push([word, '#dcdcaa'])
        else tokens.push([word, '#9cdcfe'])
      } else tokens.push([m[0], '#d4d4d4'])
    }
    return tokens
  }

  /**
   * The quest editor as the game shows it (quest-panel.css): the NPC's request and the
   * signature on the left; language, Run and the language-server status on top; Monaco in
   * the middle; the test results below.
   */
  function drawEditor(ctx, spec) {
    ctx.fillStyle = 'rgba(16,17,26,0.95)'
    ctx.fillRect(0, 0, W, H)
    const side = 300

    // Side panel
    ctx.textBaseline = 'top'
    ctx.fillStyle = UI.text
    let titleSize = 21
    ctx.font = `bold ${titleSize}px ${SANS}`
    while (ctx.measureText(spec.title).width > side - 40 && titleSize > 14) {
      titleSize -= 1
      ctx.font = `bold ${titleSize}px ${SANS}`
    }
    ctx.fillText(spec.title, 22, 22)
    ctx.font = `bold 11px ${SANS}`
    ctx.fillStyle = UI.muted
    ctx.fillText(spec.npc.toUpperCase().split('').join(' '), 22, 52)
    ctx.font = `13.5px ${SANS}`
    let y = 78
    for (const line of spec.lines) {
      ctx.fillStyle = line.speaker === 'NULL' ? '#b8ffd0' : UI.text
      for (const t of wrap(ctx, line.text, side - 44)) {
        ctx.fillText(t, 22, y)
        y += 18
      }
      y += 8
    }
    ctx.font = `12px ${MONO}`
    const sig = wrap(ctx, spec.signature.replace(/, /g, ',  '), side - 64)
    const sigH = sig.length * 17 + 20
    ctx.fillStyle = '#1b1d29'
    roundRect(ctx, 22, y + 6, side - 44, sigH, 6)
    ctx.fill()
    ctx.strokeStyle = UI.line
    ctx.stroke()
    ctx.fillStyle = UI.accent
    sig.forEach((t, i) => {
      ctx.fillText(t.replace(/, {2}/g, ', '), 32, y + 16 + i * 17)
    })
    ctx.fillStyle = UI.line
    ctx.fillRect(side, 0, 1, H)

    // Top bar
    const mx = side + 1
    ctx.fillStyle = UI.panel
    ctx.fillRect(mx, 0, W - mx, 52)
    ctx.fillStyle = UI.line
    ctx.fillRect(mx, 52, W - mx, 1)
    ctx.font = `13px ${SANS}`
    ctx.fillStyle = UI.text
    ctx.textBaseline = 'middle'
    ctx.fillText('Linguagem', mx + 16, 26)
    const button = (bx, label, w, active) => {
      ctx.fillStyle = active ? '#3a4370' : '#2f3450'
      roundRect(ctx, bx, 11, w, 30, 6)
      ctx.fill()
      ctx.strokeStyle = active ? UI.accent : UI.line
      ctx.stroke()
      ctx.fillStyle = UI.text
      ctx.fillText(label, bx + 12, 26)
    }
    button(mx + 92, `${spec.language}  ▾`, 128, false)
    button(mx + 232, 'Executar', 86, spec.running === true)
    button(mx + 330, 'Fechar', 70, false)
    ctx.fillStyle = '#2b2f47'
    roundRect(ctx, W - 150, 14, 136, 24, 12)
    ctx.fill()
    ctx.fillStyle = UI.ok
    ctx.font = `12px ${SANS}`
    ctx.fillText('servidor: pronto', W - 136, 26)

    // Monaco
    const resultsH = spec.resultsHeight ?? 168
    const edTop = 53
    const edH = H - edTop - resultsH
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(mx, edTop, W - mx, edH)
    ctx.fillStyle = '#252526'
    ctx.fillRect(mx, edTop, W - mx, 26)
    ctx.font = `12px ${SANS}`
    ctx.fillStyle = '#cccccc'
    ctx.fillText(spec.file, mx + 14, edTop + 13)
    ctx.fillStyle = UI.accent
    ctx.fillRect(mx, edTop + 24, ctx.measureText(spec.file).width + 28, 2)
    ctx.font = `13px ${MONO}`
    ctx.textBaseline = 'top'
    const lineH = spec.lineHeight ?? 17
    ctx.font = `${lineH < 17 ? 12 : 13}px ${MONO}`
    spec.code.split('\n').forEach((codeLine, i) => {
      const ly = edTop + 34 + i * lineH
      if (ly > edTop + edH - lineH) return
      if (spec.marked?.includes(i + 1)) {
        ctx.fillStyle = spec.markColor ?? 'rgba(255,139,139,0.16)'
        ctx.fillRect(mx, ly - 1, W - mx, lineH)
      }
      ctx.fillStyle = '#858585'
      ctx.textAlign = 'right'
      ctx.fillText(String(i + 1), mx + 34, ly)
      ctx.textAlign = 'left'
      let cx = mx + 48
      for (const [text, color] of highlight(codeLine)) {
        ctx.fillStyle = color
        ctx.fillText(text, cx, ly)
        cx += ctx.measureText(text).width
      }
      if (spec.cursor === i + 1) {
        ctx.fillStyle = '#aeafad'
        ctx.fillRect(cx + 1, ly, 2, lineH - 2)
      }
    })

    // Results
    const rTop = H - resultsH
    ctx.fillStyle = '#1b1d29'
    ctx.fillRect(mx, rTop, W - mx, resultsH)
    ctx.fillStyle = UI.line
    ctx.fillRect(mx, rTop, W - mx, 1)
    ctx.font = `13px ${MONO}`
    let ry = rTop + 12
    for (const r of spec.results ?? []) {
      if (r.kind === 'case') {
        ctx.fillStyle = r.ok ? UI.ok : UI.fail
        ctx.fillText(`${r.ok ? '✓' : '✗'} ${r.name}`, mx + 16, ry)
        ry += 19
        if (r.detail) {
          ctx.fillStyle = UI.muted
          ctx.fillText(r.detail, mx + 36, ry)
          ry += 19
        }
      } else if (r.kind === 'summary') {
        ry += 4
        ctx.fillStyle = UI.muted
        ctx.fillText(r.text, mx + 16, ry)
        ry += 19
      } else if (r.kind === 'success') {
        ctx.fillStyle = UI.ok
        for (const t of wrap(ctx, r.text, W - mx - 32)) {
          ctx.fillText(t, mx + 16, ry)
          ry += 19
        }
      } else if (r.kind === 'running') {
        ctx.fillStyle = UI.muted
        ctx.fillText('Executando...', mx + 16, ry)
        ry += 19
      }
    }

    if (spec.duel) drawDuel(ctx, spec.duel)
  }

  /** The operation duel: NULL's health bar is his brute-force budget. */
  function drawDuel(ctx, duel) {
    const x = 318
    const y = H - 60
    const w = W - x - 18
    ctx.fillStyle = 'rgba(5,17,10,0.95)'
    roundRect(ctx, x, y, w, 48, 8)
    ctx.fill()
    ctx.strokeStyle = '#1f7a43'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.font = `bold 12px ${MONO}`
    ctx.textBaseline = 'top'
    ctx.fillStyle = UI.nullGreen
    ctx.fillText('NULL', x + 12, y + 8)
    ctx.fillStyle = '#0b2a17'
    ctx.fillRect(x + 56, y + 8, w - 220, 12)
    ctx.fillStyle = duel.nullHealth > 0.3 ? '#3dff7a' : '#ff4d5e'
    ctx.fillRect(x + 56, y + 8, (w - 220) * duel.nullHealth, 12)
    ctx.fillStyle = UI.muted
    ctx.font = `12px ${MONO}`
    ctx.fillText(`força bruta: ${duel.nullOps} ops`, x + w - 156, y + 8)
    ctx.fillStyle = UI.accent
    ctx.font = `bold 12px ${MONO}`
    ctx.fillText('VOCÊ', x + 12, y + 28)
    ctx.fillStyle = '#16203d'
    ctx.fillRect(x + 56, y + 28, w - 220, 12)
    if (duel.playerOps !== null) {
      ctx.fillStyle = UI.accent
      ctx.fillRect(x + 56, y + 28, (w - 220) * (duel.playerOps / duel.nullOps), 12)
    }
    ctx.fillStyle = UI.muted
    ctx.font = `12px ${MONO}`
    ctx.fillText(
      duel.playerOps === null ? 'aguardando execução' : `sua solução: ${duel.playerOps} ops`,
      x + w - 156,
      y + 28,
    )
  }

  // ---------- whole screens ----------

  function drawTitle(ctx, selected = 0) {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#151724')
    g.addColorStop(1, '#232640')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    const r = rng(7)
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(122,162,255,${0.08 + r() * 0.2})`
      ctx.fillRect(r() * W, r() * H * 0.6, 2, 2)
    }
    // Campus skyline
    ctx.fillStyle = '#10121c'
    const blocks = [
      [60, 120],
      [140, 90],
      [200, 150],
      [300, 110],
      [390, 170],
      [470, 100],
      [560, 140],
      [650, 120],
      [740, 180],
      [820, 95],
      [900, 130],
    ]
    for (const [bx, bh] of blocks) ctx.fillRect(bx, H - bh, 70, bh)
    ctx.fillStyle = '#1f7a43'
    ctx.fillRect(740 + 16, H - 160, 8, 8)
    ctx.fillRect(740 + 40, H - 130, 8, 8)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold 64px ${MONO}`
    ctx.fillStyle = UI.accent
    ctx.fillText('UNIFOR QUEST', W / 2, H / 2 - 120)
    ctx.font = `18px ${MONO}`
    ctx.fillStyle = UI.muted
    ctx.fillText('um dia contra o NULL', W / 2, H / 2 - 66)
    const options = [
      { label: 'Iniciar novo jogo', enabled: true },
      { label: 'Carregar jogo', enabled: false },
    ]
    options.forEach((opt, i) => {
      const oy = H / 2 + i * 44
      ctx.font = `22px ${MONO}`
      ctx.fillStyle = !opt.enabled ? '#55597a' : i === selected ? UI.text : UI.muted
      ctx.fillText(`${i === selected ? '▶ ' : '  '}${opt.label}`, W / 2, oy)
    })
    ctx.font = `13px ${MONO}`
    ctx.fillStyle = UI.hint
    ctx.fillText('setas para escolher · Enter para confirmar', W / 2, H - 24)
    ctx.textAlign = 'left'
  }

  function drawEnd(ctx, team) {
    ctx.fillStyle = '#151724'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold 44px ${MONO}`
    ctx.fillStyle = UI.ok
    ctx.fillText('Campus restaurado', W / 2, 140)
    ctx.font = `18px ${MONO}`
    ctx.fillStyle = UI.muted
    ctx.fillText('NULL derrotado · 4 de 4 quests', W / 2, 196)
    const quests = [
      '✓ Placas embaralhadas',
      '✓ A árvore do acervo',
      '✓ Fila do Centro de Convivência',
      '✓ O confronto',
    ]
    ctx.font = `17px ${MONO}`
    quests.forEach((q, i) => {
      ctx.fillStyle = UI.text
      ctx.fillText(q, W / 2, 252 + i * 28)
    })
    ctx.font = `14px ${MONO}`
    ctx.fillStyle = UI.hint
    ctx.fillText(team, W / 2, H - 56)
    ctx.font = `bold 20px ${MONO}`
    ctx.fillStyle = UI.accent
    ctx.fillText('FIM', W / 2, H - 92)
    ctx.textAlign = 'left'
  }

  /**
   * Draws one frame onto `canvas`. `frame.world(kit)` paints the world; `frame.ui(ctx)`
   * paints the interface on top; `frame.screen(ctx)` replaces both for full-screen frames.
   */
  function renderFrame(canvas, frame) {
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    if (frame.screen) {
      frame.screen(ctx)
      return
    }
    const { kit, low, labels, after } = createKit(frame.n * 9973 + 17)
    frame.world(kit)
    ctx.drawImage(low, 0, 0, W, H)
    for (const fn of after) fn(ctx)
    for (const lb of labels) {
      ctx.save()
      ctx.font = `${lb.bold ? 'bold ' : ''}${(lb.size ?? 11) * 2}px ${MONO}`
      ctx.textAlign = lb.align ?? 'center'
      ctx.textBaseline = 'middle'
      if (lb.glow) {
        ctx.shadowColor = lb.color
        ctx.shadowBlur = 10
      }
      if (lb.bg) {
        const w = ctx.measureText(lb.text).width + 16
        ctx.fillStyle = lb.bg
        ctx.fillRect(lb.x * 2 - w / 2, lb.y * 2 - (lb.size ?? 11) - 4, w, (lb.size ?? 11) * 2 + 8)
      }
      ctx.fillStyle = lb.color ?? UI.text
      ctx.fillText(lb.text, lb.x * 2, lb.y * 2)
      ctx.restore()
    }
    if (frame.ui) frame.ui(ctx)
  }

  return { W, H, CAST, ui, loadAssets, spriteImage, drawEditor, drawTitle, drawEnd, renderFrame }
})()
