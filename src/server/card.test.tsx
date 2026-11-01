// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { Feeling, PetForm, Temper } from "@/components/pk/pet-art";
import { WEARABLES } from "@/lib/closet/catalog";
import { petCard, petSvg } from "./card";

afterEach(() => vi.unstubAllGlobals());

it.each(["wide", "square"] as const)("renders a %s share card without a font-service dependency", async (shape) => {
  const localFetch = globalThis.fetch;
  const network: string[] = [];
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith("data:")) return localFetch(input, init);
    network.push(url);
    return Promise.resolve(new Response("Temporary HTTP 503", { status: 503 }));
  });
  const image = await petCard(null, shape);
  const bytes = Buffer.from(await image.arrayBuffer());
  expect(await sharp(bytes).metadata()).toMatchObject(shape === "wide"
    ? { format: "png", width: 1200, height: 630 }
    : { format: "png", width: 800, height: 800 });
  expect(network).toEqual([]);
});

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
