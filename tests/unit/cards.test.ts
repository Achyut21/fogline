import { describe, expect, it } from "vitest";
import type { Place } from "@/lib/places/types";
import { checkFact } from "../../scripts/cards/fact";
import { pickSpot } from "../../scripts/cards/spot";
import { articleUrl, imageCredit, rankArticles, type Article } from "../../scripts/cards/wiki";

const intro = "A".repeat(160);
const article = (pageid: number, title: string, extra: Partial<Article> = {}): Article => ({
  pageid,
  title,
  length: 10_000,
  extract: intro,
  pageprops: {},
  ...extra,
});
const titles = (articles: Article[]) => articles.map((a) => a.title);

describe("choosing the article", () => {
  it("[F3.3] ranks the longest nearby articles that aren't about transit, a list or a disambiguation", () => {
    const articles = [
      article(1, "Park Street station", { length: 90_000 }),
      article(2, "Green Line (MBTA)", { length: 80_000 }),
      article(3, "List of monuments on Boston Common", { length: 70_000 }),
      article(4, "Park Street (disambiguation)", {
        length: 60_000,
        pageprops: { disambiguation: "" },
      }),
      article(5, "Short stub", { length: 50_000, extract: "Too short." }),
      article(6, "Boston Common", { length: 40_000 }),
      article(7, "Brewer Fountain", { length: 9_000 }),
    ];
    expect(titles(rankArticles(articles, new Set()))).toEqual(["Boston Common", "Brewer Fountain"]);
    expect(titles(rankArticles(articles, new Set([6])))).toEqual(["Brewer Fountain"]);
    expect(rankArticles(articles.slice(0, 5), new Set())).toEqual([]);
  });

  it("[F1.5] [F3.3] never picks a bar, a nightclub or a violent event, since cards are the same for everyone", () => {
    const articles = [
      article(1, "Bell in Hand Tavern", { length: 90_000 }),
      article(2, "The Middle East", {
        length: 80_000,
        pageprops: { "wikibase-shortdesc": "Nightclub and music venue in Cambridge" },
      }),
      article(3, "Boston Marathon bombing", { length: 70_000 }),
      article(4, "Old State House", { length: 10_000 }),
    ];
    expect(titles(rankArticles(articles, new Set()))).toEqual(["Old State House"]);
  });

  it("[F3.3] links to the article's page", () => {
    expect(articleUrl("Old South Meeting House")).toBe(
      "https://en.wikipedia.org/wiki/Old_South_Meeting_House",
    );
  });
});

describe("crediting the image", () => {
  const info = (meta: Record<string, string>) => ({
    url: "https://upload.wikimedia.org/a.jpg",
    thumburl: "https://upload.wikimedia.org/thumb/a.jpg",
    descriptionurl: "https://commons.wikimedia.org/wiki/File:A.jpg",
    extmetadata: Object.fromEntries(Object.entries(meta).map(([k, value]) => [k, { value }])),
  });

  it("[F3.3] keeps a freely licensed image with its author and license, as plain text", () => {
    expect(
      imageCredit(
        info({
          Artist:
            '<a href="//commons.wikimedia.org/wiki/User:X">Paul Revere</a>&nbsp;(1735&ndash;1818) &amp; co',
          LicenseShortName: "CC BY-SA 4.0",
          LicenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        }),
      ),
    ).toEqual({
      url: "https://upload.wikimedia.org/thumb/a.jpg",
      page: "https://commons.wikimedia.org/wiki/File:A.jpg",
      author: "Paul Revere (1735–1818) & co",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    });
    expect(
      imageCredit(info({ Artist: "Anon", LicenseShortName: "Public domain" }))?.licenseUrl,
    ).toBe(null);
  });

  it("[F3.3] drops an image that isn't free, is marked non-free, or has no author to credit", () => {
    expect(
      imageCredit(info({ Artist: "X", LicenseShortName: "CC BY-SA 4.0", NonFree: "true" })),
    ).toBeNull();
    expect(imageCredit(info({ Artist: "X", LicenseShortName: "All rights reserved" }))).toBeNull();
    expect(imageCredit(info({ LicenseShortName: "CC BY 2.0" }))).toBeNull();
  });
});

describe("checking the fact", () => {
  const source =
    "Boston Common is a public park in downtown Boston. Dating from 1634, it is the oldest city park in the United States, about 50 acres in size. Its 1,000th tree was planted in 1921.";

  it("[F3.3] accepts one plain sentence of 140 characters or fewer", () => {
    expect(
      checkFact(
        "Boston Common, set aside in 1634, is the oldest city park in the United States.",
        source,
      ),
    ).toBeNull();
    expect(checkFact(`${"a".repeat(140)}.`, source)).toMatch(/141 characters/);
    expect(checkFact(`${"a".repeat(139)}.`, source)).toBeNull();
    expect(checkFact("St. Paul's Church was built near the park.", source)).toBeNull();
    expect(checkFact("The John F. Kennedy Federal Building faces the park.", source)).toBeNull();
    expect(checkFact("Its 1000th tree was planted in 1921.", source)).toBeNull();
  });

  it("[F3.3] refuses two sentences, no period, dashes, exclamations and banned words", () => {
    expect(checkFact("It opened in 1634. It was the first.", source)).toBe(
      "more than one sentence",
    );
    expect(checkFact("It opened in 1634. 50 acres were set aside.", source)).toBe(
      "more than one sentence",
    );
    expect(checkFact("It opened in 1634", source)).toBe("doesn't end with a period");
    expect(checkFact("It opened in 1634 — the first in America.", source)).toMatch(/dash/);
    expect(checkFact("It opened in 1634 – the first in America.", source)).toMatch(/dash/);
    expect(checkFact("It opened in 1634!", source)).toBe("doesn't end with a period");
    expect(checkFact("A vibrant park opened in 1634.", source)).toBe('uses "vibrant"');
    expect(checkFact("The park was utilized as a pasture in 1634.", source)).toBe(
      'uses "utilized"',
    );
    expect(checkFact("", source)).toBe("empty");
  });

  it("[F3.3] refuses a number that isn't in the intro, so the AI adds no facts", () => {
    expect(checkFact("Boston Common was set aside in 1643.", source)).toBe(
      "the number 1643 isn't in the intro",
    );
    expect(checkFact("Boston Common covers about 48 acres.", source)).toBe(
      "the number 48 isn't in the intro",
    );
  });
});

describe("choosing the spot", () => {
  const place = (id: string, category: Place["category"], extra: Partial<Place> = {}): Place => ({
    id,
    name: id,
    category,
    lat: 42.35,
    lon: -71.06,
    stations: [{ id: "place-pktrm", walkM: 200 }],
    address: null,
    ageRule: "all",
    price: null,
    hours: null,
    grade: null,
    ...extra,
  });
  const grade = (letter: "A" | "B" | "C") => ({
    letter,
    date: "2026-10-01",
    points: 0,
    license: "1",
    violations: [],
  });

  it("[F1.5] [F3.3] never shows a 21+ spot, and falls back to an all-ages one", () => {
    const pub = place("pub", "food", { ageRule: "21plus", grade: grade("A") });
    expect(pickSpot([pub], "place-pktrm", 0)).toBeNull();
    const diner = place("diner", "food", {
      grade: grade("C"),
      stations: [{ id: "place-pktrm", walkM: 590 }],
    });
    expect(pickSpot([pub, diner], "place-pktrm", 0)?.id).toBe("diner");
  });

  it("[F3.3] prefers grade A, then ungraded, then B and C, and rotates the category by station", () => {
    const places = [
      place("c-near", "food", { grade: grade("C"), stations: [{ id: "place-pktrm", walkM: 20 }] }),
      place("ungraded", "food", { stations: [{ id: "place-pktrm", walkM: 300 }] }),
      place("a-far", "food", { grade: grade("A"), stations: [{ id: "place-pktrm", walkM: 500 }] }),
      place("cafe", "coffee"),
      place("elsewhere", "food", {
        grade: grade("A"),
        stations: [{ id: "place-dwnxg", walkM: 10 }],
      }),
    ];
    expect(pickSpot(places, "place-pktrm", 0)).toEqual({
      id: "a-far",
      name: "a-far",
      category: "food",
      grade: "A",
    });
    expect(pickSpot(places.slice(0, 2), "place-pktrm", 0)?.id).toBe("ungraded");
    expect(pickSpot(places, "place-pktrm", 1)?.id).toBe("cafe");
    expect(pickSpot(places, "place-pktrm", 2)?.id).toBe("a-far");
  });
});

describe("committed station-cards.json", () => {
  it("[F1.5] [F3.3] has one card per station, each spot all-ages and real", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const { z } = await import("zod");
    const { cardSchema } = await import("@/lib/cards");
    const { stationSchema } = await import("@/lib/gtfs/types");
    const { placeSchema } = await import("@/lib/places/types");
    const read = (name: string): unknown =>
      JSON.parse(readFileSync(path.join(import.meta.dirname, "../../data", name), "utf8"));
    const cards = z.array(cardSchema).parse(read("station-cards.json"));
    const stations = z.array(stationSchema).parse(read("stations.json"));
    const places = new Map(
      z
        .array(placeSchema)
        .parse(read("places.json"))
        .map((p) => [p.id, p]),
    );
    expect(cards.map((c) => c.station).sort()).toEqual(stations.map((s) => s.id).sort());
    for (const card of cards) {
      if (card.spot) expect(places.get(card.spot.id)?.ageRule).toBe("all");
      if (card.image) expect(card.story).not.toBeNull();
    }
    expect(cards.filter((c) => c.story).length).toBeGreaterThan(100);
  });
});
