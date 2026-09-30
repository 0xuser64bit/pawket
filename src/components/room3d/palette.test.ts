import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLOTH_COLOURS } from "@/lib/player/look";
import { CLOTH_TONE, DAYLIGHT } from "./palette";

/** The Daylight tokens as `app/globals.css` declares them on `:root`. */
function rootTokens(): Record<string, string> {
  const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
  const block = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2].toLowerCase()]));
}

describe("room palette", () => {
  it("mirrors the Daylight tokens exactly", () => {
    const tokens = rootTokens();
    for (const [name, hex] of Object.entries(DAYLIGHT)) expect(tokens[name], name).toBe(hex);
  });

  it("dyes every cloth colour with a token, never bloom or alarm", () => {
    for (const colour of CLOTH_COLOURS) {
      expect(DAYLIGHT[CLOTH_TONE[colour]], colour).toBeDefined();
      expect(CLOTH_TONE[colour]).not.toMatch(/bloom|alarm/);
    }
  });
});
