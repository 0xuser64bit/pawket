// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BANNED_PHRASES, COIN_DOES, COIN_NEVER, COIN_RISKS } from "./copy";

/** Every file a player reads a coin's words in: this copy, the coin screens and the coin routes. */
function coinSurfaces(): string[] {
  const roots = ["src/lib/coins", "src/components/coins", "app/(game)/guilds/[slug]/coin", "app/api/coins"];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) files.push(full);
    }
  };
  for (const root of roots) {
    try {
      walk(root);
    } catch {
      // A surface not built yet has nothing to say.
    }
  }
  return files;
}

describe("what Pawket says about a coin", () => {
  it("never sells it: no surface uses a banned phrase", () => {
    // The list itself lives in copy.ts, so that file is read without it.
    for (const file of coinSurfaces()) {
      let text = readFileSync(file, "utf8").toLowerCase();
      if (file.endsWith(path.join("coins", "copy.ts"))) text = text.slice(0, text.indexOf("export const banned_phrases"));
      for (const phrase of BANNED_PHRASES) {
        expect(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text), `${file}: "${phrase}"`).toBe(false);
      }
    }
  });

  it("says what can go wrong, and that holding gives nothing that touches a pet", () => {
    expect(COIN_RISKS.join(" ")).toMatch(/fall to nothing/);
    expect(COIN_RISKS.join(" ")).toMatch(/Nobody promises it any value/);
    expect(COIN_DOES.join(" ")).toMatch(/crest pin/);
    expect(COIN_NEVER.join(" ")).toMatch(/vitals, XP, level/);
  });
});
