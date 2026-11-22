"use server";

import { calendarDateOf } from "@/lib/time";
import { data } from "@/server/data";
import { meetupInput, planMeetup, type MeetupResult } from "@/server/meetup";
import { guessInput, playGuesses, puzzleBoard, type PuzzlePlay } from "@/server/puzzle";

// Server Actions for the prototype's core loop (D-062): fair meetup options with leave-by times,
// and the daily puzzle. Inputs are validated with Zod; results are facts from src/lib.

export async function findMeetup(input: unknown): Promise<MeetupResult> {
  return planMeetup(meetupInput.parse(input), {
    stations: data.stations(),
    graph: data.graph(),
    timetable: data.timetable(),
    places: data.places(),
  });
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
