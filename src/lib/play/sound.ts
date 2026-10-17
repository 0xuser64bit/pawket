"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Pawket's sounds, all made here, no files: Home's music box, a little tune
 * for each thing the two of you do there, and the playground's blips. One
 * switch for all of them, remembered on this device: on until it is turned
 * off. Nothing plays before a tap — browsers forbid it, and Pawket would not
 * — and nothing plays while the page is hidden.
 */
const KEY = "pawket.sound";
const listeners = new Set<() => void>();
/** Blocked storage: the choice lasts for this page. */
let volatileChoice: boolean | null = null;

function read(): boolean {
  if (volatileChoice !== null) return volatileChoice;
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
function notify() {
  for (const listener of listeners) listener();
}
function storage(event: StorageEvent) {
  if (event.key === KEY || event.key === null) {
    volatileChoice = null;
    loud(read());
    notify();
  }
}
/** Turn everything up, or quiet at once — even what is already ringing. */
function loud(on: boolean) {
  if (out && context) out.gain.setTargetAtTime(on ? 0.8 : 0, context.currentTime, 0.03);
}
function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener("storage", storage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", storage);
  };
}

/* ------------------------------------------------------------- the voice */

let context: AudioContext | null = null;
/** Everything goes through here, so one switch silences what is already ringing. */
let out: GainNode | null = null;
/** When, on the audio clock, the last sound set to play has finished ringing. */
let quietAt = 0;

/** The audio, made on the first sound after a tap; null where a device has none. */
function audio(): { ctx: AudioContext; out: GainNode } | null {
  try {
    if (!context) {
      context = new AudioContext();
      out = context.createGain();
      out.gain.value = 0.8;
      // A small room for the music box: one soft echo, fading.
      const echo = context.createDelay(1);
      echo.delayTime.value = 0.21;
      const back = context.createGain();
      back.gain.value = 0.28;
      const wet = context.createGain();
      wet.gain.value = 0.2;
      out.connect(context.destination);
      out.connect(echo);
      echo.connect(back).connect(echo);
      echo.connect(wet).connect(context.destination);
    }
    if (context.state === "suspended" && !document.hidden) void context.resume().catch(() => {});
    return { ctx: context, out: out! };
  } catch {
    return null;
  }
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/**
 * One tine of a music box: the note, a quiet and slightly sharp octave, a
 * faint twelfth — struck, then left to ring, the higher partials first to go.
 */
function tine(ctx: AudioContext, to: AudioNode, midi: number, at: number, volume: number, ring = 1.6) {
  for (const [ratio, level, last] of [
    [1, 1, 1],
    [2.006, 0.3, 0.5],
    [3.01, 0.08, 0.3],
  ]) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const end = at + ring * last;
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz(midi) * ratio, at);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(volume * level, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(env).connect(to);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
    osc.start(at);
    osc.stop(end + 0.05);
    quietAt = Math.max(quietAt, end + 0.05);
  }
}

export function useSound(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => false);
  const set = (next: boolean) => {
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
      volatileChoice = null;
    } catch {
      volatileChoice = next;
    }
    loud(next);
    notify();
    if (next) chime("on");
  };
  return [on, set];
}

/** A short cue for the playground, started by a player action; silence never blocks a game. */
export function blip(frequency: number, ms = 90, type: OscillatorType = "triangle", volume = 0.05) {
  if (!read() || document.hidden) return;
  const sound = audio();
  if (!sound) return;
  try {
    const { ctx } = sound;
    const at = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(volume, at + 0.018);
    env.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
    osc.connect(env).connect(sound.out);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
    osc.start(at);
    osc.stop(at + ms / 1000 + 0.02);
    quietAt = Math.max(quietAt, at + ms / 1000 + 0.02);
  } catch {
    // This device can still play without audio.
  }
}

/* ------------------------------------------------------------- the tunes */

/**
 * What each moment sounds like, in the room's own music box: notes (MIDI)
 * and when, in seconds. A wave says hello, a cheer climbs, a meal is two
 * small bites, a brush sparkles, a rest winds down.
 */
const TUNES: Record<string, Array<[number, number]>> = {
  on: [[79, 0], [84, 0.1]],
  wave: [[79, 0], [84, 0.14]],
  dance: [[84, 0], [88, 0.1], [91, 0.2], [88, 0.3], [91, 0.4]],
  pet: [[76, 0], [79, 0.18], [84, 0.36]],
  treat: [[96, 0], [91, 0.08]],
  cheer: [[84, 0], [88, 0.07], [91, 0.14], [96, 0.21]],
  feed: [[67, 0], [67, 0.16], [72, 0.38]],
  brush: [[96, 0], [91, 0.06], [88, 0.12], [91, 0.3]],
  fetch: [[72, 0], [79, 0.12], [76, 0.5], [84, 0.62]],
  rest: [[79, 0], [76, 0.24], [72, 0.5]],
};

/** The little tune for `moment`, if it has one and sound is on. */
export function chime(moment: string) {
  const tune = TUNES[moment];
  if (!tune || !read() || document.hidden) return;
  const sound = audio();
  if (!sound) return;
  try {
    const at = sound.ctx.currentTime + 0.02;
    for (const [midi, after] of tune) tine(sound.ctx, sound.out, midi, at + after, 0.07, 1.1);
  } catch {
    // Quiet is fine.
  }
}

/**
 * Home's lullaby: sixteen bars in three, a music box on a windowsill — the
 * tune on top, a soft low note at each bar — then a bar's rest, and again.
 * Each bar is its low note and the tune's notes, as [MIDI, beats].
 */
const BARS: Array<[number, Array<[number, number]>]> = [
  [60, [[76, 2], [79, 1]]],
  [55, [[84, 2], [83, 1]]],
  [53, [[81, 2], [79, 1]]],
  [60, [[76, 3]]],
  [53, [[77, 2], [81, 1]]],
  [60, [[79, 2], [76, 1]]],
  [55, [[74, 2], [76, 1]]],
  [60, [[72, 3]]],
  [60, [[76, 1], [79, 1], [84, 1]]],
  [55, [[86, 2], [84, 1]]],
  [52, [[83, 1], [81, 1], [79, 1]]],
  [53, [[81, 3]]],
  [53, [[77, 1], [81, 1], [84, 1]]],
  [55, [[83, 2], [79, 1]]],
  [55, [[74, 1], [79, 1], [83, 1]]],
  [60, [[84, 3]]],
  [0, []],
];
const BEAT = 0.6;
/** One time round: when each note sounds, in beats from the top. */
const LULLABY = BARS.flatMap(([low, notes], bar) => {
  const events: Array<{ beat: number; midi: number; volume: number; ring: number }> = low ? [{ beat: bar * 3, midi: low, volume: 0.035, ring: 2.4 }] : [];
  let beat = bar * 3;
  for (const [midi, beats] of notes) {
    events.push({ beat, midi, volume: 0.05, ring: 1.7 });
    beat += beats;
  }
  return events;
});
const ROUND = BARS.length * 3;

/**
 * Plays the lullaby while `on` and this room is on screen: from the first
 * tap after a load, fading in; quiet while the page is hidden; gone when
 * Home is left or the sound is turned off. Notes are set a moment ahead on
 * the audio clock, so a busy page never makes it stumble.
 */
export function useRoomMusic(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let bus: GainNode | null = null;
    let top = 0;
    let next = 0;

    function play() {
      if (timer !== undefined || document.hidden || !read()) return;
      const sound = audio();
      if (!sound) return;
      const { ctx } = sound;
      bus = ctx.createGain();
      bus.gain.setValueAtTime(0.0001, ctx.currentTime);
      bus.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 2.5);
      bus.connect(sound.out);
      top = ctx.currentTime + 0.15;
      next = 0;
      const schedule = () => {
        if (!bus) return;
        while (top + LULLABY[next].beat * BEAT < ctx.currentTime + 0.6) {
          const note = LULLABY[next];
          tine(ctx, bus, note.midi, top + note.beat * BEAT, note.volume, note.ring);
          next += 1;
          if (next === LULLABY.length) {
            next = 0;
            top += ROUND * BEAT;
          }
        }
      };
      schedule();
      timer = setInterval(schedule, 150);
    }
    function hush() {
      clearInterval(timer);
      timer = undefined;
      if (bus && context) {
        const gone = bus;
        gone.gain.cancelScheduledValues(context.currentTime);
        gone.gain.setTargetAtTime(0, context.currentTime, 0.08);
        setTimeout(() => gone.disconnect(), 600);
      }
      bus = null;
    }
    function visibility() {
      if (document.hidden) {
        hush();
        void context?.suspend().catch(() => {});
      } else play();
    }
    // A remembered "on" is not a tap: after a load, the first one starts it.
    const started = typeof navigator !== "undefined" && navigator.userActivation?.hasBeenActive;
    if (started) play();
    window.addEventListener("pointerdown", play);
    window.addEventListener("keydown", play);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      hush();
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("keydown", play);
      document.removeEventListener("visibilitychange", visibility);
      // Home left or muted: once the last note has rung, the phone's audio rests until the next sound
      // wakes it. A sound set since then is someone else's, and keeps it awake.
      const rest = () => {
        if (context?.state === "running" && context.currentTime >= quietAt) void context.suspend().catch(() => {});
      };
      setTimeout(rest, context ? Math.max(700, (quietAt - context.currentTime) * 1000 + 50) : 700);
    };
  }, [on]);
}

/** The four beans of Copy sing a major chord, low to high. */
export const BEAN_NOTES = [392, 494, 587, 784];
