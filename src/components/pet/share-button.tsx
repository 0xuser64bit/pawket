"use client";

import { useState } from "react";
import { Button, Sheet, Stack } from "@/components/pk";
import { inAndroidApp, shareLink } from "@/lib/native/android";

/**
 * A link of Pawket's, opened as a sheet the way a photo is: the card it
 * unfurls as, the link itself, and the ways to pass it on — the phone's (or
 * browser's) share sheet, a copy, a post on X. Nothing is sent by opening
 * it, and cancelling a share says nothing.
 */
export function ShareButton({
  name,
  label = "Share this record",
  url,
  text,
  image = "/opengraph-image",
  full = false,
}: {
  name: string;
  label?: string;
  /** The link; this page when left out. */
  url?: string;
  /** The words that go with it. */
  text?: string;
  /** The card the link unfurls as (its Open Graph image). */
  image?: string;
  full?: boolean;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [said, setSaid] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [card, setCard] = useState<"loading" | "shown" | "missing">("loading");
  const title = `${name} on Pawket`;
  // Known once the sheet is open, after a tap: whether there is a share sheet to hand it to.
  const [canShare, setCanShare] = useState(false);

  async function share() {
    if (!link || busy) return;
    setBusy(true);
    setSaid(undefined);
    try {
      if (inAndroidApp()) {
        const answer = await shareLink({ url: link, title, ...(text ? { text } : {}) });
        if (!answer.ok) setSaid("The share sheet did not open. Copy the link instead.");
      } else {
        await navigator.share({ url: link, title, ...(text ? { text } : {}) });
      }
    } catch (error) {
      // Closing the share sheet is not a failure. Told by name: a DOMException from another realm is no Error here.
      if ((error as { name?: unknown } | null)?.name !== "AbortError") setSaid("The link could not be shared. Copy it instead.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(text ? `${text} ${link}` : link);
      setSaid(undefined);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setSaid("This browser did not copy it. Select the link above and copy it from there.");
    }
  }

  const post = link ? `https://x.com/intent/post?${new URLSearchParams({ text: text ?? title, url: link })}` : "";

  return (
    <>
      <Button
        label={label}
        icon="out"
        tone="quiet"
        size="sm"
        full={full}
        aria-haspopup="dialog"
        onClick={() => {
          setSaid(undefined);
          setCopied(false);
          setCanShare(inAndroidApp() || typeof navigator.share === "function");
          setLink(url ?? window.location.href);
        }}
      />
      {link ? (
        <Sheet
          register="room"
          title={label}
          onDismiss={() => setLink(null)}
          foot={(dismiss) => (
            <>
              <div className="pk-spread">
                <Button label="Close" tone="ghost" size="sm" onClick={dismiss} />
                <Button
                  label={copied ? "Copied" : "Copy link"}
                  icon={copied ? "check" : "copy"}
                  tone={canShare ? "quiet" : undefined}
                  size="sm"
                  onClick={() => void copy()}
                />
                {canShare ? <Button label="Share" icon="out" size="sm" disabled={busy} onClick={() => void share()} /> : null}
              </div>
              <p role="status" className="caption pk-faint" style={{ marginTop: said ? "var(--space-2)" : 0 }}>
                {said}
              </p>
            </>
          )}
        >
          <Stack gap={4}>
            {card === "missing" ? null : (
              // The link's own card, as it unfurls where it is posted. Drawn by Pawket's server; nothing to optimise.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={`How the link appears: ${name}`}
                className={`pk-share__card${card === "loading" ? " pk-share__card--wait" : ""}`}
                onLoad={() => setCard("shown")}
                onError={() => setCard("missing")}
              />
            )}
            {text ? <p className="body-sm">{text}</p> : null}
            <div className="pk-share__link">
              <span className="label pk-faint">The link</span>
              <span className="pk-share__url">{link}</span>
            </div>
            <a className="pk-share__post" href={post} target="_blank" rel="noreferrer">
              Post it on X
            </a>
          </Stack>
        </Sheet>
      ) : null}
    </>
  );
}
