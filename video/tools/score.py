"""Pawket's score: an original, gentle cue made from scratch to the edit's sections (no samples,
nothing licensed). Plucked strings, a music box, a soft pad, bass and a light shaker.

    python tools/score.py public/audio/score.wav

Sections follow the edit: hook 0-12 s, companion 12-52.4, together 52.4-75.9, Solana 75.9-108,
world 108-155, close 155-170. Each section starts its own bar grid at its boundary, like a new cue.
"""
import sys
import wave

import numpy as np

SR = 48000
BPM = 96
BEAT = 60 / BPM
BAR = 4 * BEAT
LENGTH = 170.0
rng = np.random.default_rng(7)

NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name):
    """'A4' -> 440."""
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[pitch] + 12 * (octave + 1) - 69) / 12)


L = np.zeros(int(SR * LENGTH) + SR * 3)
R = np.zeros_like(L)


def add(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= len(L):
        return
    sig = sig[: len(L) - i] * gain
    L[i : i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    R[i : i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))


def env_t(dur):
    return np.arange(int(dur * SR)) / SR


def pluck(f, dur=1.8, bright=1.0):
    """A soft plucked string: harmonics that fade faster the higher they are."""
    t = env_t(dur)
    sig = np.zeros_like(t)
    for k in range(1, 9):
        fk = f * k * (1 + 0.0007 * k * k)
        if fk > SR / 2.5:
            break
        sig += (1 / k ** (1.25 / bright)) * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28)) * np.exp(-t * (1.6 + 1.1 * k))
    attack = np.minimum(1, t / 0.004)
    return sig * attack * 0.32


def bell(f, dur=2.4):
    """A music box tine: a few inharmonic partials, bright and short."""
    t = env_t(dur)
    sig = np.sin(2 * np.pi * f * t) * np.exp(-t * 1.9)
    sig += 0.35 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 4.5)
    sig += 0.18 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 7.0)
    return sig * np.minimum(1, t / 0.002) * 0.22


def pad(freqs, dur, attack=1.2, release=1.4):
    t = env_t(dur + release)
    sig = np.zeros_like(t)
    for f in freqs:
        for detune in (-0.0035, 0.0, 0.004):
            ph = rng.uniform(0, 6.28)
            for k, a in ((1, 1.0), (3, 0.11), (5, 0.04)):
                sig += a * np.sin(2 * np.pi * f * (1 + detune) * k * t + ph)
    shape = np.minimum(1, t / attack) * np.clip((dur + release - t) / release, 0, 1)
    return sig * shape * 0.035 / max(1, len(freqs) / 3)


def bass(f, dur=0.9):
    t = env_t(dur)
    sig = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return sig * np.exp(-t * 2.6) * np.minimum(1, t / 0.01) * 0.30


def kick():
    t = env_t(0.35)
    f = 48 + 70 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) * 0.42


def shaker(accent=1.0):
    t = env_t(0.09)
    n = rng.standard_normal(len(t))
    n = np.diff(np.concatenate([[0], n]))  # brighter
    return n * np.exp(-t * 55) * 0.011 * accent


CHORDS = {
    "C": ["C4", "E4", "G4", "C5"], "G/B": ["B3", "D4", "G4", "B4"], "Am": ["A3", "C4", "E4", "A4"],
    "F": ["A3", "C4", "F4", "A4"], "Em": ["G3", "B3", "E4", "G4"], "G": ["B3", "D4", "G4", "D5"],
    "Fmaj7": ["A3", "C4", "E4", "F4"], "G6": ["B3", "D4", "E4", "G4"], "Em7": ["G3", "B3", "D4", "E4"],
    "Am7": ["G3", "C4", "E4", "A4"], "Cmaj7": ["B3", "E4", "G4", "C5"], "Dm7": ["A3", "C4", "D4", "F4"],
}
ROOT = {"C": "C2", "G/B": "B1", "Am": "A1", "F": "F2", "Em": "E2", "G": "G2", "Fmaj7": "F2", "G6": "G2",
        "Em7": "E2", "Am7": "A1", "Cmaj7": "C2", "Dm7": "D2"}


def strum(chord, at, up=False, gain=1.0):
    notes = CHORDS[chord][::-1] if up else CHORDS[chord]
    for i, n in enumerate(notes):
        add(pluck(hz(n), 1.6, bright=0.9 if up else 1.0), at + i * 0.011, pan=-0.25 + 0.15 * i, gain=gain * (0.62 if up else 1.0))


def section(start, end, chords, *, strums=True, drums=False, shake=False, arp=False, pads=False, gain=1.0):
    bars = int(np.ceil((end - start) / BAR))
    for b in range(bars):
        t0 = start + b * BAR
        if t0 >= end - 0.05:
            break
        chord = chords[b % len(chords)]
        fade = min(1.0, (end - t0) / BAR)
        if pads:
            add(pad([hz(n) for n in CHORDS[chord][:3]], BAR * 0.98), t0, pan=0.0, gain=gain)
        add(bass(hz(ROOT[chord])), t0, gain=gain * 0.9)
        add(bass(hz(ROOT[chord])), t0 + 2.5 * BEAT, gain=gain * 0.55)
        if strums:
            # island strum on eighths: D . D U . U D U
            for beat8, up in ((0, False), (2, False), (3, True), (5, True), (6, False), (7, True)):
                strum(chord, t0 + beat8 * BEAT / 2, up=up, gain=gain * 0.8 * fade)
        if arp:
            notes = CHORDS[chord]
            for k, idx in enumerate([0, 1, 2, 3, 2, 1, 2, 3]):
                add(pluck(hz(notes[idx]), 1.4, bright=0.8), t0 + k * BEAT / 2, pan=0.2 * (idx - 1.5), gain=gain * 0.55)
        if drums:
            add(kick(), t0, gain=gain)
            add(kick(), t0 + 2 * BEAT, gain=gain * 0.8)
        if shake:
            for s in range(16):
                add(shaker(1.0 if s % 4 == 2 else 0.55), t0 + s * BEAT / 4, pan=0.35, gain=gain)


def motif(at, gain=1.0, octave=5):
    """The hook: a small music-box phrase that comes back at the close."""
    o = str(octave)
    phrase = [("E", 0), ("G", 0.5), ("A", 1.0), ("G", 1.5), ("E", 2.0), ("D", 2.75), ("C", 3.5)]
    for name, beat in phrase:
        add(bell(hz(name + o)), at + beat * BEAT, pan=0.3, gain=gain)


# Hook 0-12: the motif alone, then a pad comes in under the title.
motif(0.35, gain=1.0)
add(pad([hz(n) for n in ("C3", "G3", "E4")], 7.5, attack=2.5), 2.2, gain=1.1)
motif(4.6, gain=0.75)
add(pad([hz(n) for n in ("F3", "A3", "E4")], 3.0, attack=0.8), 9.4, gain=1.1)
add(bell(hz("C6")), 9.45, pan=0.2, gain=0.8)

# Companion 12-52.4: strum, bass, shaker.
section(12.0, 52.4, ["C", "G/B", "Am", "F"], strums=True, shake=True, gain=0.95)
# Together 52.4-75.9 (games, the household): fuller, a soft kick, a glimpse of the motif.
section(52.4, 75.9, ["C", "Em", "F", "G", "Am", "F", "C", "G"], strums=True, shake=True, drums=True, gain=1.0)
motif(52.4 + 6 * BAR, gain=0.45)
# Solana 75.9-108: the quiet register; pads and a slow arpeggio, no drums.
section(75.9, 108.0, ["Fmaj7", "G6", "Em7", "Am7"], strums=False, arp=True, pads=True, gain=0.9)
# World 108-155 (the Market, guilds, the Park): the groove returns, the motif every eight bars.
section(108.0, 155.0, ["C", "Em", "F", "G", "Am", "F", "C", "G"], strums=True, shake=True, drums=True, gain=1.0)
for k in range(2):
    motif(108.0 + k * 8 * BAR + 6 * BAR, gain=0.45)
# Close 155-170: the strum returns gently with the motif, and lands on C.
section(155.0, 165.0, ["F", "G", "Am", "G"], strums=True, shake=False, gain=0.7)
motif(155.4, gain=0.85)
motif(160.4, gain=0.7)
strum("C", 165.0, gain=0.9)
add(pad([hz(n) for n in ("C3", "G3", "E4", "B4")], 4.0, attack=0.6, release=2.5), 165.0, gain=1.2)
add(bell(hz("C6")), 165.05, pan=0.2, gain=0.9)
add(bell(hz("G5")), 165.5, pan=-0.1, gain=0.6)

# A small room: convolution with a soft, decaying noise tail.
ir_t = np.arange(int(1.6 * SR)) / SR
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.2)
ir[0] = 0
ir = np.convolve(ir, np.ones(24) / 24, mode="same")  # a warmer, darker tail
n = 1 << int(np.ceil(np.log2(len(L) + len(ir))))
IR = np.fft.rfft(ir, n)
wetL = np.fft.irfft(np.fft.rfft(L, n) * IR, n)[: len(L)]
wetR = np.fft.irfft(np.fft.rfft(R, n) * np.fft.rfft(np.roll(ir, 37), n), n)[: len(R)]
scale = np.max(np.abs(wetL)) / max(1e-9, np.max(np.abs(L)))
Lm = L + 0.16 * wetL / scale
Rm = R + 0.16 * wetR / scale

# Fade the very end, keep the length exact, and normalise to a quiet bed (peaks at -6 dBFS).
total = int(SR * LENGTH)
Lm, Rm = Lm[:total], Rm[:total]
fade = np.ones(total)
fade[-int(2.5 * SR) :] = np.linspace(1, 0, int(2.5 * SR)) ** 2
Lm *= fade
Rm *= fade
peak = max(np.max(np.abs(Lm)), np.max(np.abs(Rm)))
stereo = np.stack([Lm, Rm], axis=1) / peak * 0.5
pcm = (np.clip(stereo, -1, 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {sys.argv[1]}: {LENGTH:.0f}s")
