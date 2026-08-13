#!/usr/bin/env node
/**
 * Cross-package invariants that TypeScript/Rust compilers cannot see.
 * Failures here mean an agent (or human) drifted a source of truth.
 *
 * Run: pnpm invariants
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

function mustExist(rel) {
  if (!existsSync(resolve(root, rel))) {
    failures.push(`missing required file: ${rel}`);
    return false;
  }
  return true;
}

function expectMatch(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function capture(source, regex, label) {
  const match = source.match(regex);
  if (!match) {
    failures.push(`${label}: pattern not found`);
    return null;
  }
  return match[1];
}

const rust = read('programs/pawket/programs/pawket/src/lib.rs');
const shared = read('packages/shared/src/constants.ts');
const sdk = read('packages/pawket-sdk/src/solanaClient.ts');
const anchorToml = read('programs/pawket/Anchor.toml');
const idlPath = 'programs/pawket/idl/pawket.json';

const rustProgramId = capture(rust, /declare_id!\("([^"]+)"\)/, 'lib.rs declare_id');
const sdkProgramId = capture(sdk, /PAWKET_PROGRAM_ID = '([^']+)'/, 'sdk PAWKET_PROGRAM_ID');
const tomlProgramId = capture(
  anchorToml,
  /\[programs\.localnet\]\s*pawket\s*=\s*"([^"]+)"/,
  'Anchor.toml programs.localnet.pawket',
);

expectMatch('program id rust vs sdk', rustProgramId, sdkProgramId);
expectMatch('program id rust vs Anchor.toml', rustProgramId, tomlProgramId);

if (mustExist(idlPath)) {
  const idl = JSON.parse(read(idlPath));
  expectMatch('program id rust vs committed IDL', rustProgramId, idl.address);

  const expected = {
    adoptPet: 'adopt_pet',
    initializeGameConfig: 'initialize_game_config',
    performCareAction: 'perform_care_action',
  };

  for (const [sdkKey, idlName] of Object.entries(expected)) {
    const discMatch = sdk.match(new RegExp(`${sdkKey}:\\s*\\[([^\\]]+)\\]`));
    if (!discMatch) {
      failures.push(`sdk discriminator for ${sdkKey} not found`);
      continue;
    }
    const sdkDisc = discMatch[1].split(',').map((n) => Number(n.trim()));
    const ix = (idl.instructions ?? []).find((item) => item.name === idlName);
    if (!ix) {
      failures.push(`IDL is missing instruction ${idlName}`);
      continue;
    }
    if (JSON.stringify(sdkDisc) !== JSON.stringify(ix.discriminator)) {
      failures.push(
        `${sdkKey} discriminator drifted (sdk ${JSON.stringify(sdkDisc)} vs idl ${JSON.stringify(ix.discriminator)}). Rebuild + pnpm idl:sync, then update solanaClient.ts.`,
      );
    }
  }
}

function rustConst(name) {
  return capture(rust, new RegExp(`const ${name}[^;]*=\\s*([^;]+);`), `rust ${name}`);
}

function sharedConst(name) {
  return capture(shared, new RegExp(`export const ${name} = ([^;]+);`), `shared ${name}`);
}

function evalNumeric(expr) {
  if (expr == null) return null;
  const cleaned = expr.replace(/_/g, '').trim();
  if (/^[\d\s*+/().-]+$/.test(cleaned)) {
    // eslint-disable-next-line no-eval
    return Function(`"use strict"; return (${cleaned});`)();
  }
  return cleaned;
}

expectMatch(
  'CARE_COOLDOWN_SECONDS',
  evalNumeric(rustConst('CARE_COOLDOWN_SECONDS')),
  evalNumeric(sharedConst('CARE_COOLDOWN_SECONDS')),
);
expectMatch(
  'INITIAL_STAT_VALUE',
  evalNumeric(rustConst('INITIAL_STAT_VALUE')),
  evalNumeric(sharedConst('INITIAL_STAT_VALUE')),
);
expectMatch(
  'XP_PER_CARE_ACTION',
  evalNumeric(rustConst('XP_PER_CARE_ACTION')),
  evalNumeric(sharedConst('XP_PER_CARE_ACTION')),
);

const rustName = evalNumeric(rustConst('MAX_NAME_LEN'));
const schema = read('packages/shared/src/schemas.ts');
const schemaNameMax = capture(
  schema,
  /petNameSchema = z\.string\(\)\.trim\(\)\.min\(2\)\.max\((\d+)\)/,
  'petNameSchema max',
);
expectMatch('MAX_NAME_LEN rust vs schema', rustName, Number(schemaNameMax));

const rustSku = evalNumeric(capture(rust, /const MAX_SKU_LEN: usize = (\d+);/, 'rust MAX_SKU_LEN'));
const sdkSkuMax = capture(sdk, /normalizeSeedString\(sku, 'sku', 2, (\d+)\)/, 'sdk sku max');
expectMatch('MAX_SKU_LEN rust vs sdk PDA cap', rustSku, Number(sdkSkuMax));

if (failures.length) {
  console.error('Pawket invariants failed:\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nSee docs/GUARDRAILS.md and docs/engineering/SOLANA.md.');
  process.exit(1);
}

console.log('Pawket invariants ok.');
console.log(`  program ${rustProgramId}`);
console.log(`  cooldown ${evalNumeric(rustConst('CARE_COOLDOWN_SECONDS'))}s`);
console.log(`  name ≤ ${rustName} bytes · sku ≤ ${rustSku} bytes`);
