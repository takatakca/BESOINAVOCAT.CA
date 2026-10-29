"""Recolours the logo and site icons of the WordPress copy with the same rule as www/palette.mjs.

    python3 -I www/tools/recolour-images.py            reads www/site, writes www/overrides (same paths)

Only images whose name marks them as the logo or the site icon are changed. Photos stay as they are.
Pixels keep their transparency; orange becomes burgundy, teal and blue become navy, neutrals stay.
"""
import colorsys
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITE, OUT = ROOT / 'site', ROOT / 'overrides'
LOGO = re.compile(r'(besoinavocat|logo|cropped-)', re.I)


def clamp(value, low, high):
    return min(high, max(low, value))


def map_colour(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    h *= 360
    if l > 0.97 or l < 0.06:
        return None
    if s < 0.13 and l < 0.3:
        return None
    if 70 <= h <= 320 and s >= 0.04:
        nh, ns, nl = 218, clamp(s * 0.9, 0, 0.7), l * 0.72 if s > 0.45 and 0.3 <= l <= 0.7 else l
    elif s < 0.12:
        return None
    elif 8 <= h <= 42 and s >= 0.45 and 0.2 <= l <= 0.88:
        light = l > 0.7
        nh, ns, nl = 350, clamp(s * (0.45 if light else 0.62), 0, 0.62), l if light else clamp(l * 0.6, 0.16, 0.5)
    else:
        return None
    rr, gg, bb = colorsys.hls_to_rgb(nh / 360, nl, ns)
    return round(rr * 255), round(gg * 255), round(bb * 255)


def recolour(source, target):
    image = Image.open(source)
    mode = image.mode
    rgba = image.convert('RGBA')
    pixels = rgba.load()
    cache, changed = {}, 0
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            key = (r, g, b)
            if key not in cache:
                cache[key] = map_colour(r, g, b)
            new = cache[key]
            if new:
                pixels[x, y] = (*new, a)
                changed += 1
    target.parent.mkdir(parents=True, exist_ok=True)
    out = rgba if mode in ('RGBA', 'LA', 'P') else rgba.convert(mode)
    out.save(target, optimize=True)
    return changed


def main():
    manifest = json.loads((SITE / 'manifest.json').read_text(encoding='utf-8'))
    done = []
    for asset in manifest['assets']:
        path = asset['path']
        if not re.search(r'\.(png|jpe?g|webp)$', path, re.I) or not LOGO.search(Path(path).name):
            continue
        source = SITE / path.lstrip('/')
        changed = recolour(source, OUT / path.lstrip('/'))
        done.append({'path': path, 'pixels_changed': changed})
    print(json.dumps(done, indent=1))


if __name__ == '__main__':
    sys.exit(main())
