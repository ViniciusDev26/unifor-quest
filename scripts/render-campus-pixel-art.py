"""The campus as layered pixel art, 1 art pixel = 1 game pixel, like the interiors (ADR 0075).

Usage (from the repository root):  uv run --with pillow python scripts/render-campus-pixel-art.py

The five buildings of the story and the gatehouse are the images scripts/campus-buildings.py
makes (ADR 0079); everything else (grass, walkways, the Praça Central and its fountain, the
classroom blocks, the sports park, the parking lot, the lake, trees, benches, lamps, signs,
the wall and the avenues) is drawn here, pixel by pixel.

The layout follows the real campus as OpenStreetMap has it (ADR 0080), north up:
Av. Washington Soares on the west, with the gatehouse; the Biblioteca just inside, with the
Praça Central south of it and the Centro de Convivência next door to the east; the Teatro
(the game's Auditório) in the wooded north-west; the technology blocks east of the
convivência; the gym, pool and athletics track further east; the Estacionamento Solar to the
north; a small lake in the north-east corner; Av. Valmir Pontes along the south. Distances are
squeezed so the walk between two doors stays a few seconds (ADR 0064).

Outputs, all committed (the game never needs Python at runtime):
- assets/campus/pixel-world/: ground.png, one PNG per prop, layout.json, overview.png;
- apps/game/src/renderer/src/scenes/campus-assets.generated.ts: what the scene draws, where
  the doors are and where the player comes out of each building;
- docs/campus-pixel-preview.png: the whole campus, for review.
content/maps/src/campus.mjs reads layout.json for the walkable ground and the solids.
"""
from pathlib import Path
import math
import random
import sys

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pixel_kit as k  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BUILDINGS = ROOT / 'assets' / 'campus-buildings'
OUT = ROOT / 'assets' / 'campus' / 'pixel-world'
OUT.mkdir(parents=True, exist_ok=True)
TILE = 16

P = {
    'path': ['#c9c0b2', '#d3cbbd', '#ddd5c8'], 'path_grout': '#a39a8c',
    'plaza': ['#d9cfc0', '#e2d9cb', '#ebe3d6'], 'plaza_grout': '#b3a998',
    'curb': '#8f8679',
    'asphalt': '#4b4d55', 'asphalt2': '#55575f', 'lane': '#e8dfa0', 'sidewalk': '#b8b0a3',
    'water': ['#2f6fa8', '#3a82bd', '#4d97cf'], 'water_hi': '#a9dcf2', 'shore': '#b9a27a',
    'wall': '#e9e4da', 'wall_shade': '#c9c2b4', 'wall_top': '#f6f2ea',
    'court': '#3f8f5a', 'court_line': '#e8f2e0', 'track': '#b4553f', 'track_line': '#f0d8c8',
}
# The campus' colour "bairros" (unifor.br): blocks painted by zone.
ZONES = {'amarelo': '#e8b83a', 'roxo': '#8a5ab8', 'verde': '#4f9a5a', 'azul': '#3f6fb0'}

rng = random.Random(80)
props = []

# ---------------------------------------------------------------- the layout
W, H = 2240, 1600
AVENUE_X1 = 168             # Av. Washington Soares, west of the wall
WALL_X = AVENUE_X1 + 26
SOUTH_ROAD_Y0 = 1488        # Av. Valmir Pontes, south of the wall
SOUTH_WALL_Y = SOUTH_ROAD_Y0 - 18
GATE_Y0, GATE_Y1 = 600, 712
GATE_Y = (GATE_Y0 + GATE_Y1) // 2
MAIN_Y = 768                 # the east-west walk through the campus, south of the library

# The story's buildings: top-left of the sprite, the door as a fraction of its width.
BUILDING_SPOTS = {
    'portaria': dict(x=236, y=444, door=0.80, label='PORTARIA'),
    'biblioteca': dict(x=520, y=470, door=0.50, label='BIBLIOTECA'),
    'centro-de-convivencia': dict(x=830, y=516, door=0.50, label='CENTRO DE CONVIVÊNCIA'),
    'auditorio': dict(x=470, y=90, door=0.50, label='AUDITÓRIO'),
    'bloco-de-tecnologia': dict(x=1240, y=470, door=0.50, label='BLOCO DE TECNOLOGIA'),
    'centro-esportivo': dict(x=1580, y=880, door=0.48, label='CENTRO ESPORTIVO'),
}
PLAZA = (480, 730, 1060, 900)          # Praça Central
FOUNTAIN = (720, 780, 820, 850)         # its fountain (ellipse box)
LAKE = (1930, 50, 2180, 220)           # the small lake in the north-east corner
PARKING = (1010, 60, 1470, 300)        # Estacionamento Solar
TRACK = (1600, 300, 2120, 600)         # athletics track with a pitch inside
POOL = (1860, 900, 2060, 1010)
COURTS = [(1880, 1060, 1990, 1180), (2010, 1060, 2120, 1180)]
WOODS = [(260, 20, 1000, 420), (1700, 640, 2200, 860), (240, 1260, 700, 1460)]

# Classroom blocks (drawn here, not generated): x, y, width, floors, zone, name.
BLOCKS = [
    ('reitoria', 236, 800, 150, 2, 'verde', 'REITORIA'),
    ('bloco-a', 300, 1060, 150, 2, 'amarelo', 'BLOCO A'),
    ('bloco-b', 480, 1060, 150, 2, 'amarelo', 'BLOCO B'),
    ('bloco-d', 660, 1060, 160, 3, 'amarelo', 'BLOCO D'),
    ('bloco-i', 900, 1000, 150, 2, 'roxo', 'BLOCO I'),
    ('bloco-j', 1080, 1000, 150, 2, 'roxo', 'BLOCO J'),
    ('bloco-k', 1260, 1060, 150, 2, 'roxo', 'BLOCO K'),
    ('bloco-h', 1080, 360, 140, 2, 'verde', 'BLOCO H'),
    ('bloco-m', 1500, 470, 0, 0, '', ''),   # placeholder removed below (kept for clarity)
    ('bloco-z', 1960, 1240, 160, 2, 'azul', 'BLOCO Z'),
    ('bloco-o', 1440, 1240, 150, 2, 'azul', 'BLOCO O'),
]
BLOCKS = [b for b in BLOCKS if b[3] > 0]


def sprite_size(building_id):
    with Image.open(BUILDINGS / f'{building_id}.png') as img:
        return img.size


def building_box(building_id):
    spot = BUILDING_SPOTS[building_id]
    w, h = sprite_size(building_id)
    return spot['x'], spot['y'], w, h


def door_point(building_id):
    x, y, w, h = building_box(building_id)
    return round(x + w * BUILDING_SPOTS[building_id]['door']), y + h + 14


def back_point(building_id):
    x, y, w, _ = building_box(building_id)
    return round(x + w * BUILDING_SPOTS[building_id]['door']), y + 4


# ---------------------------------------------------------------- ground
def path_mask():
    """Every walkway as one mask: the routes between doors, the plaza, the lake's ring."""
    mask = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(mask)

    def walk(points, width=40):
        d.line(points, fill=255, width=width, joint='curve')
        for x, y in points:
            d.ellipse((x - width // 2, y - width // 2, x + width // 2, y + width // 2), fill=255)

    por, bib, ccv = door_point('portaria'), door_point('biblioteca'), door_point('centro-de-convivencia')
    aud, tec, ce = door_point('auditorio'), door_point('bloco-de-tecnologia'), door_point('centro-esportivo')
    # gate -> the main walk, east past the plaza, the tech block and on to the sports park
    walk([(AVENUE_X1, GATE_Y), (WALL_X + 60, GATE_Y), (440, MAIN_Y), (1500, MAIN_Y),
          (1700, MAIN_Y + 10), (W - 1, MAIN_Y + 10)], width=52)
    walk([por, (por[0], GATE_Y)], width=36)
    walk([bib, (bib[0], MAIN_Y)], width=40)
    walk([ccv, (ccv[0], MAIN_Y)], width=40)
    walk([tec, (tec[0], MAIN_Y)], width=40)
    walk([(ce[0], MAIN_Y), ce], width=40)
    # up through the woods to the Teatro
    walk([(440, MAIN_Y), (430, 440), (aud[0], 400), aud], width=36)
    # the north side: behind the convivência and the tech block, to the parking lot
    ccb, tcb = back_point('centro-de-convivencia'), back_point('bloco-de-tecnologia')
    walk([(ccb[0], ccb[1]), (ccb[0], 440), (tcb[0], 440), tcb], width=32)
    walk([((PARKING[0] + PARKING[2]) // 2, PARKING[3]), ((PARKING[0] + PARKING[2]) // 2, 440)],
         width=32)
    walk([(1500, MAIN_Y), (1540, TRACK[3] + 30), (TRACK[0] + 60, TRACK[3] + 30)], width=32)
    # south to the classroom blocks
    walk([(560, MAIN_Y), (560, 1260), (1520, 1260)], width=36)
    walk([(1000, MAIN_Y), (1000, 1260)], width=32)
    walk([(1520, 1260), (2040, 1260)], width=32)
    # the lake's ring
    lx0, ly0, lx1, ly1 = LAKE
    ring = [(round((lx0 + lx1) / 2 + math.cos(i * math.pi / 16) * ((lx1 - lx0) / 2 + 34)),
             round((ly0 + ly1) / 2 + math.sin(i * math.pi / 16) * ((ly1 - ly0) / 2 + 30)))
            for i in range(33)]
    walk(ring, width=26)
    walk([(lx0 - 10, ly1 + 40), (TRACK[2] - 60, TRACK[1] - 20)], width=26)
    d.rounded_rectangle(PLAZA, radius=30, fill=255)
    return mask


def draw_avenues(img, d):
    # Av. Washington Soares: two carriageways and a grass median, outside the west wall.
    k.rect(d, 0, 0, AVENUE_X1, H - 1, P['asphalt'])
    k.rect(d, 0, SOUTH_ROAD_Y0, W - 1, H - 1, P['asphalt'])
    for _ in range(W * H // 120):
        x, y = rng.randrange(W), rng.randrange(H)
        if x < AVENUE_X1 or y > SOUTH_ROAD_Y0:
            d.point((x, y), fill=P['asphalt2'])
    k.rect(d, 70, 0, 92, SOUTH_ROAD_Y0 + 40, '#6f9a52')
    k.vline(d, 70, 0, SOUTH_ROAD_Y0 + 40, P['curb'])
    k.vline(d, 92, 0, SOUTH_ROAD_Y0 + 40, P['curb'])
    for y in range(0, SOUTH_ROAD_Y0, 40):
        k.rect(d, 30, y, 32, y + 20, P['lane'])
        k.rect(d, 130, y, 132, y + 20, P['lane'])
    # Av. Valmir Pontes along the south
    for x in range(AVENUE_X1 + 40, W, 40):
        k.rect(d, x, SOUTH_ROAD_Y0 + 54, x + 20, SOUTH_ROAD_Y0 + 56, P['lane'])
    # sidewalks
    k.rect(d, AVENUE_X1 - 2, 0, WALL_X, SOUTH_ROAD_Y0, P['sidewalk'])
    k.rect(d, AVENUE_X1, SOUTH_WALL_Y, W - 1, SOUTH_ROAD_Y0, P['sidewalk'])
    for y in range(0, SOUTH_ROAD_Y0, 12):
        k.hline(d, AVENUE_X1 - 2, WALL_X, y, '#a59d90')
    for x in range(AVENUE_X1, W, 12):
        k.vline(d, x, SOUTH_WALL_Y, SOUTH_ROAD_Y0, '#a59d90')
    k.vline(d, AVENUE_X1 - 2, 0, SOUTH_ROAD_Y0, P['curb'])
    k.hline(d, AVENUE_X1, W - 1, SOUTH_ROAD_Y0, P['curb'])
    # zebra crossing in front of the gate
    for y in range(GATE_Y0 + 14, GATE_Y1 - 14, 10):
        k.rect(d, 96, y, AVENUE_X1 - 6, y + 5, '#e8e4da')


def draw_walls(d):
    for y0, y1 in ((0, GATE_Y0 - 1), (GATE_Y1 + 1, SOUTH_WALL_Y)):
        k.rect(d, WALL_X - 10, y0, WALL_X, y1, P['wall_shade'])
        k.rect(d, WALL_X - 10, y0, WALL_X - 4, y1, P['wall'])
        k.vline(d, WALL_X - 10, y0, y1, P['wall_top'])
        k.vline(d, WALL_X, y0, y1, k.INK)
    k.rect(d, WALL_X - 10, SOUTH_WALL_Y - 10, W - 1, SOUTH_WALL_Y, P['wall_shade'])
    k.rect(d, WALL_X - 10, SOUTH_WALL_Y - 10, W - 1, SOUTH_WALL_Y - 5, P['wall'])
    k.hline(d, WALL_X - 10, W - 1, SOUTH_WALL_Y - 10, P['wall_top'])
    k.hline(d, WALL_X - 10, W - 1, SOUTH_WALL_Y, k.INK)


def draw_lake(d):
    lx0, ly0, lx1, ly1 = LAKE
    d.ellipse((lx0 - 8, ly0 - 6, lx1 + 8, ly1 + 8), fill=P['shore'])
    d.ellipse((lx0 - 3, ly0 - 2, lx1 + 3, ly1 + 3), fill='#8f7a58')
    d.ellipse(LAKE, fill=P['water'][1])
    d.ellipse((lx0 + 10, ly0 + 8, lx1 - 10, ly1 - 6), fill=P['water'][0])
    d.ellipse((lx0 + 40, ly0 + 26, lx1 - 50, ly1 - 30), fill=P['water'][1])
    cx, cy, rx, ry = (lx0 + lx1) / 2, (ly0 + ly1) / 2, (lx1 - lx0) / 2, (ly1 - ly0) / 2
    for _ in range(50):
        x, y = rng.randint(lx0 + 20, lx1 - 20), rng.randint(ly0 + 14, ly1 - 14)
        if ((x - cx) / (rx - 16)) ** 2 + ((y - cy) / (ry - 12)) ** 2 < 1:
            k.hline(d, x, x + rng.randint(3, 8), y, P['water_hi'] if rng.random() < 0.5 else P['water'][2])
    for _ in range(12):
        a = rng.random() * 2 * math.pi
        x, y = cx + math.cos(a) * (rx - 22), cy + math.sin(a) * (ry - 18)
        k.blob(d, x, y, 5, 3, '#3f7a45')
        k.blob(d, x - 1, y - 1, 3, 2, '#5f9f52')


def draw_parking(d):
    x0, y0, x1, y1 = PARKING
    k.box(d, x0, y0, x1, y1, P['asphalt'], P['curb'])
    for _ in range((x1 - x0) * (y1 - y0) // 40):
        d.point((rng.randint(x0 + 1, x1 - 1), rng.randint(y0 + 1, y1 - 1)), fill=P['asphalt2'])
    for row_y in (y0 + 14, y1 - 74):
        for x in range(x0 + 10, x1 - 30, 36):
            k.vline(d, x, row_y, row_y + 58, '#e8e4da')
        k.vline(d, x1 - 30, row_y, row_y + 58, '#e8e4da')
    # solar canopy posts are props; a lane arrow in the middle
    k.rect(d, (x0 + x1) // 2 - 10, (y0 + y1) // 2 - 1, (x0 + x1) // 2 + 10, (y0 + y1) // 2 + 1, '#e8e4da')


def draw_sports(d):
    x0, y0, x1, y1 = TRACK
    d.rounded_rectangle(TRACK, radius=(y1 - y0) // 2, fill=k.INK)
    d.rounded_rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), radius=(y1 - y0) // 2 - 1, fill=P['track'])
    for i in range(1, 4):
        d.rounded_rectangle((x0 + i * 8, y0 + i * 8, x1 - i * 8, y1 - i * 8),
                            radius=(y1 - y0) // 2 - i * 8, outline=P['track_line'])
    inner = (x0 + 36, y0 + 36, x1 - 36, y1 - 36)
    d.rounded_rectangle(inner, radius=(inner[3] - inner[1]) // 2, fill='#5aa64a')
    for x in range(inner[0], inner[2], 24):
        k.rect(d, x, inner[1] + 1, x + 11, inner[3] - 1, '#62ae52')
    pitch = (inner[0] + 70, inner[1] + 14, inner[2] - 70, inner[3] - 14)
    d.rectangle(pitch, outline=P['court_line'])
    mx = (pitch[0] + pitch[2]) // 2
    k.vline(d, mx, pitch[1], pitch[3], P['court_line'])
    d.ellipse((mx - 24, (pitch[1] + pitch[3]) // 2 - 24, mx + 24, (pitch[1] + pitch[3]) // 2 + 24),
              outline=P['court_line'])
    for gx in (pitch[0], pitch[2] - 30):
        d.rectangle((gx, (pitch[1] + pitch[3]) // 2 - 40, gx + 30, (pitch[1] + pitch[3]) // 2 + 40),
                    outline=P['court_line'])
    # pool
    px0, py0, px1, py1 = POOL
    k.box(d, px0 - 10, py0 - 10, px1 + 10, py1 + 10, '#e2dbd2', P['curb'])
    k.box(d, px0, py0, px1, py1, '#5ab8e0', '#2f6fa8')
    for y in range(py0 + 16, py1 - 4, 18):
        for x in range(px0 + 4, px1 - 4, 6):
            k.hline(d, x, x + 2, y, '#e8f2e0' if (x // 6) % 2 else '#c8373f')
    for _ in range(30):
        x, y = rng.randint(px0 + 4, px1 - 10), rng.randint(py0 + 3, py1 - 3)
        k.hline(d, x, x + 4, y, '#a9e6f6')
    # courts
    for cx0, cy0, cx1, cy1 in COURTS:
        k.box(d, cx0, cy0, cx1, cy1, P['court'], k.INK)
        d.rectangle((cx0 + 6, cy0 + 6, cx1 - 6, cy1 - 6), outline=P['court_line'])
        k.hline(d, cx0 + 6, cx1 - 6, (cy0 + cy1) // 2, '#e8e4da')


def build_ground():
    img = Image.new('RGBA', (W, H))
    k.grass_field(img, rng, flowers=0.0005)
    d = ImageDraw.Draw(img)
    # darker grass under the woods
    # Darker grass under the woods, fading out at the edges by dithering, not by a smooth
    # gradient: each pixel is either shaded or not, so the ground stays pixel art.
    shade = Image.new('L', (W, H), 0)
    for box in WOODS:
        ImageDraw.Draw(shade).rounded_rectangle(box, radius=80, fill=255)
    shade = shade.filter(ImageFilter.GaussianBlur(36))
    noise = Image.new('L', (W, H))
    noise.putdata([rng.randrange(256) for _ in range(W * H)])
    mask = Image.frombytes('L', (W, H), bytes(
        255 if sv > nv else 0 for sv, nv in zip(shade.tobytes(), noise.tobytes())))
    dark = Image.new('RGBA', (W, H), (20, 60, 20, 70))
    img.alpha_composite(Image.composite(dark, Image.new('RGBA', (W, H)), mask))
    draw_avenues(img, d)
    draw_parking(d)
    draw_sports(d)
    paths = path_mask()
    k.paving(img, paths, rng, P['path'], P['path_grout'], size=16)
    plaza = Image.new('L', (W, H), 0)
    ImageDraw.Draw(plaza).rounded_rectangle(PLAZA, radius=30, fill=255)
    k.paving(img, plaza, rng, P['plaza'], P['plaza_grout'], size=24, offset_rows=False)
    # a ring of darker pavers round the fountain
    fx0, fy0, fx1, fy1 = FOUNTAIN
    d.ellipse((fx0 - 18, fy0 - 14, fx1 + 18, fy1 + 14), outline='#b3a998', width=3)
    k.edge_shadow(img, paths, depth=2, alpha=40)
    draw_lake(d)
    draw_walls(d)
    gate = Image.new('L', (W, H), 0)
    ImageDraw.Draw(gate).rectangle((AVENUE_X1, GATE_Y0 + 6, WALL_X + 40, GATE_Y1 - 6), fill=255)
    k.paving(img, gate, rng, P['plaza'], P['plaza_grout'], size=24, offset_rows=False)
    return img, paths


# ---------------------------------------------------------------- prop art
def shade(hex_color, f):
    c = hex_color.lstrip('#')
    r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
    if f < 1:
        r, g, b = (int(v * f) for v in (r, g, b))
    else:
        r, g, b = (int(v + (255 - v) * (f - 1)) for v in (r, g, b))
    return f'#{r:02x}{g:02x}{b:02x}'


def block_art(seed, w, floors, zone, name):
    """A classroom block: flat roof seen from above, white concrete, windows in rows and a
    band painted in the colour of its zone ("bairro"), with its name over the door."""
    srng = random.Random(seed)
    roof_h = 40
    floor_h = 26
    h = roof_h + floors * floor_h + 22
    img, d = k.new(w, h)
    zc = ZONES[zone]
    k.rshadow(d, 6, h - 8, w - 1, h - 1)
    # roof with a parapet, AC units and a water tank
    k.box(d, 2, 2, w - 3, roof_h, '#bdb6aa')
    k.rect(d, 4, 4, w - 5, 7, '#d9d2c6')
    for y in range(10, roof_h - 2, 6):
        k.hline(d, 5, w - 6, y, '#b2ab9f')
    for i in range(srng.randint(1, 3)):
        ax = srng.randint(10, w - 30)
        k.box(d, ax, 12, ax + 14, 24, '#d9dde2', k.INK_COOL)
        k.blob(d, ax + 7, 18, 3, 3, '#9aa6bb')
    tx = srng.randint(w - 40, w - 22)
    k.oval(d, tx, 10, tx + 14, 28, '#cfd6dc', k.INK_COOL)
    # facade
    fy0 = roof_h
    k.box(d, 2, fy0, w - 3, h - 8, '#efebe3')
    k.rect(d, 3, fy0 + 1, w - 4, fy0 + 3, '#ffffff')
    k.rect(d, 3, h - 22, w - 4, h - 9, zc)                    # painted zone band
    k.hline(d, 3, w - 4, h - 22, shade(zc, 1.3))
    for f in range(floors):
        y = fy0 + 6 + f * floor_h
        for x in range(8, w - 14, 16):
            k.box(d, x, y, x + 11, y + 15, '#7fb3c4', '#3a4a66')
            k.rect(d, x + 1, y + 1, x + 10, y + 3, '#bfe3e8')
            d.point((x + 2, y + 6), fill='#ffffff')
        k.hline(d, 3, w - 4, y + 19, '#d9d2c6')
    # door and name plate
    cx = w // 2
    k.box(d, cx - 10, h - 30, cx + 10, h - 9, '#5a7fa8', k.INK)
    k.vline(d, cx, h - 29, h - 10, '#3a4a66')
    plate_w = k.text_width(name) + 8
    k.box(d, cx - plate_w // 2, h - 42, cx + plate_w // 2, h - 33, '#ffffff', shade(zc, 0.6))
    k.centered_text(img, cx, h - 40, name, shade(zc, 0.55))
    return img


def palm_art(seed, height=78):
    srng = random.Random(seed)
    w, h = 64, height
    img, d = k.new(w, h)
    cx = w // 2
    k.shadow(d, cx - 16, h - 9, cx + 18, h - 1)
    lean = srng.choice((-1, 1)) * srng.randint(2, 6)
    top_y = 18
    for i, y in enumerate(range(h - 4, top_y, -1)):
        t = (h - 4 - y) / (h - 4 - top_y)
        x = cx + round(lean * t * t)
        k.rect(d, x - 2, y, x + 2, y, '#8a6a48')
        d.point((x - 2, y), fill=k.INK)
        d.point((x + 2, y), fill=k.INK)
        if i % 4 == 0:
            k.hline(d, x - 1, x + 1, y, '#6b4f36')
        else:
            d.point((x - 1, y), fill='#b08c62')
    tx = cx + lean
    for a in range(0, 360, 40):
        ang = math.radians(a + srng.randint(-10, 10))
        length = srng.randint(18, 24)
        for j in range(length):
            px = round(tx + math.cos(ang) * j)
            py = round(top_y + math.sin(ang) * j * 0.6 + 0.5 * (j / length) ** 2 * 14)
            d.point((px, py + 1), fill=k.INK)
            col = k.LEAF[2] if math.cos(ang) < 0.2 else k.LEAF[1]
            d.point((px, py), fill=col)
            if 2 < j < length - 2:
                d.point((px, py - 1), fill=k.LEAF[3] if j % 2 else col)
                d.point((px, py + 1), fill=k.LEAF[0])
    k.blob(d, tx, top_y + 2, 3, 2, '#7a5a3a')
    return img


def tree_art(seed, r=22):
    srng = random.Random(seed)
    w, h = r * 2 + 8, r * 3 + 12
    img, d = k.new(w, h)
    k.tree(d, w // 2, h - 6, r, srng)
    if srng.random() < 0.3:   # an ipê in bloom
        col = srng.choice(('#f6d36b', '#f3b4c4', '#f6d36b'))
        cy = h - 6 - r - r // 2
        for _ in range(r * 3):
            a = srng.random() * 2 * math.pi
            rr = math.sqrt(srng.random()) * (r - 3)
            d.point((int(w // 2 + math.cos(a) * rr), int(cy + math.sin(a) * rr * 0.9)), fill=col)
    return img


def bush_art(seed, r=12):
    srng = random.Random(seed)
    img, d = k.new(r * 2 + 6, r * 2 + 6)
    k.shadow(d, 1, r + 6, r * 2 + 4, r * 2 + 5, soft=True)
    k.bush(d, r + 3, r + 2, r, srng, flowers=5)
    return img


def bench_art():
    w, h = 44, 26
    img, d = k.new(w, h)
    k.shadow(d, 0, h - 8, w - 1, h - 1)
    k.box(d, 2, 0, w - 3, 8, k.WOOD[2])
    k.hline(d, 3, w - 4, 1, k.WOOD[4])
    k.box(d, 0, 8, w - 1, h - 8, k.WOOD[3])
    for y in range(10, h - 9, 3):
        k.hline(d, 1, w - 2, y, k.WOOD[1])
    for x in (4, w - 9):
        k.box(d, x, 4, x + 4, h - 4, '#4a4f5c')
    return img


def lamp_art():
    w, h = 18, 60
    img, d = k.new(w, h)
    cx = w // 2
    k.shadow(d, cx - 7, h - 7, cx + 7, h - 1)
    k.box(d, cx - 4, h - 8, cx + 4, h - 3, '#3e4352')
    k.rect(d, cx - 1, 12, cx + 1, h - 8, '#4a4f5c')
    k.vline(d, cx - 1, 12, h - 9, '#7a8090')
    k.box(d, cx - 6, 2, cx + 6, 13, '#3e4352')
    k.rect(d, cx - 4, 4, cx + 4, 11, '#ffe9a8')
    k.rect(d, cx - 3, 5, cx, 8, '#fff8dc')
    return img


def sign_art(text):
    """A blue campus totem with the building's name in white pixel letters."""
    lines, line = [], ''
    for word in text.split(' '):
        trial = (line + ' ' + word).strip()
        if k.text_width(trial) > 70 and line:
            lines.append(line)
            line = word
        else:
            line = trial
    lines.append(line)
    w = max(k.text_width(s) for s in lines) + 14
    h = 14 + 9 * len(lines) + 14
    img, d = k.new(w, h)
    k.shadow(d, 2, h - 6, w - 3, h - 1)
    k.box(d, 0, 0, w - 1, h - 12, '#24508f')
    k.hline(d, 1, w - 2, 1, '#4f7fc2')
    for i, s in enumerate(lines):
        k.centered_text(img, w // 2, 8 + i * 9, s, '#ffffff')
    k.box(d, w // 2 - 4, h - 13, w // 2 + 3, h - 4, '#7a8090')
    return img


def screen_art(ok):
    """The screen beside a locked door (campus-doors.ts): NULL in green until it is gone."""
    w, h = 32, 36
    img, d = k.new(w, h)
    k.shadow(d, 2, h - 6, w - 3, h - 1)
    k.box(d, 0, 0, w - 1, 22, '#2c3346')
    if ok:
        k.rect(d, 2, 2, w - 3, 20, '#0f3a4a')
        k.centered_text(img, w // 2, 6, 'OK', '#7ef0b0')
        k.hline(d, 6, w - 7, 15, '#5ad0ff')
    else:
        k.rect(d, 2, 2, w - 3, 20, '#0b1a10')
        k.centered_text(img, w // 2, 8, 'NULL', '#39ff6a')
    k.box(d, w // 2 - 2, 22, w // 2 + 1, h - 4, '#4a4f5c')
    return img


def fountain_art():
    fx0, fy0, fx1, fy1 = FOUNTAIN
    w, h = fx1 - fx0, fy1 - fy0 + 30
    img, d = k.new(w, h)
    top = 30
    k.oval(d, 0, top, w - 1, h - 1, '#d9d2c6')
    k.oval(d, 5, top + 4, w - 6, h - 6, '#3a82bd', '#8f8679')
    k.oval(d, 12, top + 9, w - 13, h - 12, '#4d97cf', '#3a82bd')
    for _ in range(18):
        x, y = rng.randint(14, w - 16), rng.randint(top + 12, h - 14)
        k.hline(d, x, x + 3, y, '#a9dcf2')
    cx = w // 2
    k.box(d, cx - 6, top + 6, cx + 5, top + 24, '#d9d2c6')
    k.oval(d, cx - 14, top - 2, cx + 13, top + 10, '#d9d2c6')
    k.oval(d, cx - 10, top, cx + 9, top + 7, '#4d97cf', '#8f8679')
    for i, (dx, dy) in enumerate(((0, -26), (-5, -20), (5, -20), (-9, -12), (9, -12))):
        k.vline(d, cx + dx, top + dy, top + 2, '#cfefff' if i % 2 else '#a9dcf2')
    k.blob(d, cx, top - 26, 2, 2, '#ffffff')
    return img


def car_art(seed):
    srng = random.Random(seed)
    col = srng.choice(('#c8373f', '#e8e4da', '#3f6fb0', '#4a4f5c', '#e0b45a', '#2f9a8a', '#d9dde2'))
    w, h = 26, 44
    img, d = k.new(w, h)
    k.rshadow(d, 3, 6, w - 1, h - 1)
    k.box(d, 1, 2, w - 3, h - 4, col)
    k.rect(d, 4, 9, w - 6, 15, '#9fd3e0')
    k.rect(d, 5, 10, 9, 11, '#ffffff')
    k.rect(d, 4, h - 14, w - 6, h - 10, '#7fb3c4')
    k.hline(d, 2, w - 4, 3, shade(col, 1.3))
    for y in (6, h - 9):
        k.rect(d, 0, y, 1, y + 4, k.INK)
        k.rect(d, w - 3, y, w - 2, y + 4, k.INK)
    return img


def solar_canopy_art(w):
    """A row of the Estacionamento Solar's photovoltaic roofs, on posts."""
    h = 52
    img, d = k.new(w, h)
    k.rshadow(d, 6, h - 10, w - 1, h - 1, soft=True)
    for x in range(10, w - 6, 72):
        k.box(d, x, 20, x + 5, h - 4, '#7a8090')
    k.box(d, 0, 0, w - 1, 24, '#2a3a5a', k.INK_COOL)
    for x in range(2, w - 2, 12):
        k.vline(d, x, 2, 22, '#4a6ea0')
    k.hline(d, 1, w - 2, 12, '#4a6ea0')
    k.hline(d, 1, w - 2, 2, '#7a9ad0')
    return img


def bleachers_art(w):
    h = 40
    img, d = k.new(w, h)
    k.rshadow(d, 4, h - 6, w - 1, h - 1)
    for i in range(4):
        k.box(d, 0, i * 8, w - 1, i * 8 + 9, '#9aa6bb' if i % 2 else '#b9c2d0', k.INK_COOL)
    k.box(d, 0, 32, w - 1, h - 3, '#6d7a90', k.INK_COOL)
    return img


# ---------------------------------------------------------------- placing things
def build_props(paths):
    occupied = []

    def free(x, y, w, h, gap=6):
        return not any(x < ox + ow + gap and x + w + gap > ox and y < oy + oh + gap and y + h + gap > oy
                       for ox, oy, ow, oh in occupied)

    def claim(x, y, w, h):
        occupied.append((x, y, w, h))

    def on_path(x, y, w, h, margin=4):
        box = paths.crop((max(0, x - margin), max(0, y - margin), min(W, x + w + margin),
                          min(H, y + h + margin)))
        return box.getbbox() is not None

    def in_box(x, y, box, margin=0):
        return box[0] - margin <= x <= box[2] + margin and box[1] - margin <= y <= box[3] + margin

    # the story's buildings, a sign beside each door and, at the two locked doors, a screen
    for building_id, spot in BUILDING_SPOTS.items():
        bx, by, bw, bh = building_box(building_id)
        img = Image.open(BUILDINGS / f'{building_id}.png').convert('RGBA')
        add(building_id, 'building', bx, by, img, [4, 18, bw - 8, bh - 20], label=spot['label'])
        claim(bx - 6, by - 6, bw + 12, bh + 34)
        dx, _ = door_point(building_id)
        sign = sign_art(spot['label'])
        sx = bx + bw + 6 if building_id == 'portaria' else bx - sign.width - 6
        sy = by + bh - sign.height + 8
        add(f'placa-{building_id}', 'sign', sx, sy, sign, [sign.width // 2 - 4, sign.height - 10, 8, 6])
        claim(sx, sy, sign.width, sign.height)
        if building_id in ('centro-de-convivencia', 'bloco-de-tecnologia'):
            k.save(screen_art(ok=True), OUT / f'tela-{building_id}-ok.png')
            scr = screen_art(ok=False)
            tx, ty = dx + 30, by + bh - 12
            add(f'tela-{building_id}', 'screen', tx, ty, scr, [12, 28, 8, 6])
            claim(tx, ty, scr.width, scr.height)

    # classroom blocks and the Reitoria
    for block_id, bx, by, bw, floors, zone, name in BLOCKS:
        img = block_art(block_id, bw, floors, zone, name)
        add(block_id, 'block', bx, by, img, [4, 16, bw - 8, img.height - 18], label=name)
        claim(bx - 6, by - 6, bw + 12, img.height + 20)

    # the gate: two pillars on the wall line
    pillar = Image.open(BUILDINGS / 'portao.png').convert('RGBA')
    k.save(pillar, OUT / 'portao.png')
    for i, py in enumerate((GATE_Y0 - pillar.height + 12, GATE_Y1 - pillar.height + 12)):
        px = WALL_X - pillar.width // 2 - 5
        add(f'portao-{i}', 'pillar', px, py, pillar, [2, pillar.height - 12, pillar.width - 4, 10],
            texture='portao', save=False)
        claim(px, py, pillar.width, pillar.height)

    # the Praça Central's fountain, benches round it, flowerbeds at its ends
    fountain = fountain_art()
    add('fonte', 'fountain', FOUNTAIN[0], FOUNTAIN[1] - 30, fountain,
        [4, 34, fountain.width - 8, fountain.height - 36], ellipse=True)
    claim(FOUNTAIN[0] - 4, FOUNTAIN[1] - 34, fountain.width + 8, fountain.height + 8)

    # the Estacionamento Solar: canopies over two rows of cars
    x0, y0, x1, y1 = PARKING
    for row, cy in enumerate((y0 + 18, y1 - 70)):
        canopy = solar_canopy_art(x1 - x0 - 30)
        for i, cx in enumerate(range(x0 + 14, x1 - 34, 36)):
            if rng.random() < 0.7:
                car = car_art(f'{row}-{i}')
                add(f'carro-{row}-{i}', 'car', cx + 5, cy + 6, car, [2, 6, car.width - 4, car.height - 10])
        add(f'cobertura-solar-{row}', 'canopy', x0 + 10, cy - 30, canopy,
            [10, canopy.height - 8, 6, 6], depth_y=cy + 60)
    claim(x0, y0, x1 - x0, y1 - y0)

    # bleachers by the track, and the sports park's own fence posts are left out on purpose
    bl = bleachers_art(TRACK[2] - TRACK[0] - 160)
    add('arquibancada', 'bleachers', TRACK[0] + 80, TRACK[3] + 6, bl, [0, 8, bl.width, bl.height - 10])
    claim(TRACK[0], TRACK[1], TRACK[2] - TRACK[0], TRACK[3] - TRACK[1] + 50)
    claim(POOL[0] - 14, POOL[1] - 14, POOL[2] - POOL[0] + 28, POOL[3] - POOL[1] + 28)
    for court in COURTS:
        claim(court[0] - 4, court[1] - 4, court[2] - court[0] + 8, court[3] - court[1] + 8)

    # lamps along the main walk and round the plaza; benches facing the plaza and the lake
    lamp_spots = [(x, MAIN_Y - 46) for x in range(300, 1700, 170)] + \
                 [(x, MAIN_Y + 34) for x in range(380, 1700, 210)]
    for i, (x, y) in enumerate(lamp_spots):
        lamp = lamp_art()
        if free(x, y, lamp.width, lamp.height, 2) and not on_path(x + 4, y + lamp.height - 8, 10, 6, 0):
            add(f'poste-{i}', 'lamp', x, y, lamp, [6, lamp.height - 8, 6, 6])
            claim(x, y, lamp.width, lamp.height)
    bench_spots = [(560, 860), (640, 860), (880, 860), (960, 860), (520, 740), (980, 740),
                   (1960, 250), (2080, 250), (1880, 130), (1500, MAIN_Y + 40)]
    for i, (x, y) in enumerate(bench_spots):
        bench = bench_art()
        if free(x, y, bench.width, bench.height, 2):
            add(f'banco-{i}', 'bench', x, y, bench, [0, 8, bench.width, bench.height - 12])
            claim(x, y, bench.width, bench.height)

    # palms along the main walk: the campus' signature
    for i, x in enumerate(range(260, 1720, 96)):
        for side, y in (('n', MAIN_Y - 30), ('s', MAIN_Y + 64)):
            palm = palm_art(f'palma-{i}{side}')
            px, py = x - palm.width // 2, y - palm.height
            foot = (px + 24, py + palm.height - 12, 16, 10)
            if free(*foot, 4) and not on_path(*foot, 2):
                add(f'palmeira-{i}{side}', 'palm', px, py, palm, [27, palm.height - 9, 10, 6])
                claim(*foot)

    # trees: thick in the woods, sparse elsewhere; bushes in the gaps
    def place_trees(count, area, prefix, tries=2500):
        placed = 0
        for _ in range(tries):
            if placed >= count:
                return
            r = rng.randint(16, 26)
            tree = tree_art(f'{prefix}-{placed}', r)
            x = rng.randint(area[0], max(area[0], area[2] - tree.width))
            y = rng.randint(area[1] - r, max(area[1], area[3] - tree.height))
            fx, fy = x + tree.width // 2, y + tree.height - 8
            if x < WALL_X + 6 or fy > SOUTH_WALL_Y - 14 or x + tree.width > W - 2:
                continue
            if in_box(fx, fy, LAKE, 40) or in_box(fx, fy, PARKING, 30) or in_box(fx, fy, TRACK, 30):
                continue
            body = (x + 4, y + tree.height // 3, tree.width - 8, tree.height * 2 // 3)
            if not free(*body, 2) or on_path(fx - r, fy - 10, 2 * r, 14, 6):
                continue
            add(f'{prefix}-{placed}', 'tree', x, y, tree, [tree.width // 2 - 5, tree.height - 12, 10, 7])
            claim(*body)
            placed += 1

    for i, area in enumerate(WOODS):
        place_trees(26, area, f'bosque{i}')
    place_trees(60, (WALL_X, 0, W, SOUTH_WALL_Y), 'arvore')

    bushes = 0
    for _ in range(2500):
        if bushes >= 70:
            break
        bush = bush_art(f'arbusto-{bushes}', rng.randint(9, 13))
        x = rng.randint(WALL_X + 6, W - bush.width - 4)
        y = rng.randint(4, SOUTH_WALL_Y - bush.height - 14)
        if not free(x, y, bush.width, bush.height, 3) or on_path(x, y, bush.width, bush.height, 6):
            continue
        if in_box(x, y, LAKE, 30) or in_box(x, y, PARKING, 10):
            continue
        add(f'arbusto-{bushes}', 'bush', x, y, bush, [3, bush.height // 2, bush.width - 6, bush.height // 2 - 3],
            ellipse=True)
        claim(x, y, bush.width, bush.height)
        bushes += 1


def add(prop_id, kind, x, y, img, solid, label=None, ellipse=False, depth_y=None, texture=None,
        save=True):
    """`solid` is [dx, dy, width, height] inside the sprite: what the player bumps into."""
    w, h = img.size
    if save:
        k.save(img, OUT / f'{texture or prop_id}.png')
    p = dict(id=prop_id, kind=kind, x=int(x), y=int(y), width=w, height=h,
             depthY=int(depth_y if depth_y is not None else y + h), solid=solid)
    if ellipse:
        p['ellipse'] = True
    if label:
        p['label'] = label
    if texture:
        p['texture'] = texture
    props.append(p)
    return p


# ---------------------------------------------------------------- walkable ground
def terrain():
    """One character per 16px tile: '.' walkable, ' ' not (the avenues, the walls, the lake,
    the pool and the track's field)."""
    lx0, ly0, lx1, ly1 = LAKE
    rows = []
    for row in range(H // TILE):
        line = ''
        for col in range(W // TILE):
            x, y = (col + 0.5) * TILE, (row + 0.5) * TILE
            ok = WALL_X + 2 < x and y < SOUTH_WALL_Y - 12
            if GATE_Y0 + 8 < y < GATE_Y1 - 8 and AVENUE_X1 + 8 < x <= WALL_X + 2:
                ok = True
            ex = (x - (lx0 + lx1) / 2) / ((lx1 - lx0) / 2 + 2)
            ey = (y - (ly0 + ly1) / 2) / ((ly1 - ly0) / 2 + 2)
            if ex * ex + ey * ey < 1:
                ok = False
            if POOL[0] - 4 < x < POOL[2] + 4 and POOL[1] - 4 < y < POOL[3] + 4:
                ok = False
            line += '.' if ok else ' '
        rows.append(line)
    return rows


def write_outputs(ground):
    k.save(ground, OUT / 'ground.png')
    doors = [{'buildingId': b, 'x': door_point(b)[0], 'y': door_point(b)[1]} for b in BUILDING_SPOTS]
    entrances = {b: dict(zip(('x', 'y'), door_point(b))) for b in BUILDING_SPOTS}
    for building_id in ('centro-de-convivencia', 'bloco-de-tecnologia'):
        x, y = back_point(building_id)
        entrances[f'{building_id}:norte'] = {'x': x, 'y': y - 22}
    # The graph of the campus' walkways (ADR 0012): the doors, joined the way the paths run.
    nodes = [
        {'id': 'ENTR', 'label': 'Portaria', 'at': 'portaria'},
        {'id': 'BIB', 'label': 'Biblioteca', 'at': 'biblioteca'},
        {'id': 'CCV', 'label': 'Centro de Convivência', 'at': 'centro-de-convivencia'},
        {'id': 'AUD', 'label': 'Auditório', 'at': 'auditorio'},
        {'id': 'TEC', 'label': 'Bloco de Tecnologia', 'at': 'bloco-de-tecnologia'},
        {'id': 'CE', 'label': 'Centro Esportivo', 'at': 'centro-esportivo'},
    ]
    for node in nodes:
        node['x'], node['y'] = door_point(node.pop('at'))
    nodes.append({'id': 'LAG', 'label': 'Lago', 'x': (LAKE[0] + LAKE[2]) // 2, 'y': LAKE[3] + 30})
    manifest = {'version': 1, 'width': W, 'height': H, 'props': props, 'doors': doors,
                'entrances': entrances, 'nodes': nodes, 'terrain': terrain()}
    (OUT / 'layout.json').write_text(k.to_json(manifest) + '\n', encoding='utf8')

    rows = ['// AUTO-GENERATED by scripts/render-campus-pixel-art.py. Do not edit.',
            f'export const CAMPUS_SIZE = {{ width: {W}, height: {H} }} as const', '',
            'export const CAMPUS_PROPS = [']
    for p in props:
        rows.append(f"  {{ id: '{p['id']}', texture: '{p.get('texture', p['id'])}', x: {p['x']}, "
                    f"y: {p['y']}, width: {p['width']}, depthY: {p['depthY']} }},")
    rows += ['] as const', '', '/** Where E opens each building: just outside its facade. */',
             'export const CAMPUS_DOORS = [']
    for door in doors:
        rows.append(f"  {{ buildingId: '{door['buildingId']}', x: {door['x']}, y: {door['y']} }},")
    rows += ['] as const', '',
             '/** Where the player stands on the campus coming out of each building. */',
             'export const CAMPUS_ENTRANCES = {']
    for key, point in entrances.items():
        rows.append(f"  '{key}': {{ x: {point['x']}, y: {point['y']} }},")
    rows += ['} as const', '']
    (ROOT / 'apps/game/src/renderer/src/scenes/campus-assets.generated.ts').write_text(
        '\n'.join(rows), encoding='utf8')

    preview = ground.copy()
    for p in sorted(props, key=lambda p: p['depthY']):
        with Image.open(OUT / f"{p.get('texture', p['id'])}.png") as sprite:
            preview.alpha_composite(sprite.convert('RGBA'), (p['x'], p['y']))
    preview.convert('RGB').save(ROOT / 'docs/campus-pixel-preview.png', optimize=True)
    scale = min((960 - 80) / W, (540 - 85) / H)  # campus-scene.ts, the M map
    preview.resize((round(W * scale), round(H * scale)), Image.Resampling.BOX).convert('RGB').save(
        OUT / 'overview.png', optimize=True)


if __name__ == '__main__':
    for stale in OUT.glob('*.png'):
        stale.unlink()
    ground, paths = build_ground()
    build_props(paths)
    write_outputs(ground)
    print(f'{len(props)} campus props, world {W}x{H}')
