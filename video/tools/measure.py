"""Measures one UI element in a phone recording, so the edit can lift it out exactly: its border box,
corner radius and sticker shadow, in device px. Give a box that sits in the empty page around the
element; the tool scans inward from each side until it meets the element's own edge (ink, a pool edge
or a Paper rule: anything much darker than the page).

    python tools/measure.py <clip> <second> <x0> <y0> <x1> <y1>

Prints {"box": [x, y, w, h], "radius": r, "border": b, "shadow": [dx, dy, "#rrggbb"] | null}
"""
import json
import subprocess
import sys

import numpy as np

W, H = 1080, 2400


def frame(clip, t):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", str(t), "-i", f"public/footage/{clip}.mp4", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(H, W, 3).astype(int)


def longest_run(a):
    best = cur = 0
    for v in a:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


clip, t = sys.argv[1], float(sys.argv[2])
x0, y0, x1, y1 = map(int, sys.argv[3:7])
img = frame(clip, t)
lum = img @ np.array([0.299, 0.587, 0.114])
page = np.median(lum[y0 : y0 + 3, x0:x1])
dark = lum < page - 60

# Rows across the middle half of the box, columns across the middle half of its height.
mx0, mx1 = x0 + (x1 - x0) // 4, x1 - (x1 - x0) // 4
my0, my1 = y0 + (y1 - y0) // 4, y1 - (y1 - y0) // 4
row_hit = lambda y: longest_run(dark[y, mx0:mx1]) >= 0.8 * (mx1 - mx0)
col_hit = lambda x: longest_run(dark[my0:my1, x]) >= 0.8 * (my1 - my0)


def band(start, stop, step, hit):
    i = start
    while i != stop and not hit(i):
        i += step
    outer = i
    while i != stop and hit(i):
        i += step
    return outer, i - step  # outer edge, inner edge


top_o, top_i = band(y0, y1, 1, row_hit)
bot_o, bot_i = band(y1, y0, -1, row_hit)
lef_o, lef_i = band(x0, x1, 1, col_hit)
rig_o, rig_i = band(x1, x0, -1, col_hit)
border = max(1, round(((top_i - top_o) + (lef_i - lef_o)) / 2) + 1)
dx = (rig_o - rig_i + 1) - border
dy = (bot_o - bot_i + 1) - border
right, bottom = rig_o - max(0, dx), bot_o - max(0, dy)
shadow = None
if dx >= 3 and dy >= 3:
    c = img[(top_o + bottom) // 2, rig_o - 1]
    shadow = [int(dx), int(dy), "#%02x%02x%02x" % tuple(int(v) for v in c)]
# Radius: how far in from the left edge the top edge's straight line begins.
row = dark[top_o + border // 2, lef_o : right + 1]
radius = int(np.argmax(row)) if row.any() else 0
print(json.dumps({"box": [int(lef_o), int(top_o), int(right - lef_o + 1), int(bottom - top_o + 1)], "radius": int(round(radius * 1.2)), "border": int(border), "shadow": shadow}))
