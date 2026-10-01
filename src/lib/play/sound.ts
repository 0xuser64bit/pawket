"use client";

import { useSyncExternalStore } from "react";

/**
 * The playground's sounds: short synthesised blips, no files. Off unless
 * the player turns them on, remembered on this device; nothing plays before
 * a tap, so no browser has to block it.
 */
const KEY = "pawket.sound";
const listeners = new Set<() => void>();
let context: AudioContext | null = null;

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function useSound(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => false,
  );
  const set = (next: boolean) => {
    try {
      if (next) window.localStorage.setItem(KEY, "on");
      else window.localStorage.removeItem(KEY);
    } catch {
      // Blocked storage: the choice lasts until the page reloads.
    }
    for (const listener of listeners) listener();
    if (next) blip(660, 80);
  };
  return [on, set];
}

/** One note. Quiet by design: a cue, not music. */
export function blip(frequency: number, ms = 90, type: OscillatorType = "triangle", volume = 0.05) {
  if (!read()) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
    osc.connect(gain).connect(context.destination);
    osc.start(now);
    osc.stop(now + ms / 1000 + 0.02);
  } catch {
    // No audio on this device: the game is the same without it.
  }
}

/** The four beans of Copy sing a major chord, low to high. */
export const BEAN_NOTES = [392, 494, 587, 784];
