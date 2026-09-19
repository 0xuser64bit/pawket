"use client";

import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient, useRequest } from "@solana/react";
import { useCallback, useEffect } from "react";
import type { AppClient } from "@/lib/solana/browser-client";
import { getPublicEnv } from "@/config/env";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { formatSol } from "@/lib/utils/format";
import { useMounted } from "@/lib/utils/use-mounted";

/** Live SOL balance for the connected account. Null state when disconnected. */
export function BalanceDisplay() {
  const client = useClient<AppClient>();
  const mounted = useMounted();
  const connectedAccount = useConnectedWallet(client);
  const connected = mounted ? connectedAccount : null;
  const env = getPublicEnv();

  const accountAddress = connected ? String(connected.account.address) : null;

  const fetcher = useCallback(async () => {
    if (!accountAddress) throw new Error("No wallet connected.");
    const { value } = await client.rpc
      .getBalance(address(accountAddress))
      .send();
    return value;
  }, [client, accountAddress]);

  const {
    data: balance,
    error,
    status,
    refresh,
  } = useRequest<bigint>(connected ? fetcher : null);

  // A settled transfer changes the balance — refresh without a manual click.
  useEffect(() => {
    const onSettled = () => {
      void refresh();
    };
    window.addEventListener("pawket:transfer-settled", onSettled);
    return () => window.removeEventListener("pawket:transfer-settled", onSettled);
  }, [refresh]);

  if (!connected || !accountAddress) return null;

  const isLoading = status === "fetching";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <p className="text-slate-400">
        Balance:{" "}
        <span className="font-semibold text-slate-100">
          {balance !== undefined
            ? `${formatSol(balance)} SOL`
            : isLoading
              ? "…"
              : "—"}
        </span>
      </p>
      <button
        type="button"
        onClick={() => refresh()}
        disabled={isLoading}
        className="font-medium text-amber-200/90 underline disabled:opacity-50"
      >
        {isLoading ? "Refreshing…" : "Refresh"}
      </button>
      <a
        href={explorerAddressUrl(accountAddress, env.solanaCluster)}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-amber-200/90 underline"
      >
        View in Explorer →
      </a>
      {error ? (
        <p role="alert" className="w-full text-sm font-medium text-rose-300">
          Couldn’t reach the network
          {error instanceof Error && error.message ? `: ${error.message}` : "."}{" "}
          Try Refresh.
        </p>
      ) : null}
    </div>
  );
}
