import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Meteora's SDKs are built on web3.js v1 and Anchor, which the rest of the
 * app never uses (Kit is the one client). They live behind one door,
 * `src/server/coins/`, server-only, and in the scripts that set Pawket's
 * presets up; anywhere else, importing them is an error.
 */
const LEGACY_SOLANA = {
  patterns: [
    {
      group: ["@solana/web3.js", "@coral-xyz/anchor", "@meteora-ag/*", "@solana/spl-token", "bn.js"],
      message: "Meteora's SDKs and web3.js v1 stay in src/server/coins/. Use @solana/kit everywhere else.",
    },
  ],
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["**/*.{ts,tsx,mts,mjs}"], rules: { "no-restricted-imports": ["error", LEGACY_SOLANA] } },
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
