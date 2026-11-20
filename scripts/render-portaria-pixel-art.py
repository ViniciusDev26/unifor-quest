"""The portaria (Quest 1) as layered pixel art, 1 art pixel = 1 game pixel (ADR 0075, 0087).

Usage (from the repository root):  uv run --with pillow python scripts/render-portaria-pixel-art.py

Marcos's guardhouse, where the game starts: the floor, walls, wall screens and sign panel
are drawn here; the furniture (his desk, the turnstiles, the vending machine, the water
cooler, the plants, the waiting chairs, the notice board) comes from
scripts/portaria-props.py. The screens and the panel each have every state the story puts
them in (lit or NULL; readable, noise or scrambled), and the scene swaps between them.

Outputs, all committed:
- assets/portaria/pixel-world/: ground.png, one PNG per prop, layout.json, overview.png;
- apps/game/src/renderer/src/scenes/portaria-assets.generated.ts;
- docs/portaria-pixel-preview.png.
content/maps/src/entrada.mjs reads layout.json for the walkable floor and the solids.
"""
from pathlib import Path
import random
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pixel_kit as k  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PROPS = ROOT / 'assets' / 'portaria' / 'props'
OUT = ROOT / 'assets' / 'portaria' / 'pixel-world'
OUT.mkdir(parents=True, exist_ok=True)
TILE = 16
W, H = 1024, 768

# The hall the player walks in, and the wall around it.
HALL = (64, 176, 960, 688)
WALL_TOP = 40          # the back wall's face runs from here down to HALL[1]
DOOR = (448, 576)      # the opening in the south wall: the way out to the campus
TURNSTILE_Y = 520

P = {
    'floor': ['#d8d2c8', '#d2ccc1', '#ded8ce'], 'floor_hi': '#ebe6dd', 'grout': '#b7afa3',
    'wall': '#4b5a73', 'wall_hi': '#6d7f9c', 'wall_face': '#e7e1d4', 'wall_face2': '#ddd5c4',
    'trim': '#8a5a3c', 'trim_hi': '#b07a52', 'skirting': '#5c4636',
    'stripe_y': '#f2c230', 'stripe_k': '#2c2c34',
    'rug': '#2f5d8a', 'rug2': '#3b6fa0', 'rug_edge': '#e0b45a',
    'glass': '#9fd3e0', 'glass2': '#cbeaf0',
}
rng = random.Random(87)
props = []


# ---------------------------------------------------------------- ground
def build_ground():
    img = Image.new('RGBA', (W, H), '#232838')
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = HALL

    # Outer walls, seen from above: a dark top all round.
    k.box(d, x0 - 24, WALL_TOP - 16, x1 + 24, y1 + 32, P['wall'], k.INK_COOL)
    k.rect(d, x0 - 23, WALL_TOP - 15, x1 + 23, WALL_TOP - 9, P['wall_hi'])

    # The back wall's face, above the floor: plaster, a wooden dado rail and a skirting.
    k.rect(d, x0, WALL_TOP, x1, y0 - 1, P['wall_face'])
    for x in range(x0, x1, 12):
        k.vline(d, x, WALL_TOP + 2, y0 - 26, P['wall_face2'])
    k.rect(d, x0, y0 - 26, x1, y0 - 14, P['trim'])
    k.hline(d, x0, x1, y0 - 26, P['trim_hi'])
    k.rect(d, x0, y0 - 13, x1, y0 - 1, P['skirting'])
    k.hline(d, x0, x1, y0 - 1, k.INK)

    # Floor: big polished stone tiles, a soft shadow under the walls.
    floor = Image.new('L', (W, H), 0)
    fd = ImageDraw.Draw(floor)
    fd.rectangle(HALL, fill=255)
    fd.rectangle((DOOR[0], y1, DOOR[1], y1 + 31), fill=255)
    k.paving(img, floor, rng, P['floor'], P['grout'], size=32, offset_rows=False)
    for y in range(y0, y1, 32):            # a polished glint on each tile
        for x in range(x0, x1, 32):
            if rng.random() < 0.5:
                k.hline(d, x + 4, x + 9, y + 4, P['floor_hi'])
    k.edge_shadow(img, floor, depth=6, alpha=55)

    # A guide line on the floor, from the way in to Marcos's desk.
    gx = (DOOR[0] + DOOR[1]) // 2
    for y in range(400, 588, 10):
        k.rect(d, gx - 3, y, gx + 2, y + 5, '#3f6fb0')
        k.hline(d, gx - 3, gx + 2, y, '#6c8cc0')

    # Safety stripe along the turnstile line.
    for x in range(x0, x1, 16):
        k.rect(d, x, TURNSTILE_Y + 36, x + 7, TURNSTILE_Y + 41, P['stripe_y'])
        k.rect(d, x + 8, TURNSTILE_Y + 36, x + 15, TURNSTILE_Y + 41, P['stripe_k'])

    # The welcome rug in front of the way out.
    rx0, ry0, rx1, ry1 = DOOR[0] - 8, 596, DOOR[1] + 8, 668
    k.box(d, rx0, ry0, rx1, ry1, P['rug'], P['rug_edge'])
    k.rect(d, rx0 + 4, ry0 + 4, rx1 - 4, ry1 - 4, P['rug2'])
    k.rect(d, rx0 + 6, ry0 + 6, rx1 - 6, ry1 - 6, P['rug'])
    k.centered_text(img, (rx0 + rx1) // 2, ry0 + 26, 'BEM-VINDO', '#fff2d8', 2, '#1d3a5c')

    # South wall with the opening to the campus, and the glass doors standing open in it.
    for a, b in ((x0 - 23, DOOR[0] - 1), (DOOR[1] + 1, x1 + 23)):
        k.rect(d, a, y1 + 1, b, y1 + 31, P['wall'])
        k.hline(d, a, b, y1 + 1, P['wall_hi'])
    for gx in (DOOR[0] - 10, DOOR[1] + 1):
        k.box(d, gx, y1 - 6, gx + 9, y1 + 30, P['glass'], k.INK_COOL)
        k.vline(d, gx + 2, y1 - 5, y1 + 29, P['glass2'])
    k.box(d, DOOR[0] + 24, y1 + 6, DOOR[1] - 24, y1 + 22, '#1f6b4f', k.INK_COOL)
    k.centered_text(img, (DOOR[0] + DOOR[1]) // 2, y1 + 11, 'CAMPUS', '#d9ffe9')
    return img, floor


# ---------------------------------------------------------------- drawn props
def add(prop_id, kind, x, y, img, solid, label=None, depth_y=None, save_as=None):
    w, h = img.size
    k.save(img, OUT / f'{save_as or prop_id}.png')
    p = dict(id=prop_id, kind=kind, x=int(x), y=int(y), width=w, height=h,
             depthY=int(depth_y if depth_y is not None else y + h), solid=solid)
    if label:
        p['label'] = label
    props.append(p)
    return p


def screen_art(state):
    """A wall screen: the campus news when lit, NULL in green once it has taken over."""
    w, h = 120, 76
    img, d = k.new(w, h)
    k.box(d, 0, 0, w - 1, h - 9, '#1d2230', k.INK_COOL)
    k.rect(d, 3, 3, w - 4, h - 12, '#10141d')
    if state == 'ok':
        k.rect(d, 4, 4, w - 5, h - 13, '#1f4f8a')
        k.rect(d, 4, 4, w - 5, 14, '#2c6fbd')
        k.pixel_text(img, 8, 7, 'UNIFOR', '#ffffff')
        k.pixel_text(img, w - 34, 7, '08:00', '#cfe6ff')
        k.pixel_text(img, 8, 22, 'BEM-VINDO,', '#ffe7a0')
        k.pixel_text(img, 8, 31, 'CALOURO!', '#ffe7a0')
        k.pixel_text(img, 8, 45, 'AULAS HOJE', '#cfe6ff')
        k.hline(d, 8, w - 10, 54, '#5a8fd0')
    else:
        k.rect(d, 4, 4, w - 5, h - 13, '#06120b')
        for y in range(6, h - 14, 3):                         # scanlines
            k.hline(d, 5, w - 6, y, '#0b1f14')
        k.centered_text(img, w // 2, 22, 'NULL', '#39ff6a', 3, '#0f5a2a')
        for x in range(10, w - 12, 9):
            k.hline(d, x, x + 4, 52, '#1f8a46')
    k.rect(d, w // 2 - 10, h - 9, w // 2 + 9, h - 6, '#2c3346')   # wall bracket
    return img


SIGN_LINES = ['CAMPUS', 'BIBLIOTECA', 'CONVIVENCIA', 'TECNOLOGIA']


def caesar(text, shift=3):
    return ''.join(chr((ord(c) - 65 + shift) % 26 + 65) if 'A' <= c <= 'Z' else c for c in text)


def panel_art(state):
    """The sign panel by the turnstiles: where each place is. Davi's reset scrambles it
    (a Caesar shift of 3, the first quest) and, in between, it shows noise."""
    w, h = 236, 96
    img, d = k.new(w, h)
    k.box(d, 0, 0, w - 1, h - 1, '#2a2f3d', k.INK_COOL)
    k.rect(d, 4, 4, w - 5, h - 5, '#151a25')
    k.rect(d, 4, 4, w - 5, 16, '#3a4256')
    k.pixel_text(img, 9, 7, 'PAINEL DE PLACAS', '#e8e8f0')
    srng = random.Random(5)
    arrows = ['^', '<', '>', '>']
    for i, line in enumerate(SIGN_LINES):
        y = 24 + i * 17
        k.rect(d, 8, y - 2, w - 9, y + 11, '#1d2433')
        if state == 'ok':
            text, color = line, '#facc15'
        elif state == 'scrambled':
            text, color = caesar(line), '#facc15'
        else:
            text = ''.join(srng.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ') for _ in line)
            color = '#f87171'
        k.pixel_text(img, 14, y + 2, text, color)
        k.box(d, w - 30, y, w - 14, y + 9, '#2c6f4f' if state == 'ok' else '#5a2a2a', k.INK_COOL)
        k.centered_text(img, w - 22, y + 2, arrows[i] if state == 'ok' else '-', '#e8ffe8')
    return img


def column_art():
    w, h = 40, 132
    img, d = k.new(w, h)
    k.shadow(d, 2, h - 12, w - 3, h - 1)
    k.box(d, 4, 0, w - 5, h - 8, '#e7e1d4', k.INK)
    k.rect(d, 6, 2, 10, h - 10, '#f6f2ea')
    k.rect(d, w - 12, 2, w - 7, h - 10, '#cfc6b6')
    k.box(d, 0, h - 16, w - 1, h - 6, '#b9ae9c', k.INK)
    k.box(d, 0, 0, w - 1, 8, '#b9ae9c', k.INK)
    return img


def camera_art():
    """A security camera on the wall, watching the turnstiles."""
    w, h = 22, 16
    img, d = k.new(w, h)
    k.box(d, 0, 2, 5, 12, '#4a4f5c', k.INK_COOL)
    k.box(d, 4, 3, w - 2, 11, '#e7e1d4', k.INK_COOL)
    k.rect(d, w - 4, 5, w - 3, 8, '#1d2230')
    d.point((w - 7, 5), fill='#ff4d4d')
    return img


def lamp_art():
    w, h = 18, 60
    img, d = k.new(w, h)
    cx = w // 2
    k.shadow(d, cx - 7, h - 7, cx + 7, h - 1)
    k.box(d, cx - 4, h - 8, cx + 4, h - 3, '#3e4352')
    k.rect(d, cx - 1, 12, cx + 1, h - 8, '#4a4f5c')
    k.box(d, cx - 6, 2, cx + 6, 13, '#3e4352')
    k.rect(d, cx - 4, 4, cx + 4, 11, '#ffe9a8')
    return img


def clock_art():
    w, h = 26, 26
    img, d = k.new(w, h)
    k.oval(d, 0, 0, w - 1, h - 1, '#f6f2ea', k.INK)
    k.oval(d, 2, 2, w - 3, h - 3, '#ffffff', '#8a5a3c')
    for a, b in ((12, 4), (21, 12), (12, 20), (4, 12)):
        d.point((a, b), fill=k.INK)
    k.vline(d, 12, 6, 12, k.INK)
    k.hline(d, 12, 17, 12, k.INK)
    return img


def extinguisher_art():
    w, h = 14, 30
    img, d = k.new(w, h)
    k.shadow(d, 1, h - 5, w - 2, h - 1, soft=True)
    k.box(d, 3, 6, w - 4, h - 4, '#c8373f', k.INK)
    k.vline(d, 5, 8, h - 6, '#e86068')
    k.box(d, 4, 1, 9, 6, '#2c2c34', k.INK)
    k.rect(d, 4, 14, w - 5, 17, '#f2f2f2')
    return img


def bin_art():
    w, h = 18, 24
    img, d = k.new(w, h)
    k.shadow(d, 1, h - 6, w - 2, h - 1, soft=True)
    k.box(d, 2, 4, w - 3, h - 3, '#4f8a73', k.INK)
    for x in range(5, w - 5, 3):
        k.vline(d, x, 7, h - 6, '#3f7060')
    k.box(d, 0, 1, w - 1, 5, '#5fa086', k.INK)
    return img


def stanchion_art(width):
    """Queue posts with a belt between them, in front of the desk."""
    h = 30
    img, d = k.new(width, h)
    for x in (0, width - 8):
        k.shadow(d, x - 1, h - 5, x + 9, h - 1, soft=True)
        k.box(d, x + 2, 4, x + 5, h - 4, '#9aa6bb', k.INK_COOL)
        k.box(d, x, h - 6, x + 7, h - 2, '#4a4f5c', k.INK_COOL)
        k.box(d, x + 1, 1, x + 6, 5, '#d9dde2', k.INK_COOL)
    k.rect(d, 6, 6, width - 7, 8, '#c8373f')
    k.hline(d, 6, width - 7, 6, '#e86068')
    return img


def prop_image(name):
    return Image.open(PROPS / f'{name}.png').convert('RGBA')


# ---------------------------------------------------------------- placing
def build_props():
    x0, y0, x1, y1 = HALL

    # Back wall: two screens, the notice board, the sign panel. On the wall face, so they
    # sit behind everything that stands on the floor and block nothing.
    for i, sx in enumerate((150, 300)):
        ok = screen_art('ok')
        add(f'tela-{i + 1}', 'screen', sx, 70, ok, None, depth_y=0)
        k.save(screen_art('null'), OUT / f'tela-{i + 1}-null.png')
    mural = prop_image('mural')
    add('mural', 'board', 460, y0 - 26 - mural.height + 6, mural, None, depth_y=0)
    panel = panel_art('ok')
    add('painel', 'panel', 664, 56, panel, None, depth_y=0)
    k.save(panel_art('noise'), OUT / 'painel-noise.png')
    k.save(panel_art('scrambled'), OUT / 'painel-scrambled.png')
    add('camera', 'camera', x1 - 40, y0 - 60, camera_art(), None, depth_y=0)
    add('camera-oeste', 'camera', x0 + 18, y0 - 60, camera_art().transpose(Image.Transpose.FLIP_LEFT_RIGHT),
        None, depth_y=0)
    add('relogio', 'clock', 586, 66, clock_art(), None, depth_y=0)
    add('extintor', 'extinguisher', 612, y0 - 32, extinguisher_art(), [2, 24, 10, 6])

    # Marcos's desk, in the middle of the hall, facing the way in. He stands behind it.
    desk_img = prop_image('guarita')
    dx = (DOOR[0] + DOOR[1]) // 2 - desk_img.width // 2
    dy = 262
    desk = add('guarita', 'desk', dx, dy, desk_img,
               [4, desk_img.height // 3, desk_img.width - 8, desk_img.height * 2 // 3 - 6], label='Guarita')
    # Queue posts to each side of where the player stands to talk, leaving the middle open.
    for i, sx in enumerate((desk['x'] - 10, desk['x'] + desk['width'] - 60)):
        add(f'fila-{i}', 'stanchion', sx, desk['y'] + desk['height'] + 8, stanchion_art(70), [0, 20, 70, 8])

    # The turnstile line: two on each side of the open gate the player walks through.
    t = prop_image('catraca')
    gate0, gate1 = DOOR[0] - 8, DOOR[1] + 8
    xs = [gate0 - (i + 1) * (t.width + 10) for i in range(3)] + [gate1 + 10 + i * (t.width + 10) for i in range(3)]
    for i, tx in enumerate(xs):
        add(f'catraca-{i}', 'turnstile', tx, TURNSTILE_Y, t, [4, t.height - 16, t.width - 8, 12])
    # Low glass barriers close the line from the turnstiles to the side walls.
    for i, (a, b) in enumerate(((x0, min(xs) - 4), (max(xs) + t.width + 4, x1))):
        bar, bd = k.new(b - a, 30)
        k.rshadow(bd, 2, 22, b - a - 1, 29, soft=True)
        k.box(bd, 0, 4, b - a - 1, 22, P['glass2'], '#7f9aa6')
        k.hline(bd, 1, b - a - 2, 6, '#ffffff')
        for x in range(0, b - a, 64):
            k.box(bd, x, 0, x + 5, 24, '#9aa6bb', k.INK_COOL)
        add(f'barreira-{i}', 'barrier', a, TURNSTILE_Y + 18, bar, [0, 16, b - a, 8])

    # The waiting area: chairs along the west wall, plants in the corners.
    chairs = prop_image('cadeiras')
    for i, cy in enumerate((y0 + 40, y0 + 150)):
        add(f'cadeiras-{i}', 'chairs', x0 + 18, cy, chairs, [2, chairs.height // 2, chairs.width - 4, chairs.height // 2 - 4])
    plant = prop_image('planta')
    for i, (px, py) in enumerate(((x0 + 8, y1 - plant.height - 6), (x1 - plant.width - 8, y1 - plant.height - 6),
                                  (x0 + 150, y0 - 10), (x1 - plant.width - 150, y0 - 10))):
        add(f'planta-{i}', 'plant', px, py, plant, [6, plant.height - 16, plant.width - 12, 12])

    # The east side: a vending machine and the water cooler.
    vend = prop_image('maquina-lanches')
    add('maquina-lanches', 'vending', x1 - vend.width - 24, y0 + 20, vend, [2, vend.height - 26, vend.width - 4, 22],
        label='Máquina de lanches')
    cooler = prop_image('bebedouro')
    add('bebedouro', 'cooler', x1 - vend.width - cooler.width - 44, y0 + 50, cooler,
        [2, cooler.height - 14, cooler.width - 4, 12], label='Bebedouro')

    # Bins by the vending machine and by the chairs.
    for i, (bx, by) in enumerate(((x1 - 80, y0 + 116), (x0 + 130, y0 + 210))):
        add(f'lixeira-{i}', 'bin', bx, by, bin_art(), [2, 14, 14, 8])

    # Two columns holding up the ceiling, and lamps at the turnstiles.
    col = column_art()
    for i, cx in enumerate((x0 + 260, x1 - 300)):
        add(f'coluna-{i}', 'column', cx, 330, col, [2, col.height - 18, col.width - 4, 14])
    for i, lx in enumerate((DOOR[0] - 140, DOOR[1] + 122)):
        lamp = lamp_art()
        add(f'poste-{i}', 'lamp', lx, TURNSTILE_Y + 70, lamp, [6, lamp.height - 8, 6, 6])


# ---------------------------------------------------------------- outputs
def terrain(floor):
    rows = []
    for row in range(H // TILE):
        line = ''
        for col in range(W // TILE):
            line += '.' if floor.getpixel((col * TILE + TILE // 2, row * TILE + TILE // 2)) else ' '
        rows.append(line)
    return rows


def write_outputs(ground, floor):
    k.save(ground, OUT / 'ground.png')
    desk = next(p for p in props if p['id'] == 'guarita')
    marcos = {'x': desk['x'] + desk['width'] // 2, 'y': desk['y'] - 6}
    manifest = {
        'version': 1, 'width': W, 'height': H, 'props': props,
        'marcos': marcos,
        # Where the player talks to Marcos: in front of his desk.
        'talk': {'x': marcos['x'], 'y': desk['y'] + desk['height'] + 14},
        'exit': {'x': (DOOR[0] + DOOR[1]) // 2, 'y': HALL[3] - 10},
        'spawn': {'x': (DOOR[0] + DOOR[1]) // 2, 'y': HALL[3] - 40},
        'terrain': terrain(floor),
    }
    (OUT / 'layout.json').write_text(k.to_json(manifest) + '\n', encoding='utf8')

    rows = ['// AUTO-GENERATED by scripts/render-portaria-pixel-art.py. Do not edit.',
            f'export const PORTARIA_SIZE = {{ width: {W}, height: {H} }} as const', '',
            'export const PORTARIA_PROPS = [']
    for p in props:
        rows.append(f"  {{ id: '{p['id']}', x: {p['x']}, y: {p['y']}, depthY: {p['depthY']} }},")
    rows += ['] as const', '']
    for name in ('marcos', 'talk', 'exit', 'spawn'):
        point = manifest[name]
        rows.append(f"export const PORTARIA_{name.upper()} = {{ x: {point['x']}, y: {point['y']} }} as const")
    rows.append('')
    (ROOT / 'apps/game/src/renderer/src/scenes/portaria-assets.generated.ts').write_text(
        '\n'.join(rows), encoding='utf8')

    preview = ground.copy()
    for p in sorted(props, key=lambda p: p['depthY']):
        with Image.open(OUT / f"{p['id']}.png") as sprite:
            preview.alpha_composite(sprite.convert('RGBA'), (p['x'], p['y']))
    preview.convert('RGB').save(ROOT / 'docs/portaria-pixel-preview.png', optimize=True)
    scale = min((960 - 80) / W, (540 - 85) / H)  # entrada-scene.ts, the M map
    preview.resize((round(W * scale), round(H * scale)), Image.Resampling.BOX).convert('RGB').save(
        OUT / 'overview.png', optimize=True)


if __name__ == '__main__':
    for stale in OUT.glob('*.png'):
        stale.unlink()
    ground, floor = build_ground()
    build_props()
    write_outputs(ground, floor)
    print(f'{len(props)} portaria props, world {W}x{H}')
