"""The story characters' walk sheets: drawn by an image model, normalised to the player's
own grid (ADR 0088).

Usage (from the repository root):

    uv run --with pillow python scripts/character-sprites.py process
    OPENROUTER_API_KEY=... python scripts/character-sprites.py generate [name ...]
    ESTUDIO_URL=http://host:port python scripts/character-sprites.py edit [name ...]

`generate` asks the model for a whole 4x4 sheet per character in one image, with the
player's sheet attached as the reference for layout, proportions and pixel style: one
image keeps the sixteen frames consistent with each other. The raw image is kept in
assets/characters/raw/ (committed, it is the source).

`edit` fixes, on a generated sheet, the details the generation got wrong (glasses that did
not come out, a badge in the wrong colour), with the Qwen-Image-Edit workflow of a ComfyUI
server (the team's "Estúdio"): one prompt per character, a fixed seed. The result is kept
next to the original, as raw/<name>-edited.png, and `process` prefers it.

`process` is deterministic. Each of the sixteen cells is keyed out of its magenta
background, scaled to the player's height (HEIGHT art pixels) with one scale for the whole
sheet, reduced to the player's 4-pixel art grid with one palette (keeping small details,
and the same head along a row), centred, and put down with the feet on the player's
baseline. The result is a 512x512 sheet in the same
convention as characters/player.png: 128px frames, rows facing down, left, right, up.
"""
from pathlib import Path
import base64
import json
import os
import statistics
import sys
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'assets' / 'characters' / 'raw'
OUT = ROOT / 'assets' / 'characters'
REFERENCE = ROOT / 'assets' / 'graphics' / 'graphics' / 'characters' / 'player.png'
MODEL = 'openai/gpt-5.4-image-2'

FRAME = 128          # one cell of the sheet, as player.png
PIXEL = 4            # one art pixel, in sheet pixels
GRID = FRAME // PIXEL
HEIGHT = 28          # the figure's height, in art pixels: the player's, with a pixel above
HEAD = 13            # art rows from the top that are the head, kept the same along a row
BASELINE = 30        # the row the player's feet stand on, in art pixels

BASE = (
    'Pixel art character sprite sheet for a top-down 2D RPG, matching EXACTLY the attached '
    'reference sheet in layout, proportions, outline style and pixel size: a 4x4 grid of '
    'equally sized cells; row 1 the character walking toward the viewer (facing down), row '
    '2 walking left (seen from the side, facing left), row 3 walking right (facing right), '
    'row 4 walking away (back view, facing up); in each row, four frames of a walk cycle. '
    'Same chibi proportions as the reference (big head, short body), the same thin dark '
    'outline, soft shading, the character centred in every cell, feet on the same line in '
    'every cell. Like the reference, the head and face are IDENTICAL in all four frames of a '
    'row (only the legs and arms move, the head bobs at most one pixel). Flat colours with '
    'few clean shading steps, no noise or dithering, and a thick dark outline closing the '
    'whole silhouette, feet and shoes included. Draw instead this character: {who} The '
    'background must be a single flat '
    'solid pure magenta colour (#FF00FF) everywhere, with no grid lines, no shadows and no '
    'text.'
)
CHARACTERS = {
    'davi': 'Davi, a lanky young Brazilian university student and the comic sidekick: messy '
    'curly black hair, light brown skin, big round BLACK-RIMMED glasses clearly visible on '
    'his face in every frame (also in the side views), a big cheerful grin, a bright orange '
    'hoodie, big RED over-ear headphones resting around his neck (two red ear cups clearly '
    'visible), blue jeans and WHITE sneakers with a dark outline (the same white in every '
    'frame).',
    'marcos': 'Marcos, a middle-aged Brazilian university security guard, serious and a bit '
    'suspicious: short black hair greying at the sides, a thick moustache, tan skin, a navy '
    'blue security uniform shirt with a BRIGHT YELLOW star badge on the left of his chest '
    '(clearly yellow, not skin coloured) and shoulder epaulettes, a walkie-talkie on his '
    'belt, dark navy trousers and black boots. Simple dot eyes in every view, never crosses.',
    'celia': 'Dona Célia, a strict older librarian woman: grey hair tied in a neat round bun '
    'on top of the head (a small bun, clearly hair, also from behind), light skin, a stern '
    'face with DARK rectangular reading glasses clearly visible on her nose, a lilac '
    'cardigan over a white blouse, a long brown A-line skirt down to the ankles (clearly a '
    'skirt, not trousers) and small brown shoes.',
    'raimundo': 'Seu Raimundo, a friendly but grumpy older man who runs the university '
    'restaurant: a TALL white chef toque hat, a grey moustache, dark brown skin, a little '
    'chubby, a white apron tied close to the body over a light blue shirt (from behind only '
    'the apron strings show), dark grey trousers and black shoes.',
}


# What `edit` asks for, per character, and the seed it uses.
EDITS = {
    'davi': (3, 'Edit this pixel art sprite sheet: give the boy round black-rimmed glasses '
             'with clear see-through lenses, his skin and small dark eyes visible through '
             'them (the lenses are not white), in every frame where his face is visible; in '
             'the front row he looks straight at the viewer. His big red headphones rest '
             'AROUND HIS NECK in every frame, never on his head or ears: two big round red ear '
             'cups clearly visible on both sides of his neck, joined by a black band. Make his sneakers '
             'white in every frame. Keep everything else exactly the same: same 4x4 layout, '
             'same poses, same pixel art style, same flat magenta background.'),
    'marcos': (5, "Edit this pixel art sprite sheet: replace the badge on the security guard's "
               'chest with a small dull gold metal shield badge on the left side of his chest, '
               'about the size of a shirt pocket, matte, not glowing, in every frame where his '
               'chest is visible. In the '
               'side views, draw his eye as a simple small black dot, not a cross. Keep '
               'everything else exactly the same: same 4x4 layout, same poses, same pixel art '
               'style, same flat magenta background.'),
    'celia': (5, 'Edit this pixel art sprite sheet: give the old librarian thin dark brown '
              'reading glasses with clear lenses, her eyes visible through them, in every frame '
              'where her face is visible (front and side views); they are not sunglasses. From '
              'behind (bottom row) no glasses are visible at all. Make her brown skirt clearly a long skirt, not '
              'trousers. Keep everything else exactly the same: same 4x4 layout, same poses, '
              'same pixel art style, same flat magenta background.'),
}


def edit(names):
    import time
    import urllib.parse
    import uuid

    base = os.environ.get('ESTUDIO_URL')
    if not base:
        raise SystemExit('ESTUDIO_URL is not set (the ComfyUI server, e.g. http://host:8189)')
    api = base.rstrip('/') + '/api'
    for name in names:
        if name not in EDITS:
            print(f'{name}: nothing to edit')
            continue
        seed, prompt = EDITS[name]
        boundary = uuid.uuid4().hex
        data = (RAW / f'{name}.png').read_bytes()
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}.png"\r\n'
                'Content-Type: image/png\r\n\r\n').encode() + data + (
            f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue'
            f'\r\n--{boundary}--\r\n').encode()
        upload = urllib.request.Request(f'{api}/upload/image', body,
                                        {'Content-Type': f'multipart/form-data; boundary={boundary}'})
        image = json.load(urllib.request.urlopen(upload))['name']
        negative = 'blurry, different character, extra people, text'
        graph = {
            'load': {'class_type': 'LoadImage', 'inputs': {'image': image}},
            'scale': {'class_type': 'ImageScale', 'inputs': {'upscale_method': 'lanczos', 'width': 1024, 'height': 1024, 'crop': 'disabled', 'image': ['load', 0]}},
            'unet': {'class_type': 'UnetLoaderGGUF', 'inputs': {'unet_name': 'qwen-image-edit-2511-Q4_K_M.gguf'}},
            'lora': {'class_type': 'LoraLoaderModelOnly', 'inputs': {'lora_name': 'Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors', 'strength_model': 1, 'model': ['unet', 0]}},
            'shift': {'class_type': 'ModelSamplingAuraFlow', 'inputs': {'shift': 3.1, 'model': ['lora', 0]}},
            'cfgnorm': {'class_type': 'CFGNorm', 'inputs': {'strength': 1, 'model': ['shift', 0]}},
            'clip': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_2.5_vl_7b_fp8_scaled.safetensors', 'type': 'qwen_image'}},
            'vae': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
            'pos_enc': {'class_type': 'TextEncodeQwenImageEditPlus', 'inputs': {'prompt': prompt, 'clip': ['clip', 0], 'vae': ['vae', 0], 'image1': ['scale', 0]}},
            'neg_enc': {'class_type': 'TextEncodeQwenImageEditPlus', 'inputs': {'prompt': negative, 'clip': ['clip', 0], 'vae': ['vae', 0], 'image1': ['scale', 0]}},
            'pos': {'class_type': 'FluxKontextMultiReferenceLatentMethod', 'inputs': {'reference_latents_method': 'index_timestep_zero', 'conditioning': ['pos_enc', 0]}},
            'neg': {'class_type': 'FluxKontextMultiReferenceLatentMethod', 'inputs': {'reference_latents_method': 'index_timestep_zero', 'conditioning': ['neg_enc', 0]}},
            'encode': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['scale', 0], 'vae': ['vae', 0]}},
            'sampler': {'class_type': 'KSampler', 'inputs': {'seed': seed, 'steps': 4, 'cfg': 1, 'sampler_name': 'euler', 'scheduler': 'simple', 'denoise': 1, 'model': ['cfgnorm', 0], 'positive': ['pos', 0], 'negative': ['neg', 0], 'latent_image': ['encode', 0]}},
            'decode': {'class_type': 'VAEDecode', 'inputs': {'samples': ['sampler', 0], 'vae': ['vae', 0]}},
            'save': {'class_type': 'SaveImage', 'inputs': {'filename_prefix': f'unifor_{name}', 'images': ['decode', 0]}},
        }
        queued = urllib.request.Request(f'{api}/prompt', json.dumps({'prompt': graph}).encode(),
                                        {'Content-Type': 'application/json'})
        prompt_id = json.load(urllib.request.urlopen(queued))['prompt_id']
        for _ in range(1200):
            time.sleep(1)
            history = json.load(urllib.request.urlopen(f'{api}/history/{prompt_id}'))
            if prompt_id in history:
                result = history[prompt_id]['outputs']['save']['images'][0]
                urllib.request.urlretrieve(f'{api}/view?{urllib.parse.urlencode(result)}',
                                           RAW / f'{name}-edited.png')
                print(f'edited {name}')
                break
        else:
            raise SystemExit(f'{name}: the edit timed out')


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
                {'type': 'text', 'text': BASE.format(who=CHARACTERS[name])},
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


def is_magenta(r, g, b):
    return r > 150 and b > 150 and g < 110 and abs(r - b) < 90


def is_fringe(r, g, b):
    """The dark outline blended into the magenta: red and blue well above green and close
    to each other. A purple shadow on a cardigan is like that too, so it only counts as
    background when it touches the background."""
    return r - g > 60 and b - g > 60 and abs(r - b) < 50


def key_background(image):
    pixels = image.load()
    w, h = image.size
    clear = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if is_magenta(*pixels[x, y][:3]):
                clear[y][x] = True
    # Fringe pixels go only where they touch the background, a couple of pixels deep.
    for _ in range(3):
        grow = []
        for y in range(h):
            for x in range(w):
                if clear[y][x] or not is_fringe(*pixels[x, y][:3]):
                    continue
                if any(0 <= x + dx < w and 0 <= y + dy < h and clear[y + dy][x + dx]
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    grow.append((x, y))
        for x, y in grow:
            clear[y][x] = True
    for y in range(h):
        for x in range(w):
            if clear[y][x]:
                pixels[x, y] = (0, 0, 0, 0)
    return image


def keyed_cells(image):
    """The sixteen characters of a raw sheet, each cropped to itself with a transparent
    background. The model does not keep to an exact grid (a hat can cross the line between
    two rows), so the figures are found by their silhouettes: the opaque blobs, grouped into
    four rows by height and four columns by position."""
    from PIL import Image, ImageFilter

    image = key_background(image.convert('RGBA'))
    # Blobs on a quarter-size mask, slightly grown so a figure's parts stay one blob.
    small = image.getchannel('A').resize((image.width // 4, image.height // 4), Image.Resampling.BOX)
    mask = small.point(lambda a: 255 if a >= 96 else 0).filter(ImageFilter.MaxFilter(5))
    width, height = mask.size
    data = mask.load()
    seen = set()
    blobs = []
    for y0 in range(height):
        for x0 in range(width):
            if data[x0, y0] == 0 or (x0, y0) in seen:
                continue
            stack = [(x0, y0)]
            seen.add((x0, y0))
            xs, ys = [], []
            while stack:
                x, y = stack.pop()
                xs.append(x)
                ys.append(y)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < width and 0 <= ny < height and data[nx, ny] and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            blobs.append((min(xs) * 4, min(ys) * 4, (max(xs) + 1) * 4, (max(ys) + 1) * 4, len(xs)))
    # The sixteen biggest blobs are the figures; anything else is a speck.
    blobs = sorted(blobs, key=lambda blob: blob[4], reverse=True)[:16]
    if len(blobs) != 16:
        raise SystemExit(f'expected 16 figures, found {len(blobs)}')
    blobs.sort(key=lambda blob: (blob[1] + blob[3]) / 2)
    cells = []
    for row in range(4):
        for blob in sorted(blobs[row * 4:row * 4 + 4], key=lambda blob: blob[0]):
            crop = image.crop(blob[:4])
            alpha = crop.getchannel('A').point(lambda a: 255 if a >= 200 else 0)
            box = alpha.getbbox()
            cells.append(crop.crop(box) if box else crop)
    return cells


def detail_weight(index, counts, colours):
    """How much a colour's pixels count in a block: more the further it is from the block's
    average colour. Small features (glasses, a badge, an eye) cover a fraction of a block
    and would lose a plain majority vote to the skin or the shirt around them."""
    total = sum(counts.values())
    mean = [sum(colours[i * 3 + c] * n for i, n in counts.items()) / total for c in range(3)]
    distance = sum((colours[index * 3 + c] - mean[c]) ** 2 for c in range(3)) ** 0.5
    return 1 + distance / 90


# Small coloured features, per character: pixels of the raw whose hue (degrees) and
# saturation fall in the range take, per row of the sheet, the given colour. Marcos's badge
# is pushed to a clear gold in the front row, where it reads, instead of being averaged into
# the skin next to it; seen from the side and from behind it is a blob that changes from
# frame to frame, so there it takes the uniform's navy. Only below the head, where skin
# highlights would otherwise match too.
ACCENTS = {
    'marcos': ((40, 62), 0.45, {0: (244, 196, 48), 1: (34, 49, 76), 2: (34, 49, 76), 3: (34, 49, 76)}),
}


def accent(image, name, row):
    import colorsys

    if name not in ACCENTS:
        return image
    (low, high), saturation, colours = ACCENTS[name]
    colour = colours[row]
    image = image.copy()
    px = image.load()
    for y in range(image.height * 2 // 5, image.height):
        for x in range(image.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, _, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if low <= h * 360 <= high and s >= saturation and max(r, g, b) > 120:
                px[x, y] = (*colour, a)
    return image


def mode_downsample(cell, size, palette):
    """Reduces a cell to `size` taking, for each target pixel, the most common colour of
    its block (or transparency, when most of the block is background), with the colours
    that stand out weighing more (detail_weight). Pixel art keeps its outlines and small
    features this way; averaging, as a box filter does, smears them."""
    from PIL import Image

    w, h = size
    indexed = cell.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE)
    alpha = cell.getchannel('A')
    src = indexed.load()
    src_alpha = alpha.load()
    colours = palette.getpalette()
    out = Image.new('RGBA', size, (0, 0, 0, 0))
    dst = out.load()
    for ty in range(h):
        y0, y1 = int(ty * cell.height / h), max(int(ty * cell.height / h) + 1, int((ty + 1) * cell.height / h))
        for tx in range(w):
            x0, x1 = int(tx * cell.width / w), max(int(tx * cell.width / w) + 1, int((tx + 1) * cell.width / w))
            counts = {}
            opaque = 0
            total = 0
            for y in range(y0, y1):
                for x in range(x0, x1):
                    total += 1
                    if src_alpha[x, y] >= 128:
                        opaque += 1
                        index = src[x, y]
                        counts[index] = counts.get(index, 0) + 1
            if opaque * 2 < total or not counts:
                continue
            index = max(counts, key=lambda i: counts[i] * detail_weight(i, counts, colours))
            dst[tx, ty] = (colours[index * 3], colours[index * 3 + 1], colours[index * 3 + 2], 255)
    return out


def despeckle(art):
    """A lone pixel whose four neighbours all share another colour takes that colour: the
    model's noisy shading becomes flat areas, like the player's."""
    px = art.load()
    w, h = art.size
    changes = []
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            here = px[x, y]
            if here[3] == 0:
                continue
            around = [px[x + 1, y], px[x - 1, y], px[x, y + 1], px[x, y - 1]]
            if around[0][3] and all(n == around[0] for n in around) and around[0] != here:
                changes.append((x, y, around[0]))
    for x, y, colour in changes:
        px[x, y] = colour
    return art


def outline(art):
    """A dark outline where the figure meets the background, as on the player: an edge
    pixel that is light is replaced by a dark shade of itself."""
    px = art.load()
    w, h = art.size
    edges = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            touches = any(not (0 <= x + dx < w and 0 <= y + dy < h) or px[x + dx, y + dy][3] == 0
                          for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if touches and (r * 299 + g * 587 + b * 114) / 1000 > 70:
                edges.append((x, y, (int(r * 0.3), int(g * 0.28), int(b * 0.32), 255)))
    for x, y, colour in edges:
        px[x, y] = colour
    return art


def same_heads(frames):
    """The four frames of a row get the head of the first one, each at its own height (the
    bob stays) and centred where that frame's head was: the model redraws the face in every
    frame, and a walking character's face would flicker."""
    from PIL import Image

    def head_box(art):
        box = art.getbbox()
        return box[0], box[1], box[2], min(box[1] + HEAD, box[3])

    def centre(art, box):
        xs = [x for y in range(box[1], box[3]) for x in range(box[0], box[2]) if art.getpixel((x, y))[3]]
        return sum(xs) / len(xs)

    first = frames[0]
    fbox = head_box(first)
    head = first.crop(fbox)
    fcentre = centre(first, fbox) - fbox[0]
    out = [first]
    for art in frames[1:]:
        box = head_box(art)
        x_at = round(centre(art, box) - fcentre)
        cleared = art.copy()
        px = cleared.load()
        for y in range(box[1], box[3]):
            for x in range(cleared.width):
                px[x, y] = (0, 0, 0, 0)
        cleared.alpha_composite(head, (max(0, x_at), box[1]))
        out.append(cleared)
    return out


def process(names):
    from PIL import Image

    OUT.mkdir(parents=True, exist_ok=True)
    for name in names:
        edited = RAW / f'{name}-edited.png'
        cells = [accent(cell, name, index // 4) for index, cell in
                 enumerate(keyed_cells(Image.open(edited if edited.exists() else RAW / f'{name}.png')))]
        # One scale for the whole sheet, so the character keeps its size from frame to frame.
        scale = HEIGHT / statistics.median(cell.height for cell in cells)
        # One palette for the whole sheet: the same colours in every frame.
        strip = Image.new('RGB', (sum(c.width for c in cells), max(c.height for c in cells)), (255, 0, 255))
        x = 0
        for cell in cells:
            strip.paste(cell.convert('RGB'), (x, 0), cell)
            x += cell.width
        # The accent colours go in as they are: median cut would fold a small badge into
        # the skin around it.
        extra = sorted({c for c in ACCENTS[name][2].values()}) if name in ACCENTS else []
        palette = strip.quantize(colors=128 - len(extra), method=Image.Quantize.MEDIANCUT,
                                 dither=Image.Dither.NONE)
        colours = palette.getpalette()[:3 * (128 - len(extra))] + [v for c in extra for v in c]
        palette = Image.new('P', (1, 1))
        palette.putpalette(colours)
        arts = []
        for cell in cells:
            size = (max(1, round(cell.width * scale)), max(1, round(cell.height * scale)))
            figure = despeckle(mode_downsample(cell, size, palette))
            art = Image.new('RGBA', (GRID, GRID), (0, 0, 0, 0))
            left = (GRID - figure.width) // 2
            top = BASELINE - figure.height
            art.alpha_composite(figure, (left, max(1, top)))
            arts.append(art)
        sheet = Image.new('RGBA', (FRAME * 4, FRAME * 4), (0, 0, 0, 0))
        for row in range(4):
            for col, art in enumerate(same_heads(arts[row * 4:row * 4 + 4])):
                frame = outline(art).resize((FRAME, FRAME), Image.Resampling.NEAREST)
                sheet.alpha_composite(frame, (col * FRAME, row * FRAME))
        sheet.save(OUT / f'{name}.png', optimize=True)
        print(f'processed {name} (scale {scale:.3f})')


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in ('generate', 'edit', 'process'):
        raise SystemExit(__doc__)
    chosen = sys.argv[2:] or list(CHARACTERS)
    unknown = [name for name in chosen if name not in CHARACTERS]
    if unknown:
        raise SystemExit(f'unknown character: {", ".join(unknown)}')
    {'generate': generate, 'edit': edit, 'process': process}[sys.argv[1]](chosen)
