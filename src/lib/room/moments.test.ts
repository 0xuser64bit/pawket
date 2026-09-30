import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "@/components/pk/icon";
import { CareActionType } from "@/lib/game/enums";
import { CARE_MOMENT, EMOTES, FORMATIONS, MOMENTS, PET_CUES, PROPS, findMoment, momentLength, momentSentence } from "./moments";

/** Clip names and durations straight out of a shipped GLB's JSON chunk. */
function clipsIn(file: string): Map<string, number> {
  const bytes = fs.readFileSync(path.join(process.cwd(), "public/3d", file));
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString("utf8"));
  return new Map(
    (json.animations ?? []).map((a: { name: string; samplers: Array<{ input: number }> }) => [
      a.name,
      Math.max(...a.samplers.map((s) => json.accessors[s.input].max[0])),
    ]),
  );
}

const bodies = ["human/body-a.glb", "human/body-b.glb"].map(clipsIn);
const pets = ["pets/cat.glb", "pets/dog.glb", "pets/bunny.glb"].map(clipsIn);

describe("moment registry", () => {
  it("has one entry per id", () => {
    const ids = MOMENTS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names only clips both bodies carry, or clips its own file carries", () => {
    for (const moment of MOMENTS)
      for (const clip of moment.clips) {
        if (clip.src) {
          expect(clip.src, moment.id).toMatch(/^\/3d\/.+\.glb$/);
          expect(clipsIn(clip.src.replace(/^\/3d\//, "")).has(clip.name), `${moment.id}: ${clip.name} in ${clip.src}`).toBe(true);
          continue;
        }
        for (const body of bodies) expect(body.has(clip.name), `${moment.id}: ${clip.name}`).toBe(true);
      }
  });

  it("keeps every cue, prop and hand inside the moment", () => {
    const external = new Map(
      MOMENTS.flatMap((m) => m.clips.filter((c) => c.src).map((c) => [c.name, clipsIn(c.src!.replace(/^\/3d\//, "")).get(c.name) ?? 0] as const)),
    );
    for (const moment of MOMENTS) {
      const length = momentLength(moment, (name) => bodies[0].get(name) ?? external.get(name) ?? 0);
      expect(length, moment.id).toBeGreaterThan(0);
      expect(FORMATIONS).toContain(moment.formation);
      for (const step of moment.pet) {
        expect(PET_CUES).toContain(step.cue);
        expect(step.at).toBeLessThanOrEqual(length);
      }
      if (moment.prop) {
        expect(PROPS).toContain(moment.prop.kind);
        expect(moment.prop.from).toBeLessThan(moment.prop.to);
        // A prop needs a moment to shrink away before its moment ends.
        expect(moment.prop.to, moment.id).toBeLessThanOrEqual(length - 0.2);
      }
      if (moment.contact) {
        expect(moment.contact.from).toBeLessThan(moment.contact.to);
        expect(moment.contact.to).toBeLessThanOrEqual(length);
      }
      expect(moment.still).toBeGreaterThanOrEqual(0);
      expect(moment.still).toBeLessThanOrEqual(length);
      expect(ICON_NAMES as string[]).toContain(moment.icon);
    }
  });

  it("offers emotes that exist, and shows every care action once saved", () => {
    for (const id of EMOTES) expect(findMoment(id), id).toBeDefined();
    for (const action of Object.values(CareActionType)) expect(findMoment(CARE_MOMENT[action]), action).toBeDefined();
  });

  it("never says a vital, XP or a streak changed", () => {
    for (const moment of MOMENTS) expect(moment.says).not.toMatch(/xp|vital|streak|level|\+\d/i);
    expect(momentSentence(findMoment("wave")!, "Pepper")).toBe("You wave. Pepper saw.");
  });

  it("uses only clips every pet has", () => {
    for (const pet of pets)
      for (const clip of ["idle", "walk", "run", "eat", "dance", "gesture-positive", "gesture-negative"])
        expect(pet.has(clip), clip).toBe(true);
  });
});
