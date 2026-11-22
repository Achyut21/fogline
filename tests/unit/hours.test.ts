import { describe, expect, it } from "vitest";
import { openAt, parseHours } from "@/lib/places/hours";

// Boston times in November (EST, UTC−5). 2026-11-20 is a Friday.
const at = (local: string) => new Date(`${local}-05:00`);

describe("opening hours", () => {
  it("[F10.1] reads day ranges, lists and several spans a day", () => {
    const hours = "Mo-Th 12:00-15:00, 16:00-22:00; Fr-Su 12:00-22:00";
    expect(openAt(hours, at("2026-11-19T13:00:00"))).toBe("open");
    expect(openAt(hours, at("2026-11-19T15:30:00"))).toBe("closed");
    expect(openAt(hours, at("2026-11-20T15:30:00"))).toBe("open");
    expect(openAt("Mo, We-Sa 11:30-21:00; Su 12:00-21:00", at("2026-11-17T12:00:00"))).toBe(
      "closed",
    );
    expect(openAt("Mo, We-Sa 11:30-21:00; Su 12:00-21:00", at("2026-11-16T12:00:00"))).toBe("open");
  });

  it("[F10.1] carries late hours past midnight into the next day", () => {
    const hours = "Fr-Sa 10:30-01:00, Su-Th 10:30-24:00";
    expect(openAt(hours, at("2026-11-21T00:30:00"))).toBe("open");
    expect(openAt(hours, at("2026-11-21T01:30:00"))).toBe("closed");
    expect(openAt(hours, at("2026-11-19T23:59:00"))).toBe("open");
    expect(openAt(hours, at("2026-11-20T00:30:00"))).toBe("closed");
  });

  it("[F10.1] wraps day ranges across Sunday and lets later rules win", () => {
    expect(openAt("Su-Th 11:00 - 23:00; Fr-Sa 11:00-01:00", at("2026-11-22T22:00:00"))).toBe(
      "open",
    );
    expect(openAt("Mo-Su 09:00-17:00; Tu off", at("2026-11-17T10:00:00"))).toBe("closed");
    expect(openAt("24/7", at("2026-11-17T04:00:00"))).toBe("open");
    expect(openAt("Mo-Su 17:00-26:00", at("2026-11-21T01:30:00"))).toBe("open");
    expect(openAt("PH,Mo-Su 10:45-22:00", at("2026-11-17T12:00:00"))).toBe("open");
  });

  it("[F10.1] calls hours it can't read unknown", () => {
    for (const text of [
      "sunrise-sunset",
      '"by appointment"',
      "11:00+",
      "Jun-Oct: Tu-Fr 15:00-19:00",
      'Mo-Fr 05:00-21:00 || "May close earlier"',
    ]) {
      expect(parseHours(text)).toBeNull();
    }
    expect(openAt(null, at("2026-11-17T12:00:00"))).toBe("unknown");
  });
});
