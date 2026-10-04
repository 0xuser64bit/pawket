/**
 * A daily reminder to look in on a pet, as a calendar file: one event,
 * repeating every day at the time the player picks, linking back to Pawket.
 * It lives in the player's own calendar — Pawket keeps no list of who wants
 * reminding, sends nothing, and needs no server for it.
 */

/** iCalendar escapes these in text: backslash, semicolon, comma, newline. */
function text(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets fold onto the next line, which starts with a space (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  for (const char of line) {
    if (new TextEncoder().encode(current + char).length > (out.length ? 74 : 75)) {
      out.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.join("\r\n ");
}

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The calendar file. `at` is the first reminder, in the player's own time
 * (its local hours and minutes are kept, floating, so it rings at the same
 * clock time wherever they are); it repeats daily for `days` days.
 */
export function reminderIcs({ name, url, at, days = 30, now = new Date() }: { name: string; url: string; at: Date; days?: number; now?: Date }): string {
  const local = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}T${pad(at.getHours())}${pad(at.getMinutes())}00`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pawket//Daily reminder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:pawket-${local}-${encodeURIComponent(name)}@pawket`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${local}`,
    "DURATION:PT10M",
    `RRULE:FREQ=DAILY;COUNT=${days}`,
    `SUMMARY:${text(`Look in on ${name}`)}`,
    `DESCRIPTION:${text(`${name} is waiting on Pawket. A care a day keeps the streak: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${text(`Look in on ${name}`)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
