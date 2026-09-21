"use client";

import { useState } from "react";
import { Button } from "@/components/pk";

/**
 * An address always sits beside a copy control. The control says what it did
 * rather than flashing — confirmation is a fact, not a celebration.
 */
export function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // A blocked clipboard is not a failure worth alarming anyone about;
      // the value stays on screen to select by hand.
      setCopied(false);
    }
  }

  return (
    <Button
      label={copied ? "Copied" : label}
      tone="paper"
      icon={copied ? "check" : "copy"}
      onClick={copy}
    />
  );
}
