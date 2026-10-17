"use client";

import { Analytics } from "@vercel/analytics/next";
import { counting, plainUrl } from "@/lib/analytics/events";

/**
 * Vercel Web Analytics, held to Pawket's own rules before anything leaves
 * the page: nothing at all once the player turns counting off or the browser
 * declines (page views included), and no query, fragment or Solana address
 * in the page address that is counted.
 */
export function PawketAnalytics() {
  return <Analytics beforeSend={(event) => (counting() ? { ...event, url: plainUrl(event.url) } : null)} />;
}
