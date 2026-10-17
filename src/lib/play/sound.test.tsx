import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

type Fake = { contexts: number; oscillators: number; time: number; master: { gain: { setTargetAtTime: ReturnType<typeof vi.fn> } } | null; ctx: { suspend: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn> } | null };

/** Just enough of Web Audio to count what would sound, on a clock the test moves. */
function fakeAudio(): Fake {
  const made: Fake = { contexts: 0, oscillators: 0, time: 0, master: null, ctx: null };
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const node = () => ({ connect: vi.fn((to: unknown) => to), disconnect: vi.fn() });
  class Context {
    state = "running";
    destination = {};
    get currentTime() {
      return made.time;
    }
    constructor() {
      made.contexts += 1;
      made.ctx = this as unknown as Fake["ctx"];
    }
    createGain() {
      const gain = { ...node(), gain: param() };
      made.master ??= gain;
      return gain;
    }
    createDelay() {
      return { ...node(), delayTime: param() };
    }
    createOscillator() {
      made.oscillators += 1;
      return { ...node(), type: "", frequency: param(), start: vi.fn(), stop: vi.fn(), onended: null };
    }
    resume = vi.fn(async () => {
      this.state = "running";
    });
    suspend = vi.fn(async () => {
      this.state = "suspended";
    });
  }
  vi.stubGlobal("AudioContext", Context);
  return made;
}

async function room() {
  const { useRoomMusic, useSound } = await import("./sound");
  function Room() {
    const [on, setOn] = useSound();
    useRoomMusic(on);
    return <button onClick={() => setOn(!on)}>{on ? "Sound on" : "Sound off"}</button>;
  }
  return render(<Room />);
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("is on until it is turned off, remembers that, and keeps the choice for the page when storage is blocked", async () => {
  fakeAudio();
  await room();
  expect(screen.getByRole("button").textContent).toBe("Sound on");
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button").textContent).toBe("Sound off");
  expect(localStorage.getItem("pawket.sound")).toBe("off");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Blocked");
  });
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button").textContent).toBe("Sound on");
});

it("waits for a tap after a load, then plays the lullaby a moment ahead on the audio clock", async () => {
  const audio = fakeAudio();
  await room();
  vi.advanceTimersByTime(1000);
  expect(audio.contexts).toBe(0);
  fireEvent.pointerDown(window);
  expect(audio.contexts).toBe(1);
  const first = audio.oscillators;
  expect(first).toBeGreaterThan(0);
  audio.time = 3;
  vi.advanceTimersByTime(150);
  expect(audio.oscillators).toBeGreaterThan(first);
});

it("goes quiet while the page is hidden, when it is muted, and when Home is left", async () => {
  const audio = fakeAudio();
  const view = await room();
  fireEvent.pointerDown(window);
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  expect(audio.ctx!.suspend).toHaveBeenCalled();
  let before = audio.oscillators;
  audio.time = 10;
  vi.advanceTimersByTime(600);
  expect(audio.oscillators).toBe(before);
  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  expect(audio.oscillators).toBeGreaterThan(before);

  // Muted: what is ringing goes quiet at once, and nothing more is set.
  fireEvent.click(screen.getByRole("button"));
  expect(audio.master!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, expect.any(Number), expect.any(Number));
  before = audio.oscillators;
  audio.time = 20;
  vi.advanceTimersByTime(600);
  expect(audio.oscillators).toBe(before);

  fireEvent.click(screen.getByRole("button"));
  view.unmount();
  before = audio.oscillators;
  audio.time = 40;
  vi.advanceTimersByTime(600);
  expect(audio.oscillators).toBe(before);
});

it("lets the audio rest once Home is left and its last note has rung", async () => {
  const audio = fakeAudio();
  const view = await room();
  fireEvent.pointerDown(window);
  view.unmount();
  vi.advanceTimersByTime(600);
  expect(audio.ctx!.suspend).not.toHaveBeenCalled();
  audio.time = 5;
  vi.advanceTimersByTime(5_000);
  expect(audio.ctx!.suspend).toHaveBeenCalledTimes(1);
});

it("gives each moment its own little tune, and none while muted", async () => {
  const audio = fakeAudio();
  const { chime } = await import("./sound");
  chime("cheer");
  expect(audio.oscillators).toBe(4 * 3);
  localStorage.setItem("pawket.sound", "off");
  chime("cheer");
  chime("not a moment");
  expect(audio.oscillators).toBe(12);
});
