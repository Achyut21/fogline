import { describe, expect, it } from "vitest";
import {
  dayTypeOf,
  hourBucketOf,
  parseGtfsTime,
  serviceDateOf,
  serviceDayOrigin,
  serviceTimeToDate,
  toServiceTime,
} from "@/lib/time";

const at = (iso: string) => new Date(iso);

describe("parseGtfsTime", () => {
  it("[F5.1] reads GTFS times of 24:00:00 and later as seconds past the service-day origin", () => {
    expect(parseGtfsTime("24:00:00")).toBe(86_400);
    expect(parseGtfsTime("25:30:00")).toBe(91_800);
    expect(parseGtfsTime("5:07:09")).toBe(18_429);
  });

  it("rejects text that isn't a GTFS time", () => {
    expect(() => parseGtfsTime("25:61:00")).toThrow('Not a GTFS time: "25:61:00"');
    expect(() => parseGtfsTime("noon")).toThrow();
  });
});

describe("service-day origin", () => {
  it("[F5.1] is local midnight on an ordinary day", () => {
    expect(serviceDayOrigin("2026-11-20").toISOString()).toBe("2026-11-20T05:00:00.000Z");
  });

  it("[F5.1] is noon minus 12 hours on DST change days, so later times land on the right clock time", () => {
    expect(serviceDayOrigin("2026-03-08").toISOString()).toBe("2026-03-08T04:00:00.000Z");
    expect(serviceTimeToDate("2026-03-08", parseGtfsTime("08:00:00")).toISOString()).toBe(
      "2026-03-08T12:00:00.000Z",
    );
    expect(serviceDayOrigin("2026-11-01").toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(serviceTimeToDate("2026-11-01", parseGtfsTime("08:00:00")).toISOString()).toBe(
      "2026-11-01T13:00:00.000Z",
    );
  });

  it("[F5.1] places 25:30:00 at 1:30 AM on the next calendar day", () => {
    expect(serviceTimeToDate("2026-11-20", 91_800).toISOString()).toBe("2026-11-21T06:30:00.000Z");
  });

  it("rejects text that isn't a date, and dates that don't exist", () => {
    expect(() => serviceDayOrigin("11/20/2026")).toThrow('Not a service date: "11/20/2026"');
    expect(() => serviceDayOrigin("2026-02-30")).toThrow('Not a service date: "2026-02-30"');
    expect(() => dayTypeOf("2026-13-45")).toThrow('Not a service date: "2026-13-45"');
  });
});

describe("serviceDateOf", () => {
  it("[F5.1] gives moments from midnight to 2:59 AM to the previous service date", () => {
    expect(serviceDateOf(at("2026-11-21T06:30:00Z"))).toBe("2026-11-20");
    expect(serviceDateOf(at("2026-11-21T07:59:59Z"))).toBe("2026-11-20");
    expect(serviceDateOf(at("2026-11-21T08:00:00Z"))).toBe("2026-11-21");
    expect(serviceDateOf(at("2026-11-20T23:30:00Z"))).toBe("2026-11-20");
  });

  it("[F5.1] keeps the cutoff at 3 AM local clock time across both DST changes", () => {
    expect(serviceDateOf(at("2026-03-08T06:30:00Z"))).toBe("2026-03-07");
    expect(serviceDateOf(at("2026-03-08T06:59:59Z"))).toBe("2026-03-07");
    expect(serviceDateOf(at("2026-03-08T07:00:00Z"))).toBe("2026-03-08");
    expect(serviceDateOf(at("2026-03-08T07:30:00Z"))).toBe("2026-03-08");
    expect(serviceDateOf(at("2026-11-01T05:30:00Z"))).toBe("2026-10-31");
    expect(serviceDateOf(at("2026-11-01T06:30:00Z"))).toBe("2026-10-31");
    expect(serviceDateOf(at("2026-11-01T07:59:59Z"))).toBe("2026-10-31");
    expect(serviceDateOf(at("2026-11-01T08:00:00Z"))).toBe("2026-11-01");
  });
});

describe("toServiceTime", () => {
  it("[F5.1] turns 1:30 AM into 25:30:00 of the previous service date", () => {
    expect(toServiceTime(at("2026-11-21T06:30:00Z"))).toEqual({
      serviceDate: "2026-11-20",
      seconds: 91_800,
    });
    expect(toServiceTime(at("2026-03-09T05:30:00Z"))).toEqual({
      serviceDate: "2026-03-08",
      seconds: 91_800,
    });
    expect(toServiceTime(at("2026-11-02T06:30:00Z"))).toEqual({
      serviceDate: "2026-11-01",
      seconds: 91_800,
    });
  });

  it("[F5.1] counts elapsed time, not clock time, on the nights the clocks change", () => {
    expect(toServiceTime(at("2026-03-08T06:30:00Z"))).toEqual({
      serviceDate: "2026-03-07",
      seconds: 91_800,
    });
    expect(toServiceTime(at("2026-11-01T05:30:00Z"))).toEqual({
      serviceDate: "2026-10-31",
      seconds: 91_800,
    });
    expect(toServiceTime(at("2026-11-01T06:30:00Z"))).toEqual({
      serviceDate: "2026-10-31",
      seconds: 95_400,
    });
  });

  it("[F5.1] rounds down, so a moment just before the 3 AM cutoff stays on the previous date", () => {
    expect(toServiceTime(at("2026-11-21T07:59:59.600Z"))).toEqual({
      serviceDate: "2026-11-20",
      seconds: 97_199,
    });
  });

  it("reads an evening plan as seconds on the same service date", () => {
    expect(toServiceTime(at("2026-11-20T23:30:00Z"))).toEqual({
      serviceDate: "2026-11-20",
      seconds: 66_600,
    });
  });
});

describe("dayTypeOf", () => {
  it("[F4.2] sorts service dates into weekday, Saturday and Sunday", () => {
    expect(dayTypeOf("2026-11-20")).toBe("weekday");
    expect(dayTypeOf("2026-11-21")).toBe("saturday");
    expect(dayTypeOf("2026-11-22")).toBe("sunday");
  });

  it("[F4.2] treats 1:30 AM on Sunday as Saturday service", () => {
    expect(dayTypeOf(serviceDateOf(at("2026-11-22T06:30:00Z")))).toBe("saturday");
  });
});

describe("hourBucketOf", () => {
  it("[F4.2] uses one bucket per hour from 5 to 23 and 'late' from 24:00:00", () => {
    expect(hourBucketOf(66_600)).toBe(18);
    expect(hourBucketOf(86_340)).toBe(23);
    expect(hourBucketOf(86_400)).toBe("late");
    expect(hourBucketOf(91_800)).toBe("late");
  });

  it("[F4.2] puts times before 5 AM in the 5 AM bucket", () => {
    expect(hourBucketOf(16_200)).toBe(5);
    expect(hourBucketOf(18_000)).toBe(5);
  });
});
