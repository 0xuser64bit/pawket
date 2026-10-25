import {
  ActivationType,
  BaseFeeMode,
  buildCurveWithMarketCap,
  CollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
  type ConfigParameters,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { COIN_TERMS, type CoinCluster, type CoinPreset } from "@/lib/coins/presets";

export function presetParameters(preset: CoinPreset, cluster: CoinCluster): ConfigParameters {
  const { start, graduation } = preset.marketCap[cluster];
  return buildCurveWithMarketCap({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: COIN_TERMS.decimals as TokenDecimal,
      tokenQuoteDecimal: 9,
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: COIN_TERMS.supply,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: COIN_TERMS.feeBps,
          endingFeeBps: COIN_TERMS.feeBps,
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: COIN_TERMS.founderSharePercent,
      poolCreationFee: Number(COIN_TERMS.launchFeeLamports) / 1e9,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps100,
      migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    },
    liquidityDistribution: {
      partnerLiquidityPercentage: 0,
      partnerPermanentLockedLiquidityPercentage: COIN_TERMS.lockedLiquidityPercent.pawket,
      creatorLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: COIN_TERMS.lockedLiquidityPercent.founder,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    initialMarketCap: start,
    migrationMarketCap: graduation,
  });
}
