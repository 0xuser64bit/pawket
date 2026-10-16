"use client";

import { useEffect, useSyncExternalStore } from "react";

/** One device preference for Pawket's quiet room chimes and playground cues. */
const KEY = "pawket.sound";
const listeners = new Set<() => void>();
const notes = new Set<OscillatorNode>();
let context: AudioContext | null = null;
let volatileChoice: boolean | null = null;

function read(): boolean {
  if (volatileChoice !== null) return volatileChoice;
  try { return window.localStorage.getItem(KEY) === "on"; } catch { return false; }
}
function notify() { for (const listener of listeners) listener(); }
function storage(event: StorageEvent) {
  if (event.key === KEY || event.key === null) { volatileChoice = null; notify(); }
}
function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener("storage", storage);
  listeners.add(listener);
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener("storage", storage); };
}
function stop(group: Set<OscillatorNode>) {
  for (const osc of group) { try { osc.stop(); } catch { /* Already ended. */ } }
  group.clear();
}
function audio(): AudioContext | null {
  try {
    context ??= new AudioContext();
    return context;
  } catch { return null; }
}

export function useSound(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => false);
  const set = (next: boolean) => {
    try {
      if (next) window.localStorage.setItem(KEY, "on");
      else window.localStorage.removeItem(KEY);
      volatileChoice = null;
    } catch { volatileChoice = next; }
    if (!next) stop(notes);
    notify();
    if (next) blip(660, 80);
  };
  return [on, set];
}

function note(ctx: AudioContext, frequency: number, ms: number, type: OscillatorType, volume: number, at = ctx.currentTime, group?: Set<OscillatorNode>) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
  osc.connect(gain).connect(ctx.destination);
  notes.add(osc);
  group?.add(osc);
  osc.onended = () => { notes.delete(osc); group?.delete(osc); osc.disconnect(); gain.disconnect(); };
  osc.start(at);
  osc.stop(at + ms / 1000 + 0.02);
}

/** A short cue, started by a player action; silence never blocks the game. */
export function blip(frequency: number, ms = 90, type: OscillatorType = "triangle", volume = 0.05) {
  if (!read() || document.hidden) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    note(ctx, frequency, ms, type, volume);
  } catch { /* This device can still play without audio. */ }
}

/** A sparse, soft major-key phrase. No audio is created before a gesture. */
export function useRoomAmbience(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const playing = new Set<OscillatorNode>();
    let timer: ReturnType<typeof setInterval> | undefined;
    let alive = true;
    function pause() { clearInterval(timer); timer = undefined; stop(playing); }
    function phrase() {
      if (!alive || !read() || document.hidden || context?.state !== "running") return;
      try {
        [392, 494, 587, 784, 659, 587].forEach((frequency, i) => note(context!, frequency, 900, "sine", 0.014, context!.currentTime + i * 0.46, playing));
      } catch { pause(); }
    }
    function begin() {
      if (!alive || document.hidden || timer !== undefined || context?.state !== "running") return;
      phrase();
      timer = setInterval(phrase, 12_000);
    }
    function unlock() {
      const ctx = audio();
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume().then(begin).catch(() => {});
      else begin();
    }
    function visibility() { if (document.hidden) pause(); else begin(); }
    // Remembering “on” does not grant autoplay after a reload.
    begin();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      alive = false;
      pause();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [on]);
}

/** The four beans of Copy sing a major chord, low to high. */
export const BEAN_NOTES = [392, 494, 587, 784];
