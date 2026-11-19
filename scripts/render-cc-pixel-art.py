"""Centro de Convivência (Quest 3) as layered pixel art, 1 art pixel = 1 game pixel (ADR 0075).

Usage (from the repository root):  python scripts/render-cc-pixel-art.py

The layout data (every prop's position, size and collision footprint, the walkable
polygon, the exits) is the same one the CC already had: only the drawing changed. Before,
the art was drawn at 728x544 and doubled, so a pixel of the scenery was twice the size of
a pixel of the characters; now the 1456x1088 world is drawn pixel by pixel, at the
characters' own density, and the scene uses a whole-number zoom.

Generated PNG/JSON/TS are committed; the game never needs Python or Pillow at runtime.
"""
from pathlib import Path
import math
import random
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pixel_kit as k  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'cc' / 'pixel-world'
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1456, 1088

# The CC's footprint, authored at half scale (kept as it was: it is the layout, not the art).
RING = [(320, 44), (408, 44), (445, 56), (501, 79), (559, 97), (640, 117),
        (687, 167), (702, 235), (704, 291), (689, 349), (660, 384), (610, 411),
        (532, 419), (451, 400), (409, 393), (407, 488), (309, 488), (306, 391),
        (262, 405), (198, 417), (142, 403), (89, 376), (55, 332), (27, 276),
        (26, 207), (65, 153), (107, 116), (169, 100), (220, 84), (268, 61)]
OUTER = [(2 * x, 2 * y) for x, y in RING]
INNER = [(round(2 * (x + (15 if x < 364 else -15))), round(2 * (y + (14 if y < 248 else -13))))
         for x, y in RING]

P = {
    'floor': ['#e8c9a0', '#e2c196', '#ecd1aa', '#f2dcb8'], 'grout': '#c7a47d',
    'brick': ['#c97a5c', '#d48a68', '#bf6f53'], 'brick_grout': '#9c5a45',
    'wall_top': '#6f5a5e', 'wall_cap': '#9a8486', 'wall_face': '#b9a29a', 'wall_dark': '#4e3f46',
    'path': ['#b9b1a6', '#c6beb2', '#d1c9bd'], 'path_grout': '#958c84',
    'cream': '#fff2d8', 'cream2': '#f3dfbd',
}

rng = random.Random(26)


# ---------------------------------------------------------------- ground
def build_ground():
    img = Image.new('RGBA', (W, H))
    k.grass_field(img, rng, flowers=0.0009)
    d = ImageDraw.Draw(img)

    # Outside paths to both exits and the campus walkway along the bottom.
    path_mask = Image.new('L', (W, H), 0)
    pm = ImageDraw.Draw(path_mask)
    pm.rectangle((672, 0, 782, 130), fill=255)
    pm.rectangle((652, 880, 804, H - 1), fill=255)
    pm.rectangle((0, 972, W - 1, 1060), fill=255)
    k.paving(img, path_mask, rng, P['path'], P['path_grout'], size=16)
    # a grass verge along the paths
    for y in (970, 971, 1061, 1062):
        k.hline(d, 0, W - 1, y, '#4f8a3c')

    # Trees and flower beds around the building (behind the shell).
    for x, y, r in ((110, 130, 26), (1280, 104, 28), (34, 900, 24), (1386, 882, 26),
                    (900, 40, 22), (328, 50, 20), (1180, 1030, 18), (240, 1030, 18)):
        k.tree(d, x, y, r, rng)
    for x, y in ((96, 946), (170, 100), (1298, 946), (1284, 130), (560, 1018), (880, 1018)):
        k.bush(d, x, y, 14, rng, flowers=6)

    # The shell: a thick stone wall (outer ring) around the walkable floor (inner ring).
    shell = Image.new('L', (W, H), 0)
    ImageDraw.Draw(shell).polygon(OUTER, fill=255)
    floor = Image.new('L', (W, H), 0)
    fd = ImageDraw.Draw(floor)
    fd.polygon(INNER, fill=255)
    fd.rectangle((674, 90, 780, 140), fill=255)    # north doorway
    fd.rectangle((656, 760, 800, 960), fill=255)   # south entrance hall

    # drop shadow of the building on the grass (down-right)
    shade = Image.new('L', (W, H), 0)
    ImageDraw.Draw(shade).polygon([(x + 6, y + 10) for x, y in OUTER], fill=255)
    img.alpha_composite(Image.composite(Image.new('RGBA', (W, H), (30, 40, 30, 70)),
                                        Image.new('RGBA', (W, H), (0, 0, 0, 0)), shade))

    wall = Image.new('RGBA', (W, H), P['wall_top'])
    wd = ImageDraw.Draw(wall)
    for y in range(0, H, 6):                          # stone courses on the wall top
        k.hline(wd, 0, W - 1, y, '#665257')
        for x in range((y // 6) % 2 * 9, W, 18):
            k.vline(wd, x, y, y + 5, '#665257')
    img.paste(wall, (0, 0), shell)
    d.line(OUTER + [OUTER[0]], fill=k.INK, width=3)

    # floor: warm sandstone pavers, a terracotta brick walk down the middle
    k.paving(img, floor, rng, P['floor'], P['grout'], size=16)
    walk = Image.new('L', (W, H), 0)
    ImageDraw.Draw(walk).polygon(
        [(692, 100), (762, 100), (762, 960), (692, 960)], fill=255)
    bricks = Image.new('RGBA', (W, H))
    bd = ImageDraw.Draw(bricks)
    for row, y in enumerate(range(0, H, 6)):
        for x in range(-(row % 2) * 7, W, 14):
            k.rect(bd, x, y, x + 13, y + 5, P['brick_grout'])
            k.rect(bd, x + 1, y + 1, x + 12, y + 4, rng.choice(P['brick']))
            k.hline(bd, x + 1, x + 12, y + 1, '#e3a07e')
    mask = Image.composite(walk, Image.new('L', (W, H), 0), floor)
    img.paste(bricks, (0, 0), mask)
    # inner wall face: a lighter cap where the wall meets the floor, then a soft shadow
    d.line(INNER + [INNER[0]], fill=P['wall_face'], width=5)
    d.line(INNER + [INNER[0]], fill=P['wall_cap'], width=2)
    k.edge_shadow(img, floor, depth=5, alpha=70)

    # stone columns along the perimeter
    for x, y in [(93, 166), (146, 114), (229, 95), (484, 86), (579, 119), (655, 172),
                 (684, 285), (630, 370), (493, 410), (218, 400), (97, 349), (44, 267)]:
        cx, cy = 2 * x, 2 * y
        k.shadow(d, cx - 10, cy + 8, cx + 14, cy + 16)
        k.box(d, cx - 9, cy - 22, cx + 9, cy + 10, P['cream2'])
        k.rect(d, cx - 8, cy - 21, cx - 4, cy + 9, P['cream'])
        k.rect(d, cx + 5, cy - 21, cx + 8, cy + 9, '#d9c3a2')
        k.box(d, cx - 11, cy - 26, cx + 11, cy - 20, P['cream'])
        k.box(d, cx - 11, cy + 8, cx + 11, cy + 13, '#d9c3a2')

    # door mats + door frames at both portals
    for cy in (108, 920):
        k.box(d, 670, cy - 14, 784, cy + 22, '#7a4b3a')
        for x in range(674, 782, 6):
            k.vline(d, x, cy - 11, cy + 19, '#8f5c46')
        k.rect(d, 680, cy - 6, 774, cy + 14, '#5c7f5a')
        k.rect(d, 682, cy - 4, 772, cy + 12, '#6f9a68')
        k.centered_text(img, 727, cy + 1, 'BEM-VINDO' if cy > 500 else 'CC', '#f5e7c3')
        for x in (660, 786):
            k.box(d, x, cy - 30, x + 10, cy + 24, P['cream'])
            k.vline(d, x + 2, cy - 28, cy + 22, '#ffffff')

    # the building's name on a wooden board over the north door, outside
    board_w = k.text_width('UNIFOR • CENTRO DE CONVIVÊNCIA', 2) + 20
    bx0 = 727 - board_w // 2
    k.rshadow(d, bx0 + 3, 56, bx0 + board_w + 3, 82)
    k.box(d, bx0, 52, bx0 + board_w, 78, k.WOOD[2])
    k.hline(d, bx0 + 1, bx0 + board_w - 1, 53, k.WOOD[4])
    k.rect(d, bx0 + 3, 56, bx0 + board_w - 3, 75, k.WOOD[1])
    k.centered_text(img, 727, 61, 'UNIFOR • CENTRO DE CONVIVÊNCIA', P['cream'], 2, k.WOOD[0])
    return img


# ---------------------------------------------------------------- props
props = []


def new_prop(spec, art):
    img = art(spec)
    assert img.size == (spec['width'], spec['height']), (spec['id'], img.size)
    k.save(img, OUT / f"{spec['id']}.png")
    entry = {key: spec[key] for key in ('id', 'kind', 'x', 'y', 'width', 'height')}
    entry['depthY'] = spec['y'] + spec['height']
    entry['solid'] = spec['solid']
    if 'label' in spec:
        entry['label'] = spec['label']
    props.append(entry)


SHOPS = [
    dict(id='bebelu', x=580, y=147, width=274, height=151, label='BEBELU', sub='HAMBÚRGUER',
         tone='#c8553f', awning='#f0a46b', goods='burger', solid=[12, 48, 250, 92]),
    dict(id='restaurante', x=184, y=221, width=250, height=148, label='RESTAURANTE',
         sub='PRATO DO DIA', tone='#a94f55', awning='#e9a08f', goods='plate', solid=[12, 46, 224, 94]),
    dict(id='cafe', x=968, y=217, width=246, height=143, label='CAFÉ', sub='LANCHES E SUCOS',
         tone='#4f8a73', awning='#a9d3a3', goods='cup', solid=[10, 45, 224, 88]),
    dict(id='grafica', x=129, y=411, width=223, height=136, label='GRÁFICA', sub='IMPRESSÕES',
         tone='#4f6fa0', awning='#a8c0e6', goods='paper', solid=[10, 42, 202, 88]),
    dict(id='farmacia', x=161, y=567, width=223, height=141, label='FARMÁCIA +',
         sub='SAÚDE E SERVIÇOS', tone='#2f9a8a', awning='#a2e0d0', goods='pill', solid=[12, 42, 202, 94]),
    dict(id='nost', x=889, y=369, width=266, height=132, label='SELF SERVICE NOST',
         sub='REFEIÇÕES', tone='#cf8340', awning='#f6c777', goods='plate', solid=[12, 48, 242, 78]),
    dict(id='handful', x=903, y=511, width=241, height=115, label='HANDFUL', sub='LANCHES',
         tone='#a8673f', awning='#ebb98a', goods='burger', solid=[10, 38, 219, 71]),
    dict(id='campus-shop', x=1022, y=629, width=223, height=126, label='LOJA DO CAMPUS',
         sub='ARTIGOS UNIFOR', tone='#6c5c9e', awning='#b8ace0', goods='shirt', solid=[12, 42, 200, 78]),
]


def shade(hex_color, f):
    c = hex_color.lstrip('#')
    r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
    if f < 1:
        r, g, b = (int(v * f) for v in (r, g, b))
    else:
        r, g, b = (int(v + (255 - v) * (f - 1)) for v in (r, g, b))
    return f'#{r:02x}{g:02x}{b:02x}'


def goods(d, kind, x, y, srng):
    """A tiny item on a display shelf."""
    if kind == 'burger':
        k.rect(d, x, y, x + 5, y + 1, '#e2a650'); k.rect(d, x, y + 2, x + 5, y + 2, '#5a8a3c')
        k.rect(d, x, y + 3, x + 5, y + 3, '#7b3f2a'); k.rect(d, x, y + 4, x + 5, y + 4, '#e2a650')
    elif kind == 'cup':
        k.rect(d, x + 1, y, x + 4, y + 4, '#f4ecdc'); k.hline(d, x + 1, x + 4, y, '#7b4a32')
        d.point((x + 5, y + 2), fill='#f4ecdc')
    elif kind == 'plate':
        k.rect(d, x, y + 2, x + 6, y + 4, '#f4ecdc')
        k.rect(d, x + 1, y + 1, x + 5, y + 2, srng.choice(('#e0a040', '#6aa84f', '#c8553f')))
    elif kind == 'paper':
        k.rect(d, x, y, x + 4, y + 5, '#ffffff'); k.hline(d, x + 1, x + 3, y + 2, '#8aa0c8')
    elif kind == 'pill':
        k.rect(d, x + 1, y, x + 4, y + 5, srng.choice(('#e8728a', '#f6d36b', '#7fc8e8')))
        k.hline(d, x + 1, x + 4, y, '#ffffff')
    elif kind == 'shirt':
        c = srng.choice(('#3f6fb0', '#c8553f', '#f6d36b', '#ffffff'))
        k.rect(d, x, y, x + 6, y + 1, c); k.rect(d, x + 1, y + 2, x + 5, y + 5, c)


def shop_art(s):
    w, h, tone, aw = s['width'], s['height'], s['tone'], s['awning']
    srng = random.Random(s['id'])
    img, d = k.new(w, h)
    sx, sy, sw, sh = s['solid']
    # ground shadow under the stall
    k.shadow(d, sx - 4, sy + sh - 10, sx + sw + 6, h - 1)
    # back wall of the stall (rises above the floor footprint)
    body_top = 18
    k.box(d, 4, body_top, w - 5, h - 8, shade(tone, 1.55))
    for y in range(body_top + 4, h - 10, 6):          # plank wall
        k.hline(d, 5, w - 6, y, shade(tone, 1.4))
    # sign board on the roof
    k.box(d, 2, 0, w - 3, 22, k.WOOD[1])
    k.rect(d, 4, 2, w - 5, 19, tone)
    k.hline(d, 4, w - 5, 2, shade(tone, 1.35))
    k.hline(d, 4, w - 5, 19, shade(tone, 0.7))
    scale = 2 if k.text_width(s['label'], 2) < w - 24 else 1
    k.centered_text(img, w // 2, 6 if scale == 2 else 9, s['label'], '#fff6e4', scale,
                    shade(tone, 0.55))
    for x in (8, w - 10):                             # little lamps on the board
        k.rect(d, x, 4, x + 2, 6, '#ffe7a0')
    # striped awning with a scalloped edge
    ay0, ay1 = 24, 40
    for i, x in enumerate(range(3, w - 3, 12)):
        col = aw if i % 2 == 0 else '#fff4e2'
        k.rect(d, x, ay0, min(x + 11, w - 4), ay1, col)
        k.hline(d, x, min(x + 11, w - 4), ay0, shade(col, 1.2) if col != '#fff4e2' else '#ffffff')
        blob(d, x + 5, ay1 + 1, 6, 2, col)
    k.hline(d, 3, w - 4, ay0 - 1, k.INK)
    d.line((3, ay1 + 3, w - 4, ay1 + 3), fill=(40, 26, 36, 60))
    # inside: shelves with goods behind the counter
    in_y0, in_y1 = ay1 + 6, sy + sh - 30
    k.rect(d, 10, in_y0, w - 11, in_y1, shade(tone, 0.72))
    k.hline(d, 10, w - 11, in_y0, shade(tone, 0.5))
    for shelf_y in range(in_y0 + 9, in_y1, 11):
        k.hline(d, 12, w - 13, shelf_y, k.WOOD[3])
        k.hline(d, 12, w - 13, shelf_y + 1, k.WOOD[1])
        for x in range(16, w - 20, 10):
            if srng.random() < 0.8:
                goods(d, s['goods'], x, shelf_y - 6, srng)
    # menu chalkboard on the back wall
    mx = w - 58
    k.box(d, mx, in_y0 + 2, mx + 40, in_y0 + 26, k.WOOD[2])
    k.rect(d, mx + 2, in_y0 + 4, mx + 38, in_y0 + 24, '#2f3b36')
    for i in range(4):
        k.hline(d, mx + 5, mx + 5 + srng.randint(14, 30), in_y0 + 7 + i * 4, '#d9e4d2')
    # the counter: the solid footprint's front
    cy0 = sy + sh - 30
    k.box(d, sx, cy0, sx + sw - 1, sy + sh - 1, k.WOOD[2])
    k.rect(d, sx + 1, cy0 + 1, sx + sw - 2, cy0 + 6, k.WOOD[4])
    k.hline(d, sx + 1, sx + sw - 2, cy0 + 1, '#f2c08a')
    k.hline(d, sx, sx + sw - 1, cy0 + 7, k.INK)
    for x in range(sx + 6, sx + sw - 20, 24):
        k.box(d, x, cy0 + 10, x + 18, sy + sh - 4, k.WOOD[2], k.WOOD[1])
        k.hline(d, x + 1, x + 17, cy0 + 11, k.WOOD[3])
    # sub label on a little hanging plate on the counter
    sub_w = k.text_width(s['sub']) + 8
    px0 = w // 2 - sub_w // 2
    k.box(d, px0, cy0 + 11, px0 + sub_w, cy0 + 19, '#fff2d8', k.WOOD[0])
    k.centered_text(img, w // 2, cy0 + 13, s['sub'], shade(tone, 0.6))
    # things on the counter: a register, a bell, a jar
    k.box(d, sx + 14, cy0 - 7, sx + 28, cy0 + 1, '#cfc6b0')
    k.rect(d, sx + 16, cy0 - 5, sx + 26, cy0 - 3, '#2f3b36')
    d.point((sx + 18, cy0 - 4), fill='#62f59c')
    blob(d, sx + sw - 24, cy0 - 1, 3, 2, '#e3b24a')
    k.rect(d, sx + sw // 2 - 2, cy0 - 6, sx + sw // 2 + 3, cy0, '#bfe3e8')
    k.hline(d, sx + sw // 2 - 2, sx + sw // 2 + 3, cy0 - 6, '#7a4b3a')
    # potted plants either side of the counter
    for x in (sx - 2, sx + sw - 16):
        k.box(d, x + 2, sy + sh - 16, x + 15, sy + sh - 2, '#b8653f')
        k.hline(d, x + 3, x + 14, sy + sh - 15, '#d98a5a')
        k.bush(d, x + 8, sy + sh - 22, 9, srng, flowers=2)
    return img


def blob(d, cx, cy, rx, ry, fill):
    k.blob(d, cx, cy, rx, ry, fill)


def table_art(s):
    w, h = s['width'], s['height']
    img, d = k.new(w, h)
    cx, cy = w // 2, h // 2 - 4
    k.shadow(d, cx - 26, cy + 10, cx + 26, cy + 24)
    chair = lambda x, y: (k.box(d, x - 6, y - 5, x + 6, y + 5, k.WOOD[2]),
                          k.rect(d, x - 5, y - 4, x + 5, y - 2, k.WOOD[4]))
    chair(cx, 6)
    chair(8, cy)
    chair(w - 9, cy)
    # table top
    k.oval(d, cx - 20, cy - 16, cx + 20, cy + 12, k.WOOD[3])
    k.oval(d, cx - 17, cy - 14, cx + 17, cy + 9, '#f4e6cc', k.WOOD[2])
    for i in range(-14, 16, 6):                       # checked tablecloth
        k.vline(d, cx + i, cy - 12, cy + 7, '#e9a08f')
    d.ellipse((cx - 4, cy - 6, cx + 4, cy), fill='#ffffff')
    k.rect(d, cx - 1, cy - 4, cx + 1, cy - 2, '#e0a040')
    k.rect(d, cx + 8, cy - 8, cx + 11, cy - 3, '#bfe3e8')
    k.rect(d, cx - 2, cy + 12, cx + 2, cy + 18, k.WOOD[1])
    chair(cx, h - 13)
    return img


def bench_art(s):
    w, h = s['width'], s['height']
    sx, sy, sw, sh = s['solid']
    img, d = k.new(w, h)
    k.shadow(d, sx, sy + sh - 8, sx + sw, h - 1)
    # backrest
    k.box(d, 2, 0, w - 3, 14, k.WOOD[2])
    k.hline(d, 3, w - 4, 1, k.WOOD[4])
    k.hline(d, 3, w - 4, 7, k.WOOD[1])
    k.hline(d, 3, w - 4, 8, k.WOOD[3])
    # seat slats
    k.box(d, 0, 14, w - 1, h - 14, k.WOOD[3])
    for y in range(17, h - 15, 4):
        k.hline(d, 1, w - 2, y, k.WOOD[1])
        k.hline(d, 1, w - 2, y + 1, k.WOOD[4])
    # iron legs and armrests
    for x in (6, w - 12):
        k.box(d, x, 6, x + 6, h - 6, '#4a4f5c')
        k.vline(d, x + 1, 7, h - 7, '#7a8090')
    return img


def planter_art(s):
    w, h = s['width'], s['height']
    srng = random.Random(s['id'])
    img, d = k.new(w, h)
    k.shadow(d, 2, h - 14, w - 3, h - 1)
    # wooden planter box
    top = h // 3
    k.box(d, 2, top, w - 3, h - 6, k.WOOD[2])
    for y in range(top + 3, h - 7, 4):
        k.hline(d, 3, w - 4, y, k.WOOD[1])
    k.box(d, 0, top - 2, w - 1, top + 3, k.WOOD[3])
    k.hline(d, 1, w - 2, top - 1, k.WOOD[4])
    # plants and flowers spilling over
    for i in range(max(3, w // 18)):
        x = 10 + i * ((w - 20) // max(1, w // 18 - 1 if w // 18 > 1 else 1))
        k.bush(d, min(x, w - 10), top - 2, srng.randint(8, 11), srng, flowers=4)
    return img


def center_art(s):
    """The big tree in the middle of the CC, in a round brick planter."""
    w, h = s['width'], s['height']
    srng = random.Random(7)
    img, d = k.new(w, h)
    cx = w // 2
    sx, sy, sw, sh = s['solid']
    k.shadow(d, sx - 14, sy + sh - 18, sx + sw + 14, h - 1)
    # brick planter
    k.oval(d, sx - 8, sy - 6, sx + sw + 8, sy + sh - 2, '#b4553f')
    k.oval(d, sx - 4, sy - 4, sx + sw + 4, sy + 16, '#6b4a33', '#8a3b30')
    for x in range(sx - 6, sx + sw + 6, 7):
        k.vline(d, x, sy + 14, sy + sh - 6, '#8a3b30')
    # flowers round the trunk
    for _ in range(18):
        x = srng.randint(sx, sx + sw)
        y = srng.randint(sy - 2, sy + 10)
        c = srng.choice(k.FLOWERS)
        d.point((x, y), fill=c)
        d.point((x + 1, y), fill=c)
    # trunk and canopy
    k.rect(d, cx - 5, 50, cx + 5, sy + 6, k.WOOD[1])
    k.vline(d, cx - 3, 50, sy + 5, k.WOOD[2])
    k.vline(d, cx + 4, 50, sy + 5, k.WOOD[0])
    for (dx, dy, r, c) in ((0, 48, 48, k.INK), (0, 46, 46, k.LEAF[0]), (-6, 40, 38, k.LEAF[1]),
                           (-14, 32, 24, k.LEAF[2]), (-20, 24, 12, k.LEAF[3])):
        k.blob(d, cx + dx, dy, r, int(r * 0.85), c)
    for _ in range(90):
        a = srng.random() * 2 * math.pi
        r = math.sqrt(srng.random()) * 40
        x, y = cx + math.cos(a) * r, 44 + math.sin(a) * r * 0.8
        d.point((int(x), int(y)), fill=srng.choice((k.LEAF[0], k.LEAF[2], k.LEAF[3], '#f3b4c4')))
    return img


def sign_art(s):
    w, h = s['width'], s['height']
    img, d = k.new(w, h)
    sx, sy, sw, sh = s['solid']
    k.shadow(d, sx - 6, sy + sh - 6, sx + sw + 6, h - 1)
    for x in (sx + 2, sx + sw - 8):                    # two posts
        k.box(d, x, 30, x + 6, sy + sh - 2, k.WOOD[1])
    k.box(d, 2, 4, w - 3, 52, k.WOOD[2])
    k.rect(d, 5, 7, w - 6, 49, '#2f4a6a')
    k.hline(d, 5, w - 6, 7, '#47698f')
    k.centered_text(img, w // 2, 12, 'CC', '#fff2d8', 3)
    k.centered_text(img, w // 2, 34, 'MAPA', '#ffe7a0', 2)
    k.box(d, 0, 0, w - 1, 5, k.WOOD[3])                # little roof
    return img


def lamp_art(s):
    w, h = s['width'], s['height']
    img, d = k.new(w, h)
    cx = w // 2
    k.shadow(d, cx - 8, h - 8, cx + 8, h - 1)
    k.box(d, cx - 5, h - 9, cx + 5, h - 3, '#3e4352')
    k.rect(d, cx - 2, 16, cx + 1, h - 9, '#4a4f5c')
    k.vline(d, cx - 1, 16, h - 10, '#7a8090')
    # lantern with warm glass
    k.box(d, cx - 8, 4, cx + 8, 18, '#3e4352')
    k.rect(d, cx - 6, 6, cx + 6, 16, '#ffd37a')
    k.rect(d, cx - 4, 7, cx + 1, 12, '#fff3c4')
    k.box(d, cx - 10, 0, cx + 10, 4, '#3e4352')
    return img


SPECS = [
    ('jardim-central', 'center', 632, 451, 148, 154, [33, 98, 86, 44]),
    ('jardim-noroeste', 'planter', 455, 324, 143, 82, [17, 46, 109, 31]),
    ('banco-oeste', 'bench', 406, 497, 144, 55, [6, 31, 132, 18]),
    ('banco-sul', 'bench', 456, 692, 130, 45, [5, 25, 120, 17]),
    ('banco-leste', 'bench', 834, 680, 143, 50, [6, 28, 129, 16]),
    ('mesa-noroeste', 'table', 445, 410, 76, 68, [12, 29, 50, 26]),
    ('mesa-superior', 'table', 846, 295, 77, 68, [14, 27, 49, 28]),
    ('mesa-cafe', 'table', 1201, 430, 75, 68, [12, 27, 51, 28]),
    ('mesa-oeste', 'table', 438, 597, 87, 77, [15, 30, 56, 35]),
    ('mesa-leste', 'table', 828, 586, 87, 77, [15, 30, 56, 35]),
    ('mesa-norte', 'table', 490, 249, 78, 70, [12, 29, 52, 30]),
    ('planta-sudoeste', 'planter', 88, 544, 85, 48, [11, 27, 62, 14]),
    ('planta-nordeste', 'planter', 1227, 348, 98, 52, [13, 27, 71, 18]),
    ('planta-sul', 'planter', 906, 741, 92, 47, [12, 27, 68, 16]),
]
ART = {'bench': bench_art, 'planter': planter_art, 'table': table_art, 'center': center_art,
       'shop': shop_art, 'sign': sign_art, 'lamp': lamp_art}


def build_props():
    for s in SHOPS:
        spec = dict(s, kind='shop')
        new_prop(spec, shop_art)
    for prop_id, kind, x, y, w, h, solid in SPECS:
        new_prop(dict(id=prop_id, kind=kind, x=x, y=y, width=w, height=h, solid=solid), ART[kind])
    new_prop(dict(id='placa-cc', kind='sign', x=666, y=694, width=75, height=101,
                  solid=[25, 51, 27, 45]), sign_art)
    for i, (x, y) in enumerate([(320, 412), (858, 260), (1172, 604), (288, 716), (1124, 765)]):
        new_prop(dict(id=f'poste-{i}', kind='lamp', x=x, y=y, width=27, height=67,
                      solid=[11, 55, 6, 10]), lamp_art)


def write_outputs(ground):
    k.save(ground, OUT / 'ground.png')
    manifest = {
        'version': 3, 'width': W, 'height': H, 'props': props,
        'exits': [{'x': 704, 'y': 902, 'name': 'sul'}, {'x': 706, 'y': 118, 'name': 'norte'}],
        'mission': {'x': 705, 'y': 409},
        'queue': [[813, 356], [815, 398], [817, 440], [819, 480]],
        'walkablePolygon': [list(p) for p in INNER],
    }
    (OUT / 'layout.json').write_text(k.to_json(manifest) + '\n', encoding='utf-8')
    rows = ['// AUTO-GENERATED by scripts/render-cc-pixel-art.py. Do not edit.',
            'export const CC_PROPS = [']
    for p in props:
        rows.append(f"  {{ id: '{p['id']}', x: {p['x']}, y: {p['y']}, width: {p['width']}, "
                    f"height: {p['height']}, depthY: {p['depthY']} }},")
    rows += ['] as const', '']
    (ROOT / 'apps' / 'game' / 'src' / 'renderer' / 'src' / 'scenes' / 'cc-assets.generated.ts'
     ).write_text('\n'.join(rows), encoding='utf-8')

    preview = ground.copy()
    for p in sorted(props, key=lambda p: p['depthY']):
        preview.alpha_composite(Image.open(OUT / f"{p['id']}.png").convert('RGBA'), (p['x'], p['y']))
    preview.convert('RGB').save(ROOT / 'docs' / 'quest3-pixel-preview.png', optimize=True)
    # The in-game map (M) shows the whole CC at 960x540 minus margins: pre-shrink it once,
    # with an area filter, to exactly the size it is drawn at, instead of letting the GPU
    # nearest-sample a 0.42x scale (which is what made the old map shimmer).
    scale = min((960 - 90) / W, (540 - 85) / H)  # centro-de-convivencia-scene.ts
    small = preview.resize((round(W * scale), round(H * scale)), Image.Resampling.BOX)
    small.convert('RGB').save(OUT / 'overview.png', optimize=True)


if __name__ == '__main__':
    ground = build_ground()
    build_props()
    write_outputs(ground)
    print(f'{len(props)} CC props, world {W}x{H}')
