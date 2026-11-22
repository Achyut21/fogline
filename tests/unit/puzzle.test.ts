import { describe, expect, it, onTestFinished, vi } from "vitest";
import {
  checkGuess,
  feedback,
  gameState,
  maxGuesses,
  puzzleFor,
  shareGrid,
  streak,
} from "@/lib/puzzle";
import { addDays, calendarDateOf } from "@/lib/time";

const valid = new Set(["carol", "cocoa", "light", "skate", "hoops", "lilac", "llama", "label"]);

describe("puzzle date", () => {
  it("[F7.1] changes at midnight Eastern, whatever the server's clock zone", () => {
    vi.stubEnv("TZ", "UTC");
    onTestFinished(() => {
      vi.unstubAllEnvs();
    });
    expect(calendarDateOf(new Date("2026-11-22T23:59:59-05:00"))).toBe("2026-11-22");
    expect(calendarDateOf(new Date("2026-11-23T00:00:00-05:00"))).toBe("2026-11-23");
    expect(calendarDateOf(new Date("2026-07-04T23:30:00-04:00"))).toBe("2026-07-04");
    expect(calendarDateOf(new Date("2026-07-05T00:30:00-04:00"))).toBe("2026-07-05");
    expect(calendarDateOf(new Date("2026-03-09T00:30:00-04:00"))).toBe("2026-03-09");
    expect(calendarDateOf(new Date("2026-03-08T00:30:00-05:00"))).toBe("2026-03-08");
    expect(calendarDateOf(new Date("2026-03-08T23:30:00-04:00"))).toBe("2026-03-08");
    expect(calendarDateOf(new Date("2026-11-01T01:30:00-05:00"))).toBe("2026-11-01");
    expect(calendarDateOf(new Date("2026-11-01T23:59:00-05:00"))).toBe("2026-11-01");
  });

  it("[F7.1] gives everyone the event scheduled for the date, and nothing on an empty date", () => {
    const events = [
      { id: "a", date: "2026-11-22", word: "light" },
      { id: "b", date: "2026-11-23", word: "skate" },
    ];
    expect(puzzleFor(events, "2026-11-23")?.id).toBe("b");
    expect(puzzleFor(events, "2026-11-24")).toBeNull();
  });

  it("[F7.6] counts calendar days across months and the DST change", () => {
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("guesses", () => {
  it("[F7.2] accepts only 5-letter words from the list, in any case", () => {
    expect(checkGuess("Carol", valid, [], "light")).toBeNull();
    expect(checkGuess(" carol ", valid, [], "light")).toBeNull();
    expect(checkGuess("caro", valid, [], "light")).toBe("length");
    expect(checkGuess("carols", valid, [], "light")).toBe("length");
    expect(checkGuess("car0l", valid, [], "light")).toBe("length");
    expect(checkGuess("zzzzz", valid, [], "light")).toBe("not-a-word");
  });

  it("[F7.2] allows six guesses and none after the puzzle is solved or lost", () => {
    const five = ["carol", "cocoa", "skate", "hoops", "lilac"];
    expect(checkGuess("label", valid, five, "light")).toBeNull();
    expect(checkGuess("label", valid, [...five, "llama"], "light")).toBe("finished");
    expect(checkGuess("label", valid, ["light"], "light")).toBe("finished");
    expect(maxGuesses).toBe(6);
  });

  it("[F7.2] marks letters correct, present or absent", () => {
    expect(feedback("carol", "coral")).toEqual([
      "correct",
      "present",
      "correct",
      "present",
      "correct",
    ]);
    expect(feedback("skate", "light")).toEqual(["absent", "absent", "absent", "present", "absent"]);
  });

  it("[F7.2] counts a repeated letter only as often as the answer has it", () => {
    expect(feedback("cocoa", "carol")).toEqual([
      "correct",
      "absent",
      "absent",
      "correct",
      "present",
    ]);
    expect(feedback("llama", "label")).toEqual([
      "correct",
      "present",
      "present",
      "absent",
      "absent",
    ]);
    expect(feedback("lilac", "llama")).toEqual([
      "correct",
      "absent",
      "present",
      "present",
      "absent",
    ]);
  });
});

describe("results", () => {
  it("[F7.3] [F7.7] reveals the event when solved or lost, and clears fog only when solved", () => {
    expect(gameState(["carol"], "light")).toEqual({
      status: "playing",
      revealEvent: false,
      revealFog: false,
    });
    expect(gameState(["carol", "Light"], "light")).toEqual({
      status: "solved",
      revealEvent: true,
      revealFog: true,
    });
    const lost = ["carol", "cocoa", "skate", "hoops", "lilac", "llama"];
    expect(gameState(lost, "light")).toEqual({
      status: "failed",
      revealEvent: true,
      revealFog: false,
    });
    expect(gameState([...lost.slice(0, 5), "light"], "light").status).toBe("solved");
    expect(gameState([...lost, "light"], "light").status).toBe("failed");
    expect(shareGrid([...lost, "light"], "light").split("\n")).toHaveLength(6);
  });

  it("[F7.5] shares a grid of squares with one row per guess and no letters", () => {
    const grid = shareGrid(["skate", "lilac", "light"], "light");
    expect(grid).toBe("⬛⬛⬛🟨⬛\n🟩🟩⬛⬛⬛\n🟩🟩🟩🟩🟩");
    expect(grid).not.toMatch(/[a-z]/i);
  });

  const day = (date: string, solved: boolean, guesses = solved ? 3 : 0) => ({
    date,
    solved,
    guesses: Array.from({ length: guesses }, () => "carol"),
  });

  it("[F7.6] counts consecutive solved days, keeping yesterday's streak while today is open", () => {
    const history = [
      day("2026-11-28", true),
      day("2026-11-29", true),
      day("2026-11-30", true),
      day("2026-12-01", true),
    ];
    expect(streak(history, "2026-12-01")).toBe(4);
    expect(streak(history, "2026-12-02")).toBe(4);
    expect(streak([...history, day("2026-12-02", false, 2)], "2026-12-02")).toBe(4);
  });

  it("[F7.6] resets after a missed or failed day", () => {
    const gap = [day("2026-11-28", true), day("2026-11-30", true), day("2026-12-01", true)];
    expect(streak(gap, "2026-12-01")).toBe(2);
    expect(streak(gap, "2026-12-03")).toBe(0);
    const failed = [day("2026-11-30", true), day("2026-12-01", false, maxGuesses)];
    expect(streak(failed, "2026-12-01")).toBe(0);
    expect(streak([], "2026-12-01")).toBe(0);
  });
});
