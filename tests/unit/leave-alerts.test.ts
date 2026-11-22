import { describe, expect, it } from "vitest";
import { dueLeaveAlert } from "@/lib/leave-alerts";

describe("leave-by alerts", () => {
  it("[F5.4] alerts at 20 and then at 5 minutes before leave-by, once each", () => {
    const fired = new Set<number>();
    expect(dueLeaveAlert(45, fired)).toBeNull();
    expect(dueLeaveAlert(19.5, fired)).toBe(20);
    expect(dueLeaveAlert(12, fired)).toBeNull();
    expect(dueLeaveAlert(4.8, fired)).toBe(5);
    expect(dueLeaveAlert(2, fired)).toBeNull();
    expect(dueLeaveAlert(-1, fired)).toBeNull();
  });

  it("[F5.4] opening a plan inside the last 5 minutes alerts once", () => {
    const fired = new Set<number>();
    expect(dueLeaveAlert(3, fired)).toBe(5);
    expect(dueLeaveAlert(2.5, fired)).toBeNull();
  });
});
