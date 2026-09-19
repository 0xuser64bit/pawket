import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PetMood, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { PetAvatar } from "./pet-avatar";

const PROPS = {
  species: PetSpecies.LunaCat,
  personality: PetPersonality.Curious,
  mood: PetMood.Happy,
  name: "Mochi",
} as const;

describe("PetAvatar", () => {
  it("renders deterministically for the same input", () => {
    expect(renderToStaticMarkup(<PetAvatar {...PROPS} />)).toBe(
      renderToStaticMarkup(<PetAvatar {...PROPS} />),
    );
  });

  it("changes with mood and species", () => {
    const base = renderToStaticMarkup(<PetAvatar {...PROPS} />);
    expect(renderToStaticMarkup(<PetAvatar {...PROPS} mood={PetMood.Tired} />)).not.toBe(base);
    expect(
      renderToStaticMarkup(<PetAvatar {...PROPS} species={PetSpecies.MossPup} />),
    ).not.toBe(base);
  });

  it("labels the portrait for assistive tech", () => {
    const html = renderToStaticMarkup(<PetAvatar {...PROPS} />);
    expect(html).toContain("Mochi");
    expect(html).toContain("happy");
  });
});
