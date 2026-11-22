import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isLine } from "@/components/display/line-badge";
import { FogFallback } from "@/components/map/fog-fallback";
import { onboarding } from "@/copy";
import type { CellState } from "@/lib/geo/cells";
import { haversineM } from "@/lib/geo/distance";
import { mapLines, mapStations } from "@/server/network";
import { currentProfile } from "@/server/profile";
import { schools } from "@/server/schools";
import { stations } from "@/server/stations";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: onboarding.pageTitle };

// The five stations nearest each campus, nearest first: the home-station step suggests the first.
// "Other" has no campus, so it gets no suggestions; every school can pick any station.
const choices = schools.map((school) => ({
  name: school.name,
  stations:
    "lat" in school
      ? [...stations]
          .sort((a, b) => haversineM(school, a) - haversineM(school, b))
          .slice(0, 5)
          .map((s) => ({ id: s.id, name: s.name, lines: s.routes.filter(isLine) }))
      : [],
}));

const allStations = [...stations]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((s) => ({ id: s.id, name: s.name }));

// The whole city starts under fog; no cell is uncovered before onboarding.
const noCells = new Map<string, CellState>();

export default async function WelcomePage() {
  if (await currentProfile()) redirect("/");
  return (
    <Onboarding
      schools={choices}
      allStations={allStations}
      hero={<FogFallback states={noCells} lines={mapLines} stations={mapStations} />}
    />
  );
}
