import { z } from "zod";
import { uncoveredShare, type CellState } from "./cells";

/** A neighborhood of Boston, or Cambridge, Somerville or Brookline as one region (DATA 2.5). */
export const regionSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.enum(["Boston", "Cambridge", "Somerville", "Brookline"]),
  cells: z.array(z.string()).min(1),
});
export type Region = z.infer<typeof regionSchema>;

/** Cells in no region belong to "Beyond", which has no fixed size and so no percentage. */
export const beyond = "beyond";

export function regionIndex(regions: readonly Region[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const region of regions) for (const cell of region.cells) index.set(cell, region.id);
  return index;
}

export function regionOf(index: ReadonlyMap<string, string>, cell: string): string {
  return index.get(cell) ?? beyond;
}

/** Each region's uncovered share, 0 to 1, in the regions' order (F2.4). */
export function regionShares(
  regions: readonly Region[],
  states: ReadonlyMap<string, CellState>,
): { id: string; name: string; share: number }[] {
  return regions.map((r) => ({ id: r.id, name: r.name, share: uncoveredShare(states, r.cells) }));
}

/** The uncovered share of Boston: the union of its neighborhoods (F2.4, DATA 3.8). */
export function bostonShare(
  regions: readonly Region[],
  states: ReadonlyMap<string, CellState>,
): number {
  return uncoveredShare(
    states,
    regions.filter((r) => r.city === "Boston").flatMap((r) => r.cells),
  );
}
