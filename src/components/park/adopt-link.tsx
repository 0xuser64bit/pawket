"use client";

import { useState } from "react";
import { Button } from "@/components/pk";

/** Copies the adoption link — the one that unfurls as a Blink. */
export function AdoptLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      label={copied ? "Link copied" : "Copy the adoption link"}
      icon={copied ? "check" : "copy"}
      tone="quiet"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard refused: the link is pawket's /adopt page.
        }
      }}
    />
  );
}
