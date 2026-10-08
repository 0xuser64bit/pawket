"use client";

import { useState } from "react";
import { Button, Card, Sheet, Stack } from "@/components/pk";
import { inAndroidApp, shareLink } from "@/lib/native/android";

/** Every shared link gets a preview, a native share action, and a reachable copy fallback. */
export function ShareButton({ name, label = "Share this record", url, text, full = false }: {
  name: string; label?: string; url?: string; text?: string; full?: boolean;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [said, setSaid] = useState<string>();
  const [busy, setBusy] = useState(false);
  const title = `${name} on Pawket`;

  async function share() {
    if (!link || busy) return;
    setBusy(true);
    setSaid(undefined);
    try {
      if (inAndroidApp()) {
        const answer = await shareLink({ url: link, title, ...(text ? { text } : {}) });
        if (!answer.ok) setSaid("The share sheet did not open. You can copy the link below.");
      } else if (navigator.share) {
        await navigator.share({ url: link, title, ...(text ? { text } : {}) });
      } else setSaid("Copy the link below and paste it wherever you like.");
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setSaid("The link could not be shared. You can copy it below.");
    } finally { setBusy(false); }
  }

  return <>
    <Button label={label} icon="out" tone="quiet" size="sm" full={full} aria-haspopup="dialog" onClick={() => {
      setSaid(undefined);
      setLink(url ?? window.location.href);
    }} />
    {link ? <Sheet register="room" title={label} onDismiss={() => setLink(null)} foot={(dismiss) => <div className="pk-spread">
      <Button label="Close" tone="ghost" size="sm" onClick={dismiss} />
      <Button label="Share" icon="out" size="sm" disabled={busy} onClick={() => void share()} />
    </div>}>
      <Stack gap={4}>
        <Card><Stack gap={3}>
          <span className="label pk-faint">Pawket · A living companion</span>
          <p className="display-s">{name}</p>
          <p className="body-sm pk-muted">{text ?? "A little company. A story that grows with every visit."}</p>
        </Stack></Card>
        <label className="label" htmlFor="pk-share-url">Share link</label>
        <input id="pk-share-url" className="pk-input" readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
        <Button label="Copy link" tone="quiet" size="sm" icon="copy" onClick={async () => {
          try { await navigator.clipboard.writeText(text ? `${text} ${link}` : link); setSaid("Link copied. Paste it anywhere."); }
          catch { setSaid("Select the link above to copy it. This browser did not copy it automatically."); }
        }} />
        {said ? <p role="status" className="body-sm pk-muted">{said}</p> : null}
      </Stack>
    </Sheet> : null}
  </>;
}
