import { describe, expect, it } from "vitest";
import { reminderIcs } from "./ics";

describe("a daily reminder", () => {
  const at = new Date(2026, 9, 6, 19, 30);
  const ics = reminderIcs({ name: "Pepper", url: "https://pawket-pets.vercel.app/home", at, now: new Date(Date.UTC(2026, 9, 5, 12)) });

  it("is one event that repeats daily, at the player's own clock time", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261006T193000\r\n");
    expect(ics).toContain("RRULE:FREQ=DAILY;COUNT=30\r\n");
    expect(ics).toContain("SUMMARY:Look in on Pepper\r\n");
    expect(ics).toContain("URL:https://pawket-pets.vercel.app/home\r\n");
    expect(ics).toContain("DTSTAMP:20261005T120000Z\r\n");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("escapes a stranger's name and folds long lines", () => {
    const odd = reminderIcs({ name: "Nib, the; brave", url: "https://x.test/home", at });
    expect(odd).toContain("SUMMARY:Look in on Nib\\, the\; brave");
    for (const line of odd.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
