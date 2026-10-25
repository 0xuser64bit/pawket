import { afterEach, beforeEach, expect, it, vi } from "vitest";

const sent = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track: sent }));
import { counting, daysBucket, plainUrl, record, type PawketEvent } from "./events";

const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
beforeEach(() => { window.localStorage.clear(); sent.mockReset(); });
afterEach(() => { Reflect.deleteProperty(nav, "globalPrivacyControl"); Reflect.deleteProperty(nav, "doNotTrack"); vi.restoreAllMocks(); });

it("sends the event's name and its fixed words, nothing else", () => {
  record({ name: "care_saved", where: "browser", action: "feed" });
  expect(sent).toHaveBeenCalledWith("care_saved", { where: "browser", action: "feed" });
});

it("counts nothing once the player turns it off, or when the browser declines", () => {
  window.localStorage.setItem("pawket.counts", "off");
  record({ name: "pet_adopted" });
  expect(counting()).toBe(false);
  window.localStorage.clear();
  Object.defineProperty(nav, "globalPrivacyControl", { value: true, configurable: true });
  record({ name: "pet_adopted" });
  Reflect.deleteProperty(nav, "globalPrivacyControl");
  Object.defineProperty(nav, "doNotTrack", { value: "1", configurable: true });
  record({ name: "pet_adopted" });
  expect(sent).not.toHaveBeenCalled();
});

it("buckets days so a return is visible and a date is not", () => {
  const day = 86_400_000;
  expect([0, day - 1, day, 2 * day, 6 * day, 7 * day, 13 * day, 14 * day, 30 * day].map(daysBucket)).toEqual(["0", "0", "1", "2-6", "2-6", "7-13", "7-13", "14-29", "30+"]);
});

it("keeps every Solana address and query out of a page's address", () => {
  expect(plainUrl("https://pawket.world/pet/EFr1hjEsYCCYqT7XkM3yQaHn6DPw4b4cuWZcV2Lr9Pg8/visit?tab=x#y")).toBe("https://pawket.world/pet/[address]/visit");
  expect(plainUrl("https://pawket.world/guilds/window-seat")).toBe("https://pawket.world/guilds/window-seat");
});

it("can carry nothing that names a player: every property is one of a few fixed words", () => {
  const events: PawketEvent[] = [
    { name: "home_opened", petAge: "30+", sinceCare: "never" },
    { name: "send_outcome", kind: "coin", outcome: "needs-wallet" },
    { name: "device_link_failed", reason: "webview" },
    { name: "round_finished", where: "solana", game: "pairs" },
  ];
  for (const event of events) {
    record(event);
    const [, data] = sent.mock.calls.at(-1)!;
    for (const value of Object.values(data as Record<string, unknown>)) {
      expect(typeof value).toBe("string");
      expect(String(value)).toMatch(/^[a-z0-9+-]{1,16}$/);
    }
  }
});
