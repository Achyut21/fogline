import { applyReveal, revealAround, type CellState, type RevealSource } from "@/lib/geo/cells";
import { sampleStations } from "./sample-network";

// Sample data: Maya's map from the design mockups. Home at Boston University Central, one ride to
// Park Street and on to Harvard, check-ins at Harvard Square and Union Square.
const ride = [
  "Kenmore",
  "Hynes Convention Center",
  "Copley",
  "Arlington",
  "Boylston",
  "Park Street",
  "Charles/MGH",
  "Kendall/MIT",
  "Central",
  "Harvard",
];

/** Stops the preview's reveal button clears next, one per press. */
export const nextStops = [
  "Lechmere",
  "Science Park/West End",
  "North Station",
  "Haymarket",
  "Back Bay",
  "Porter",
];

export function stationPoint(name: string) {
  const station = sampleStations.find((s) => s.name === name);
  if (!station) throw new Error(`No sample station named ${name}`);
  return { lat: station.lat, lon: station.lon };
}

export function revealStep(
  states: ReadonlyMap<string, CellState>,
  source: RevealSource,
  point: { lat: number; lon: number },
) {
  return applyReveal(states, revealAround(source, point)).next;
}

export function sampleStates(): Map<string, CellState> {
  let states: Map<string, CellState> = revealStep(
    new Map(),
    "home",
    stationPoint("Boston University Central"),
  );
  for (const name of ride) states = revealStep(states, "ride", stationPoint(name));
  states = revealStep(states, "checkin", { lat: 42.3728, lon: -71.1189 });
  return revealStep(states, "checkin", { lat: 42.3799, lon: -71.0952 });
}
