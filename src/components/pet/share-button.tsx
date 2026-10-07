"use client";

import { useState } from "react";
import { Button, dismissToast, showToast } from "@/components/pk";
import { inAndroidApp, shareLink } from "@/lib/native/android";

/** Share a page — a pet's record, a guild: the phone's share sheet where there is one (the Android app's own, there), else a copied link. */
export function ShareButton({ name, label }: { name: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      label={copied ? "Link copied" : (label ?? "Share this record")}
      icon={copied ? "check" : "out"}
      tone="quiet"
      size="sm"
      onClick={async () => {
        const url = window.location.href;
        if (inAndroidApp()) {
          const answer = await shareLink({ url, title: `${name} on Pawket` });
          if (answer.ok) dismissToast("share-page");
          else showToast({ id: "share-page", tone: "risk", title: "The share sheet did not open", body: <span style={{ overflowWrap: "anywhere", userSelect: "text" }}>{url}</span> });
          return;
        }
        try {
          if (navigator.share) {
            await navigator.share({ title: `${name} on Pawket`, url });
            dismissToast("share-page");
            return;
          }
          await navigator.clipboard.writeText(url);
          dismissToast("share-page");
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch (error) {
          if ((error instanceof Error || error instanceof DOMException) && error.name === "AbortError") return;
          showToast({ id: "share-page", tone: "risk", title: "The link could not be shared", body: <span style={{ overflowWrap: "anywhere", userSelect: "text" }}>{url}</span> });
        }
      }}
    />
  );
}
