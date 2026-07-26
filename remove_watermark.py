"""Remove the 'AI生成' watermark from the generated ad by patching with sampled background."""
from PIL import Image, ImageFilter
import numpy as np

SRC = "/Users/taj/klarpakke/klarpakke-ad-v1.png"
DST = "/Users/taj/klarpakke/klarpakke-ad-v1.png"

img = Image.open(SRC).convert("RGB")
a = np.array(img)

# Watermark box (original 1024x1536 coords), measured from full-fidelity crop.
x0, y0, x1, y1 = 8, 1408, 142, 1492

# Sample background color from a clean strip just above the watermark
# and from the left margin beside it, avoiding star dots by taking the median.
samples = np.concatenate([
    a[1336:1400, x0:x1].reshape(-1, 3),   # strip above
    a[y0:y1, 0:x0].reshape(-1, 3),        # sliver to the left
])
bg = np.median(samples, axis=0).astype(np.uint8)

patch = np.full((y1 - y0, x1 - x0, 3), bg, dtype=np.uint8)
a[y0:y1, x0:x1] = patch

out = Image.fromarray(a)
# Feather the patch edges so the fill blends in.
box = out.crop((x0 - 4, y0 - 4, x1 + 4, y1 + 4)).filter(ImageFilter.GaussianBlur(3))
out.paste(box, (x0 - 4, y0 - 4))
out.save(DST)
print("patched ->", DST)
