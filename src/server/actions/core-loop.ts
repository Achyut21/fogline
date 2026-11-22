"use server";

import { calendarDateOf } from "@/lib/time";
import { crawlInput, planCrawl, type CrawlPlan } from "@/server/crawl";
import { data } from "@/server/data";
import { dinnerBeforeInput, planDinnerBefore, type DinnerBeforePlan } from "@/server/dinner-before";
import { currentProfile } from "@/server/profile";
import { meetupInput, planMeetup, type MeetupResult } from "@/server/meetup";
import { guessInput, playGuesses, puzzleBoard, type PuzzlePlay } from "@/server/puzzle";

// Server Actions for the prototype's core loop (D-067): fair meetup options with leave-by times,
// and the daily puzzle. Inputs are validated with Zod; results are facts from src/lib.

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

export async function todaysPuzzle() {
  return puzzleBoard(data.events(), calendarDateOf(new Date()));
}

export async function playPuzzle(input: unknown): Promise<PuzzlePlay> {
  const { guesses } = guessInput.parse(input);
  return playGuesses(
    data.events(),
    new Set(data.words().words),
    calendarDateOf(new Date()),
    guesses,
  );
}
