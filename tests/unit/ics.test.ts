import { describe, expect, it } from "vitest";
import { calendarFile, escapeText, fold } from "@/lib/ics";

describe("calendar file", () => {
  const body = calendarFile(
    {
      uid: "plan.person@fogline",
      start: new Date("2026-11-28T05:14:00Z"),
      minutes: 5,
      summary: "Leave by 12:14 AM",
      description: "Friday dinner, then dessert. Your last train leaves Park Street; at 12:22 AM.",
      alarms: [
        { minutesBefore: 20, text: "Leave in 20 min for your last train." },
        { minutesBefore: 5, text: "Leave in 5 min for your last train." },
      ],
    },
    new Date("2026-11-27T20:00:00Z"),
  );
  const lines = body.split("\r\n");

  it("[F5.8] puts the event at the leave-by time with alarms 20 and 5 minutes before", () => {
    expect(lines).toContain("DTSTART:20261128T051400Z");
    expect(lines).toContain("DTEND:20261128T051900Z");
    expect(lines.filter((l) => l.startsWith("TRIGGER:"))).toEqual([
      "TRIGGER:-PT20M",
      "TRIGGER:-PT5M",
    ]);
    expect(lines.filter((l) => l === "BEGIN:VALARM")).toHaveLength(2);
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(body.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("[F5.8] escapes text and folds long lines at 75 bytes without splitting a character", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const unfolded = body.replace(/\r\n /g, "");
    expect(unfolded).toContain("Friday dinner\\, then dessert.");
    expect(unfolded).toContain("Park Street\\;");
    const folded = fold(`DESCRIPTION:${"é".repeat(60)}`);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(`DESCRIPTION:${"é".repeat(60)}`);
  });
});
