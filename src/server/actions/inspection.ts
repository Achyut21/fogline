"use server";

import { z } from "zod";
import { data } from "@/server/data";

// A spot's latest inspection (F11.1, F11.2), loaded when someone opens it, so map and plan
// payloads carry only the letter and date. Inspection records are public city data.

export async function spotInspection(id: unknown) {
  const spotId = z.string().min(1).max(80).parse(id);
  const grade = data.places().find((p) => p.id === spotId)?.grade;
  if (!grade) return null;
  return { letter: grade.letter, date: grade.date, violations: grade.violations };
}
