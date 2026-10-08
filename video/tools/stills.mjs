// Renders chosen frames of the edit as PNGs (one bundle, many stills), for review.
// Usage: node tools/stills.mjs <out-dir> <second> [second …]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [out, ...seconds] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const root = path.resolve(new URL("..", import.meta.url).pathname);
process.chdir(root);
const { default: config } = await import(path.join(root, "node_modules/@remotion/cli/dist/config/index.js")).catch(() => ({ default: null }));
const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  webpackOverride: (c) => ({
    ...c,
    resolve: {
      ...c.resolve,
      alias: {
        ...(c.resolve?.alias ?? {}),
        "next/link": path.join(root, "src/stubs/next-link.tsx"),
        react: path.join(root, "node_modules/react"),
        "react-dom": path.join(root, "node_modules/react-dom"),
        "@app": path.join(root, "../src"),
      },
    },
  }),
});
void config;
const composition = await selectComposition({ serveUrl, id: "Pawket", inputProps: { captions: true } });
for (const s of seconds) {
  const frame = Math.round(Number(s) * 30);
  const output = path.join(out, `t${Number(s).toFixed(1).padStart(6, "0")}.png`);
  await renderStill({ composition, serveUrl, frame, output, inputProps: { captions: true }, scale: 0.5 });
  console.log(output);
}
