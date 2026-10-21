"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/pk";
import { choosePet } from "@/lib/companion/use-companion";
import { useConnected } from "@/lib/solana/browser-client";

export function OwnerActions({ owner, address, name }: { owner: string; address: string; name: string }) {
  const connected = useConnected();
  const router = useRouter();
  const [opening, startOpening] = useTransition();
  if (connected?.account.address !== owner) return null;
  return (
    <Button
      label={`Care for ${name}`}
      icon="home"
      tone="sun"
      size="sm"
      busy={opening}
      onClick={() => {
        choosePet(address);
        startOpening(() => router.push("/home", { transitionTypes: ["nav-place"] }));
      }}
    />
  );
}
