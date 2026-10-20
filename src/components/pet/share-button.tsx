"use client";

import { useEffect, useState } from "react";
import { Button, Sheet, Stack } from "@/components/pk";
import { inAndroidApp, savePicture, shareCard, shareLink } from "@/lib/native/android";

/** The card as a file is called: the name in letters, digits and dashes. */
const fileOf = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "pawket"}-on-pawket`;

/** A picture as a data URL, the one way it crosses to the Android app. */
const dataUrlOf = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

type Card = "loading" | "missing" | { file: File; url: string };

/**
 * The card this page unfurls as: its own Open Graph image, as Next names it —
 * a page under a dynamic segment gets a hashed file name, so no path is
 * guessed — read on this origin, whatever host the tag names.
 */
function pageCard(): string {
  const tag = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;
  if (!tag) return "/opengraph-image";
  const at = new URL(tag, window.location.href);
  return `${at.pathname}${at.search}`;
}

/**
 * A link of Pawket's, opened as a sheet the way a photo is: the card it
 * unfurls as, the link itself, and the ways to pass it on — the phone's (or
 * browser's) share sheet, a copy, the picture, a post on X. Share hands on
 * the card itself with the words and the link, so a chat shows the pet and
 * not a bare address; where a picture cannot go, the link goes alone.
 * Nothing is sent by opening it, and cancelling a share says nothing.
 */
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
  /** The link; this page when left out. */
  url?: string;
  /** The words that go with it. */
  text?: string;
  /** The card the link unfurls as; this page's own Open Graph image when left out. */
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
  // Known once the sheet is open, after a tap: whether there is a share sheet to hand it to.
  const [canShare, setCanShare] = useState(false);
  const [inApp, setInApp] = useState(false);

  // The card is read once the sheet opens — drawn from it, and ready when Share is tapped, since a
  // browser lets a share sheet open only straight from the tap.
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
        // An app from before cards could go with their link does not know the request: the link goes alone.
        if (!answer || answer.reason === "unknown") answer = await shareLink({ url: link, title, ...(text ? { text } : {}) });
        if (!answer.ok) setSaid("The share sheet did not open. Copy the link instead.");
      } else if (picture && navigator.canShare?.({ files: [picture] })) {
        // With a picture, the link rides in the words: some apps keep a picture's words and drop its url.
        await navigator.share({ files: [picture], title, text: `${words} ${link}` });
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

  /** In the app, into the phone's gallery; a browser saves it through the link itself. */
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
                {/* A card still on its way is not waited for: the link goes alone. */}
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
              // The link's own card, as it unfurls where it is posted, drawn by Pawket's server and read once.
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
