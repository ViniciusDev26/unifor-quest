"""Biblioteca (Quest 2) as layered pixel art, authored at 1 art pixel = 1 game pixel.

Usage (from the repository root):  python scripts/render-biblioteca-pixel-art.py

Why 1:1. The characters are 32px pixel art (`characters/*.png` is a 4x upscale drawn at
PLAYER_SCALE 0.25). When the room is drawn at the same pixel density and the camera zooms
by a whole number, every art pixel turns into the same NxN block on screen: no mixed pixel
sizes, no half-pixels, nothing smeared. Text is drawn with a 3x5 bitmap font for the same
reason: anti-aliased TrueType text is exactly the "borrado" this pass removes.

Art direction: cozy farming/life-sim pixel art. Warm palette, top-left light, dark
coloured outlines (never pure black), 3-tone shading, soft drop shadows. Every sprite and
colour here is original; nothing is copied from any game.

Outputs (committed, so the game never needs Python at runtime):
  assets/biblioteca/pixel-world/ground.png   floor, walls, windows, rug (no depth)
  assets/biblioteca/pixel-world/light.png    sunbeams from the windows (alpha overlay)
  assets/biblioteca/pixel-world/props/*.png  depth-sorted sprites
  assets/biblioteca/pixel-world/layout.json  sprite positions + collision footprints
  apps/game/src/renderer/src/scenes/biblioteca-assets.generated.ts
  docs/quest2-pixel-preview.png              before / after, 3x, for review
"""
from pathlib import Path
import json
import random

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'biblioteca' / 'pixel-world'
PROPS = OUT / 'props'
PROPS.mkdir(parents=True, exist_ok=True)

TILE = 16
W, H = 30 * TILE, 22 * TILE  # 480 x 352
WALL_H = 64                  # tall back wall, 4 tiles
SIDE = 16                    # side and bottom wall thickness
DOOR_X0, DOOR_X1 = 224, 256  # gap in the bottom wall

random.seed(2026)

# ---------------------------------------------------------------- palette
C = {
    'ink': '#3a2028',        # outline: dark plum-brown, never black
    'ink2': '#52303a',
    'shadow': (58, 32, 40, 78),
    'shadow_soft': (58, 32, 40, 44),
    # wood
    'w0': '#4a2a22', 'w1': '#6e3d2a', 'w2': '#94563a', 'w3': '#b9744a', 'w4': '#dc9b63',
    # floor planks
    'f0': '#7a4a32', 'f1': '#a0663f', 'f2': '#ad7146', 'f3': '#b97d4f', 'f4': '#d39a68',
    # wall
    'paper': '#efdcb1', 'paper2': '#e3cc9b', 'paper3': '#f7ebcb',
    'wain0': '#5a3326', 'wain1': '#7b4630', 'wain2': '#9a5c3d',
    'top0': '#2e1d26', 'top1': '#47303a', 'top2': '#5d4250',
    # rug
    'rug0': '#6a2534', 'rug1': '#8f3440', 'rug2': '#b2474d', 'gold': '#e2b453', 'gold2': '#f3d58a',
    # nature
    'leaf0': '#2f5a3a', 'leaf1': '#3f7a45', 'leaf2': '#5f9f52', 'leaf3': '#93c66b',
    'pot0': '#7b3b2d', 'pot1': '#a8553b', 'pot2': '#cf7a52',
    # glass and light
    'sky0': '#7fb6d6', 'sky1': '#a8d4e8', 'sky2': '#e2f3f6',
    'brass': '#c99a3e', 'brass2': '#f0cf73',
    'lamp': '#3f8a5c', 'lamp2': '#6cbf86',
    # terminal
    'crt0': '#9c9483', 'crt1': '#c9c0aa', 'crt2': '#e6dfcb', 'scr': '#0e2a1d', 'glow': '#62f59c',
    'paper_sheet': '#f4ecd8',
}
BOOKS = ['#b8443c', '#d8843a', '#e5c25a', '#4c8a58', '#3d6d9e', '#7a58a3', '#d5cdb8',
         '#a3364f', '#2f7f86', '#9a6a3a']

# ---------------------------------------------------------------- 3x5 bitmap font
GLYPHS = {
    'A': ['010', '101', '111', '101', '101'], 'B': ['110', '101', '110', '101', '110'],
    'C': ['011', '100', '100', '100', '011'], 'E': ['111', '100', '110', '100', '111'],
    'F': ['111', '100', '110', '100', '100'], 'I': ['111', '010', '010', '010', '111'],
    'K': ['101', '101', '110', '101', '101'], 'L': ['100', '100', '100', '100', '111'],
    'N': ['101', '111', '111', '111', '101'], 'O': ['010', '101', '101', '101', '010'],
    'R': ['110', '101', '110', '101', '101'], 'T': ['111', '010', '010', '010', '010'],
    'U': ['101', '101', '101', '101', '111'], 'S': ['011', '100', '010', '001', '110'],
    '.': ['000', '000', '000', '000', '010'], ' ': ['000', '000', '000', '000', '000'],
    '>': ['100', '010', '001', '010', '100'], '_': ['000', '000', '000', '000', '111'],
}


def text_width(s):
    return len(s) * 4 - 1


def pixel_text(img, x, y, s, color):
    px = img.load()
    rgba = Image.new('RGBA', (1, 1), color).getpixel((0, 0))
    for i, ch in enumerate(s):
        for row, bits in enumerate(GLYPHS[ch]):
            for col, bit in enumerate(bits):
                if bit == '1':
                    px[x + i * 4 + col, y + row] = rgba


# ---------------------------------------------------------------- primitives
def rect(d, x0, y0, x1, y1, fill):
    """Inclusive pixel rectangle."""
    if x1 >= x0 and y1 >= y0:
        d.rectangle((x0, y0, x1, y1), fill=fill)


def box(d, x0, y0, x1, y1, fill, outline=None):
    rect(d, x0, y0, x1, y1, outline or C['ink'])
    rect(d, x0 + 1, y0 + 1, x1 - 1, y1 - 1, fill)


def hline(d, x0, x1, y, c):
    rect(d, x0, y, x1, y, c)


def vline(d, x, y0, y1, c):
    rect(d, x, y0, x, y1, c)


def blob(d, cx, cy, rx, ry, fill):
    d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=fill)


def shadow(d, x0, y0, x1, y1, soft=False):
    """Drop shadow under a prop: a flat ellipse, the light comes from the top-left."""
    d.ellipse((x0, y0, x1, y1), fill=C['shadow_soft'] if soft else C['shadow'])


def new(w, h):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


# ---------------------------------------------------------------- ground (floor + walls)
def draw_floor(img, d):
    # Horizontal planks, 8px tall, staggered seams; each plank gets its own tone.
    tones = [C['f1'], C['f2'], C['f3'], C['f2']]
    for row, y in enumerate(range(WALL_H, H - SIDE, 8)):
        x = -random.randint(0, 40)
        while x < W:
            length = random.randint(28, 60)
            tone = random.choice(tones)
            rect(d, x, y, x + length - 1, y + 7, tone)
            hline(d, x, x + length - 1, y, C['f4'] if tone != C['f1'] else C['f3'])
            hline(d, x, x + length - 1, y + 7, C['f0'])
            vline(d, x, y, y + 7, C['f0'])
            # grain: a couple of short darker streaks and the odd knot
            for _ in range(random.randint(1, 3)):
                gx = x + random.randint(3, max(4, length - 8))
                gy = y + random.randint(2, 5)
                hline(d, gx, gx + random.randint(2, 6), gy, C['f1'] if tone != C['f1'] else C['f0'])
            if random.random() < 0.18:
                kx = x + random.randint(4, max(5, length - 6))
                rect(d, kx, y + 3, kx + 1, y + 4, C['f0'])
            x += length


def draw_back_wall(img, d):
    # wallpaper with soft vertical stripes and a tiny diamond pattern
    rect(d, 0, 0, W - 1, WALL_H - 1, C['paper'])
    for x in range(0, W, 8):
        vline(d, x, 6, WALL_H - 18, C['paper2'])
    for y in range(12, WALL_H - 20, 10):
        for x in range(4, W, 8):
            d.point((x, y), fill=C['paper3'])
    # crown molding along the top
    rect(d, 0, 0, W - 1, 5, C['top1'])
    hline(d, 0, W - 1, 5, C['ink'])
    hline(d, 0, W - 1, 6, C['w3'])
    hline(d, 0, W - 1, 7, C['w2'])
    # wainscot: lower wooden panelling with raised panels
    top = WALL_H - 18
    rect(d, 0, top, W - 1, WALL_H - 1, C['wain1'])
    hline(d, 0, W - 1, top, C['ink'])
    hline(d, 0, W - 1, top + 1, C['w4'])
    hline(d, 0, W - 1, top + 2, C['wain2'])
    for x in range(4, W, 24):
        box(d, x, top + 5, x + 18, WALL_H - 5, C['wain2'], C['wain0'])
        hline(d, x + 1, x + 17, top + 6, C['w3'])
    # baseboard + shadow cast on the floor by the wall
    hline(d, 0, W - 1, WALL_H - 2, C['wain0'])
    hline(d, 0, W - 1, WALL_H - 1, C['ink'])
    shade = Image.new('RGBA', (W, 5), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for i, a in enumerate((70, 52, 36, 22, 10)):
        hline(sd, 0, W - 1, i, (58, 32, 40, a))
    img.alpha_composite(shade, (0, WALL_H))


def draw_window(img, d, x, y, w=36, h=36):
    """Arched window with sky, a tree outside and a brass latch."""
    box(d, x - 2, y - 2, x + w + 1, y + h + 3, C['w2'])          # frame
    hline(d, x - 1, x + w, y - 1, C['w4'])
    rect(d, x, y, x + w - 1, y + h - 1, C['sky1'])
    # sky gradient, top lighter
    rect(d, x, y, x + w - 1, y + 6, C['sky2'])
    rect(d, x, y + h - 12, x + w - 1, y + h - 1, C['sky0'])
    # tree tops outside, so the window looks onto the campus
    for tx, ty, r in ((x + 6, y + h - 6, 7), (x + 18, y + h - 4, 8), (x + 30, y + h - 7, 6)):
        blob(d, tx, ty, r, r - 1, C['leaf1'])
        blob(d, tx - 2, ty - 2, r - 3, r - 4, C['leaf2'])
        d.point((tx - 3, ty - 4), fill=C['leaf3'])
    # arch: cut the top corners with the frame colour
    for i in range(4):
        hline(d, x, x + 3 - i, y + i, C['w2'])
        hline(d, x + w - 4 + i, x + w - 1, y + i, C['w2'])
    # mullions
    vline(d, x + w // 2, y, y + h - 1, C['w2'])
    hline(d, x, x + w - 1, y + h // 2, C['w2'])
    vline(d, x + w // 2 + 1, y, y + h - 1, C['w1'])
    # glass glint
    for i in range(5):
        d.point((x + 3 + i, y + 9 - i), fill=C['sky2'])
        d.point((x + w // 2 + 4 + i, y + h // 2 + 8 - i), fill=C['sky2'])
    # sill
    box(d, x - 4, y + h + 2, x + w + 3, y + h + 6, C['w3'])
    hline(d, x - 3, x + w + 2, y + h + 3, C['w4'])


def draw_sign(img, d):
    label = 'BIBLIOTECA'
    w = text_width(label) + 14
    x0 = W // 2 - w // 2
    y0 = 10
    box(d, x0, y0, x0 + w - 1, y0 + 12, C['w1'])
    rect(d, x0 + 2, y0 + 2, x0 + w - 3, y0 + 10, C['w0'])
    hline(d, x0 + 1, x0 + w - 2, y0 + 1, C['w3'])
    for sx in (x0 + 3, x0 + w - 4):
        d.point((sx, y0 + 6), fill=C['brass2'])
    pixel_text(img, x0 + 7, y0 + 4, label, C['gold2'])
    # small UNIFOR plate under the sign
    sub = 'UNIFOR'
    sw = text_width(sub) + 6
    sx0 = W // 2 - sw // 2
    box(d, sx0, y0 + 14, sx0 + sw - 1, y0 + 22, C['brass'])
    pixel_text(img, sx0 + 3, y0 + 16, sub, C['w0'])


def draw_clock(img, d, cx, cy):
    blob(d, cx, cy, 6, 6, C['ink'])
    blob(d, cx, cy, 5, 5, C['brass'])
    blob(d, cx, cy, 4, 4, C['paper3'])
    vline(d, cx, cy - 3, cy, C['ink'])
    hline(d, cx, cx + 2, cy, C['ink'])
    d.point((cx - 2, cy - 2), fill=(255, 255, 255, 255))


def draw_side_walls(img, d):
    # Wall tops, seen from above: dark with a lighter inner bevel, like the room is cut open.
    for x0, x1 in ((0, SIDE - 1), (W - SIDE, W - 1)):
        rect(d, x0, 0, x1, H - 1, C['top1'])
        for y in range(0, H, 8):
            hline(d, x0 + 2, x1 - 2, y, C['top0'])
            d.point((x0 + 4 + (y // 8) % 6, y + 4), fill=C['top2'])
    vline(d, SIDE - 1, 0, H - 1, C['ink'])
    vline(d, SIDE - 2, WALL_H, H - SIDE, C['top2'])
    vline(d, W - SIDE, 0, H - 1, C['ink'])
    vline(d, W - SIDE + 1, WALL_H, H - SIDE, C['top2'])
    # bottom wall with the doorway
    rect(d, 0, H - SIDE, W - 1, H - 1, C['top1'])
    for x in range(0, W, 8):
        vline(d, x, H - SIDE + 3, H - 3, C['top0'])
    hline(d, 0, W - 1, H - SIDE, C['ink'])
    hline(d, 0, W - 1, H - SIDE + 1, C['top2'])
    # doorway: open floor continues outside onto a stone step
    rect(d, DOOR_X0, H - SIDE, DOOR_X1 - 1, H - 1, '#9b8d7c')
    for x in range(DOOR_X0, DOOR_X1, 8):
        vline(d, x, H - SIDE, H - 1, '#857766')
    hline(d, DOOR_X0, DOOR_X1 - 1, H - SIDE, '#c4b6a2')
    vline(d, DOOR_X0 - 1, H - SIDE, H - 1, C['ink'])
    vline(d, DOOR_X1, H - SIDE, H - 1, C['ink'])
    # door frame posts
    for x in (DOOR_X0 - 4, DOOR_X1 + 1):
        box(d, x, H - SIDE - 4, x + 3, H - 1, C['w3'])


def draw_rug(img, d, x0, y0, x1, y1):
    """Runner rug from the door to the counter."""
    box(d, x0, y0, x1, y1, C['rug1'])
    rect(d, x0 + 2, y0 + 2, x1 - 2, y1 - 2, C['gold'])
    rect(d, x0 + 3, y0 + 3, x1 - 3, y1 - 3, C['rug0'])
    rect(d, x0 + 5, y0 + 5, x1 - 5, y1 - 5, C['rug1'])
    cx = (x0 + x1) // 2
    # repeating diamonds down the middle
    for y in range(y0 + 14, y1 - 10, 20):
        for i in range(6):
            hline(d, cx - i, cx + i, y + i, C['rug2'])
            hline(d, cx - i, cx + i, y + 11 - i, C['rug2'])
        d.point((cx, y + 5), fill=C['gold2'])
        d.point((cx, y + 6), fill=C['gold2'])
        for sx in (x0 + 9, x1 - 9):
            d.point((sx, y + 5), fill=C['gold'])
    # side stripes
    vline(d, x0 + 7, y0 + 6, y1 - 6, C['rug2'])
    vline(d, x1 - 7, y0 + 6, y1 - 6, C['rug2'])
    # fringe at the ends
    for x in range(x0 + 2, x1 - 1, 2):
        d.point((x, y0 - 1), fill=C['paper3'])
        d.point((x, y1 + 1), fill=C['paper3'])


def draw_round_rug(img, d, cx, cy, rx, ry):
    blob(d, cx, cy, rx, ry, C['ink'])
    blob(d, cx, cy, rx - 1, ry - 1, '#3f6b5a')
    blob(d, cx, cy, rx - 4, ry - 3, '#d9c08a')
    blob(d, cx, cy, rx - 6, ry - 5, '#4f8a6e')
    blob(d, cx, cy, rx - 11, ry - 8, '#d9c08a')
    blob(d, cx, cy, rx - 13, ry - 10, '#3f6b5a')


def build_ground():
    img, d = new(W, H)
    draw_floor(img, d)
    draw_back_wall(img, d)
    for x in (40, 136, 308, 404):
        draw_window(img, d, x, 14)
    draw_sign(img, d)
    draw_clock(img, d, 194, 26)
    draw_rug(img, d, DOOR_X0 - 8, 134, DOOR_X1 + 7, H - SIDE - 3)
    draw_round_rug(img, d, 146, 304, 34, 20)
    draw_side_walls(img, d)
    return img


def build_light():
    """Sunbeams from the four windows, falling down-right and fading out over the floor."""
    img, d = new(W, H)
    length = 150
    for x in (40, 136, 308, 404):
        for step in range(0, length, 6):
            alpha = int(30 * (1 - step / length))
            y0, y1 = 52 + step, 52 + step + 5
            sx0 = x + 2 + step * 0.35
            sx1 = x + 34 + step * 0.35
            d.polygon([(sx0, y0), (sx1, y0), (sx1 + 2, y1), (sx0 + 2, y1)],
                      fill=(255, 238, 176, alpha))
    return img


# ---------------------------------------------------------------- props
props = []


def add_prop(prop_id, label, kind, img, x, y, solid=None, depth_y=None, states=None, sprite=None):
    """Saves the sprite and records it. `solid` is [dx, dy, w, h] relative to x, y."""
    name = sprite or prop_id
    if img is not None:
        img.save(PROPS / f'{name}.png', optimize=True)
    w, h = (img.width, img.height) if img is not None else (0, 0)
    entry = {
        'id': prop_id, 'sprite': name, 'label': label, 'kind': kind,
        'x': x, 'y': y, 'width': w, 'height': h,
        'depthY': depth_y if depth_y is not None else y + h,
        'solid': solid or [0, 0, 0, 0],
    }
    if states is not None:
        entry['states'] = states
    props.append(entry)


def book_row(d, x0, x1, y_base, rng, max_h=9, lean=True):
    """A row of book spines standing on a shelf whose top surface is at y_base."""
    x = x0
    while x <= x1 - 2:
        bw = rng.choice((2, 2, 3, 3, 4))
        if x + bw > x1 + 1:
            break
        bh = rng.randint(max_h - 3, max_h)
        col = rng.choice(BOOKS)
        rect(d, x, y_base - bh, x + bw - 1, y_base - 1, col)
        vline(d, x, y_base - bh, y_base - 1, C['ink2'])
        # a highlight and a little label band on the spine
        if bw >= 3:
            vline(d, x + 1, y_base - bh + 1, y_base - 2, '#ffffff40')
        hline(d, x + 1, x + bw - 1, y_base - bh + 2, C['gold2'] if rng.random() < 0.4 else col)
        x += bw
        if lean and rng.random() < 0.07 and x < x1 - 6:
            # a book leaning on its neighbour
            for i in range(5):
                rect(d, x + i, y_base - 2 - i, x + i + 1, y_base - 1 - i, rng.choice(BOOKS))
            x += 6


def bookshelf(width=64, height=50, seed=0, full=True):
    """Free-standing shelf seen in 3/4 view: top board, three shelves of books, plinth."""
    rng = random.Random(seed)
    img, d = new(width, height + 4)
    shadow(d, 1, height - 5, width - 2, height + 3)
    box(d, 0, 0, width - 1, height - 1, C['w2'])
    # top board (we see the top of the case)
    rect(d, 1, 1, width - 2, 5, C['w3'])
    hline(d, 1, width - 2, 1, C['w4'])
    hline(d, 0, width - 1, 6, C['ink'])
    # side posts
    for x in (1, width - 4):
        rect(d, x, 7, x + 2, height - 2, C['w2'])
    vline(d, 2, 7, height - 3, C['w3'])
    shelves = [8, 22, 36]
    for sy in shelves:
        rect(d, 4, sy, width - 5, sy + 11, C['w0'])         # dark back panel
        hline(d, 4, width - 5, sy, C['ink'])
        if full:
            book_row(d, 5, width - 6, sy + 12, rng)
        else:
            # emptied shelf: one or two strays only
            book_row(d, 5, 5 + rng.randint(4, 12), sy + 12, rng, lean=False)
        hline(d, 3, width - 4, sy + 12, C['w3'])           # shelf board
        hline(d, 3, width - 4, sy + 13, C['w1'])
    rect(d, 1, height - 3, width - 2, height - 2, C['w1'])   # plinth
    return img


def fallen_shelf(width=64, seed=0):
    """The same shelf knocked onto its back: its compartments face up, the books inside are
    jumbled, and a few have slid out onto the floor. No rotation, so it stays pixel-crisp."""
    rng = random.Random(seed + 99)
    img, d = new(width + 16, 36)
    shadow(d, 6, 22, width + 10, 35)
    ox, oy = 8, 6
    h = 24
    box(d, ox, oy, ox + width - 1, oy + h - 1, C['w2'])
    # the case's side, now facing up, catches the light
    rect(d, ox + 1, oy + 1, ox + width - 2, oy + 3, C['w4'])
    hline(d, ox, ox + width - 1, oy + 4, C['ink'])
    # three compartments, separated by what used to be the shelf boards
    edges = [ox + 3, ox + 22, ox + 41, ox + width - 4]
    for a, b in zip(edges, edges[1:]):
        rect(d, a + 1, oy + 5, b - 1, oy + h - 4, C['w0'])
        # books lying every which way inside
        for _ in range(4):
            bx = rng.randint(a + 1, max(a + 2, b - 7))
            by = rng.randint(oy + 6, oy + h - 9)
            col = rng.choice(BOOKS)
            if rng.random() < 0.5:
                rect(d, bx, by, bx + 5, by + 2, col)
                hline(d, bx, bx + 5, by + 3, C['ink2'])
            else:
                rect(d, bx, by, bx + 2, by + 5, col)
                vline(d, bx + 3, by, by + 5, C['ink2'])
        vline(d, b, oy + 4, oy + h - 3, C['w3'])
    rect(d, ox + 1, oy + h - 3, ox + width - 2, oy + h - 2, C['w1'])
    # a few books that slid out onto the floor, and loose pages
    for bx, by in ((0, 20), (width + 8, 12), (3, 2), (width + 6, 26), (width // 2, 30)):
        open_book(d, bx, by, rng)
    for bx, by in ((14, 31), (width - 6, 30)):
        rect(d, bx, by, bx + 4, by + 3, C['paper_sheet'])
        hline(d, bx + 1, bx + 3, by + 1, '#c9bfa6')
    return img


def book_cart():
    """Returns cart: a little trolley with a few books waiting to be shelved."""
    rng = random.Random(42)
    img, d = new(30, 28)
    shadow(d, 1, 21, 28, 27)
    box(d, 0, 4, 29, 20, C['w2'])
    rect(d, 1, 5, 28, 6, C['w4'])
    rect(d, 2, 8, 27, 18, C['w0'])
    book_row(d, 3, 26, 18, rng, max_h=9, lean=False)
    hline(d, 1, 28, 19, C['w3'])
    vline(d, 29, 0, 6, C['crt0'])  # handle
    hline(d, 26, 29, 0, C['crt0'])
    for x in (3, 24):
        blob(d, x + 1, 23, 2, 2, C['ink'])
        d.point((x + 1, 22), fill=C['crt1'])
    return img


def open_book(d, x, y, rng):
    col = rng.choice(BOOKS)
    rect(d, x, y, x + 7, y + 4, C['ink2'])
    rect(d, x + 1, y, x + 3, y + 3, C['paper_sheet'])
    rect(d, x + 4, y, x + 6, y + 3, C['paper_sheet'])
    hline(d, x + 1, x + 6, y + 4, col)
    d.point((x + 2, y + 1), fill='#b9ad92')
    d.point((x + 5, y + 2), fill='#b9ad92')


def book_pile(seed, w=40, h=20, count=7):
    """Spilled books on the floor: a decal, no collision."""
    rng = random.Random(seed)
    img, d = new(w, h)
    for _ in range(count):
        x = rng.randint(0, w - 9)
        y = rng.randint(0, h - 6)
        if rng.random() < 0.5:
            open_book(d, x, y, rng)
        else:
            col = rng.choice(BOOKS)
            bw, bh = rng.choice(((7, 4), (4, 7), (6, 3)))
            rect(d, x, y, x + bw, y + bh, C['ink2'])
            rect(d, x, y, x + bw - 1, y + bh - 1, col)
            hline(d, x, x + bw - 1, y, '#ffffff50')
    for _ in range(3):  # loose sheets of paper
        x = rng.randint(0, w - 6)
        y = rng.randint(0, h - 4)
        rect(d, x, y, x + 4, y + 3, C['paper_sheet'])
        hline(d, x + 1, x + 3, y + 1, '#c9bfa6')
    return img


def counter():
    """Dona Célia's circulation desk, a U shape that closes her in against the back wall."""
    w, h = 132, 72
    img, d = new(w, h + 4)
    shadow(d, 2, h - 6, w - 3, h + 3)
    # side wings, running back to the wall
    for x0 in (0, w - 12):
        box(d, x0, 0, x0 + 11, h - 1, C['w2'])
        rect(d, x0 + 1, 1, x0 + 10, 4, C['w4'])
        rect(d, x0 + 1, 5, x0 + 10, h - 14, C['w3'])
        hline(d, x0 + 1, x0 + 10, 5, C['w4'])
    # front desk
    fy = h - 30
    box(d, 0, fy, w - 1, h - 1, C['w2'])
    rect(d, 1, fy + 1, w - 2, fy + 8, C['w4'])            # desk top
    hline(d, 1, w - 2, fy + 1, '#f0bd85')
    hline(d, 0, w - 1, fy + 9, C['ink'])
    # front face panels
    for x in range(4, w - 8, 22):
        box(d, x, fy + 12, x + 18, h - 5, C['w2'], C['w1'])
        hline(d, x + 1, x + 17, fy + 13, C['w3'])
    rect(d, 1, h - 3, w - 2, h - 2, C['w1'])
    # things on the desk: book stacks, a bell, a mug
    rng = random.Random(7)
    for sx in (8, 14):
        for i in range(3):
            col = rng.choice(BOOKS)
            rect(d, sx, fy + 4 - i * 2, sx + 7, fy + 5 - i * 2, col)
            d.point((sx, fy + 4 - i * 2), fill=C['ink2'])
    blob(d, 36, fy + 5, 3, 2, C['brass'])                  # bell
    d.point((36, fy + 2), fill=C['brass2'])
    d.point((35, fy + 4), fill='#fff3c4')
    rect(d, 46, fy + 2, 49, fy + 6, '#e9e2d0')             # mug
    d.point((50, fy + 4), fill='#e9e2d0')
    hline(d, 46, 49, fy + 2, '#7a4a32')
    # a little plant on the left wing
    blob(d, 6, 8, 5, 4, C['leaf1'])
    blob(d, 5, 6, 3, 2, C['leaf2'])
    rect(d, 3, 11, 8, 16, C['pot1'])
    hline(d, 3, 8, 11, C['pot2'])
    return img


def terminal(state):
    """CRT on the desk. `null`: the green NULL message; `ok`: the catalogue back online."""
    img, d = new(26, 24)
    box(d, 1, 0, 24, 17, C['crt1'])
    rect(d, 2, 1, 23, 2, C['crt2'])
    box(d, 4, 3, 21, 14, C['scr'], C['crt0'])
    if state == 'null':
        pixel_text(img, 6, 6, 'NULL', C['glow'])
        hline(d, 5, 20, 12, '#1d5a38')
    else:
        pixel_text(img, 6, 5, 'OK', C['glow'])
        for i, y in enumerate((11, 12)):
            hline(d, 6, 18 - i * 5, y, '#2f9a5e')
    rect(d, 9, 18, 16, 19, C['crt0'])                     # stand
    box(d, 3, 19, 22, 23, C['crt1'])                      # keyboard
    for x in range(5, 21, 2):
        d.point((x, 21), fill=C['crt0'])
    return img


def chair(facing):
    img, d = new(14, 18)
    shadow(d, 1, 13, 12, 17, soft=True)
    if facing == 'down':  # backrest at the top, seat towards the viewer
        box(d, 1, 0, 12, 8, C['w2'])
        hline(d, 2, 11, 1, C['w4'])
        box(d, 1, 7, 12, 12, C['rug1'])
        hline(d, 2, 11, 8, C['rug2'])
    else:                  # backrest at the bottom (seen from behind)
        box(d, 1, 2, 12, 7, C['rug1'])
        hline(d, 2, 11, 3, C['rug2'])
        box(d, 1, 6, 12, 13, C['w2'])
        hline(d, 2, 11, 7, C['w4'])
    for x in (2, 10):
        vline(d, x, 13, 15, C['w0'])
    return img


def reading_table(seed):
    rng = random.Random(seed)
    w, h = 64, 30
    img, d = new(w, h + 4)
    shadow(d, 2, h - 6, w - 3, h + 3)
    box(d, 0, 4, w - 1, h - 8, C['w3'])
    hline(d, 1, w - 2, 5, C['w4'])
    for y in range(9, h - 9, 4):
        hline(d, 2, w - 3, y, C['w2'])
    box(d, 0, h - 8, w - 1, h - 4, C['w1'])           # front edge
    for x in (2, w - 5):
        rect(d, x, h - 4, x + 2, h - 1, C['w0'])
    # banker's lamp
    rect(d, 10, 9, 11, 12, C['brass'])
    box(d, 5, 3, 16, 9, C['lamp'])
    hline(d, 6, 15, 4, C['lamp2'])
    hline(d, 6, 15, 9, '#fff1a8')
    rect(d, 7, 12, 14, 13, C['brass'])
    # open books and papers
    open_book(d, 26, 12, rng)
    open_book(d, 44, 9, rng)
    rect(d, 36, 15, 41, 18, C['paper_sheet'])
    hline(d, 37, 40, 16, '#c9bfa6')
    # an inkwell + quill
    rect(d, 55, 13, 57, 15, '#24313f')
    vline(d, 58, 9, 14, '#f4ecd8')
    return img


def plant(big=True):
    w, h = (24, 36) if big else (16, 24)
    img, d = new(w, h)
    cx = w // 2
    shadow(d, 2, h - 6, w - 3, h - 1)
    # leaves: layered blobs, dark to light, lit from top-left
    rng = random.Random(w * 13)
    for (dx, dy, r, c) in (
        (0, -2, w // 2 - 1, C['leaf0']), (-3, -5, w // 3, C['leaf1']), (4, -4, w // 3, C['leaf1']),
        (-2, -9, w // 4, C['leaf2']), (3, -10, w // 5, C['leaf2']),
    ):
        blob(d, cx + dx, h // 2 + dy - (2 if big else 0), r, r - 1, c)
    for _ in range(6 if big else 3):
        d.point((cx + rng.randint(-w // 3, 1), h // 2 + rng.randint(-12, -4)), fill=C['leaf3'])
    # pot
    py = h - 12 if big else h - 9
    box(d, cx - 6 if big else cx - 4, py, cx + 5 if big else cx + 3, h - 3, C['pot1'])
    hline(d, cx - 5 if big else cx - 3, cx + 4 if big else cx + 2, py + 1, C['pot2'])
    return img


def globe():
    img, d = new(20, 30)
    shadow(d, 2, 24, 17, 29)
    rect(d, 9, 18, 10, 25, C['w1'])
    box(d, 4, 24, 15, 27, C['w2'])
    blob(d, 10, 10, 8, 8, C['ink'])
    blob(d, 10, 10, 7, 7, '#3c79a8')
    blob(d, 8, 8, 3, 2, C['leaf2'])
    blob(d, 13, 12, 2, 3, C['leaf2'])
    blob(d, 7, 13, 2, 1, C['leaf1'])
    d.point((6, 6), fill=C['sky2'])
    d.arc((1, 1, 19, 19), 200, 340, fill=C['brass'])
    return img


def card_catalog():
    img, d = new(40, 34)
    shadow(d, 1, 26, 38, 33)
    box(d, 0, 0, 39, 29, C['w2'])
    rect(d, 1, 1, 38, 4, C['w4'])
    hline(d, 0, 39, 5, C['ink'])
    for row in range(3):
        for col in range(4):
            x = 3 + col * 9
            y = 8 + row * 7
            box(d, x, y, x + 7, y + 5, C['w3'], C['w1'])
            rect(d, x + 2, y + 2, x + 5, y + 2, C['paper_sheet'])
            d.point((x + 3, y + 4), fill=C['brass2'])
    for x in (2, 35):
        rect(d, x, 29, x + 2, 32, C['w0'])
    return img


def wall_bookcase(seed, width=40, height=58):
    """Tall bookcase standing against the back wall."""
    rng = random.Random(seed)
    img, d = new(width, height + 3)
    shadow(d, 1, height - 4, width - 2, height + 2, soft=True)
    box(d, 0, 0, width - 1, height - 1, C['w2'])
    rect(d, 1, 1, width - 2, 3, C['w4'])
    hline(d, 0, width - 1, 4, C['ink'])
    for sy in (6, 19, 32, 45):
        if sy + 12 >= height:
            break
        rect(d, 3, sy, width - 4, sy + 10, C['w0'])
        book_row(d, 4, width - 5, sy + 11, rng, max_h=9)
        hline(d, 2, width - 3, sy + 11, C['w3'])
        hline(d, 2, width - 3, sy + 12, C['w1'])
    return img


def armchair():
    img, d = new(28, 26)
    shadow(d, 2, 19, 25, 25)
    box(d, 2, 0, 25, 12, '#4f7a5f')          # back
    hline(d, 3, 24, 1, '#7aa983')
    box(d, 0, 6, 6, 20, '#3f6b51')           # arms
    box(d, 21, 6, 27, 20, '#3f6b51')
    hline(d, 1, 5, 7, '#7aa983')
    hline(d, 22, 26, 7, '#7aa983')
    box(d, 6, 10, 21, 19, '#5c8f6c')         # seat cushion
    hline(d, 7, 20, 11, '#8cc096')
    for x in (2, 24):
        vline(d, x, 20, 23, C['w0'])
    return img


def side_table():
    img, d = new(16, 18)
    shadow(d, 1, 13, 14, 17)
    blob(d, 8, 5, 7, 4, C['ink'])
    blob(d, 8, 5, 6, 3, C['w3'])
    d.point((5, 3), fill=C['w4'])
    rect(d, 7, 8, 8, 14, C['w1'])
    rect(d, 4, 14, 11, 15, C['w1'])
    # a teacup
    rect(d, 6, 2, 9, 4, '#f0ebe0')
    d.point((10, 3), fill='#f0ebe0')
    return img


def ladder():
    img, d = new(14, 52)
    for x in (1, 11):
        rect(d, x, 0, x + 1, 50, C['w2'])
        vline(d, x, 0, 50, C['w3'])
    for y in range(4, 50, 7):
        hline(d, 2, 10, y, C['w1'])
        hline(d, 2, 10, y - 1, C['w3'])
    rect(d, 1, 50, 12, 51, C['shadow'])
    return img


def build_props():
    # Wall furniture along the back wall (always upright, just decoration + collision).
    add_prop('estante-parede-1', 'Estante', 'shelf', wall_bookcase(11), 92, 24,
             solid=[0, 46, 40, 12])
    add_prop('estante-parede-2', 'Estante', 'shelf', wall_bookcase(12), 348, 24,
             solid=[0, 46, 40, 12])
    add_prop('escada', 'Escada', 'decor', ladder(), 133, 28, solid=None, depth_y=82)
    add_prop('fichario', 'Fichário', 'decor', card_catalog(), 400, 52, solid=[0, 20, 40, 10])
    add_prop('globo', 'Globo', 'decor', globe(), 24, 56, solid=[3, 22, 14, 6])

    # Circulation desk: wings back to the wall, Dona Célia stands inside.
    cx0 = W // 2 - 66
    add_prop('balcao', 'Balcão', 'counter', counter(), cx0, 58, solid=[0, 42, 132, 30])
    props[-1]['extraSolids'] = [[0, 0, 12, 44], [120, 0, 12, 44]]
    add_prop('terminal', 'Terminal', 'terminal', terminal('null'), cx0 + 98, 75, depth_y=131,
             states={'before': 'terminal-null', 'after': 'terminal-ok'}, sprite='terminal-null')
    terminal('ok').save(PROPS / 'terminal-ok.png', optimize=True)

    # Six free-standing shelves: knocked over at the start (docs/story.md), upright after.
    shelf_slots = [(28, 140), (28, 204), (28, 268), (388, 140), (388, 204), (388, 268)]
    for i, (x, y) in enumerate(shelf_slots, start=1):
        upright = bookshelf(64, 50, seed=i)
        upright.save(PROPS / f'estante-{i}.png', optimize=True)
        fallen = fallen_shelf(64, seed=i)
        fallen.save(PROPS / f'estante-{i}-caida.png', optimize=True)
        # Both states share one collision footprint: the shelf's base on the floor.
        props.append({
            'id': f'estante-{i}', 'sprite': f'estante-{i}', 'label': 'Estante', 'kind': 'shelf',
            'x': x, 'y': y, 'width': upright.width, 'height': upright.height,
            'depthY': y + 50, 'solid': [0, 36, 64, 14],
            'states': {
                'before': {'sprite': f'estante-{i}-caida', 'dx': -8, 'dy': 18},
                'after': {'sprite': f'estante-{i}', 'dx': 0, 'dy': 0},
            },
        })
        pile = book_pile(100 + i)
        name = f'livros-{i}'
        pile.save(PROPS / f'{name}.png', optimize=True)
        px = x + (66 if x < W // 2 else -42)
        props.append({
            'id': name, 'sprite': name, 'label': 'Livros', 'kind': 'decal',
            'x': px, 'y': y + 30, 'width': pile.width, 'height': pile.height,
            'depthY': 0, 'solid': [0, 0, 0, 0], 'states': {'before': {'sprite': name}},
        })

    # Reading tables with chairs, either side of the rug.
    for side, tx in (('oeste', 118), ('leste', 298)):
        add_prop(f'mesa-{side}', 'Mesa de leitura', 'table', reading_table(5 if side == 'oeste' else 6),
                 tx, 176, solid=[0, 8, 64, 20])
        for j, cx in enumerate((tx + 10, tx + 40)):
            add_prop(f'cadeira-{side}-{j}-n', 'Cadeira', 'decor', chair('down'), cx, 160,
                     solid=[1, 8, 12, 6], sprite=f'cadeira-{side}-{j}-n')
            add_prop(f'cadeira-{side}-{j}-s', 'Cadeira', 'decor', chair('up'), cx, 204,
                     solid=[1, 8, 12, 6], sprite=f'cadeira-{side}-{j}-s')

    # Reading nook on the round rug (bottom-left), plants flanking the door.
    add_prop('poltrona', 'Poltrona', 'decor', armchair(), 118, 280, solid=[0, 10, 28, 12])
    add_prop('mesinha', 'Mesinha', 'decor', side_table(), 150, 288, solid=[2, 9, 12, 6])
    add_prop('carrinho', 'Carrinho de livros', 'decor', book_cart(), 300, 282,
             solid=[0, 12, 30, 10])
    add_prop('planta-porta-oeste', 'Planta', 'plant', plant(True), DOOR_X0 - 34, 296,
             solid=[5, 26, 14, 8])
    add_prop('planta-porta-leste', 'Planta', 'plant', plant(True), DOOR_X1 + 10, 296,
             solid=[5, 26, 14, 8])
    add_prop('planta-canto-ne', 'Planta', 'plant', plant(True), W - SIDE - 26, 64,
             solid=[5, 26, 14, 8])
    add_prop('planta-mesa-leste', 'Planta', 'plant', plant(False), 344, 284, solid=[3, 17, 10, 6])


# ---------------------------------------------------------------- layout + generated TS
def to_json(value, indent=0):
    """JSON the way the repo's formatter (Biome) writes it: objects expanded, short arrays
    of scalars on one line, so `npm run lint` passes on the generated file as-is."""
    pad = '  ' * indent
    if isinstance(value, dict):
        if not value:
            return '{}'
        items = [f'{pad}  {json.dumps(k, ensure_ascii=False)}: {to_json(v, indent + 1)}'
                 for k, v in value.items()]
        return '{\n' + ',\n'.join(items) + f'\n{pad}}}'
    if isinstance(value, list):
        inline = '[' + ', '.join(to_json(v, indent + 1) for v in value) + ']'
        if all(not isinstance(v, (dict, list)) for v in value) or len(pad) + len(inline) < 80:
            if '\n' not in inline:
                return inline
        items = [f'{pad}  {to_json(v, indent + 1)}' for v in value]
        return '[\n' + ',\n'.join(items) + f'\n{pad}]'
    return json.dumps(value, ensure_ascii=False)


def write_layout():
    layout = {
        'tile': TILE, 'width': W, 'height': H,
        # Walkable floor, in pixels: the room minus the walls, plus the doorway.
        'floor': [[SIDE, WALL_H, W - SIDE * 2, H - SIDE - WALL_H],
                  [DOOR_X0, H - SIDE, DOOR_X1 - DOOR_X0, SIDE]],
        'npcs': {'Dona Célia': [W // 2, 82]},
        'spawn': [W // 2, H - SIDE - 30],
        'door': [W // 2, H - SIDE - 6],
        'props': props,
    }
    (OUT / 'layout.json').write_text(to_json(layout) + '\n')

    lines = ['// AUTO-GENERATED by scripts/render-biblioteca-pixel-art.py. Do not edit.',
             'export type BibliotecaPropState = { sprite: string; dx?: number; dy?: number }',
             'export type BibliotecaProp = {',
             '  id: string', '  sprite: string', '  kind: string', '  x: number', '  y: number',
             '  depthY: number',
             '  /** Shown before / after the acervo is organised; absent means always the same. */',
             '  states?: { before?: BibliotecaPropState; after?: BibliotecaPropState | string }',
             '}',
             f'export const BIBLIOTECA_SIZE = {{ width: {W}, height: {H} }} as const',
             f"export const BIBLIOTECA_SPAWN = {{ x: {W // 2}, y: {H - SIDE - 30} }} as const",
             f"export const BIBLIOTECA_DOOR = {{ x: {W // 2}, y: {H - SIDE - 6} }} as const",
             f"export const BIBLIOTECA_CELIA = {{ x: {W // 2}, y: 82 }} as const",
             'export const BIBLIOTECA_PROPS: readonly BibliotecaProp[] = [']
    for p in props:
        fields = [f"id: '{p['id']}'", f"sprite: '{p['sprite']}'", f"kind: '{p['kind']}'",
                  f"x: {p['x']}", f"y: {p['y']}", f"depthY: {p['depthY']}"]
        if 'states' in p:
            parts = []
            for key, value in p['states'].items():
                if isinstance(value, str):
                    parts.append(f"{key}: {{ sprite: '{value}' }}")
                else:
                    inner = [f"sprite: '{value['sprite']}'"]
                    if value.get('dx'):
                        inner.append(f"dx: {value['dx']}")
                    if value.get('dy'):
                        inner.append(f"dy: {value['dy']}")
                    parts.append(f"{key}: {{ {', '.join(inner)} }}")
            fields.append(f"states: {{ {', '.join(parts)} }}")
        lines.append(f"  {{ {', '.join(fields)} }},")
    lines.append(']')
    sprites = sorted({p['sprite'] for p in props} |
                     {v if isinstance(v, str) else v['sprite']
                      for p in props for v in p.get('states', {}).values()})
    lines.append('/** Every sprite file under scene-art/biblioteca-props/, for preloading. */')
    lines.append('export const BIBLIOTECA_SPRITES: readonly string[] = [')
    for s in sprites:
        lines.append(f"  '{s}',")
    lines.append(']')
    target = ROOT / 'apps' / 'game' / 'src' / 'renderer' / 'src' / 'scenes' / 'biblioteca-assets.generated.ts'
    target.write_text('\n'.join(lines) + '\n')


# ---------------------------------------------------------------- preview
def compose(ground, light, state, with_player=True):
    scene = ground.copy()
    char_dir = ROOT / 'assets' / 'graphics' / 'graphics' / 'characters'

    def char(name):
        sheet = Image.open(char_dir / f'{name}.png').convert('RGBA')
        return sheet.crop((0, 0, 128, 128)).resize((32, 32), Image.Resampling.NEAREST)

    items = []
    for p in props:
        sprite, dx, dy = p['sprite'], 0, 0
        st = p.get('states', {}).get(state)
        if 'states' in p and st is None:
            continue
        if isinstance(st, str):
            sprite = st
        elif isinstance(st, dict):
            sprite, dx, dy = st['sprite'], st.get('dx', 0), st.get('dy', 0)
        img = Image.open(PROPS / f'{sprite}.png')
        items.append((p['depthY'], img, p['x'] + dx, p['y'] + dy))
    cx, cy = W // 2, 82
    items.append((cy + 16, char('purple_girl'), cx - 16, cy - 16))
    if with_player:
        px, py = W // 2 + 30, 236
        items.append((py + 16, char('player'), px - 16, py - 16))
    for _, img, x, y in sorted(items, key=lambda t: t[0]):
        scene.alpha_composite(img, (x, y))
    scene.alpha_composite(light)
    return scene


def write_preview(ground, light):
    before = compose(ground, light, 'before')
    after = compose(ground, light, 'after')
    gap = 8
    sheet = Image.new('RGBA', (W * 2 + gap, H), '#1d1f2b')
    sheet.alpha_composite(before, (0, 0))
    sheet.alpha_composite(after, (W + gap, 0))
    sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.Resampling.NEAREST)
    sheet.convert('RGB').save(ROOT / 'docs' / 'quest2-pixel-preview.png', optimize=True)
    # the in-game map (M), one per state, without the sample player
    for state in ('before', 'after'):
        compose(ground, light, state, with_player=False).convert('RGB').save(
            OUT / f'overview-{state}.png', optimize=True)


if __name__ == '__main__':
    ground = build_ground()
    light = build_light()
    ground.save(OUT / 'ground.png', optimize=True)
    light.save(OUT / 'light.png', optimize=True)
    build_props()
    write_layout()
    write_preview(ground, light)
    print(f'{len(props)} props, room {W}x{H}')
