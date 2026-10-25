// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  COIN_CONFIGS,
  COIN_PRESETS,
  coinName,
  coinSymbol,
  feeSplitBps,
  findPreset,
  presetForConfig,
} from "./presets";

describe("guild coin presets", () => {
  it("split every fee three ways, and the three add up to the whole", () => {
    expect(feeSplitBps()).toEqual({ total: 100, meteora: 20, founder: 40, pawket: 40 });
  });

  it("are found by id and by config, and only Pawket's configs count", () => {
    expect(new Set(COIN_PRESETS.map((preset) => preset.id)).size).toBe(COIN_PRESETS.length);
    expect(findPreset("gentle")?.rise).toBe(3);
    expect(findPreset("custom")).toBeUndefined();
    for (const [cluster, configs] of Object.entries(COIN_CONFIGS)) {
      for (const [id, config] of Object.entries(configs ?? {})) {
        expect(presetForConfig(cluster as "devnet", config)).toBe(id);
      }
    }
    expect(presetForConfig("devnet", "11111111111111111111111111111111")).toBeNull();
  });

  it("name a coin within a token's 32 bytes, and tick it from the slug", () => {
    expect(coinName("Sunbeam Club")).toBe("Sunbeam Club Coin");
    const long = coinName("The Very Long Guild Name Of Ours");
    expect(new TextEncoder().encode(long).length).toBeLessThanOrEqual(32);
    expect(long.endsWith(" Coin")).toBe(true);
    expect(coinSymbol("sunbeam-club")).toBe("SUNBEAM");
    expect(coinSymbol("ab-cd")).toBe("ABCD");
    expect(coinSymbol("cloud-nine")).toBe("CLOUD");
  });
});
