"use client";

import { Analytics } from "@vercel/analytics/next";
import { counting, plainUrl } from "@/lib/analytics/events";

export function PawketAnalytics() {
  return <Analytics beforeSend={(event) => (counting() ? { ...event, url: plainUrl(event.url) } : null)} />;
}
