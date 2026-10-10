// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const documents = [
  "README.md",
  "AGENTS.md",
  "android/README.md",
  ...readdirSync("docs").filter((name) => name.endsWith(".md")).map((name) => `docs/${name}`),
];

describe("repository documentation", () => {
  it.each(documents)("%s references existing documents and source paths", (file) => {
    const content = readFileSync(file, "utf8");
    for (const [, target] of content.matchAll(/\[[^\]\n]*\]\(([^\s()]+)\)/g)) {
      if (/^[a-z]+:|^#/i.test(target)) continue;
      const path = target.split("#")[0];
      expect(existsSync(resolve(dirname(file), path)), `${file}: ${target}`).toBe(true);
    }
    for (const [, path] of content.matchAll(/`([^`\n]+)`/g)) {
      // Created locally by Android developers, not part of a checkout.
      if (path === "android/local.properties") continue;
      if (path.endsWith(".md")) {
        const relative = path.startsWith("docs/") ? path : resolve(dirname(file), path);
        expect(existsSync(relative), `${file}: ${path}`).toBe(true);
      } else if (/^(src|app|programs|scripts|e2e|android|public)\//.test(path) && !/[\s*{}<>…]|\.\.\./.test(path)) {
        expect(existsSync(path), `${file}: ${path}`).toBe(true);
      }
    }
  });
});
