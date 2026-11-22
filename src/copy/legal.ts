// Legal and data lines, worded exactly as docs/COPY.md has them.
export const legal = {
  mbta: "Train data: MBTA. Not affiliated with the MBTA.",
  mapData: "Map data © OpenStreetMap contributors. Tiles by OpenFreeMap.",
  grade: "Unofficial grade from City of Boston inspection records.",
  photo: (author: string, license: string) =>
    `Photo: ${author}, ${license}, via Wikimedia Commons.`,
} as const;
