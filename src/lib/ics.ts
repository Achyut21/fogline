// A one-event iCalendar file (RFC 5545) with display alarms, for "Remind me" (F5.8). Times are
// written in UTC, so every calendar app shows them in its own time zone.

export type CalendarEvent = {
  uid: string;
  start: Date;
  minutes: number;
  summary: string;
  description: string;
  alarms: { minutesBefore: number; text: string }[];
};

const utc = (at: Date) =>
  at
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

/**
 * Escapes text values: backslash, semicolon, comma and any line break (RFC 5545 3.3.11). Other
 * control characters aren't allowed in TEXT, so they're dropped.
 */
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[\u0000-\u001f\u007f]/g, "");
}

/** Folds a content line at 75 octets, never splitting a UTF-8 character (RFC 5545 3.1). */
export function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function calendarFile(event: CalendarEvent, now: Date): string {
  const end = new Date(event.start.getTime() + event.minutes * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fogline//Leave-by reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(event.start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    ...event.alarms.flatMap((alarm) => [
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(alarm.text)}`,
      `TRIGGER:-PT${alarm.minutesBefore}M`,
      "END:VALARM",
    ]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
