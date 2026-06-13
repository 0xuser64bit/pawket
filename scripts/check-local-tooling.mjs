import { execSync } from 'node:child_process';

for (const command of [
  'node --version',
  'pnpm --version',
  'anchor --version',
  'solana --version',
  'rustc --version',
]) {
  try {
    const output = execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
    console.log(`${command}: ${output}`);
  } catch {
    console.log(`${command}: not installed or not on PATH`);
  }
}
