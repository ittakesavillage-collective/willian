# Builds every Willian icon size from Michael's artwork, keeping his tile exactly as drawn (texture and all).
# Source: willian-icon-source.jpg (1408x768, terracotta tile on a blurred lane photo). Run: python icons/make_icons.py
from PIL import Image, ImageDraw, ImageFilter
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

im = Image.open('icons/willian-icon-source.jpg').convert('RGB')
# Square from just inside the tile (tile spans x430-978, y92-675), centred on the church
L, T, S = 484, 106, 440
tile = im.crop((L, T, L + S, T + S))
px = tile.load()

# The very corners can fall outside the tile's own rounding: patch them from just inside.
def is_tile(p):
    r, g, b = p
    return r > 120 and r - g > 50 and b < 110
Z = 40
for y in range(S):
    for x in range(S):
        if (x < Z or x >= S - Z) and (y < Z or y >= S - Z) and not is_tile(px[x, y]):
            px[x, y] = px[x + Z if x < Z else x - Z, y + Z if y < Z else y - Z]

def full(size, name):
    tile.resize((size, size), Image.LANCZOS).save(name)

def padded(size, frac, name):
    # Android "maskable": artwork inside the safe circle, tile faded into a matching gradient
    top, bot = (164, 70, 40), (192, 92, 60)
    bg = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    w = int(size * frac)
    a = tile.resize((w, w), Image.LANCZOS)
    m = Image.new('L', (w, w), 0)
    ImageDraw.Draw(m).rounded_rectangle((w * .06, w * .06, w * .94, w * .94), radius=w * .12, fill=255)
    bg.paste(a, ((size - w) // 2, (size - w) // 2), m.filter(ImageFilter.GaussianBlur(w * .03)))
    bg.save(name)

full(512, 'icons/icon-512.png')
full(192, 'icons/icon-192.png')
full(180, 'icons/apple-touch-icon.png')
full(32, 'icons/favicon-32.png')
padded(512, 0.80, 'icons/icon-maskable-512.png')
print('ok')
