import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { THEMES, THEME_SCRIPT } from "./themes";

const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

/** A theme's tokens, from the block its preview selector opens. */
function tokens(id: string): Record<string, string> {
  const start = css.indexOf(`[data-theme-preview="${id}"] {`);
  if (start < 0) return {};
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2].toLowerCase()]));
}

function luminance(hex: string): number {
  const [r, g, b] = hex
    .slice(1)
    .match(/../g)!
    .map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Every pairing the design system promises, as [text, ground, minimum]. */
function pairings(): Array<[string, string, number]> {
  const out: Array<[string, string, number]> = [];
  for (const ground of ["ground", "surface", "surface-sunk", "paper"]) {
    out.push(["ink", ground, 4.5], ["ink-soft", ground, 4.5]);
  }
  for (const ground of ["ground", "surface"]) out.push(["ink-faint", ground, 4.5]);
  for (const hue of ["sun", "sprout", "pool", "bloom", "alarm"]) {
    for (const ground of ["ground", "surface", "paper", `${hue}-soft`]) out.push([`${hue}-text`, ground, 4.5]);
    out.push([`on-${hue}`, hue, 4.5], ["ink", `${hue}-soft`, 4.5]);
  }
  out.push(
    ["edge", "ground", 3],
    ["edge", "surface", 3],
    ["focus", "ground", 3],
    ["focus", "surface", 3],
    ["rule", "paper", 3],
    ["ink-inverse", "surface-ink", 4.5],
  );
  return out;
}

describe("rooms", () => {
  it.each(THEMES.map((theme) => [theme.id]))("%s is a complete set of tokens", (id) => {
    const set = tokens(id);
    for (const [text, ground] of pairings()) {
      expect(set[text], `${id} --${text}`).toMatch(/^#/);
      expect(set[ground], `${id} --${ground}`).toMatch(/^#/);
    }
  });

  it.each(THEMES.map((theme) => [theme.id]))("%s meets the contrast floor in every pairing", (id) => {
    const set = tokens(id);
    for (const [text, ground, min] of pairings()) {
      expect(contrast(set[text], set[ground]), `${id}: ${text} on ${ground}`).toBeGreaterThanOrEqual(min);
    }
  });

  it("declares each room's scheme where the 3D room reads it", () => {
    for (const theme of THEMES) {
      const start = css.indexOf(`[data-theme-preview="${theme.id}"] {`);
      const block = css.slice(start, css.indexOf("}", start));
      expect(block, theme.id).toContain(`color-scheme: ${theme.scheme};`);
    }
  });

  it("applies only rooms it knows before paint", () => {
    for (const theme of THEMES) expect(THEME_SCRIPT).toContain(`"${theme.id}"`);
    expect(THEME_SCRIPT).toContain("indexOf(t)>=0");
  });
});
