import { AnimationClip, Camera, Group, Vector3 } from "three";
import { expect, it, vi } from "vitest";
import type { HumanActor } from "./human";
import { Director } from "./director";

function stage(loadClips: (src: string) => Promise<AnimationClip[]> = async () => []) {
  const clips = new Set(["Idle", "Wave", "Dance", "Pet"]);
  const human = {
    root: new Group(),
    play: vi.fn(),
    hold: vi.fn(),
    update: vi.fn(),
    duration: () => 3,
    hasClip: (name: string) => clips.has(name),
    addClips: (more: AnimationClip[]) => more.forEach((clip) => clips.add(clip.name)),
  };
  const camera = new Camera();
  camera.position.set(0, 1.2, 4);
  const director = new Director({ human: human as unknown as HumanActor, pet: null, camera, world: new Group(), petName: "Mochi", mood: null, reduced: false, windowPoint: new Vector3(), loadClips });
  return { director, human };
}

it("holds a pose facing the camera until released, then the room lives again", async () => {
  const { director, human } = stage();
  const status = vi.fn();
  director.listen(status);
  await director.holdPhoto("wave");
  expect(human.hold).toHaveBeenCalledWith("Wave", 1);
  // Turned to the camera, not to the window behind: a face, never the back of a head.
  expect(Math.abs(human.root.rotation.y)).toBeLessThan(0.3);
  human.play.mockClear();
  director.update(30);
  expect(human.play).not.toHaveBeenCalled();
  expect(human.update.mock.calls.at(-1)?.[0]).toBe(0);
  await director.holdPhoto(null);
  expect(human.play).toHaveBeenCalledWith("Idle", { fade: 0, loop: true });
  expect(status).toHaveBeenLastCalledWith({ moment: null, sentence: "" });
  director.play("wave");
  expect(status.mock.calls.at(-1)?.[0].moment).toBe("wave");
  director.dispose();
});

it("loads a pose's own clip before holding it, and a later ask wins over a slower one", async () => {
  let arrive = () => {};
  const loadClips = vi.fn(() => new Promise<AnimationClip[]>((resolve) => { arrive = () => resolve([new AnimationClip("Cheer", 1, [])]); }));
  const { director, human } = stage(loadClips);
  const cheer = director.holdPhoto("cheer");
  expect(loadClips).toHaveBeenCalledWith("/3d/emotes/cheer.glb");
  await director.holdPhoto("wave");
  arrive();
  await cheer;
  expect(human.hold).toHaveBeenLastCalledWith("Wave", 1);
  await director.holdPhoto("cheer");
  expect(loadClips).toHaveBeenCalledTimes(1);
  expect(human.hold).toHaveBeenLastCalledWith("Cheer", 0.9);
  director.dispose();
});
