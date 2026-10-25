import type { Metadata } from "next";
import { PawketWalletScreen } from "@/components/wallet/pawket-wallet-screen";

export const metadata: Metadata = {
  title: "Pawket Wallet",
  description: "Link this device once and care for your pets on Solana without a prompt each time. Fees come from a balance only you can fill or empty.",
};

export default function PawketWalletPage() {
  return <PawketWalletScreen />;
}
