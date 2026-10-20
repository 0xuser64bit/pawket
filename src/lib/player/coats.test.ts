import { afterEach, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { DAYLIGHT } from "@/components/room3d/palette";
import { PetSpecies } from "@/lib/game/enums";
import { BAKED, COATS, findCoat } from "./coats";
import { chooseCoat, useCoats } from "./use-coats";

afterEach(() => window.localStorage.clear());

/** WCAG relative luminance of an sRGB hex. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

it("swaps exactly the colours the pipeline baked into each model", () => {
  expect(BAKED[PetSpecies.LunaCat]).toEqual({ main: DAYLIGHT.sun, second: DAYLIGHT["sun-edge"] });
  expect(BAKED[PetSpecies.MossPup]).toEqual({ main: DAYLIGHT["trim-copper"], second: DAYLIGHT["pet-cocoa"] });
  expect(BAKED[PetSpecies.CloudBun]).toEqual({ main: DAYLIGHT["pet-cloud"], second: DAYLIGHT["pet-cloud-shade"] });
});

it("offers each species its classic coat first, and others its dark eyes read on", () => {
  const eye = luminance(DAYLIGHT["pet-eye"]);
  for (const species of Object.values(PetSpecies)) {
    const coats = COATS[species];
    expect(coats[0].id).toBe("classic");
    expect(new Set(coats.map((coat) => coat.id)).size).toBe(coats.length);
    for (const coat of coats.slice(1)) expect((luminance(coat.main) + 0.05) / (eye + 0.05), `${species} ${coat.id}`).toBeGreaterThanOrEqual(4.5);
  }
  expect(findCoat(PetSpecies.LunaCat, "nope").id).toBe("classic");
});

it("keeps each pet's coat on this device, and forgets a return to the classic", () => {
  const { result } = renderHook(() => useCoats());
  const mango = { id: "Mango111", species: PetSpecies.LunaCat };
  expect(result.current(mango).id).toBe("classic");
  act(() => {
    expect(chooseCoat(mango.id, "lilac")).toBe(true);
  });
  expect(result.current(mango).name).toBe("Lilac");
  expect(result.current({ id: "other", species: PetSpecies.MossPup }).id).toBe("classic");
  act(() => {
    chooseCoat(mango.id, "classic");
  });
  expect(JSON.parse(window.localStorage.getItem("pawket.pet-coats.v1")!)).toEqual({});
});
