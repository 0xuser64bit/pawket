"use client";

import { useEffect, useState } from "react";
import { Button, Sheet, Stack } from "@/components/pk";
import { inAndroidApp, savePicture, shareCard, shareLink } from "@/lib/native/android";

const fileOf = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "pawket"}-on-pawket`;

const dataUrlOf = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

type Card = "loading" | "missing" | { file: File; url: string };

/** Next hashes a dynamic route's OG image name, so read the page's og:image rather than guess a path. */
function pageCard(): string {
  const tag = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;
  if (!tag) return "/opengraph-image";
  const at = new URL(tag, window.location.href);
  return `${at.pathname}${at.search}`;
}

export function ShareButton({
  name,
  label = "Share this record",
  url,
  text,
  image,
  full = false,
}: {
  name: string;
  label?: string;
  url?: string;
  text?: string;
  image?: string;
  full?: boolean;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [said, setSaid] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [card, setCard] = useState<Card>("loading");
  const [cardSrc, setCardSrc] = useState<string | null>(null);
  const title = `${name} on Pawket`;
  const file = fileOf(name);
  const [canShare, setCanShare] = useState(false);
  const [inApp, setInApp] = useState(false);

  // Fetched ahead: navigator.share needs the tap's user activation, which awaiting the card would spend.
  useEffect(() => {
    if (!link || !cardSrc) return;
    let alive = true;
    let shown: string | null = null;
    fetch(cardSrc)
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => {
        if (!alive) return;
        shown = URL.createObjectURL(blob);
        setCard({ file: new File([blob], `${file}.png`, { type: blob.type || "image/png" }), url: shown });
      })
      .catch(() => alive && setCard("missing"));
    return () => {
      alive = false;
      if (shown) URL.revokeObjectURL(shown);
    };
  }, [link, cardSrc, file]);

  const picture = typeof card === "object" ? card.file : null;

  async function share() {
    if (!link || busy) return;
    setBusy(true);
    setSaid(undefined);
    const words = text ?? title;
    try {
      if (inAndroidApp()) {
        let answer = picture ? await shareCard({ data: await dataUrlOf(picture), name: file, title, url: link, text: words }) : null;
        if (!answer || answer.reason === "unknown") answer = await shareLink({ url: link, title, ...(text ? { text } : {}) });
        if (!answer.ok) setSaid("The share sheet did not open. Copy the link instead.");
      } else if (picture && navigator.canShare?.({ files: [picture] })) {
        // With files, some apps drop `url`: the link rides in the text.
        await navigator.share({ files: [picture], title, text: `${words} ${link}` });
      } else {
        await navigator.share({ url: link, title, ...(text ? { text } : {}) });
      }
    } catch (error) {
      // AbortError is a closed sheet. By name: a DOMException from another realm fails instanceof.
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

  async function save() {
    if (!picture || busy) return;
    setBusy(true);
    setSaid("Saving…");
    const answer = await savePicture(await dataUrlOf(picture), file).catch(() => ({ ok: false }));
    setBusy(false);
    setSaid(answer.ok ? "Saved to your gallery, in Pictures › Pawket." : "This phone did not save it. Nothing was kept.");
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
          setInApp(inAndroidApp());
          setCanShare(inAndroidApp() || typeof navigator.share === "function");
          setCard("loading");
          setCardSrc(image ?? pageCard());
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
            {card === "missing" ? null : typeof card === "object" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.url} alt={`How the link appears: ${name}`} className="pk-share__card" />
            ) : (
              <div className="pk-share__card pk-share__card--wait" aria-hidden="true" />
            )}
            {text ? <p className="body-sm">{text}</p> : null}
            <div className="pk-share__link">
              <span className="label pk-faint">The link</span>
              <span className="pk-share__url">{link}</span>
            </div>
            <div className="pk-share__more">
              {typeof card !== "object" ? null : inApp ? (
                <button type="button" className="pk-share__post" disabled={busy} onClick={() => void save()}>
                  Save the picture
                </button>
              ) : (
                <a className="pk-share__post" href={card.url} download={`${file}.png`}>
                  Save the picture
                </a>
              )}
              <a className="pk-share__post" href={post} target="_blank" rel="noreferrer">
                Post it on X
              </a>
            </div>
          </Stack>
        </Sheet>
      ) : null}
    </>
  );
}
