"use client";

import { useState } from "react";
import { Banner, Button } from "@/components/pk";
import { useMounted } from "@/lib/utils/use-mounted";

const KEY = "pawket.tip.home-screen";

function needsTip(): boolean {
  const ua = navigator.userAgent;
  const ios = /iP(hone|od|ad)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!ios) return false;
  const standalone = (navigator as { standalone?: boolean }).standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
  if (standalone) return false;
  try {
    return window.localStorage.getItem(KEY) === null;
  } catch {
    return true;
  }
}

export function HomeScreenTip({ name }: { name: string }) {
  const mounted = useMounted();
  const [gone, setGone] = useState(false);
  if (!mounted || gone || !needsTip()) return null;
  return (
    <Banner
      tone="info"
      title={`Keep ${name} on this iPhone`}
      body={`Safari may clear what a site keeps if you have not visited for a week. Add Pawket to your Home Screen (Share, then Add to Home Screen) and ${name} stays, or keep a copy from Profile.`}
      action={
        <Button
          label="Got it"
          tone="quiet"
          size="sm"
          onClick={() => {
            try {
              window.localStorage.setItem(KEY, "seen");
            } catch {}
            setGone(true);
          }}
        />
      }
    />
  );
}
