import { eq } from "drizzle-orm";
import { lines as badgeLines, type Line } from "@/components/display/line-badge";
import { cellOf, type CellState } from "@/lib/geo/cells";
import { bostonShare, regionShares } from "@/lib/geo/regions";
import { getDb } from "@/server/db/client";
import { revealedCells, type profiles } from "@/server/db/schema";
import { mapLines, mapStations, regions } from "./network";
import { stationById, stations } from "./stations";

const isLine = (route: string): route is Line => badgeLines.some((line) => line === route);

// Everything the map home needs for one profile (F2.1–F2.4, F2.7): its cell states, Boston's
// uncovered share, each region's share, and each station's line badges and fog state.
export async function mapData(profile: typeof profiles.$inferSelect) {
  const rows = await getDb()
    .select({ h3: revealedCells.h3, state: revealedCells.state, source: revealedCells.source })
    .from(revealedCells)
    .where(eq(revealedCells.profileId, profile.id));
  const states = new Map<string, CellState>(rows.map((r) => [r.h3, r.state]));
  const home = stationById(profile.homeStationId);
  return {
    cells: [...states],
    share: bostonShare(regions, states),
    regions: regionShares(regions, states),
    home: home ? { lat: home.lat, lon: home.lon } : { lat: 42.3555, lon: -71.0605 },
    firstVisit: rows.every((r) => r.source === "home"),
    stations: [...stations]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({
        id: s.id,
        name: s.name,
        lines: s.routes.filter(isLine),
        uncovered: states.has(cellOf(s)),
      })),
    lines: mapLines,
    mapStations,
  };
}

export type MapData = Awaited<ReturnType<typeof mapData>>;
