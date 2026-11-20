"""The app icon: the player, pixel for pixel, on the game's night blue (ADR 0081).

Usage (from the repository root):  uv run --with pillow python scripts/render-icon.py

electron-builder turns apps/game/build/icon.png (512x512) into .ico, .icns and the Linux
icons; the PNG is committed, so packaging needs no Python.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / 'assets' / 'graphics' / 'graphics' / 'characters' / 'player.png'
OUT = ROOT / 'apps' / 'game' / 'build' / 'icon.png'
SIZE = 512

frame = Image.open(SHEET).convert('RGBA').crop((0, 0, 128, 128))  # facing down, standing
frame = frame.crop(frame.getbbox())
scale = (SIZE * 3 // 4) // max(frame.size)
sprite = frame.resize((frame.width * scale, frame.height * scale), Image.Resampling.NEAREST)

icon = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(icon)
d.rounded_rectangle((16, 16, SIZE - 17, SIZE - 17), radius=96, fill='#1d1f2b')
d.rounded_rectangle((16, 16, SIZE - 17, SIZE - 17), radius=96, outline='#7aa2ff', width=12)
d.ellipse((SIZE // 2 - 120, SIZE - 120, SIZE // 2 + 120, SIZE - 84), fill='#14151e')
icon.alpha_composite(sprite, ((SIZE - sprite.width) // 2, SIZE - 96 - sprite.height))
icon.save(OUT, optimize=True)
print(f'{OUT.relative_to(ROOT)} {icon.size}')
