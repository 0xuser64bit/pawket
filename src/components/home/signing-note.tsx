"use client";

import { Icon } from "@/components/pk";
import { NavLink as Link } from "@/components/pk/nav-link";
import { useAndroidApp, useHere } from "@/lib/native/android";
import { deviceFallback, needsSol, useSponsor } from "@/lib/solana/use-send";
import type { PawketWalletState } from "@/lib/wallet/pawket-wallet";

/**
 * For a pet on Solana, said before a tap rather than after one: why this
 * device cannot sign its care right now — not linked here, its link ran
 * out, today's limit used, an empty balance — and where that is fixed.
 * Nothing while it can, so a phone keeps its room.
 */
export function SigningNote({ state, name }: { state: PawketWalletState | null; name: string }) {
  const { here, Here } = useHere();
  const app = useAndroidApp();
  const sponsor = useSponsor();
  if (!state || state.status !== "ready" || state.error) return null;
  // An empty balance matters only while Pawket is not paying, and only once the sponsor has said so.
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
