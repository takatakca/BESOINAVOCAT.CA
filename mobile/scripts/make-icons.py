# Draws the BesoinAvocat app icons (burgundy "b." monogram, same as the portal icon) at store sizes.
# Run: python3 scripts/make-icons.py  (needs Pillow). Output in assets/.
from PIL import Image, ImageDraw, ImageFont
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONT = os.path.join(ROOT, 'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf')
WINE_A, WINE_B, PINK, IVORY = (124, 30, 46), (156, 66, 82), (242, 200, 207), (247, 244, 238)

def gradient(size):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip(WINE_A, WINE_B))
    return img

def glyph(draw, size, scale, color=(255, 255, 255)):
    font = ImageFont.truetype(FONT, int(size * 0.62 * scale))
    box = draw.textbbox((0, 0), 'b', font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    dot = int(size * 0.11 * scale)
    total = w + dot * 1.25
    x = (size - total) / 2 - box[0]
    y = (size - h) / 2 - box[1]
    draw.text((x, y), 'b', font=font, fill=color)
    dx = x + box[0] + w + dot * 0.25
    dy = y + box[1] + h - dot
    draw.rectangle([dx, dy, dx + dot, dy + dot], fill=PINK)

def out(name, img):
    img.save(os.path.join(ROOT, 'assets', name))

S = 1024
icon = gradient(S); glyph(ImageDraw.Draw(icon), S, 1.0); out('icon.png', icon)
fg = Image.new('RGBA', (S, S), (0, 0, 0, 0)); glyph(ImageDraw.Draw(fg), S, 0.62); out('adaptive-foreground.png', fg)
out('adaptive-background.png', gradient(S))
mono = Image.new('RGBA', (S, S), (0, 0, 0, 0)); glyph(ImageDraw.Draw(mono), S, 0.62, (255, 255, 255, 255)); out('adaptive-monochrome.png', mono)
splash = Image.new('RGBA', (S, S), (0, 0, 0, 0)); r = Image.new('L', (S, S), 0)
ImageDraw.Draw(r).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.24), fill=255)
tile = gradient(S).convert('RGBA'); glyph(ImageDraw.Draw(tile), S, 1.0); splash.paste(tile, (0, 0), r); out('splash-icon.png', splash)
fav = icon.resize((48, 48), Image.LANCZOS); out('favicon.png', fav)
print('ok')
