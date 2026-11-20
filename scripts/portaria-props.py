"""The portaria's furniture: drawn by an image model, then turned into pixel art (ADR 0087).

Usage (from the repository root):

    uv run --with pillow python scripts/portaria-props.py process
    OPENROUTER_API_KEY=... python scripts/portaria-props.py generate [name ...]

Same pipeline as the campus buildings (scripts/campus-buildings.py, ADR 0079): `generate`
asks the model for each prop, with a crop of the Centro de Convivência as the style to
match, and keeps the raw image in assets/portaria/raw/ (committed, it is the source);
`process` keys out the magenta, trims and reduces each one to the characters' pixel
density with a limited palette. scripts/render-portaria-pixel-art.py places them.
"""
from pathlib import Path
import base64
import json
import os
import sys
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'assets' / 'portaria' / 'raw'
OUT = ROOT / 'assets' / 'portaria' / 'props'
REFERENCE = ROOT / 'assets' / 'portaria' / 'style-reference.png'
MODEL = 'openai/gpt-5.4-image-2'

# The box each prop is fitted into, in game pixels. The player is 32 pixels tall.
SIZES = {
    'guarita': (216, 116),
    'catraca': (36, 48),
    'maquina-lanches': (48, 84),
    'bebedouro': (26, 52),
    'planta': (40, 60),
    'cadeiras': (124, 50),
    'mural': (100, 62),
}

BASE = (
    'Pixel art game asset for a top-down 2D RPG, in exactly the same style as the attached '
    'reference image (an interior seen from the front with the top of each object visible, '
    'three-quarter view, crisp hard pixels, dark coloured outlines, warm soft lighting from '
    'the top-left, limited palette). {what} One single object, centred, filling the canvas. '
    'The background must be a single flat solid pure magenta colour (#FF00FF) everywhere '
    'outside the object, with no shadow on it and no floor. No text, no letters, no logos, '
    'no people.'
)
PROMPTS = {
    'guarita': 'Draw a university security guard desk (reception counter), wide and low, in '
    'light wood with a pale grey countertop: on top, three small CCTV monitors showing '
    'grey-blue camera views, a walkie-talkie radio on a charger, an open logbook with a pen, '
    'a coffee mug and a desk lamp. The front panel has vertical wooden slats. Wider than '
    'tall, about 2:1.',
    'catraca': 'Draw one waist-high metal access turnstile (tripod barrier) of a university '
    'entrance: a brushed steel cabinet with a small card reader on top showing a red light, '
    'and three short steel arms. Taller than wide.',
    'maquina-lanches': 'Draw a snack vending machine: a tall red and white cabinet with a '
    'glass front showing rows of colourful snack packets and drinks, a small keypad and a '
    'coin slot on the right side, and a pickup flap at the bottom. Tall and narrow.',
    'bebedouro': 'Draw an office water cooler: a white base cabinet with two small taps (one '
    'blue, one red) and a big transparent light-blue water bottle upside down on top. Tall '
    'and narrow.',
    'planta': 'Draw a large tropical indoor plant (a leafy palm) in a round terracotta pot. '
    'Lush green leaves. Taller than wide.',
    'cadeiras': 'Draw a row of four connected waiting-room chairs on a metal beam, with blue '
    'plastic seats and backs, like in a university lobby. Wide and low, about 5:2.',
    'mural': 'Draw a wall-mounted cork bulletin board with a wooden frame, with pinned paper '
    'notices in white, yellow and pink, a small campus map and a calendar. Wider than tall.',
}


def generate(names):
    key = os.environ.get('OPENROUTER_API_KEY')
    if not key:
        raise SystemExit('OPENROUTER_API_KEY is not set')
    reference = 'data:image/png;base64,' + base64.b64encode(REFERENCE.read_bytes()).decode()
    RAW.mkdir(parents=True, exist_ok=True)
    for name in names:
        body = {
            'model': MODEL,
            'modalities': ['image', 'text'],
            'messages': [{'role': 'user', 'content': [
                {'type': 'text', 'text': BASE.format(what=PROMPTS[name])},
                {'type': 'image_url', 'image_url': {'url': reference}},
            ]}],
        }
        request = urllib.request.Request(
            'https://openrouter.ai/api/v1/chat/completions',
            json.dumps(body).encode(),
            {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        )
        response = json.load(urllib.request.urlopen(request, timeout=600))
        images = response['choices'][0]['message'].get('images') or []
        if not images:
            raise SystemExit(f'{name}: the model returned no image')
        url = images[0]['image_url']['url']
        (RAW / f'{name}.png').write_bytes(base64.b64decode(url.split(',', 1)[1]))
        print(f'generated {name}')


def is_background(r, g, b):
    return r > 150 and b > 150 and g < 110 and abs(r - b) < 90


def process(names):
    from PIL import Image

    OUT.mkdir(parents=True, exist_ok=True)
    for name in names:
        image = Image.open(RAW / f'{name}.png').convert('RGBA')
        pixels = image.load()
        for y in range(image.height):
            for x in range(image.width):
                r, g, b, _ = pixels[x, y]
                if is_background(r, g, b):
                    pixels[x, y] = (0, 0, 0, 0)
        bbox = image.getbbox()
        if bbox is None:
            raise SystemExit(f'{name}: nothing left after keying')
        image = image.crop(bbox)
        box_w, box_h = SIZES[name]
        scale = min(box_w / image.width, box_h / image.height)
        size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
        small = image.resize(size, Image.Resampling.BOX)
        alpha = small.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
        rgb = small.convert('RGB').quantize(colors=32, method=Image.Quantize.MEDIANCUT,
                                            dither=Image.Dither.NONE).convert('RGB')
        result = rgb.convert('RGBA')
        result.putalpha(alpha)
        result.save(OUT / f'{name}.png', optimize=True)
        print(f'processed {name} {size[0]}x{size[1]}')


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in ('generate', 'process'):
        raise SystemExit(__doc__)
    chosen = sys.argv[2:] or list(SIZES)
    unknown = [name for name in chosen if name not in SIZES]
    if unknown:
        raise SystemExit(f'unknown prop: {", ".join(unknown)}')
    (generate if sys.argv[1] == 'generate' else process)(chosen)
