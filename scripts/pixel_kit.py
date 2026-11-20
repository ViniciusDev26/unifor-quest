"""Shared helpers for the pixel-art generators (CC and Bloco de Tecnologia), ADR 0075.

Everything here draws at 1 art pixel = 1 game pixel, with hard edges only: no anti-aliased
shapes, no TrueType text. Imported by scripts/render-*-pixel-art.py, which run with the
scripts/ directory first on sys.path (plain `python scripts/render-....py`).
"""
from PIL import Image, ImageDraw, ImageFilter

INK = '#3a2830'          # outline: dark warm plum, never pure black
INK_COOL = '#2c3346'     # outline for the cool (tech) palette
SHADOW = (40, 26, 36, 70)
SHADOW_SOFT = (40, 26, 36, 40)

WOOD = ['#4a2a22', '#6e3d2a', '#94563a', '#b9744a', '#dc9b63']
LEAF = ['#2f5a3a', '#3f7a45', '#5f9f52', '#93c66b', '#c4e08a']
FLOWERS = ['#e8728a', '#f3b4c4', '#f6d36b', '#ffffff', '#b98ae0', '#ef8f5a']
STONE = ['#6f6a73', '#8f8890', '#aba4a6', '#c9c1bd', '#e2dbd2']


def new(w, h):
    img = Image.new('RGBA', (int(w), int(h)), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def rect(d, x0, y0, x1, y1, fill):
    """Inclusive pixel rectangle; silently skips empty ones."""
    if x1 >= x0 and y1 >= y0:
        d.rectangle((int(x0), int(y0), int(x1), int(y1)), fill=fill)


def box(d, x0, y0, x1, y1, fill, outline=INK):
    rect(d, x0, y0, x1, y1, outline)
    rect(d, x0 + 1, y0 + 1, x1 - 1, y1 - 1, fill)


def hline(d, x0, x1, y, c):
    rect(d, x0, y, x1, y, c)


def vline(d, x, y0, y1, c):
    rect(d, x, y0, x, y1, c)


def blob(d, cx, cy, rx, ry, fill):
    if rx >= 0 and ry >= 0:
        d.ellipse((int(cx - rx), int(cy - ry), int(cx + rx), int(cy + ry)), fill=fill)


def oval(d, x0, y0, x1, y1, fill, outline=INK):
    d.ellipse((int(x0), int(y0), int(x1), int(y1)), fill=outline)
    if x1 - x0 > 2 and y1 - y0 > 2:
        d.ellipse((int(x0) + 1, int(y0) + 1, int(x1) - 1, int(y1) - 1), fill=fill)


def shadow(d, x0, y0, x1, y1, soft=False):
    d.ellipse((int(x0), int(y0), int(x1), int(y1)), fill=SHADOW_SOFT if soft else SHADOW)


def rshadow(d, x0, y0, x1, y1, soft=False):
    rect(d, x0, y0, x1, y1, SHADOW_SOFT if soft else SHADOW)


def bush(d, cx, cy, r, rng, flowers=0):
    """A round leafy bush, lit from the top-left, with optional flower dots."""
    blob(d, cx, cy + 1, r, r - 1, INK)
    blob(d, cx, cy, r - 1, r - 2, LEAF[1])
    blob(d, cx - r // 4, cy - r // 4, r * 2 // 3, r // 2, LEAF[2])
    blob(d, cx - r // 3, cy - r // 3, max(1, r // 3), max(1, r // 4), LEAF[3])
    for _ in range(max(2, r // 2)):
        x = cx + rng.randint(-r + 2, r - 3)
        y = cy + rng.randint(-r + 3, r - 3)
        d.point((x, y), fill=LEAF[0] if rng.random() < 0.5 else LEAF[3])
    for _ in range(flowers):
        x = cx + rng.randint(-r + 3, r - 4)
        y = cy + rng.randint(-r + 3, r - 4)
        c = rng.choice(FLOWERS)
        d.point((x, y), fill=c)
        d.point((x + 1, y), fill=c)


def tree(d, cx, base_y, r, rng):
    """Round-canopy tree: trunk, shadow on the ground, layered crown."""
    shadow(d, cx - r, base_y - 4, cx + r, base_y + 5)
    rect(d, cx - 3, base_y - r // 2 - 4, cx + 2, base_y, WOOD[1])
    vline(d, cx - 2, base_y - r // 2 - 4, base_y - 1, WOOD[2])
    cy = base_y - r - r // 2
    blob(d, cx, cy + 2, r + 1, r, INK)
    blob(d, cx, cy + 1, r, r - 1, LEAF[0])
    blob(d, cx - 2, cy - 1, r - 3, r - 4, LEAF[1])
    blob(d, cx - r // 3, cy - r // 3, r // 2, r // 2 - 1, LEAF[2])
    blob(d, cx - r // 2, cy - r // 2, r // 4, r // 5, LEAF[3])
    for _ in range(r):
        x = cx + rng.randint(-r + 3, r - 3)
        y = cy + rng.randint(-r + 3, r - 3)
        d.point((x, y), fill=rng.choice((LEAF[0], LEAF[2], LEAF[3])))


def grass_field(img, rng, base='#6aa84f', tones=('#5e9a45', '#79b85a', '#8cc66a'),
                flowers=0.0):
    """Grass with tufts and the odd flower, like a lawn seen from above."""
    d = ImageDraw.Draw(img)
    rect(d, 0, 0, img.width - 1, img.height - 1, base)
    for _ in range(img.width * img.height // 28):
        x = rng.randrange(img.width)
        y = rng.randrange(img.height)
        c = rng.choice(tones)
        d.point((x, y), fill=c)
    for _ in range(img.width * img.height // 520):  # little "v" tufts
        x = rng.randrange(1, img.width - 2)
        y = rng.randrange(1, img.height - 2)
        d.point((x - 1, y), fill=tones[2])
        d.point((x + 1, y), fill=tones[2])
        d.point((x, y + 1), fill=tones[0])
    for _ in range(int(img.width * img.height * flowers)):
        x = rng.randrange(1, img.width - 2)
        y = rng.randrange(1, img.height - 2)
        c = rng.choice(FLOWERS)
        d.point((x, y), fill=c)
        d.point((x, y + 1), fill=tones[0])


def paving(img, mask, rng, tones, grout, size=16, offset_rows=True):
    """Stone pavers clipped to `mask` (mode 'L'), each with its own tone and a highlight."""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for row, y in enumerate(range(0, img.height, size)):
        shift = (size // 2) if (offset_rows and row % 2) else 0
        for x in range(-shift, img.width, size):
            c = rng.choice(tones)
            rect(d, x, y, x + size - 1, y + size - 1, grout)
            rect(d, x + 1, y + 1, x + size - 2, y + size - 2, c)
            hline(d, x + 1, x + size - 2, y + 1, tones[-1])
            if rng.random() < 0.25:
                px = x + rng.randint(3, size - 4)
                py = y + rng.randint(4, size - 4)
                d.point((px, py), fill=grout)
    img.paste(layer, (0, 0), mask)


def edge_shadow(img, mask, depth=4, alpha=60):
    """Darkens the inside rim of `mask`: walls casting a soft shadow onto the floor."""
    empty = Image.new('RGBA', img.size, (0, 0, 0, 0))
    previous = mask
    for i in range(1, depth + 1):
        eroded = mask.filter(ImageFilter.MinFilter(i * 2 + 1))
        # the ring between this erosion and the previous one, one pixel wide
        band = Image.new('L', img.size, 0)
        band.paste(previous, (0, 0))
        band.paste(0, (0, 0), eroded)
        tint = Image.new('RGBA', img.size, (40, 26, 36, int(alpha * (depth - i + 1) / depth)))
        img.alpha_composite(Image.composite(tint, empty, band))
        previous = eroded


# ---------------------------------------------------------------- bitmap font (5 rows)
_F = {
    'A': ['0110', '1001', '1111', '1001', '1001'], 'B': ['1110', '1001', '1110', '1001', '1110'],
    'C': ['0111', '1000', '1000', '1000', '0111'], 'D': ['1110', '1001', '1001', '1001', '1110'],
    'E': ['1111', '1000', '1110', '1000', '1111'], 'F': ['1111', '1000', '1110', '1000', '1000'],
    'G': ['0111', '1000', '1011', '1001', '0111'], 'H': ['1001', '1001', '1111', '1001', '1001'],
    'I': ['111', '010', '010', '010', '111'], 'J': ['0011', '0001', '0001', '1001', '0110'],
    'K': ['1001', '1010', '1100', '1010', '1001'], 'L': ['1000', '1000', '1000', '1000', '1111'],
    'M': ['10001', '11011', '10101', '10001', '10001'], 'N': ['1001', '1101', '1011', '1001', '1001'],
    'O': ['0110', '1001', '1001', '1001', '0110'], 'P': ['1110', '1001', '1110', '1000', '1000'],
    'Q': ['0110', '1001', '1001', '1011', '0111'], 'R': ['1110', '1001', '1110', '1010', '1001'],
    'S': ['0111', '1000', '0110', '0001', '1110'], 'T': ['11111', '00100', '00100', '00100', '00100'],
    'U': ['1001', '1001', '1001', '1001', '0110'], 'V': ['10001', '10001', '01010', '01010', '00100'],
    'W': ['10001', '10001', '10101', '11011', '10001'], 'X': ['1001', '1001', '0110', '1001', '1001'],
    'Y': ['10001', '01010', '00100', '00100', '00100'], 'Z': ['1111', '0010', '0100', '1000', '1111'],
    '0': ['0110', '1011', '1101', '1001', '0110'], '1': ['010', '110', '010', '010', '111'],
    '2': ['1110', '0001', '0110', '1000', '1111'], '3': ['1110', '0001', '0110', '0001', '1110'],
    '4': ['1001', '1001', '1111', '0001', '0001'], '5': ['1111', '1000', '1110', '0001', '1110'],
    '6': ['0110', '1000', '1110', '1001', '0110'], '7': ['1111', '0001', '0010', '0100', '0100'],
    '8': ['0110', '1001', '0110', '1001', '0110'], '9': ['0110', '1001', '0111', '0001', '0110'],
    '+': ['000', '010', '111', '010', '000'], '/': ['001', '001', '010', '100', '100'],
    '<': ['001', '010', '100', '010', '001'], '>': ['100', '010', '001', '010', '100'],
    '.': ['0', '0', '0', '0', '1'], '-': ['000', '000', '111', '000', '000'],
    ' ': ['00', '00', '00', '00', '00'], '•': ['0', '0', '1', '0', '0'],
    '_': ['111', '000', '000', '000', '000'],
}
# accented capitals: base glyph plus a mark on the row above
_ACCENT = {'É': ('E', 'acute'), 'Á': ('A', 'acute'), 'Ú': ('U', 'acute'), 'Ó': ('O', 'acute'),
           'Õ': ('O', 'tilde'), 'Ã': ('A', 'tilde'), 'Ê': ('E', 'circ'), 'Ç': ('C', 'cedilla'),
           'Í': ('I', 'acute')}


def text_width(s, scale=1):
    w = 0
    for ch in s:
        base = _ACCENT.get(ch, (ch, None))[0]
        w += (len(_F[base][0]) + 1) * scale
    return max(0, w - scale)


def pixel_text(img, x, y, s, color, scale=1, shadow_color=None):
    """Draws `s` with its top-left at (x, y). Accents use the row above y."""
    if shadow_color is not None:
        pixel_text(img, x + scale, y + scale, s, shadow_color, scale)
    d = ImageDraw.Draw(img)
    cx = x
    for ch in s:
        base, mark = _ACCENT.get(ch, (ch, None))
        rows = _F[base]
        gw = len(rows[0])
        for r, bits in enumerate(rows):
            for c, bit in enumerate(bits):
                if bit == '1':
                    rect(d, cx + c * scale, y + r * scale, cx + (c + 1) * scale - 1,
                         y + (r + 1) * scale - 1, color)
        mid = cx + (gw // 2) * scale
        if mark == 'acute':
            rect(d, mid, y - 2 * scale, mid + scale - 1, y - scale - 1, color)
        elif mark == 'tilde':
            rect(d, cx, y - 2 * scale, cx + gw * scale - 1, y - scale - 1, color)
        elif mark == 'circ':
            rect(d, mid - scale, y - 2 * scale, mid + 2 * scale - 1, y - scale - 1, color)
        elif mark == 'cedilla':
            rect(d, mid, y + 5 * scale, mid + scale - 1, y + 6 * scale - 1, color)
        cx += (gw + 1) * scale


def centered_text(img, cx, y, s, color, scale=1, shadow_color=None):
    pixel_text(img, int(cx - text_width(s, scale) / 2), y, s, color, scale, shadow_color)


def save(img, path):
    img.save(path, optimize=True)


def to_json(value, indent=0):
    """JSON the way Biome formats it: objects expanded, short arrays of scalars inline."""
    import json
    pad = '  ' * indent
    if isinstance(value, dict):
        if not value:
            return '{}'
        items = [f'{pad}  {json.dumps(k, ensure_ascii=False)}: {to_json(v, indent + 1)}'
                 for k, v in value.items()]
        return '{\n' + ',\n'.join(items) + f'\n{pad}}}'
    if isinstance(value, list):
        inline = '[' + ', '.join(to_json(v, indent + 1) for v in value) + ']'
        scalars = all(not isinstance(v, (dict, list)) for v in value)
        # Biome keeps an array of scalars on one line only while it fits in 100 columns.
        if '\n' not in inline and ((scalars and len(pad) + len(inline) < 90)
                                   or len(pad) + len(inline) < 80):
            return inline
        items = [f'{pad}  {to_json(v, indent + 1)}' for v in value]
        return '[\n' + ',\n'.join(items) + f'\n{pad}]'
    return json.dumps(value, ensure_ascii=False)
