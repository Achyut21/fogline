import { describe, expect, it } from "vitest";
import {
  addressKey,
  distinctiveWords,
  gradeFor,
  inspectionPoints,
  jaroWinkler,
  matchEstablishment,
  normalizeName,
  normalizeStreet,
  sameBusiness,
  type Establishment,
} from "@/lib/grades";
import {
  gradeOf,
  parseAddress,
  parseLocation,
  toEstablishments,
} from "../../scripts/grades/inspections";

describe("grade formula", () => {
  it("[F11.1] scores violations 2, 5 and 10 points by level", () => {
    expect(inspectionPoints([])).toBe(0);
    expect(inspectionPoints(["*", "**", "***"])).toBe(17);
    expect(inspectionPoints(["***", "***", "***"])).toBe(30);
  });

  it("[F11.1] grades A to 13 points, B to 27, C above", () => {
    expect([0, 13, 14, 27, 28, 60].map(gradeFor)).toEqual(["A", "A", "B", "B", "C", "C"]);
  });

  it("[F11.2] keeps the cited violations, worst first, with the license and date", () => {
    expect(
      gradeOf({
        license: "313440",
        name: "1000 Degrees Pizza",
        address: null,
        at: null,
        date: "2026-10-21",
        violations: [
          { level: "*", text: "Clean Cloths Hair Restraint" },
          { level: "***", text: "Cold Holding" },
          { level: "**", text: "Food Contact Surfaces Clean" },
        ],
      }),
    ).toEqual({
      letter: "B",
      date: "2026-10-21",
      points: 17,
      license: "313440",
      violations: [
        { level: "***", text: "Cold Holding" },
        { level: "**", text: "Food Contact Surfaces Clean" },
        { level: "*", text: "Clean Cloths Hair Restraint" },
      ],
    });
  });
});

describe("inspection rows", () => {
  const row = (extra: Partial<Parameters<typeof toEstablishments>[0][number]>) => ({
    licenseno: "1",
    at: "2026-10-21",
    businessname: "Tasty Burger",
    address: "1301  BOYLSTON ST",
    location: "(42.3459, -71.0970)",
    viol_level: null,
    viol_status: null,
    violdesc: null,
    ...extra,
  });

  it("[F11.1] counts only violations cited as failed, once each, per license", () => {
    const [burger] = toEstablishments([
      row({ viol_level: "**", viol_status: "Fail", violdesc: "Cold  Holding" }),
      row({ viol_level: "**", viol_status: "Fail", violdesc: "Cold Holding" }),
      row({ viol_level: "*", viol_status: "Pass", violdesc: "Floors" }),
      row({ viol_level: "1919", viol_status: "Fail", violdesc: "Bad level" }),
    ]);
    expect(burger).toMatchObject({
      license: "1",
      name: "Tasty Burger",
      address: { number: "1301", street: "BOYLSTON ST" },
      at: { lat: 42.3459, lon: -71.097 },
      violations: [{ level: "**", text: "Cold Holding" }],
    });
  });

  it("reads locations and addresses, and drops ones that aren't usable", () => {
    expect(parseLocation("(42.35925954972639, -71.05890048027378)")).toEqual({
      lat: 42.35925954972639,
      lon: -71.05890048027378,
    });
    expect(parseLocation("(0, 0)")).toBeNull();
    expect(parseLocation(null)).toBeNull();
    expect(parseAddress("55  COURT ST")).toEqual({ number: "55", street: "COURT ST" });
    expect(parseAddress("1-3 Brattle Sq")).toEqual({ number: "1-3", street: "Brattle Sq" });
    expect(parseAddress("Logan Airport")).toBeNull();
  });
});

describe("matching inspections to places", () => {
  it("normalizes names and streets the same way on both sides", () => {
    expect(normalizeName("Tasty Burger, Inc.")).toBe("tasty burger");
    expect(normalizeName("Ben & Jerry's LLC")).toBe("ben and jerry s");
    expect(normalizeName("Co")).toBe("co");
    expect(normalizeStreet("Boylston Street")).toBe("boylston st");
    expect(normalizeStreet("BOYLSTON ST")).toBe("boylston st");
    expect(normalizeStreet("Massachusetts Avenue")).toBe("massachusetts ave");
    expect(addressKey({ number: "1301", street: "Boylston Street" })).toBe("1301 boylston st");
  });

  it("keeps the words that name a place in particular, not what or where it is", () => {
    expect(distinctiveWords("Warren Towers Dining Hall")).toEqual(["warren", "tower"]);
    expect(distinctiveWords("Joe's on Newbury")).toEqual([]);
    expect(distinctiveWords("Cósmica")).toEqual(["cosmica"]);
  });

  it("[F11.1] accepts the same business under the city's longer name", () => {
    expect(sameBusiness("Warren Towers Dining Hall", "B.U. WARREN TOWER CAFE", 0.85)).toBe(true);
    expect(sameBusiness("Starbucks", "BREADWINNERS/STARBUCK'S", 0.85)).toBe(true);
    expect(sameBusiness("Ristorante Limoncello", "LIMONCELLO", 0.85)).toBe(true);
    expect(sameBusiness("Cósmica", "Cosmica @ the Revolution Hotel", 0.85)).toBe(true);
    expect(sameBusiness("Taquiera Jalisco", "TAQUERIA JALISCO", 0.85)).toBe(true);
  });

  it("[F11.4] refuses different businesses that share a building, a street or a generic word", () => {
    expect(sameBusiness("Poe-Lenta", "Blue Ribbon Barbecue", 0.85)).toBe(false);
    expect(sameBusiness("Peet's Coffee", "Capital One Cafe", 0.85)).toBe(false);
    expect(sameBusiness("Joe's on Newbury", "STEPHANIE'S ON NEWBURY", 0.85)).toBe(false);
    expect(sameBusiness("Forest Hills Diner", "Hills Deli", 0.85)).toBe(false);
    expect(sameBusiness("Caffé Pompei", "Caffe Vittoria", 0.8)).toBe(false);
  });

  it("scores Jaro-Winkler similarity like the published examples", () => {
    expect(jaroWinkler("martha", "marhta")).toBeCloseTo(0.961, 3);
    expect(jaroWinkler("dwayne", "duane")).toBeCloseTo(0.84, 3);
    expect(jaroWinkler("dixon", "dicksonx")).toBeCloseTo(0.813, 3);
    expect(jaroWinkler("same", "same")).toBe(1);
    expect(jaroWinkler("", "abc")).toBe(0);
    expect(jaroWinkler("abc", "xyz")).toBe(0);
  });

  const establishment = (license: string, name: string, extra: Partial<Establishment> = {}) => ({
    license,
    name,
    address: null,
    at: null,
    ...extra,
  });
  const byAddress = (list: Establishment[]) => {
    const map = new Map<string, Establishment[]>();
    for (const e of list) {
      if (e.address) map.set(addressKey(e.address), [...(map.get(addressKey(e.address)) ?? []), e]);
    }
    return map;
  };
  const spot = { lat: 42.3459, lon: -71.097 };

  it("[F11.1] matches by house number and street when the names are close enough", () => {
    const sameBuilding = [
      establishment("1", "TASTY BURGER", { address: { number: "1301", street: "BOYLSTON ST" } }),
      establishment("2", "SUBWAY", { address: { number: "1301", street: "BOYLSTON ST" } }),
    ];
    const place = {
      name: "Tasty Burger",
      address: { number: "1301", street: "Boylston Street" },
      at: spot,
    };
    expect(matchEstablishment(place, byAddress(sameBuilding), [])?.license).toBe("1");
    const stranger = { ...place, name: "Fenway Park" };
    expect(matchEstablishment(stranger, byAddress(sameBuilding), [])).toBeNull();
  });

  it("[F11.1] falls back to a close name within 50 m", () => {
    const nearby = [
      establishment("near", "Tasty Burger Fenway", { at: { lat: 42.3461, lon: -71.097 } }),
      establishment("far", "Tasty Burger", { at: { lat: 42.35, lon: -71.097 } }),
    ];
    const place = { name: "Tasty Burger", address: null, at: spot };
    expect(matchEstablishment(place, new Map(), nearby)?.license).toBe("near");
  });

  it("[F11.4] leaves a spot unmatched when no record is close in place and name", () => {
    const nearby = [establishment("1", "Dunkin", { at: spot })];
    expect(
      matchEstablishment({ name: "Tatte Bakery", address: null, at: spot }, new Map(), nearby),
    ).toBeNull();
  });
});
