import path from "node:path";
import { Config } from "@remotion/cli/config";

// The edit draws Pawket's own pets, paw and icons straight from the app (../src/components/pk).
// Those files run here with this project's React, and the one Next.js import is stubbed.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      "next/link": path.resolve(process.cwd(), "src/stubs/next-link.tsx"),
      react: path.resolve(process.cwd(), "node_modules/react"),
      "react-dom": path.resolve(process.cwd(), "node_modules/react-dom"),
      "@app": path.resolve(process.cwd(), "../src"),
    },
  },
}));
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
