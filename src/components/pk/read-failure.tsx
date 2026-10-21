"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "./controls";
import { Banner } from "./surfaces";

export function ReadFailure({ body }: { body: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Banner tone="wait" title="Solana did not answer" body={body} action={
      <Button label={pending ? "Reading again…" : "Try again"} disabled={pending} aria-busy={pending} size="sm" tone="quiet" icon="clock" onClick={() => startTransition(() => router.refresh())} />
    } />
  );
}
