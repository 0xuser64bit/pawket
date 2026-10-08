#!/bin/sh
# Constant-30fps proxies of the raw Android takes (screenrecord writes variable frame rate), with a
# keyframe every half second so the edit seeks exactly. Usage: sh tools/proxies.sh
cd "$(dirname "$0")/.." || exit 1
for raw in footage/raw/*.mp4; do
  out="public/footage/$(basename "$raw")"
  [ -f "$out" ] && [ "$out" -nt "$raw" ] && continue
  ffmpeg -loglevel error -y -i "$raw" -vf "fps=30,format=yuv420p" -c:v libx264 -preset faster -crf 17 -g 15 -an "$out" && echo "$out"
done
