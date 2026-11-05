// @vitest-environment node
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("keeps the patched bigint converter on the safe JS path through the installed Solana dependency graph", () => {
  // A separate process observes module loading before any other test imports
  // the converter. The intercept prevents executing the unsafe native addon
  // if a future dependency upgrade accidentally drops our patch.
  const probe = spawnSync(process.execPath, ["-e", `
    const Module = require('node:module');
    const fromWeb3 = Module.createRequire(require.resolve('@solana/web3.js'));
    const original = Module._load;
    let nativeLoads = 0;
    Module._load = function (name, ...args) {
      if (name === 'bindings') {
        nativeLoads++;
        return () => { throw new Error('Native bigint conversion refused by test'); };
      }
      return original.call(this, name, ...args);
    };
    const converter = fromWeb3('bigint-buffer');
    const bytes = Buffer.alloc(32, 255);
    const value = converter.toBigIntLE(bytes);
    console.log(JSON.stringify({ nativeLoads,
      maximum: value.toString(16),
      roundtrip: converter.toBufferLE(value, 32).equals(bytes),
      littleEndian: converter.toBigIntLE(Buffer.from([1, 2])).toString(),
      bigEndian: converter.toBigIntBE(Buffer.from([1, 2])).toString()
    }));
  `], { encoding: "utf8", timeout: 10_000 });
  expect(probe.status, probe.stderr).toBe(0);
  expect(JSON.parse(probe.stdout)).toEqual({
    nativeLoads: 0, maximum: "f".repeat(64), roundtrip: true,
    littleEndian: "513", bigEndian: "258",
  });
});
