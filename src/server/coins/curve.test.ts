// @vitest-environment node
import { PublicKey } from "@solana/web3.js";
import { validateConfigParameters } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { describe, expect, it } from "vitest";
import { COIN_PRESETS, COIN_TERMS, PAWKET_TREASURY } from "@/lib/coins/presets";
import { presetParameters } from "./curve";

/**
 * Each preset as Meteora's Dynamic Bonding Curve takes it, held to the terms
 * the coin's page publishes and to Meteora's own validation of a config —
 * the same check its program makes when the config account is created.
 */
describe("a preset's config", () => {
  it("are valid Dynamic Bonding Curve configs on every cluster, with the published terms", () => {
    const treasury = new PublicKey(PAWKET_TREASURY);
    for (const preset of COIN_PRESETS) {
      for (const cluster of ["devnet", "mainnet-beta"] as const) {
        const params = presetParameters(preset, cluster);
        expect(() => validateConfigParameters({ ...params, leftoverReceiver: treasury })).not.toThrow();
        expect(params.creatorTradingFeePercentage).toBe(COIN_TERMS.founderSharePercent);
        expect(params.tokenDecimal).toBe(COIN_TERMS.decimals);
        expect(params.partnerPermanentLockedLiquidityPercentage + params.creatorPermanentLockedLiquidityPercentage).toBe(100);
        expect(params.partnerLiquidityPercentage + params.creatorLiquidityPercentage).toBe(0);
        expect(params.poolCreationFee.toString()).toBe(COIN_TERMS.launchFeeLamports.toString());
        // Nobody holds a coin the curve did not sell them.
        expect(params.lockedVesting.amountPerPeriod.isZero() && params.lockedVesting.cliffUnlockAmount.isZero()).toBe(true);
      }
    }
  });

  it("graduate on mainnet at no less than the 10 SOL Meteora's keepers migrate", () => {
    for (const preset of COIN_PRESETS) {
      const threshold = Number(presetParameters(preset, "mainnet-beta").migrationQuoteThreshold.toString()) / 1e9;
      expect(threshold, preset.id).toBeGreaterThanOrEqual(10);
      expect(preset.marketCap["mainnet-beta"].graduation / preset.marketCap["mainnet-beta"].start).toBe(preset.rise);
      expect(preset.marketCap.devnet.graduation / preset.marketCap.devnet.start).toBe(preset.rise);
    }
  });

});
