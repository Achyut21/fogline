import { gridDisk, latLngToCell } from "h3-js";
import type { LatLon } from "./distance";

export const cellResolution = 9;

export type CellState = "seen" | "visited";
export type RevealSource = "home" | "ride" | "checkin" | "puzzle";

const reveals: Record<RevealSource, { k: number; state: CellState }> = {
  home: { k: 1, state: "seen" },
  ride: { k: 1, state: "seen" },
  checkin: { k: 2, state: "visited" },
  puzzle: { k: 1, state: "seen" },
};

export function cellOf(point: LatLon): string {
  return latLngToCell(point.lat, point.lon, cellResolution);
}

export function revealAround(source: RevealSource, point: LatLon) {
  const { k, state } = reveals[source];
  return { cells: gridDisk(cellOf(point), k), state };
}

/** Visited always wins over seen. Returns the new states and the cells that left the fog. */
export function applyReveal(
  current: ReadonlyMap<string, CellState>,
  reveal: { cells: readonly string[]; state: CellState },
) {
  const next = new Map(current);
  const uncovered: string[] = [];
  for (const cell of reveal.cells) {
    const before = next.get(cell);
    if (before === undefined) uncovered.push(cell);
    if (before !== "visited") next.set(cell, reveal.state);
  }
  return { next, uncovered };
}

/** Share of a region's cells that are seen or visited, from 0 to 1. */
export function uncoveredShare(
  states: ReadonlyMap<string, CellState>,
  regionCells: readonly string[],
): number {
  if (regionCells.length === 0) throw new Error("A region needs at least one cell");
  const uncovered = regionCells.filter((cell) => states.has(cell)).length;
  return uncovered / regionCells.length;
}
