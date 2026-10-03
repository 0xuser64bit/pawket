"use client";

import { useState } from "react";
import { Button } from "@/components/pk";

/** Share a page — a pet's record, a guild: the phone's share sheet where there is one, else a copied link. */
export function ShareButton({ name, label }: { name: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      label={copied ? "Link copied" : (label ?? `Share ${name}'s record`)}
      icon={copied ? "check" : "out"}
      tone="quiet"
      size="sm"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) {
            await navigator.share({ title: `${name} on Pawket`, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          // Dismissed, or the clipboard was refused: the address bar still has it.
        }
      }}
    />
  );
}
