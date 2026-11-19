"""Bloco de Tecnologia (Quest 4) as layered pixel art, 1 art pixel = 1 game pixel (ADR 0075).

Usage (from the repository root):  python scripts/render-tech-pixel-art.py

Same layout data as before (positions, sizes, collision footprints, exits, spawn), drawn
again pixel by pixel at the characters' own density instead of at half size and doubled.
Cooler palette than the CC and the Biblioteca (it is the tech building, and NULL's lair),
but the same rules: dark coloured outlines, 3-tone shading, light from the top-left, soft
shadows, bitmap text.
"""
from pathlib import Path
import random
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pixel_kit as k  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'tech' / 'pixel-world'
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1456, 1088
INK = k.INK_COOL

# The hall, as the map compiler walks it (content/maps/src/bloco-de-tecnologia.mjs).
HALL = (47, 123, 1410, 822)
DOOR_X0, DOOR_X1 = 632, 803

P = {
    'tile': ['#e2ddd3', '#dcd6cb', '#e8e3da'], 'tile_hi': '#f2eee6', 'grout': '#c9c1b4',
    'carpet': '#3e5f8e', 'carpet2': '#4a6ea0', 'carpet_edge': '#e0b45a',
    'wall': '#3a4a66', 'wall2': '#4b5d7d', 'wall_hi': '#6d82a6', 'trim': '#b9744a',
    'paper': '#e8e1d2', 'roof': ['#5a6680', '#66738e', '#7482a0'],
    'glass': '#9fd3e0', 'glass2': '#cbeaf0', 'screen': '#5ad0ff', 'null': '#c06cf0',
}
rng = random.Random(44)


# ---------------------------------------------------------------- ground
def build_ground():
    img = Image.new('RGBA', (W, H))
    k.grass_field(img, rng, flowers=0.0007)
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = HALL

    # paths: north and south approaches + the campus walkway
    path = Image.new('L', (W, H), 0)
    pd = ImageDraw.Draw(path)
    pd.rectangle((DOOR_X0 + 10, 0, DOOR_X1 - 10, 90), fill=255)
    pd.rectangle((DOOR_X0, 840, DOOR_X1, H - 1), fill=255)
    pd.rectangle((0, 1000, W - 1, 1060), fill=255)
    k.paving(img, path, rng, ['#b9b1a6', '#c6beb2', '#d1c9bd'], '#958c84', size=16)
    for x, y, r in ((70, 76, 24), (1386, 70, 26), (66, 1000, 22), (1370, 990, 24),
                    (456, 58, 20), (984, 46, 22), (300, 960, 18), (1150, 960, 18)):
        k.tree(d, x, y, r, rng)
    for x, y in ((560, 944), (880, 944), (200, 1040), (1250, 1040)):
        k.bush(d, x, y, 13, rng, flowers=5)

    # building shadow, outer walls (seen from above: a dark top), back wall face with windows
    k.rshadow(d, x0 - 8 + 6, 84 + 10, x1 + 8 + 6, y1 + 26 + 10)
    k.box(d, x0 - 14, 76, x1 + 14, y1 + 26, P['wall'], INK)
    # back wall face (we see the inside of the north wall, above the floor)
    k.rect(d, x0, 84, x1, y0 - 1, P['paper'])
    for x in range(x0, x1, 8):
        k.vline(d, x, 88, y0 - 14, '#ddd5c3')
    k.rect(d, x0, y0 - 14, x1, y0 - 1, P['trim'])          # wooden wainscot strip
    k.hline(d, x0, x1, y0 - 14, '#dc9b63')
    k.hline(d, x0, x1, y0 - 1, INK)
    # windows on the back wall
    for wx in list(range(84, 600, 104)) + list(range(860, 1380, 104)):
        k.box(d, wx, 88, wx + 40, y0 - 18, P['glass'], P['wall'])
        k.rect(d, wx + 1, 89, wx + 39, 95, P['glass2'])
        k.vline(d, wx + 20, 89, y0 - 19, P['wall2'])
        for i in range(4):
            d.point((wx + 4 + i, 100 - i), fill='#ffffff')
    # posters on the back wall
    for px, label, col in ((612, '</>', '#2f4a6a'), (842, 'CPU', '#6a3f8a')):
        k.box(d, px - 18, 88, px + 18, 112, col, INK)
        k.centered_text(img, px, 96, label, '#d7f5ff')

    # floor
    floor = Image.new('L', (W, H), 0)
    fd = ImageDraw.Draw(floor)
    fd.rectangle(HALL, fill=255)
    fd.rectangle((DOOR_X0, y1, DOOR_X1, 840), fill=255)
    k.paving(img, floor, rng, P['tile'], P['grout'], size=24, offset_rows=False)
    # blue carpet runner down the middle, gold edge
    k.rect(d, 650, y0, 760, y1 + 18, P['carpet_edge'])
    k.rect(d, 654, y0, 756, y1 + 18, P['carpet'])
    for y in range(y0 + 6, y1 + 18, 12):
        k.hline(d, 660, 750, y, P['carpet2'])
        for x in range(668, 744, 24):
            k.rect(d, x, y + 4, x + 3, y + 5, '#6c8cc0')
    k.edge_shadow(img, floor, depth=5, alpha=60)
    # side walls (dark tops) over the floor edge
    k.rect(d, x0 - 13, 84, x0 - 1, y1 + 25, P['wall'])
    k.rect(d, x1 + 1, 84, x1 + 13, y1 + 25, P['wall'])
    k.vline(d, x0 - 1, 84, y1 + 25, P['wall_hi'])
    k.vline(d, x1 + 1, 84, y1 + 25, P['wall_hi'])
    # bottom wall with the south opening
    for a, b in ((x0 - 13, DOOR_X0 - 1), (DOOR_X1 + 1, x1 + 13)):
        k.rect(d, a, y1 + 1, b, y1 + 25, P['wall'])
        k.hline(d, a, b, y1 + 1, P['wall_hi'])
    # north opening through the back wall
    k.rect(d, DOOR_X0 + 10, 76, DOOR_X1 - 10, y0 + 4, '#c9c1b6')
    for y in range(80, y0 + 4, 8):
        k.hline(d, DOOR_X0 + 10, DOOR_X1 - 10, y, '#b0a89e')

    # the two shallow steps at the doors
    for sy in (144, 784):
        k.box(d, 642, sy, 784, sy + 36, '#a8673f', INK)
        for i in range(3):
            k.rect(d, 644, sy + 2 + i * 12, 782, sy + 9 + i * 12, '#e2a86a')
            k.hline(d, 644, 782, sy + 2 + i * 12, '#f3c989')
            k.hline(d, 644, 782, sy + 10 + i * 12, '#6e3d2a')
        for x in (628, 790):
            k.box(d, x, sy - 8, x + 9, sy + 46, '#cad8d5', INK)
            k.vline(d, x + 2, sy - 7, sy + 45, '#ffffff')

    # the south walk continues right up to the hall floor (no wall or shadow across it)
    gap = Image.new('L', (W, H), 0)
    ImageDraw.Draw(gap).rectangle((DOOR_X0, 841, DOOR_X1, 1000), fill=255)
    k.paving(img, gap, rng, ['#b9b1a6', '#c6beb2', '#d1c9bd'], '#958c84', size=16)
    k.vline(d, DOOR_X0 - 1, y1 + 1, 860, INK)
    k.vline(d, DOOR_X1 + 1, y1 + 1, 860, INK)

    return img


# ---------------------------------------------------------------- props
props = []


def add(prop_id, kind, x, y, w, h, solid, label=None, art=None, **extra):
    p = dict(id=prop_id, kind=kind, x=x, y=y, width=w, height=h, depthY=y + h, solid=solid)
    if label:
        p['label'] = label
    p.update(extra)
    img = (art or ART[kind])(p)
    assert img.size == (w, h), (prop_id, img.size)
    k.save(img, OUT / f'{prop_id}.png')
    props.append(p)


def room_art(p):
    """A classroom pod: flat roof seen from above, glass front, door at the bottom."""
    w, h = p['width'], p['height']
    srng = random.Random(p['id'])
    img, d = k.new(w, h)
    k.rshadow(d, 6, h - 8, w - 2, h - 1)
    roof_h = 76
    # roof
    k.box(d, 2, 4, w - 3, roof_h, P['roof'][1], INK)
    for y in range(8, roof_h - 2, 6):
        k.hline(d, 3, w - 4, y, P['roof'][0])
        k.hline(d, 3, w - 4, y + 1, P['roof'][2])
    k.box(d, w // 2 - 12, 18, w // 2 + 12, 34, '#9aa6bb', INK)   # AC unit
    for x in range(w // 2 - 9, w // 2 + 10, 3):
        k.vline(d, x, 21, 31, '#6d7a90')
    k.box(d, 10, 44, 26, 58, '#cbeaf0', INK)                     # skylight
    k.hline(d, 11, 25, 45, '#ffffff')
    # facade
    k.box(d, 2, roof_h, w - 3, h - 6, '#e9e4da', INK)
    k.rect(d, 3, roof_h + 1, w - 4, roof_h + 3, '#ffffff')
    # sign: SALA T101
    k.box(d, 8, roof_h + 6, w - 9, roof_h + 18, '#2c4a70', INK)
    k.centered_text(img, w // 2, roof_h + 10, f"SALA {p['room']}", '#ffffff')
    # windows showing desks with monitors
    wy0, wy1 = roof_h + 24, h - 32
    k.box(d, 8, wy0, w - 9, wy1, P['glass'], P['wall'])
    k.rect(d, 9, wy0 + 1, w - 10, wy0 + 6, P['glass2'])
    for row, y in enumerate(range(wy0 + 10, wy1 - 6, 14)):
        for x in range(13, w - 20, 18):
            k.rect(d, x, y + 5, x + 13, y + 7, '#b9744a')          # desk
            k.box(d, x + 3, y, x + 10, y + 5, '#24304a', INK)       # monitor
            k.rect(d, x + 4, y + 1, x + 9, y + 3, srng.choice((P['screen'], '#7ef0b0', P['screen'])))
    k.vline(d, w // 2, wy0 + 1, wy1 - 1, P['wall'])
    for i in range(6):
        d.point((12 + i, wy0 + 14 - i), fill='#ffffff')
    # door
    k.box(d, w // 2 - 9, h - 30, w // 2 + 9, h - 6, '#a8673f', INK)
    k.rect(d, w // 2 - 6, h - 27, w // 2 + 6, h - 20, P['glass'])
    d.point((w // 2 + 5, h - 16), fill='#f3c989')
    # little plant by the door
    k.box(d, 6, h - 16, 14, h - 7, '#b8653f')
    k.bush(d, 10, h - 20, 6, srng)
    return img


def bathroom_art(p):
    w, h = p['width'], p['height']
    img, d = k.new(w, h)
    k.rshadow(d, 8, h - 8, w - 2, h - 1)
    k.box(d, 2, 4, w - 3, 70, P['roof'][1], INK)
    for y in range(8, 68, 6):
        k.hline(d, 3, w - 4, y, P['roof'][0])
    k.box(d, 2, 70, w - 3, h - 6, '#d7eee8', INK)
    for x in range(6, w - 5, 8):                                 # tiled facade
        k.vline(d, x, 71, h - 7, '#c1e2da')
    k.box(d, 8, 76, w - 9, 94, '#2f9a8a', INK)
    k.centered_text(img, w // 2, 80, 'BANHEIROS', '#ffffff', 2, '#1d6158')
    for cx, col in ((w // 4 + 4, '#3f6fb0'), (3 * w // 4 - 4, '#c8553f')):
        k.box(d, cx - 22, 102, cx + 22, h - 8, '#e9e4da', INK)
        k.rect(d, cx - 19, 105, cx + 19, h - 11, '#a8673f')
        k.blob(d, cx, 116, 4, 4, col)                            # pictogram
        k.rect(d, cx - 4, 121, cx + 4, 134, col)
        k.rect(d, cx - 4, 135, cx - 2, 142, col)
        k.rect(d, cx + 2, 135, cx + 4, 142, col)
        d.point((cx + 15, 132), fill='#f3c989')
    return img


def mequi_art(p):
    """A burger kiosk. Its own simple burger icon: no real brand's logo."""
    w, h = p['width'], p['height']
    srng = random.Random(3)
    img, d = k.new(w, h)
    k.rshadow(d, 8, h - 8, w - 2, h - 1)
    k.box(d, 1, 0, w - 2, 28, '#c8373f', INK)
    k.hline(d, 2, w - 3, 1, '#e86068')
    # burger icon
    k.rect(d, 10, 6, 26, 10, '#f0b040'); k.rect(d, 11, 5, 25, 5, '#f6d070')
    k.rect(d, 10, 12, 26, 13, '#5a8a3c'); k.rect(d, 10, 14, 26, 16, '#7b3f2a')
    k.rect(d, 10, 18, 26, 21, '#f0b040')
    k.centered_text(img, w // 2 + 12, 8, 'MEQUI', '#fff1c5', 2, '#7a1f26')
    # awning
    for i, x in enumerate(range(2, w - 2, 10)):
        col = '#ffd54a' if i % 2 == 0 else '#ffffff'
        k.rect(d, x, 30, min(x + 9, w - 3), 42, col)
        k.blob(d, x + 4, 43, 5, 2, col)
    # counter + kitchen
    k.box(d, 4, 46, w - 5, h - 6, '#f3e6cf', INK)
    k.rect(d, 8, 50, w - 9, 98, '#3b4a5f')
    for i, mx in enumerate((14, 60, 106)):                       # menu screens
        k.box(d, mx, 54, mx + 38, 76, '#1d2638', INK)
        for j in range(3):
            k.rect(d, mx + 4, 58 + j * 6, mx + 4 + srng.randint(12, 30), 59 + j * 6, '#ffd54a')
    for x in range(14, w - 20, 12):
        k.rect(d, x, 84, x + 7, 92, srng.choice(('#f0b040', '#c8373f', '#ffffff')))
    k.box(d, 4, 104, w - 5, h - 6, '#c8373f', INK)
    k.rect(d, 5, 105, w - 6, 110, '#f6d070')
    for x in range(12, w - 16, 26):
        k.box(d, x, 116, x + 20, h - 12, '#b02e36', '#7a1f26')
    return img


def server_art(p):
    w, h = p['width'], p['height']
    srng = random.Random(p['id'])
    img, d = k.new(w, h)
    k.rshadow(d, 4, h - 8, w - 1, h - 1)
    k.box(d, 1, 0, w - 2, h - 6, '#2a2840', '#16142a')
    k.rect(d, 2, 1, w - 3, 6, '#4a4466')
    for y in range(10, h - 12, 8):
        k.box(d, 5, y, w - 6, y + 5, '#3a3556', '#16142a')
        for x in range(8, w - 9, 5):
            d.point((x, y + 2), fill=srng.choice((P['null'], '#e6a6ff', '#7ef0b0', P['null'])))
    k.rect(d, 2, h - 9, w - 3, h - 7, '#4a4466')
    return img


def console_art(p):
    w, h = p['width'], p['height']
    img, d = k.new(w, h)
    k.rshadow(d, 8, h - 10, w - 6, h - 1)
    k.box(d, 4, 4, w - 5, h - 18, '#3a3656', '#16142a')
    k.box(d, 10, 10, w - 11, h - 36, '#1a0b33', '#8b5bd6')
    k.rect(d, 11, 11, w - 12, 14, '#2b1452')
    k.centered_text(img, w // 2, 20, 'NULL', '#f2a6ff', 3, '#5a1c8a')
    for x in range(16, w - 16, 7):
        k.hline(d, x, x + 3, h - 42, '#9a5ae0')
    k.box(d, 14, h - 30, w - 15, h - 20, '#5a4a84', '#16142a')      # keyboard
    for x in range(18, w - 18, 4):
        d.point((x, h - 26), fill='#d8c4ff')
    k.box(d, 8, h - 18, w - 9, h - 6, '#2a2840', '#16142a')
    return img


def bench_art(p):
    """Round study table with stools and laptops (elliptical footprint)."""
    w, h = p['width'], p['height']
    srng = random.Random(p['id'])
    img, d = k.new(w, h)
    sx, sy, sw, sh = p['solid']
    k.shadow(d, sx, sy + sh // 2, sx + sw, sy + sh + 4)
    k.oval(d, sx + 2, sy, sx + sw - 2, sy + sh - 12, '#c9874f', INK)
    k.oval(d, sx + 6, sy + 3, sx + sw - 6, sy + sh - 18, '#dc9b63', '#b9744a')
    k.rect(d, sx + sw // 2 - 4, sy + sh - 14, sx + sw // 2 + 4, sy + sh - 4, '#6e3d2a')
    cx, cy = sx + sw // 2, sy + (sh - 12) // 2
    for dx in (-sw // 4, sw // 4):                              # two laptops
        k.box(d, cx + dx - 9, cy - 9, cx + dx + 9, cy + 1, '#3a4256', INK)
        k.rect(d, cx + dx - 7, cy - 7, cx + dx + 7, cy - 1, srng.choice((P['screen'], '#7ef0b0')))
        k.rect(d, cx + dx - 9, cy + 2, cx + dx + 9, cy + 4, '#9aa6bb')
    k.rect(d, cx - 3, cy + 6, cx + 3, cy + 10, '#f4ecdc')           # a mug
    for ax in (sx - 2, sx + sw - 14):                               # stools
        k.oval(d, ax, cy - 6, ax + 14, cy + 6, '#3e5f8e', INK)
        k.hline(d, ax + 3, ax + 11, cy - 4, '#6c8cc0')
    return img


def plant_art(p):
    w, h = p['width'], p['height']
    srng = random.Random(p['id'])
    img, d = k.new(w, h)
    sx, sy, sw, sh = p['solid']
    k.shadow(d, sx, sy + sh - 14, sx + sw, sy + sh + 2)
    k.oval(d, sx, sy + sh // 3, sx + sw, sy + sh - 2, '#9aa6bb', INK)
    k.oval(d, sx + 4, sy + sh // 3 + 2, sx + sw - 4, sy + sh // 3 + 14, '#6b4a33', '#5a6680')
    cols = max(3, sw // 16)
    for row in range(2):
        for i in range(cols):
            x = sx + 12 + i * (sw - 24) // max(1, cols - 1) + srng.randint(-3, 3)
            y = sy + sh // 3 + 4 - row * 9 + srng.randint(-2, 2)
            k.bush(d, x, y, srng.randint(10, 13), srng, flowers=4)
    return img


def board_art(p):
    """Wall-length display panel: code on a big screen, a cork board with notes."""
    w, h = p['width'], p['height']
    srng = random.Random(p['id'])
    img, d = k.new(w, h)
    k.rshadow(d, 6, h - 8, w - 2, h - 1)
    k.box(d, 2, 2, w - 3, h - 8, '#2c3346', INK)
    half = w // 2
    k.box(d, 8, 8, half - 4, h - 14, '#0f2233', '#3e5f8e')       # code screen
    y = 13
    while y < h - 20:
        x = 13 + srng.choice((0, 0, 6, 12))
        for _ in range(srng.randint(2, 4)):
            ln = srng.randint(4, 18)
            k.hline(d, x, min(x + ln, half - 10), y, srng.choice(('#7ef0b0', '#5ad0ff', '#f6d36b', '#e6a6ff')))
            x += ln + 3
        y += 5
    k.box(d, half + 4, 8, w - 9, h - 14, '#c69a62', k.WOOD[1])     # cork board
    for _ in range(9):
        nx = srng.randint(half + 8, w - 26)
        ny = srng.randint(12, h - 32)
        col = srng.choice(('#fff2a8', '#f3b4c4', '#bfe3e8', '#ffffff'))
        k.rect(d, nx, ny, nx + 13, ny + 11, col)
        k.hline(d, nx + 2, nx + 10, ny + 4, '#9a8a70')
        d.point((nx + 6, ny + 1), fill='#c8373f')
    k.rect(d, 3, h - 10, w - 4, h - 8, '#4b5d7d')
    return img


def lamp_art(p):
    w, h = p['width'], p['height']
    img, d = k.new(w, h)
    cx = w // 2
    k.shadow(d, cx - 8, h - 8, cx + 8, h - 1)
    k.box(d, cx - 5, h - 9, cx + 5, h - 3, '#2c3346')
    k.rect(d, cx - 2, 16, cx + 1, h - 9, '#4b5d7d')
    k.vline(d, cx - 1, 16, h - 10, '#8a9cc0')
    k.box(d, cx - 9, 2, cx + 9, 16, '#2c3346')
    k.rect(d, cx - 7, 4, cx + 7, 14, '#bfe9ff')
    k.rect(d, cx - 5, 5, cx, 10, '#ffffff')
    return img


ART = {'room': room_art, 'bathroom': bathroom_art, 'mcd': mequi_art, 'server': server_art,
       'console': console_art, 'bench': bench_art, 'plant': plant_art, 'board': board_art,
       'lamp': lamp_art}


def build_props():
    for bank, start, x0, y, w, step in (('NO', 101, 52, 182, 95, 96), ('NE', 106, 924, 182, 95, 96),
                                        ('SO', 201, 52, 532, 95, 96), ('SE', 206, 924, 532, 95, 96)):
        for i in range(5):
            room = f'T{start + i}'
            add('sala-' + room.lower(), 'room', x0 + i * step, y, w, 169, [6, 16, w - 12, 153],
                'Sala ' + room, room=room, bank=bank)
    add('banheiro', 'bathroom', 552, 304, 165, 165, [7, 19, 153, 140], 'Banheiro')
    add('mcdonalds', 'mcd', 732, 304, 160, 163, [6, 20, 148, 137], 'Mequi')
    add('null-servidor-esquerdo', 'server', 591, 548, 54, 105, [3, 9, 49, 92], 'Servidor esquerdo')
    add('null-console', 'console', 655, 525, 106, 99, [7, 16, 93, 77], 'Terminal NULL')
    add('null-servidor-direito', 'server', 771, 548, 57, 105, [3, 9, 51, 92], 'Servidor direito')
    for prop_id, kind, x, y, w, h, solid, label in [
        ('lounge-oeste-1', 'bench', 80, 415, 137, 103, [5, 12, 126, 89], 'Estudos oeste 1'),
        ('jardim-oeste', 'plant', 243, 409, 114, 96, [5, 8, 104, 86], 'Jardim oeste'),
        ('lounge-oeste-2', 'bench', 374, 409, 116, 104, [3, 10, 109, 90], 'Estudos oeste 2'),
        ('lounge-leste-1', 'bench', 1175, 410, 147, 111, [5, 12, 137, 94], 'Estudos leste 1'),
        ('jardim-leste', 'plant', 1023, 407, 122, 111, [4, 10, 114, 98], 'Jardim leste'),
        ('lounge-leste-2', 'bench', 924, 410, 98, 103, [6, 11, 86, 88], 'Estudos leste 2'),
        ('floreira-centro', 'plant', 680, 228, 69, 66, [7, 14, 57, 45], 'Floreira centro'),
        ('painel-oeste', 'board', 248, 726, 256, 85, [7, 11, 243, 66], 'Painel oeste'),
        ('painel-leste', 'board', 929, 724, 257, 88, [8, 11, 244, 69], 'Painel leste'),
    ]:
        add(prop_id, kind, x, y, w, h, solid, label)
    for i, (x, y) in enumerate([(533, 386), (877, 383), (515, 513), (875, 512), (532, 699),
                                (875, 699), (508, 172), (886, 175), (516, 730), (891, 735)]):
        add(f'poste-{i}', 'lamp', x, y, 28, 63, [11, 52, 7, 10], f'Poste {i + 1}')


def write_outputs(ground):
    k.save(ground, OUT / 'ground.png')
    manifest = {'version': 2, 'width': W, 'height': H, 'props': props,
                'exits': [{'x': 705, 'y': 163, 'id': 'norte'}, {'x': 705, 'y': 785, 'id': 'sul'}],
                'mission': {'x': 705, 'y': 617}, 'spawn': {'x': 705, 'y': 852}}
    (OUT / 'layout.json').write_text(k.to_json(manifest) + '\n', encoding='utf8')
    rows = ['// AUTO-GENERATED by scripts/render-tech-pixel-art.py. Do not edit.',
            'export const TECH_PROPS = [']
    for p in props:
        rows.append(f"  {{ id: '{p['id']}', x: {p['x']}, y: {p['y']}, width: {p['width']}, "
                    f"height: {p['height']}, depthY: {p['depthY']} }},")
    rows += ['] as const', '']
    (ROOT / 'apps/game/src/renderer/src/scenes/tech-assets.generated.ts').write_text(
        '\n'.join(rows), encoding='utf8')
    preview = ground.copy()
    for p in sorted(props, key=lambda p: p['depthY']):
        preview.alpha_composite(Image.open(OUT / f"{p['id']}.png").convert('RGBA'), (p['x'], p['y']))
    preview.convert('RGB').save(ROOT / 'docs/quest4-pixel-preview.png', optimize=True)
    scale = min((960 - 80) / W, (540 - 85) / H)  # tecnologia-scene.ts
    preview.resize((round(W * scale), round(H * scale)), Image.Resampling.BOX).convert('RGB').save(
        OUT / 'overview.png', optimize=True)


if __name__ == '__main__':
    ground = build_ground()
    build_props()
    write_outputs(ground)
    print(f'{len(props)} tech props, world {W}x{H}')
