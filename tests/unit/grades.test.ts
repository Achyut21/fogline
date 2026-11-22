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
    expect(inspectionPoints(["*"])).toBe(2);
    expect(inspectionPoints(["**"])).toBe(5);
    expect(inspectionPoints(["***"])).toBe(10);
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
    comments: null,
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

  it("[F11.1] counts the same violation twice when the inspector's comments differ", () => {
    const cited = (comments: string) =>
      row({ viol_level: "**", viol_status: "Fail", violdesc: "Cold Holding", comments });
    const [burger] = toEstablishments([
      cited("Chicken at 50F"),
      cited("Rice at 52F"),
      cited("Rice at 52F"),
    ]);
    expect(burger.violations).toHaveLength(2);
    const [blank] = toEstablishments([
      row({ viol_level: "**", viol_status: "Fail", violdesc: "Cold Holding", comments: null }),
      cited("Rice at 52F"),
    ]);
    expect(blank.violations).toHaveLength(1);
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
    expect(normalizeName("Starbucks Coffee No.  822")).toBe("starbucks coffee");
    expect(normalizeName("CinnabonNo.  106694")).toBe("cinnabon");
    expect(normalizeName("Hangover B&B  SpaceNo. 13")).toBe("hangover b and b");
    expect(normalizeName("No. 9 Park")).toBe("no 9 park");
    expect(normalizeName("Baby Cafe - Space No. 8")).toBe("baby cafe");
    expect(normalizeName("Chick-Fil-A (StoreNo. 80845)")).toBe("chick fil a");
    expect(normalizeStreet("Boylston Street")).toBe("boylston st");
    expect(normalizeStreet("BOYLSTON ST")).toBe("boylston st");
    expect(normalizeStreet("Massachusetts Avenue")).toBe("massachusetts ave");
    expect(addressKey({ number: "1301", street: "Boylston Street" })).toBe("1301 boylston st");
  });

  it("[F11.1] spells street suffixes the way the city does on both sides", () => {
    const same = (osm: string, city: string) =>
      expect(addressKey({ number: "2", street: osm })).toBe(
        addressKey({ number: "2", street: city }),
      );
    same("Center Plaza", "CENTER PZ");
    same("Morrissey Boulevard", "MORRISSEY BL");
    same("Seaport Way", "SEAPORT WY");
    same("Long Wharf", "LONG WH");
    same("Jamaicaway Parkway", "JAMAICAWAY PW");
    same("Frontage Highway", "FRONTAGE HW");
    same("Franklin Park", "FRANKLIN PK");
    same("West Broadway", "W BROADWAY");
    same("South Huntington Avenue", "S HUNTINGTON AV");
  });

  it("keeps the words that name a place in particular, not what or where it is", () => {
    expect(distinctiveWords("Warren Towers Dining Hall")).toEqual(["warren", "tower"]);
    expect(distinctiveWords("Joe's on Newbury")).toEqual([]);
    expect(distinctiveWords("Cósmica")).toEqual(["cosmica"]);
  });

  it("[F11.1] accepts the same business under the city's longer name", () => {
    expect(sameBusiness("Warren Towers Dining Hall", "B.U. WARREN TOWER CAFE")).toBe(true);
    expect(sameBusiness("Starbucks", "BREADWINNERS/STARBUCK'S")).toBe(true);
    expect(sameBusiness("Ristorante Limoncello", "LIMONCELLO")).toBe(true);
    expect(sameBusiness("Cósmica", "Cosmica @ the Revolution Hotel")).toBe(true);
    expect(sameBusiness("Taquiera Jalisco", "TAQUERIA JALISCO")).toBe(true);
  });

  it("[F11.4] refuses different businesses that share a building, a street or a generic word", () => {
    expect(sameBusiness("Poe-Lenta", "Blue Ribbon Barbecue")).toBe(false);
    expect(sameBusiness("Peet's Coffee", "Capital One Cafe")).toBe(false);
    expect(sameBusiness("Joe's on Newbury", "STEPHANIE'S ON NEWBURY")).toBe(false);
    expect(sameBusiness("Forest Hills Diner", "Hills Deli")).toBe(false);
    expect(sameBusiness("Caffé Pompei", "Caffe Vittoria")).toBe(false);
  });

  it("[F11.4] needs every distinctive word of the shorter name, not one shared word or a prefix", () => {
    expect(sameBusiness("Monica's Mercato and Salumeria", "MONICA'S TRATTORIA")).toBe(false);
    expect(sameBusiness("Longwood Galleria Food Court", "The Longwood Grille & Bar")).toBe(false);
    expect(sameBusiness("Starbucks", "Star Market Company")).toBe(false);
    expect(sameBusiness("Outtakes at Stetson West", "N.U. Stetson Hall East")).toBe(false);
    expect(sameBusiness("Outtakes at Stetson West", "N.U. Stetson Hall West")).toBe(true);
    expect(sameBusiness("Boston Burger Company", "BOSTON BURGER COMPANY")).toBe(true);
    expect(sameBusiness("Pizza Express", "Burger Express")).toBe(false);
    expect(sameBusiness("Gong Cha", "Gongcha")).toBe(true);
    expect(sameBusiness("Hey Tea", "HEYTEA")).toBe(true);
    expect(sameBusiness("Mario's", "Maria's")).toBe(false);
    expect(sameBusiness("Tasty Burger", "Taste of Thai")).toBe(false);
    expect(sameBusiness("Sorella", "Sorellina")).toBe(false);
    expect(sameBusiness("Royal", "Royale")).toBe(false);
    expect(sameBusiness("B.D. Chilipa", "Chili Bento")).toBe(false);
    expect(sameBusiness("Hokkaido Ramen Santouka", "Hokkaldo Ramen Santouka")).toBe(true);
    expect(sameBusiness("Hokkaido", "Hokkaidoramen")).toBe(false);
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

  const north = (meters: number) => ({ lat: spot.lat + meters / 111_195, lon: spot.lon });

  it("[F11.1] takes the right one of two halls at the same spot", () => {
    const halls = [
      establishment("east", "N.U. Stetson Hall East", { at: spot }),
      establishment("west", "N.U. Stetson Hall West", { at: spot }),
    ];
    const place = { name: "Outtakes at Stetson West", address: null, at: spot };
    expect(matchEstablishment(place, new Map(), halls)?.license).toBe("west");
  });

  it("[F11.1] matches nearby up to 50 m and not past it", () => {
    const place = { name: "Tasty Burger", address: null, at: spot };
    const at = (meters: number) => [establishment("1", "TASTY BURGER", { at: north(meters) })];
    expect(matchEstablishment(place, new Map(), at(49))?.license).toBe("1");
    expect(matchEstablishment(place, new Map(), at(51))).toBeNull();
  });

  it("[F11.4] needs each distinctive word spelled alike to a typo, not merely close", () => {
    expect(sameBusiness("Boston Döner", "Dunkin Donuts")).toBe(false);
    expect(sameBusiness("YGF Malatang", "Manhattan Bagel and Coffee CO")).toBe(false);
    expect(sameBusiness("Dwayne's", "DUANE'S")).toBe(false);
    expect(sameBusiness("Taquiera Jalisco", "TAQUERIA JALISCO")).toBe(true);
  });

  it("[F11.1] accepts a name that adds only generic words to the other", () => {
    expect(sameBusiness("Thai Place", "Thai Place Restaurant")).toBe(true);
    expect(sameBusiness("Hub Pub", "THE HUB PUB")).toBe(true);
    expect(sameBusiness("Grill 23", "GRILL 23 AND BAR")).toBe(true);
    expect(sameBusiness("Dig", "Dig Inn")).toBe(false);
  });

  it("[F11.4] leaves a spot unmatched on a tie between licenses or at an address 2 km off", () => {
    const place = {
      name: "Tasty Burger",
      address: { number: "1301", street: "Boylston Street" },
      at: spot,
    };
    const twins = [
      establishment("1", "TASTY BURGER", { at: north(10) }),
      establishment("2", "TASTY BURGER", { at: north(20) }),
    ];
    expect(matchEstablishment({ ...place, address: null }, new Map(), twins)).toBeNull();
    const otherCity = [
      establishment("1", "TASTY BURGER", {
        at: north(3000),
        address: { number: "1301", street: "BOYLSTON ST" },
      }),
    ];
    expect(matchEstablishment(place, byAddress(otherCity), otherCity)).toBeNull();
    const offGeocode = [
      establishment("1", "TASTY BURGER", {
        at: north(1500),
        address: { number: "1301", street: "BOYLSTON ST" },
      }),
    ];
    expect(matchEstablishment(place, byAddress(offGeocode), [])?.license).toBe("1");
  });

  it("[F11.4] leaves a spot unmatched when no record is close in place and name", () => {
    const nearby = [establishment("1", "Dunkin", { at: spot })];
    expect(
      matchEstablishment({ name: "Tatte Bakery", address: null, at: spot }, new Map(), nearby),
    ).toBeNull();
  });
});
