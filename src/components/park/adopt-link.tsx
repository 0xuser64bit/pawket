"use client";

import { useState } from "react";
import { Button, dismissToast, showToast } from "@/components/pk";

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
          dismissToast("copy-adoption");
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          showToast({ id: "copy-adoption", tone: "risk", title: "The link could not be copied", body: <span style={{ overflowWrap: "anywhere", userSelect: "text" }}>{url}</span> });
        }
      }}
    />
  );
}
