"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/pk";
import { useCompanion } from "@/lib/companion/use-companion";
import { useConnected } from "@/lib/solana/browser-client";

/** On your own pet's record, the way home. Anyone else sees the record and nothing to press. */
export function OwnerActions({ owner, address, name }: { owner: string; address: string; name: string }) {
  const connected = useConnected();
  const { choose } = useCompanion();
  const router = useRouter();
  if (connected?.account.address !== owner) return null;
  return (
    <Button
      label={`Care for ${name}`}
      icon="home"
      tone="sun"
      size="sm"
      onClick={() => {
        choose(address);
        router.push("/home");
      }}
    />
  );
}
