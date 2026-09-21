"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/pk";

/**
 * The acknowledgement that gates a first token purchase. Both controls are
 * Paper buttons and look alike on purpose; Continue stays unavailable until
 * the line above it has been ticked, and says so rather than going quiet.
 */
export function RiskAcknowledge({ continueHref, backHref }: { continueHref: string; backHref: string }) {
  const [read, setRead] = useState(false);

  return (
    <div>
      <label className="pk-ack">
        <input type="checkbox" checked={read} onChange={(event) => setRead(event.target.checked)} />
        <span className="pk-ack__box" aria-hidden="true">
          {read ? <Icon name="check" size={12} weight={3} /> : null}
        </span>
        <span className="body-sm">
          I have read this and understand Pawket cannot undo a transaction.
        </span>
      </label>

      <div className="pk-row" style={{ gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
        <Link href={backHref} className="pk-btn pk-btn--paper">
          <span>Not now</span>
        </Link>
        {read ? (
          <Link href={continueHref} className="pk-btn pk-btn--paper">
            <span>Continue</span>
          </Link>
        ) : (
          <button type="button" className="pk-btn pk-btn--paper" disabled>
            <span>Continue</span>
          </button>
        )}
      </div>
      {read ? null : (
        <p className="caption pk-faint" style={{ marginTop: "var(--space-2)" }}>
          Tick the line above to continue.
        </p>
      )}
    </div>
  );
}
