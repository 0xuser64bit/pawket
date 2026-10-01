"use client";

import { useState } from "react";
import { Icon } from "@/components/pk";
import { truncateAddress } from "@/lib/utils/format";

/**
 * An address or a signature: a fact, so mono, truncated no shorter than four
 * characters each side, and always beside a copy control. With `href` it
 * also opens on the Explorer.
 */
export function AddressLine({ value, label, href }: { value: string; label: string; href?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="pk-addr">
      <span title={value}>{truncateAddress(value, 4)}</span>
      <button
        type="button"
        className="pk-copy"
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard refused (permissions, an iframe): the full value is in the title.
          }
        }}
      >
        <Icon name={copied ? "check" : "copy"} size={14} />
      </button>
      {href ? (
        <a className="pk-copy" href={href} target="_blank" rel="noreferrer" aria-label={`Open ${label} on the Explorer`}>
          <Icon name="out" size={14} />
        </a>
      ) : null}
    </span>
  );
}
