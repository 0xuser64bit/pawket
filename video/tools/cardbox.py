"""Finds the exact edges of an app card in a phone recording, for a loupe that shows the card itself
and nothing around it. Cards are drawn with an ink edge (Playroom) or a hairline rule (Paper).

    python tools/cardbox.py <clip> <second> <x0> <y0> <x1> <y1> [ink|rule]

Prints x y w h (device px) of the outermost card edge inside the rough box, including the sticker
shadow below and to the right.
"""
import subprocess
import sys

import numpy as np

clip, t, x0, y0, x1, y1 = sys.argv[1], float(sys.argv[2]), *map(int, sys.argv[3:7])
kind = sys.argv[7] if len(sys.argv) > 7 else "ink"
W, H = 1080, 2400
raw = subprocess.run(
    ["ffmpeg", "-v", "error", "-ss", str(t), "-i", f"public/footage/{clip}.mp4", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
    capture_output=True,
    check=True,
).stdout
img = np.frombuffer(raw, dtype=np.uint8).reshape(H, W, 3).astype(int)
r = img[y0:y1, x0:x1]
if kind == "ink":  # #2a1e14 and its anti-aliased neighbours
    mask = (r[..., 0] < 95) & (r[..., 1] < 85) & (r[..., 2] < 75)
else:  # the rule, #85816f
    mask = (abs(r[..., 0] - 133) < 30) & (abs(r[..., 1] - 129) < 30) & (abs(r[..., 2] - 111) < 30)
rows = mask.sum(axis=1)
hrow = np.where(rows > 0.55 * (x1 - x0))[0]
if not len(hrow):
    sys.exit(f"no horizontal edge found (rows max {rows.max()})")
top, bottom = hrow[0], hrow[-1]
# Vertical edges only count inside the span the horizontal edges found.
cols = mask[top : bottom + 1].sum(axis=0)
vcol = np.where(cols > 0.5 * (bottom - top + 1))[0]
if not len(vcol):
    sys.exit(f"no vertical edge found between rows {y0 + top} and {y0 + bottom} (cols max {cols.max()})")
left, right = vcol[0], vcol[-1]
print(x0 + left, y0 + top, right - left + 1, bottom - top + 1)
