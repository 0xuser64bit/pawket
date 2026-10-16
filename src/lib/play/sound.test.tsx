import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useRoomAmbience, useSound } from "./sound";

function Room() {
  const [on, setOn] = useSound();
  useRoomAmbience(on);
  return <button onClick={() => setOn(!on)}>{on ? "Sound on" : "Sound off"}</button>;
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

it("waits for a gesture, pauses hidden or unmounted rooms, and mutes even with blocked storage", () => {
  const oscillators: Array<{ stop: ReturnType<typeof vi.fn> }> = [];
  const envelope = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const ctor = vi.fn(function () {
    return {
      state: "running", currentTime: 0, destination: {},
      createOscillator: () => {
        const osc = { frequency: envelope(), connect: (target: unknown) => target, disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
        oscillators.push(osc);
        return osc;
      },
      createGain: () => ({ gain: envelope(), connect: vi.fn(), disconnect: vi.fn() }),
    };
  });
  vi.stubGlobal("AudioContext", ctor);
  localStorage.setItem("pawket.sound", "on");
  const room = render(<Room />);
  expect(screen.getByRole("button").textContent).toBe("Sound on");
  expect(ctor).not.toHaveBeenCalled();
  fireEvent.pointerDown(window);
  expect(oscillators).toHaveLength(6);
  const visibility = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  expect(oscillators.every((osc) => osc.stop.mock.calls.length >= 2)).toBe(true);
  visibility.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  expect(oscillators).toHaveLength(12);
  room.unmount();
  expect(oscillators.every((osc) => osc.stop.mock.calls.length >= 2)).toBe(true);

  render(<Room />);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Full"); });
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Blocked"); });
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button").textContent).toBe("Sound off");
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button").textContent).toBe("Sound on");
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button").textContent).toBe("Sound off");
});
