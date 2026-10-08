#!/bin/sh
# Normalises a render's audio to -14 LUFS integrated and -1 dBTP (two-pass loudnorm), copying the video.
# Usage: sh tools/master.sh out/draft.mp4 out/Pawket-Demo-1080p.mp4
set -e
in=$1
out=$2
json=$(ffmpeg -hide_banner -nostats -i "$in" -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
args=$(printf '%s' "$json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -hide_banner -loglevel error -y -i "$in" -c:v copy -af "loudnorm=I=-14:TP=-1:LRA=11:$args:linear=true" -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$out"
ffmpeg -hide_banner -nostats -i "$out" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak|LRA):" | tail -3
