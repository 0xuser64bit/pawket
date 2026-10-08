"""Checks a finished cut by ear, without ears: short-term loudness while the voice speaks and while
only music plays, and (with ELEVENLABS_API_KEY) a transcription of the final mix diffed against the
script, to prove the music and effects never bury a word.

    python3 tools/review.py out/Pawket-Demo-1080p.mp4
"""
import difflib
import json
import os
import re
import subprocess
import sys
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
video = sys.argv[1]

placements = json.loads((ROOT / "src/placements.json").read_text())
speech = []
script_words = []
for line_id, at in placements:
    a = json.loads((ROOT / f"public/audio/narration/{line_id}.json").read_text())
    end = a["alignment"]["character_end_times_seconds"][-1]
    speech.append((at, at + end))
    script_words += a["text"].split()

# Short-term loudness (3 s window), every 0.1 s.
out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
samples = [(float(m.group(1)), float(m.group(2))) for m in re.finditer(r"t:\s*([\d.]+)\s+TARGET.*?S:\s*(-?[\d.]+)", out)]
summary = re.findall(r"^\s+(I|LRA|Peak):\s+(-?[\d.]+)", out, re.M)
inside = [s for t, s in samples if any(a + 1.5 <= t <= b for a, b in speech) and s > -70]
outside = [s for t, s in samples if all(t < a - 0.5 or t > b + 3.5 for a, b in speech) and s > -70]
med = lambda xs: sorted(xs)[len(xs) // 2] if xs else float("nan")
print("Integrated / range / peak:", ", ".join(f"{k} {v}" for k, v in summary))
print(f"Short-term loudness while speaking: median {med(inside):.1f} LUFS ({len(inside)} samples)")
print(f"Short-term loudness, music alone:   median {med(outside):.1f} LUFS ({len(outside)} samples)")

key = os.environ.get("ELEVENLABS_API_KEY")
if not key:
    sys.exit(0)
wav = "/tmp/pawket-review.mp3"
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", video, "-vn", "-ac", "1", "-b:a", "96k", wav], check=True)
boundary = uuid.uuid4().hex
body = b"".join([
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n".encode(),
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\nfalse\r\n".encode(),
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"mix.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n".encode(),
    Path(wav).read_bytes(),
    f"\r\n--{boundary}--\r\n".encode(),
])
req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body, headers={"xi-api-key": key, "Content-Type": f"multipart/form-data; boundary={boundary}"})
heard = json.loads(urllib.request.urlopen(req, timeout=300).read())["text"]
norm = lambda s: re.sub(r"[^a-z0-9' ]", " ", s.lower().replace("’", "'").replace("-", " ")).split()
a, b = norm(" ".join(script_words)), norm(heard)
ratio = difflib.SequenceMatcher(None, a, b).ratio()
diffs = [d for d in difflib.ndiff(a, b) if d[0] in "+-"]
print(f"Transcript of the final mix vs script: {ratio * 100:.1f}% word match; differences: {' '.join(diffs) or 'none'}")
