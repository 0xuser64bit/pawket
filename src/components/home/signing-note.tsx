"use client";

import { Icon } from "@/components/pk";
import { NavLink as Link } from "@/components/pk/nav-link";
import { useAndroidApp, useHere } from "@/lib/native/android";
import { deviceFallback, needsSol, useSponsor } from "@/lib/solana/use-send";
import type { PawketWalletState } from "@/lib/wallet/pawket-wallet";

export function SigningNote({ state, name }: { state: PawketWalletState | null; name: string }) {
  const { here, Here } = useHere();
  const app = useAndroidApp();
  const sponsor = useSponsor();
  if (!state || state.status !== "ready" || state.error) return null;
  const why = deviceFallback(state) ?? (sponsor.data && needsSol(state.balance, sponsor.data.available) ? "fund" : null);
  if (why === null) return null;
  const line =
    why === "expired" ? (
      <>
        {Here}&apos;s link ran out. <Link href="/wallet">Link it again</Link> to care for {name} on Solana.
      </>
    ) : why === "limit" ? (
      <>
        {Here} used today&apos;s limit. <Link href="/wallet">Change it</Link>, or care again after midnight UTC.
      </>
    ) : why === "fund" ? (
      <>
        Pawket is not paying fees right now and your Pawket Wallet is empty. <Link href="/wallet">Add a little SOL</Link>{" "}
        to care for {name} on Solana.
      </>
    ) : (
      <>
        {name}&apos;s care on Solana is signed by a linked {app ? "app" : "browser"}. <Link href="/wallet">Link {here}</Link>
      </>
    );
  return (
    <p className="caption pk-faint pk-home__signing">
      <Icon name="bolt" size={14} />
      <span>{line}</span>
    </p>
  );
}
