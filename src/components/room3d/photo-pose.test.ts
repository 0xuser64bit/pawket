import { Camera, Group, Vector3 } from "three";
import { expect, it, vi } from "vitest";
import type { HumanActor } from "./human";
import { Director } from "./director";

it("holds the authored photo frame until released, then resumes room life", () => {
  const human = { root: new Group(), play: vi.fn(), hold: vi.fn(), update: vi.fn(), duration: () => 3, hasClip: () => true };
  const director = new Director({ human: human as unknown as HumanActor, pet: null, camera: new Camera(), world: new Group(), petName: "", mood: null, reduced: false, windowPoint: new Vector3(), loadClips: async () => [] });
  const status = vi.fn();
  director.listen(status);
  director.holdPhoto("wave");
  expect(human.hold).toHaveBeenCalledWith("Wave", 1);
  human.play.mockClear();
  director.update(30);
  expect(human.play).not.toHaveBeenCalled();
  expect(human.update.mock.calls.at(-1)?.[0]).toBe(0);
  director.holdPhoto(null);
  expect(human.play).toHaveBeenCalledWith("Idle", { fade: 0, loop: true });
  expect(status).toHaveBeenCalledWith({ moment: null, sentence: "" });
  director.play("wave");
  expect(status.mock.calls.at(-1)?.[0].moment).toBe("wave");
  director.dispose();
});
