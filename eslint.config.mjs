import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const LEGACY_SOLANA = {
  patterns: [
    {
      group: ["@solana/web3.js", "@coral-xyz/anchor", "@meteora-ag/*", "@solana/spl-token", "bn.js"],
      message: "Meteora's SDKs and web3.js v1 stay in src/server/coins/. Use @solana/kit everywhere else.",
    },
  ],
};

const BROWSER_ZOD = {
  paths: [{ name: "zod", message: "Import Zod from @/lib/zod in code a page can load: \"zod\" brings all its locales into the browser." }],
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["**/*.{ts,tsx,mts,mjs}"], rules: { "no-restricted-imports": ["error", LEGACY_SOLANA] } },
  {
    files: ["src/components/**", "src/lib/**", "src/config/env.ts"],
    ignores: ["src/lib/zod.ts"],
    rules: { "no-restricted-imports": ["error", { ...LEGACY_SOLANA, ...BROWSER_ZOD }] },
  },
  { files: ["src/server/coins/**", "scripts/**"], rules: { "no-restricted-imports": "off" } },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "target/**",
    "programs/**",
  ]),
]);
