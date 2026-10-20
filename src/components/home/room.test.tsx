import { afterEach, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { DEFAULT_LOOK } from "@/lib/player/look";
import { PetMood, PetSpecies } from "@/lib/game/enums";
import { Room } from "./room";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const pet = { species: PetSpecies.LunaCat, form: "cat", temper: "curious", feeling: "happy", name: "Pepper", wearing: null, mood: PetMood.Happy } as const;

it("plays a cue in the flat room: the player says it in a bubble and the room says it aloud, then lets it go", () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  const onStatus = vi.fn();
  const props = { pet, look: DEFAULT_LOOK, sky: "warm", description: "Pepper's room", onStatus } as const;
  // jsdom draws no WebGL, so this room is flat. A cue it was given before it came is not played again.
  const { container, rerender } = render(<Room {...props} cue={{ moment: "wave", nonce: 1 }} />);
  expect(container.querySelector(".pk-room__said")).toBeNull();
  expect(onStatus).not.toHaveBeenCalledWith(expect.objectContaining({ moment: "wave" }));

  rerender(<Room {...props} cue={{ moment: "heart", nonce: 2 }} />);
  expect(container.querySelector(".pk-room__said")).not.toBeNull();
  expect(onStatus).toHaveBeenLastCalledWith({ moment: "heart", sentence: "You make a heart. Pepper beams." });

  act(() => vi.advanceTimersByTime(1800));
  expect(container.querySelector(".pk-room__said")).toBeNull();
  expect(onStatus).toHaveBeenLastCalledWith({ moment: null, sentence: "" });
});
