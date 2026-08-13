#!/usr/bin/env node
/**
 * Copy the freshly built Anchor IDL into the committed client-facing path.
 *
 *   cd programs/pawket && anchor build
 *   pnpm idl:sync
 *   pnpm invariants
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'programs/pawket/target/idl/pawket.json');
const destDir = resolve(root, 'programs/pawket/idl');
const dest = resolve(destDir, 'pawket.json');

if (!existsSync(src)) {
  console.error(
    'No built IDL at programs/pawket/target/idl/pawket.json. Run `cd programs/pawket && anchor build` first.',
  );
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`Synced IDL → programs/pawket/idl/pawket.json`);
console.log(
  'Next: update packages/pawket-sdk/src/solanaClient.ts if discriminators or accounts changed, then `pnpm invariants`.',
);
