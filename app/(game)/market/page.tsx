import type { Metadata } from "next";
import { Chip, Screen, ScreenBar } from "@/components/pk";
import { MarketScreen } from "@/components/market/market-screen";
import { getPublicEnv } from "@/config/env";

export const metadata: Metadata = {
  title: "Market",
  description: "Pieces for your pets and rooms to live in, for SOL at fixed prices. Looks only, never power.",
};

/**
 * The Market: looks for SOL, at prices Pawket's program fixes for everyone.
 * The screen is the Market's client leaf, since every figure on it depends
 * on the connected wallet's closet.
 */
export default function MarketPage() {
  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Market</h1>
          <p className="caption pk-faint">
            Looks only, never power. Kept in your closet on Solana.
            {getPublicEnv().solanaCluster === "devnet" ? " Prices are in devnet SOL, free from a faucet." : ""}
          </p>
        </div>
        <Chip label="Fixed prices" tone="paper" />
      </ScreenBar>
      <MarketScreen />
    </Screen>
  );
}
