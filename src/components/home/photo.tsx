"use client";

import { useEffect, useState } from "react";
import type { Address } from "@solana/kit";
import { useConnected } from "@/lib/solana/browser-client";
import { useCloset } from "@/lib/market/use-closet";
import { PHOTO_FRAMES, type PhotoFrameId } from "@/lib/market/frames";
import { Button, Sheet } from "@/components/pk";
import { savePicture, sharePicture, useAndroidApp } from "@/lib/native/android";

/** The tokens a photo is printed in, read from the room the player is in. */
function ink() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    paper: token("--surface", "#fffbf3"),
    edge: token("--edge", "#2a1e14"),
    ink: token("--ink", "#2a1e14"),
    faint: token("--ink-faint", "#6f5f4a"),
    sprout: token("--sprout-text", "#315b35"),
    sun: token("--sun", "#ff8a3d"),
    display: token("--font-display", "serif"),
    mono: token("--font-mono", "monospace"),
  };
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/**
 * The room's picture as a print: the photo in the room's frame shape and
 * ink outline, on the room's own paper, with who is in it and the day under
 * it, and the name of the place it was taken.
 */
export async function printPhoto(shot: string, title: string, line: string, frame?: PhotoFrameId): Promise<string> {
  const image = await load(shot);
  await document.fonts.ready;
  const t = ink();
  const W = 1080;
  const pad = 56;
  const photoW = W - pad * 2;
  const photoH = Math.round((photoW * image.height) / image.width);
  const H = pad + photoH + 230;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = t.paper;
  ctx.fillRect(0, 0, W, H);

  const r = frame === "postcard" || frame === "film" ? 0 : 40;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pad, pad, photoW, photoH, r);
  ctx.clip();
  ctx.drawImage(image, pad, pad, photoW, photoH);
  ctx.restore();
  ctx.lineWidth = frame === "sunshine" || frame === "film" ? 28 : 6;
  ctx.strokeStyle = frame === "sunshine" ? t.sun : frame === "garden" ? t.sprout : t.edge;
  ctx.beginPath();
  ctx.roundRect(pad, pad, photoW, photoH, r);
  ctx.stroke();

  if (frame === "postcard") ctx.strokeRect(pad - 16, pad - 16, photoW + 32, photoH + 32);
  if (frame === "film") {
    ctx.fillStyle = t.paper;
    for (let y = pad + 12; y < pad + photoH - 12; y += 44) {
      ctx.fillRect(pad - 7, y, 14, 22);
      ctx.fillRect(W - pad - 7, y, 14, 22);
    }
  }
  if (frame === "garden") {
    ctx.fillStyle = t.sprout;
    for (const [x, y] of [[pad, pad], [W - pad, pad], [pad, pad + photoH], [W - pad, pad + photoH]]) {
      for (let petal = 0; petal < 5; petal++) {
        const a = petal * Math.PI * 2 / 5;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * 15, y + Math.sin(a) * 15, 11, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  const base = pad + photoH;
  ctx.fillStyle = t.ink;
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 64px ${t.display}`;
  ctx.fillText(title, pad, base + 104, photoW);
  ctx.fillStyle = t.faint;
  ctx.font = `500 28px ${t.mono}`;
  ctx.fillText(line, pad, base + 156, photoW - 220);
  ctx.textAlign = "right";
  ctx.fillStyle = t.sun;
  ctx.font = `600 40px ${t.display}`;
  ctx.fillText("Pawket", W - pad, base + 156);
  return canvas.toDataURL("image/png");
}

/**
 * A photo of the two of you, printed, in a dialog: save it as a file, or
 * hand it to the system's share sheet where there is one. In the Android
 * app, saving puts it in the phone's gallery and sharing opens the phone's
 * share sheet (`src/lib/native/android.ts`). Nothing is sent anywhere by
 * taking it, and nothing is uploaded to share it.
 */
export function PhotoDialog({
  shot,
  title,
  line,
  file,
  onClose,
}: {
  shot: string;
  title: string;
  line: string;
  /** The saved file's name, without the extension. */
  file: string;
  onClose: () => void;
}) {
  const connected = useConnected();
  const closet = useCloset((connected?.account.address as Address | undefined) ?? null);
  const [frame, setFrame] = useState<PhotoFrameId>();
  const available = PHOTO_FRAMES.filter((option) => closet.data?.items.includes(option.item));
  const selected = available.some((option) => option.id === frame) ? frame : undefined;
  const [print, setPrint] = useState<string | null>(null);
  const [said, setSaid] = useState<string>();
  const [handing, setHanding] = useState(false);
  const inApp = useAndroidApp();
  useEffect(() => {
    let alive = true;
    printPhoto(shot, title, line, selected).then(
      (url) => alive && setPrint(url),
      () => alive && setPrint(shot),
    );
    return () => {
      alive = false;
    };
  }, [shot, title, line, selected]);

  /** To the phone: its gallery, or its share sheet. It says what happened, and what did not. */
  async function toPhone(how: "save" | "share") {
    if (!print || handing) return;
    setHanding(true);
    setSaid(how === "save" ? "Saving…" : undefined);
    const answer = how === "save" ? await savePicture(print, file) : await sharePicture(print, file, title);
    setHanding(false);
    if (answer.ok) setSaid(how === "save" ? "Saved to your gallery, in Pictures › Pawket." : undefined);
    else if (answer.reason === "no-target") setSaid("Nothing on this phone can take a picture to share. Save it instead.");
    else setSaid(how === "save" ? "This phone did not save it. Nothing was kept." : "The share sheet did not open. Nothing was sent.");
  }

  async function share() {
    if (!print) return;
    if (inApp) return toPhone("share");
    try {
      const blob = await (await fetch(print)).blob();
      const photo = new File([blob], `${file}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [photo] })) {
        await navigator.share({ files: [photo], title });
        setSaid("Shared.");
      } else setSaid("This browser cannot share a picture. Save it instead.");
    } catch {
      setSaid(undefined);
    }
  }

  return (
    <Sheet
      register="room"
      title={`A photo: ${title}`}
      onDismiss={onClose}
      foot={(dismiss) => (
        <>
          <div className="pk-spread">
            <Button label="Close" tone="ghost" size="sm" onClick={dismiss} />
            <Button label="Share" tone="quiet" size="sm" icon="out" disabled={!print || handing} onClick={() => void share()} />
            {print && inApp ? (
              <Button label="Save the photo" size="sm" disabled={handing} onClick={() => void toPhone("save")} />
            ) : print ? (
              <a href={print} download={`${file}.png`} className="pk-btn pk-btn--sm">
                <span className="pk-btn__label">Save the photo</span>
              </a>
            ) : null}
          </div>
          <p role="status" className="caption pk-faint" style={{ marginTop: said ? "var(--space-2)" : 0 }}>
            {said}
          </p>
        </>
      )}
    >
      {available.length ? <label className="pk-stack label">
        Photo frame
        <select className="pk-input" value={selected ?? ""} onChange={(event) => { setPrint(null); setFrame(event.target.value ? event.target.value as PhotoFrameId : undefined); }}>
          <option value="">Classic · free</option>
          {available.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </label> : null}
      {print ? (
        // A data URL made on this device: there is nothing for the image optimiser to fetch.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={print} alt={`${title}, ${line}`} className="pk-photo__print" />
      ) : (
        <div className="pk-photo__print pk-photo__print--wait" />
      )}
    </Sheet>
  );
}
