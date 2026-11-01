// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const documents = [
  ...readdirSync(".").filter((name) => name.endsWith(".md")),
  "android/README.md",
  ...readdirSync("docs", { recursive: true, encoding: "utf8" }).filter((name) => name.endsWith(".md")).map((name) => `docs/${name}`),
];

function anchorsIn(content: string): Set<string> {
  const anchors = new Set<string>();
  const occurrences = new Map<string, number>();
  const prose = content.replace(/^```[^\n]*\n[\s\S]*?^```/gm, "");
  for (const [, heading] of prose.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const slug = heading.toLowerCase().replace(/<[^>]*>/g, "").replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, "").replace(/ /g, "-");
    const count = occurrences.get(slug) ?? 0;
    const anchor = count ? `${slug}-${count}` : slug;
    anchors.add(anchor);
    occurrences.set(slug, count + 1);
  }
  for (const [, anchor] of prose.matchAll(/\bid="([^"]+)"/g)) anchors.add(anchor);
  return anchors;
}

describe("repository documentation", () => {
  it("recognizes heading anchors, repeated headings and explicit IDs, not fenced examples", () => {
    expect([...anchorsIn("# A `pet`'s home\n## Care\n## Care\n<h2 id=\"room\">Room</h2>\n```md\n# Not a section\n```")]).toEqual([
      "a-pets-home", "care", "care-1", "room",
    ]);
  });

  it.each(documents)("%s references existing documents, anchors, assets and source paths", (file) => {
    const content = readFileSync(file, "utf8");
    const targets = [
      ...Array.from(content.matchAll(/\[[^\]\n]*\]\(([^\s()]+)\)/g), ([, target]) => target),
      ...Array.from(content.matchAll(/\b(?:href|src)="([^"]+)"/g), ([, target]) => target),
    ];
    for (const target of targets) {
      if (/^[a-z]+:|^\/\//i.test(target)) continue;
      const [path, anchor] = target.split("#");
      const destination = path ? resolve(dirname(file), path) : resolve(file);
      expect(existsSync(destination), `${file}: ${target}`).toBe(true);
      if (anchor && destination.endsWith(".md")) {
        expect(anchorsIn(readFileSync(destination, "utf8")), `${file}: ${target}`).toContain(decodeURIComponent(anchor));
      }
    }
    for (const [, path] of content.matchAll(/`([^`\n]+)`/g)) {
      if (path === "android/local.properties") continue;
      if (path.endsWith(".md")) {
        const relative = path.startsWith("docs/") ? path : resolve(dirname(file), path);
        expect(existsSync(relative), `${file}: ${path}`).toBe(true);
      } else if (/^(src|app|programs|scripts|e2e|android|public)\//.test(path) && !/[\s*{}<>…]|\.\.\./.test(path)) {
        expect(existsSync(path), `${file}: ${path}`).toBe(true);
      }
    }
  });

  it("makes every top-level guide discoverable from the documentation index", () => {
    const index = readFileSync("docs/README.md", "utf8");
    for (const name of readdirSync("docs").filter((name) => name.endsWith(".md") && name !== "README.md")) {
      expect(index, `docs/${name} is absent from the index`).toContain(`](${name}`);
    }
  });

  it("distributes the copyright and license notice for every bundled font family", () => {
    const families = new Set(readdirSync("src/fonts").filter((name) => /\.(woff2|ttf)$/.test(name)).map((name) => name.split("-")[0]));
    for (const family of families) {
      const notice = readFileSync(`src/fonts/${family}.LICENSE.txt`, "utf8");
      expect(notice).toContain("Copyright");
      expect(notice).toContain("SIL OPEN FONT LICENSE Version 1.1");
    }
  });
});
