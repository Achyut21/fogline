import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { lines, type Line } from "@/components/display/line-badge";
import { onboarding } from "@/copy";
import { haversineM } from "@/lib/geo/distance";
import { currentProfile } from "@/server/profile";
import { schools } from "@/server/schools";
import { stations } from "@/server/stations";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: onboarding.pageTitle };

const isLine = (route: string): route is Line => lines.some((line) => line === route);

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

export default async function WelcomePage() {
  if (await currentProfile()) redirect("/");
  return <Onboarding schools={choices} allStations={allStations} />;
}
