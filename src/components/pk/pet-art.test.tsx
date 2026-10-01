import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WEARABLES } from "@/lib/closet/catalog";
import { PetPersonality, PetMood, PetSpecies } from "@/lib/game/enums";
import { MOOD_FEELING, PERSONALITY_TEMPER, petLook } from "@/lib/game/appearance";
import { PetArt, WearableArt, faceFor, type Feeling, type PetForm, type Temper } from "./pet-art";

const FORMS: PetForm[] = ["cat", "dog", "bun"];
const TEMPERS: Temper[] = ["curious", "cozy", "brave", "mischief"];
const NEEDS: Feeling[] = ["hungry", "lonely", "tired", "scruffy"];

describe("a pet's face", () => {
  it("is different for every temperament", () => {
    const faces = TEMPERS.map((temper) => JSON.stringify(faceFor(temper, "happy")));
    expect(new Set(faces).size).toBe(TEMPERS.length);
  });

  it("shows a need over any temperament until it is met", () => {
    for (const need of NEEDS) {
      const faces = TEMPERS.map((temper) => JSON.stringify(faceFor(temper, need)));
      expect(new Set(faces).size, need).toBe(1);
      expect(faces[0]).not.toBe(JSON.stringify(faceFor("curious", "happy")));
    }
  });

  it("keeps the temperament when radiant, and adds sparks", () => {
    for (const temper of TEMPERS) {
      const radiant = faceFor(temper, "radiant");
      expect(radiant.extra).toBe("sparks");
      expect(radiant.eyes).toBe(faceFor(temper, "happy").eyes);
    }
  });

  it("is drawn differently for each, on every species", () => {
    for (const form of FORMS) {
      const drawn = [...TEMPERS.map((temper) => ({ temper, feeling: "happy" as Feeling })), ...NEEDS.map((feeling) => ({ temper: "curious" as Temper, feeling }))].map(
        (face) => renderToStaticMarkup(<PetArt form={form} {...face} still />),
      );
      expect(new Set(drawn).size, form).toBe(drawn.length);
    }
  });
});

describe("what a pet wears", () => {
  it("is drawn on every species, for every piece in the wardrobe", () => {
    for (const form of FORMS) {
      const bare = renderToStaticMarkup(<PetArt form={form} still />);
      for (const item of WEARABLES) {
        expect(renderToStaticMarkup(<PetArt form={form} wearing={item.id} still />), `${form} ${item.id}`).not.toBe(bare);
      }
    }
  });

  it("draws nothing for an id the wardrobe does not have", () => {
    const bare = renderToStaticMarkup(<PetArt form="cat" still />);
    expect(renderToStaticMarkup(<PetArt form="cat" wearing="gold-armour" still />)).toBe(bare);
  });

  it("has a drawing of its own for the shelf", () => {
    const empty = renderToStaticMarkup(<WearableArt id="nothing" />);
    const drawn = WEARABLES.map((item) => renderToStaticMarkup(<WearableArt id={item.id} />));
    for (const svg of drawn) expect(svg).not.toBe(empty);
    expect(new Set(drawn).size).toBe(WEARABLES.length);
  });
});

describe("a pet at rest", () => {
  it("does not breathe, blink or sway when held still", () => {
    const html = renderToStaticMarkup(<PetArt form="dog" still />);
    expect(html).not.toMatch(/pk-breathe|pk-blink/);
  });

  it("breathes and blinks otherwise, offset by its name", () => {
    const html = renderToStaticMarkup(<PetArt form="dog" seed="Pepper" />);
    expect(html).toContain("pk-breathe");
    expect(html).toContain("pk-blink");
    expect(html).toContain("--pk-phase");
  });

  it("resolves to plain colours when a card has no stylesheet", () => {
    const html = renderToStaticMarkup(
      <PetArt form="bun" still colours={{ ink: "#2a1e14", eye: "#2a1e14", shine: "#ffffff", blush: "#ff9f8f", cloud: "#fbf8f4", cloudShade: "#c7d3f2", rim: "#fffbf3" }} coat="#fbf8f4" patch="#c7d3f2" rim />,
    );
    expect(html).not.toContain("var(--edge)");
    expect(html).not.toContain("var(--pet-eye)");
  });
});

describe("petLook", () => {
  it("draws a record's species, temperament, mood and clothes", () => {
    const look = petLook(
      { species: PetSpecies.MossPup, personality: PetPersonality.Mischief, wearing: "red-collar", name: "Nib" },
      PetMood.Tired,
    );
    expect(look).toEqual({ form: "dog", temper: "mischief", feeling: "tired", wearing: "red-collar", seed: "Nib" });
  });

  it("covers every personality and mood the program has", () => {
    for (const personality of Object.values(PetPersonality)) expect(PERSONALITY_TEMPER[personality]).toBeDefined();
    for (const mood of Object.values(PetMood)) expect(MOOD_FEELING[mood]).toBeDefined();
  });
});
