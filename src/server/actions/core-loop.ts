"use server";

import { crawlInput, planCrawl, type CrawlPlan } from "@/server/crawl";
import { data } from "@/server/data";
import { dinnerBeforeInput, planDinnerBefore, type DinnerBeforePlan } from "@/server/dinner-before";
import { currentProfile } from "@/server/profile";
import { meetupInput, planMeetup, type MeetupResult } from "@/server/meetup";

// Server Actions for the prototype's core loop (D-067): fair meetup options with leave-by times,
// crawls and Dinner before. Inputs are validated with Zod; results are facts from src/lib. The
// daily puzzle's actions live in daily.ts, which keeps the six-guess limit on the server.

// The age rule comes from the session's profile, never the client (F1.5). Without a profile the
// rule applies, since the visitor isn't known to be 21+.
export async function findMeetup(input: unknown): Promise<MeetupResult> {
  const viewer = await currentProfile();
  const filters = meetupInput.omit({ under21: true }).parse(input);
  return planMeetup(
    { ...filters, under21: viewer?.ageBand !== "21plus" },
    {
      stations: data.stations(),
      graph: data.graph(),
      timetable: data.timetable(),
      places: data.places(),
    },
  );
}

/** Crawl options (F10.1–F10.3), with the age rule from the session's profile like findMeetup. */
export async function findCrawl(input: unknown): Promise<CrawlPlan> {
  const viewer = await currentProfile();
  const request = crawlInput.omit({ under21: true }).parse(input);
  return planCrawl(
    { ...request, under21: viewer?.ageBand !== "21plus" },
    {
      stations: data.stations(),
      graph: data.graph(),
      timetable: data.timetable(),
      places: data.places(),
    },
  );
}

/** Dinner before a puzzle event (F10.6), with the age rule from the session's profile. */
export async function findDinnerBefore(input: unknown): Promise<DinnerBeforePlan> {
  const viewer = await currentProfile();
  const request = dinnerBeforeInput.omit({ under21: true }).parse(input);
  return planDinnerBefore(
    { ...request, under21: viewer?.ageBand !== "21plus" },
    {
      stations: data.stations(),
      graph: data.graph(),
      timetable: data.timetable(),
      places: data.places(),
      events: data.events(),
    },
  );
}
