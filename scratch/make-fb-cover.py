"""Generer Facebook cover (1920x1080) i samme stil som linkedin-banner.png."""
import math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1920, 1080
NAVY = (15, 34, 64)        # mørk blå tekst (som banneret)
BLUE = (47, 111, 237)      # klarpakke.no-blå
BG_TOP = (247, 250, 253)   # lys topp
BG_BOT = (214, 232, 248)   # lys blå bunn (subtil gradient)

img = Image.new("RGB", (W, H))
d = ImageDraw.Draw(img)

# Vertikal gradient
for y in range(H):
    t = y / H
    r = int(BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t)
    g = int(BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t)
    b = int(BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t)
    d.line([(0, y), (W, y)], fill=(r, g, b))

# Stigende chart-linje på høyre side (halvtone, som banneret)
random.seed(7)
pts = []
x = int(W * 0.58)
y = int(H * 0.98)
pts.append((x, y))
while x < W + 40:
    x += random.randint(45, 80)
    y -= random.randint(28, 90)
    y = max(int(H * 0.06), y)
    pts.append((min(x, W + 40), y))

line_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ld = ImageDraw.Draw(line_layer)
ld.line(pts, fill=(120, 165, 215, 150), width=5, joint="curve")
# svak glød
glow = line_layer.filter(ImageFilter.GaussianBlur(8))
img = Image.alpha_composite(img.convert("RGBA"), glow)
img = Image.alpha_composite(img, line_layer)
d = ImageDraw.Draw(img)

# Fyll under linjen (veldig svak)
poly = pts + [(W + 40, H), (int(W * 0.58), H)]
fill_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
fd = ImageDraw.Draw(fill_layer)
fd.polygon(poly, fill=(150, 190, 230, 26))
img = Image.alpha_composite(img, fill_layer)
d = ImageDraw.Draw(img)

def font(size):
    for p in [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNS.ttf",
    ]:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

# Tekst — venstrejustert, vertikalt sentrert
f_title = font(170)
f_url = font(84)
margin = 150

title = "AI som handler."
url = "klarpakke.no"

tb = d.textbbox((0, 0), title, font=f_title)
ub = d.textbbox((0, 0), url, font=f_url)
total_h = (tb[3] - tb[1]) + 60 + (ub[3] - ub[1])
top = (H - total_h) // 2 - 30

d.text((margin, top), title, font=f_title, fill=NAVY)
d.text((margin, top + (tb[3] - tb[1]) + 70), url, font=f_url, fill=BLUE)

img.convert("RGB").save("facebook-cover.png", optimize=True)
print("lagret facebook-cover.png", img.size)
