import { describe, expect, it } from "vitest";
import { data } from "@/server/data";
import { planMeetup, type MeetupInput } from "@/server/meetup";
import { playGuesses, puzzleBoard } from "@/server/puzzle";

const files = () => ({
  stations: data.stations(),
  graph: data.graph(),
  timetable: data.timetable(),
  places: data.places(),
});

const friday = (overrides: Partial<MeetupInput> = {}): MeetupInput => ({
  people: [
    { name: "Priya", station: "place-bucen" },
    { name: "Sam", station: "place-harsq" },
    { name: "Maya", station: "place-mdftf" },
  ],
  startsAt: "2026-11-27T19:00:00-05:00",
  categories: ["food"],
  budget: null,
  minGrade: null,
  under21: true,
  ...overrides,
});

describe("meetup Server Action logic", () => {
  it("[F4.3] [F4.4] [F5.1] gives fair options with each friend's trip and leave-by time", () => {
    const result = planMeetup(friday(), files());
    if (result.kind !== "options") throw new Error(`expected options, got ${result.kind}`);
    expect(result.options.length).toBeGreaterThan(0);
    const [best] = result.options;
    expect(best.people.map((p) => p.name)).toEqual(["Priya", "Sam", "Maya"]);
    const worst = Math.max(...best.people.map((p) => p.minutes));
    expect(best.scoreMinutes).toBeGreaterThanOrEqual(worst);
    expect(best.spots.length).toBeGreaterThan(0);
    expect(best.spots.every((s) => s.category === "food")).toBe(true);
    for (const person of best.people) {
      expect(["train", "no-train-needed", "no-train"]).toContain(person.leaveBy.kind);
    }
  });

  it("[F1.5] keeps 21+ spots out for an under-21 group", () => {
    const result = planMeetup(friday({ categories: ["food", "bar"] }), files());
    if (result.kind !== "options") throw new Error(`expected options, got ${result.kind}`);
    const ids = new Set(result.options.flatMap((o) => o.spots.map((s) => s.id)));
    const adult = data.places().filter((p) => ids.has(p.id) && p.ageRule === "21plus");
    expect(adult).toEqual([]);
  });

  it("[F4.1] reports a station it doesn't know instead of throwing", () => {
    const input = friday({ people: [{ name: "X", station: "place-nowhere" }] });
    expect(planMeetup(input, files())).toEqual({
      kind: "unknown-station",
      station: "place-nowhere",
    });
  });
});

describe("puzzle Server Action logic", () => {
  const events = () => data.events();
  const valid = () => new Set(data.words().words);
  const date = "2026-12-03";

  it("[F7.1] shows today's board without the answer", () => {
    expect(puzzleBoard(events(), date)).toEqual({ date, wordLength: 5, maxGuesses: 6 });
    expect(puzzleBoard(events(), "2030-01-01")).toBeNull();
  });

  it("[F7.2] [F7.3] plays guesses and reveals the event, without its word, once solved", () => {
    const answer = events().find((e) => e.date === date)?.word ?? "";
    const wrong = playGuesses(events(), valid(), date, ["carol"]);
    expect(wrong).toMatchObject({
      kind: "played",
      status: "playing",
      event: null,
      revealFog: false,
    });
    const solved = playGuesses(events(), valid(), date, ["carol", answer.toUpperCase()]);
    if (solved.kind !== "played") throw new Error(`expected played, got ${solved.kind}`);
    expect(solved.status).toBe("solved");
    expect(solved.revealFog).toBe(true);
    expect(solved.event?.date).toBe(date);
    expect(JSON.stringify(solved.event)).not.toContain(`"word"`);
    expect(playGuesses(events(), valid(), date, ["qzxvb"])).toEqual({
      kind: "rejected",
      date,
      error: "not-a-word",
    });
  });

  it("[F7.2] rejects a play whose earlier guess isn't a word, so guesses can't probe letters", () => {
    expect(playGuesses(events(), valid(), date, ["aaaaa", "carol"])).toEqual({
      kind: "rejected",
      date,
      error: "not-a-word",
    });
  });
});
