// @vitest-environment node
import { expect, it } from "vitest";
import type { Feeling, PetForm, Temper } from "@/components/pk/pet-art";
import { WEARABLES } from "@/lib/closet/catalog";
import { petSvg } from "./card";

const FORMS: PetForm[] = ["cat", "dog", "bun"];
const TEMPERS: Temper[] = ["curious", "cozy", "brave", "mischief"];
const FEELINGS: Feeling[] = ["radiant", "happy", "okay", "hungry", "lonely", "tired", "scruffy"];

it("draws every pet as plain SVG without React rendering it, so PetArt stays free of hooks", () => {
  for (const form of FORMS)
    for (const temper of TEMPERS)
      for (const feeling of FEELINGS)
        for (const wearing of [null, ...WEARABLES.map((item) => item.id)]) {
          const svg = petSvg({ form, temper, feeling, wearing });
          expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" '), `${form} ${feeling} ${wearing}`).toBe(true);
          expect(svg, `${form} ${feeling} ${wearing}`).not.toMatch(/\[object |undefined|NaN/);
        }
});
