import { zone } from "@/lib/time";

// OpenStreetMap opening hours, the common subset (DATA 3.15): "24/7", and rules like
// "Mo-Fr 09:00-20:00; Sa,Su 10:00-16:00", "Fr-Sa 11:00-01:00, Su-Th 11:00-24:00" or "Mo off".
// A later rule replaces earlier ones on the days it names. Anything else (months, sunrise,
// comments, fallbacks) is unknown, and the crawl builder flags it (F10.1).

export type OpenState = "open" | "closed" | "unknown";

const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const dayMinutes = 24 * 60;

type Week = (readonly [number, number][])[];

// "PH" (public holidays) is read and ignored: the crawl builder doesn't know the holidays.
const day = String.raw`(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)`;
const dayPart = String.raw`${day}(?:\s*-\s*${day})?`;
const daySelector = new RegExp(String.raw`^(${dayPart}(?:\s*,\s*${dayPart})*)\s+`);
const span = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;
// Splits "Fr-Sa 10:30-01:00, Su-Th 10:30-24:00" at a comma after a time that starts a new day
// selector, so "Mo, We-Sa 11:30-21:00" stays one rule.
const ruleBreak = new RegExp(
  String.raw`\s*;\s*|(?<=\d)\s*,\s*(?=${dayPart}(?:\s*,\s*${dayPart})*\s+\d)`,
);

const dayIndex = (name: string) => days.findIndex((d) => d === name);

function dayIndexes(selector: string): number[] | null {
  const picked: number[] = [];
  for (const part of selector.split(",")) {
    if (part === "PH") continue;
    const [first, last = first] = part.split("-");
    const from = dayIndex(first);
    const end = dayIndex(last);
    if (from === -1 || end === -1) return null;
    for (let i = from; ; i = (i + 1) % 7) {
      picked.push(i);
      if (i === end) break;
    }
  }
  return picked;
}

function spans(text: string): [number, number][] | null {
  if (text === "off" || text === "closed") return [];
  const out: [number, number][] = [];
  for (const piece of text.split(",")) {
    const m = span.exec(piece.trim());
    if (!m) return null;
    const start = Number(m[1]) * 60 + Number(m[2]);
    let end = Number(m[3]) * 60 + Number(m[4]);
    // OSM writes past-midnight closings as "01:00" or as "25:00".
    if (start >= dayMinutes || end > 2 * dayMinutes || Number(m[2]) > 59 || Number(m[4]) > 59) {
      return null;
    }
    if (end <= start) end += dayMinutes;
    out.push([start, end]);
  }
  return out;
}

/** The week's open spans in minutes from each day's midnight, or null when the text is unknown. */
export function parseHours(text: string): Week | null {
  const trimmed = text.trim();
  if (trimmed === "24/7") return days.map(() => [[0, dayMinutes]]);
  const week: Week = days.map(() => []);
  const rules = trimmed.split(ruleBreak).filter((rule) => rule !== "");
  if (rules.length === 0) return null;
  for (const rule of rules) {
    const selector = daySelector.exec(rule);
    const picked = selector ? dayIndexes(selector[1].replace(/\s+/g, "")) : [0, 1, 2, 3, 4, 5, 6];
    const open = spans(selector ? rule.slice(selector[0].length) : rule);
    if (!picked || !open) return null;
    for (const i of picked) week[i] = open;
  }
  return week;
}

const local = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Whether a spot is open at a moment, in Boston time, from its OSM hours (F10.1). */
export function openAt(hours: string | null, at: Date): OpenState {
  if (hours === null) return "unknown";
  const week = parseHours(hours);
  if (!week) return "unknown";
  const parts = Object.fromEntries(local.formatToParts(at).map((p) => [p.type, p.value]));
  const today = weekdays.indexOf(parts.weekday);
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const yesterday = (today + 6) % 7;
  const open =
    week[today].some(([start, end]) => minute >= start && minute < end) ||
    week[yesterday].some(([, end]) => end > dayMinutes && minute + dayMinutes < end);
  return open ? "open" : "closed";
}
