function text(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: a line over 75 octets folds, continuing after a space. */
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

export const reminderTitle = (name: string) => `Look in on ${name}`;
export const reminderNotes = (name: string, url: string) => `${name} is waiting on Pawket. A care a day keeps the streak: ${url}`;

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const pad = (n: number) => String(n).padStart(2, "0");

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
    `SUMMARY:${text(reminderTitle(name))}`,
    `DESCRIPTION:${text(reminderNotes(name, url))}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${text(reminderTitle(name))}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
