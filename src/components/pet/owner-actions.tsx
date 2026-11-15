"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Problem } from "@/components/pk";
import { choosePet } from "@/lib/companion/use-companion";
import { useConnected } from "@/lib/solana/browser-client";

export function OwnerActions({ owner, address, name }: { owner: string; address: string; name: string }) {
  const connected = useConnected();
  const router = useRouter();
  const [opening, startOpening] = useTransition();
  const [selectionFailed, setSelectionFailed] = useState(false);
  if (connected?.account.address !== owner) return null;
  return (
    <div>
    <Button
      label={`Care for ${name}`}
      icon="home"
      tone="sun"
      size="sm"
      busy={opening}
      onClick={() => {
        if (!choosePet(address)) {
          setSelectionFailed(true);
          return;
        }
        setSelectionFailed(false);
        startOpening(() => router.push("/home", { transitionTypes: ["nav-place"] }));
      }}
    />
    {selectionFailed ? <Problem small>This device could not bring {name} home. Free some storage, then try again; your current Home pet is unchanged.</Problem> : null}
    </div>
  );
}
