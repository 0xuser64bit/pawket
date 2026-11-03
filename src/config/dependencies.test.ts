// @vitest-environment node
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const requireFromRoot = createRequire(import.meta.url);
const requireFromEslint = createRequire(requireFromRoot.resolve("eslint"));
const requireFromNext = createRequire(requireFromRoot.resolve("eslint-config-next"));
const requireFromParser = createRequire(requireFromNext.resolve("@typescript-eslint/parser"));
const requireFromEstree = createRequire(requireFromParser.resolve("@typescript-eslint/typescript-estree"));

const consumers = [
  ["eslint", requireFromEslint],
  ["@eslint/config-array", createRequire(requireFromEslint.resolve("@eslint/config-array"))],
  ["@eslint/eslintrc", createRequire(requireFromEslint.resolve("@eslint/eslintrc"))],
  ["eslint-plugin-import", createRequire(requireFromNext.resolve("eslint-plugin-import"))],
  ["eslint-plugin-jsx-a11y", createRequire(requireFromNext.resolve("eslint-plugin-jsx-a11y"))],
  ["eslint-plugin-react", createRequire(requireFromNext.resolve("eslint-plugin-react"))],
  ["@typescript-eslint/typescript-estree", requireFromEstree],
] as const;

describe("Minimatch security and ESLint compatibility", () => {
  it("locks only releases fixed for GHSA-g3hv-75wg-m249", () => {
    const lockfile = readFileSync("pnpm-lock.yaml", "utf8");
    const versions = new Set(Array.from(lockfile.matchAll(/^ {2}minimatch@(\d+\.\d+\.\d+)/gm), (match) => match[1]));
    expect(versions.size).toBeGreaterThan(0);
    for (const version of versions) {
      expect(Number(version.split(".")[0]), version).toBeGreaterThanOrEqual(11);
      expect(version).not.toBe("11.0.0");
    }
  });

  it.each(consumers)("preserves callable, named and transpiled default exports for %s", (_name, requireFromConsumer) => {
    const minimatch = requireFromConsumer("minimatch");
    expect(typeof minimatch).toBe("function");
    expect(minimatch.minimatch).toBe(minimatch);
    const defaultImport = minimatch.__esModule ? minimatch.default : minimatch;
    expect(defaultImport).toBe(minimatch);

    const path = "src/config/dependencies.test.ts";
    const pattern = "**/*.{test,spec}.{ts,tsx}";
    expect(minimatch(path, pattern)).toBe(true);
    expect(minimatch("src/config/env.ts", pattern)).toBe(false);
    expect(new minimatch.Minimatch(pattern).match(path)).toBe(true);
    expect([path, "src/config/env.ts"].filter(minimatch.filter(pattern))).toEqual([path]);
    expect(minimatch.match([path, "src/config/env.ts"], pattern)).toEqual([path]);
    expect(minimatch.defaults({ dot: true })(".github/workflows/verify.yml", "**/*.yml")).toBe(true);
  });

  it("bounds optimization-level-two globparts amplification", () => {
    const { Minimatch } = requireFromEstree("minimatch");
    const matcher = new Minimatch(`a/${"**/../b/".repeat(5)}end`, {
      optimizationLevel: 2,
      braceExpandMax: 8,
    });
    expect(matcher.globParts.length).toBeLessThanOrEqual(8);
  });
});
