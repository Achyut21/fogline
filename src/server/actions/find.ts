"use server";

import { AISDKError } from "ai";
import { z } from "zod";
import { log } from "@/lib/log";
import { getDb } from "@/server/db/client";
import { allowSearch, identifyDish, spotsFor, type FoundSpot } from "@/server/find";
import { currentProfile } from "@/server/profile";

// Find it (F14.1) and taste of home (F14.2). The age rule comes from the profile (F1.5, F14.3).

const maxBytes = 5 * 1024 * 1024;
const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const filtersInput = z.object({
  minGrade: z.enum(["A", "B"]).nullable(),
  budget: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
});

export type FindResult =
  | { kind: "spots"; dish: string | null; spots: FoundSpot[] }
  | { kind: "not-food" }
  | { kind: "bad-image" }
  | { kind: "no-profile" }
  | { kind: "busy" }
  | { kind: "unavailable" };

function filtersFrom(form: FormData) {
  const grade = form.get("minGrade");
  const budget = Number(form.get("budget"));
  return filtersInput.parse({
    minGrade: grade === "A" || grade === "B" ? grade : null,
    budget: budget === 1 || budget === 2 || budget === 3 ? budget : null,
  });
}

async function guarded(run: () => Promise<FindResult>): Promise<FindResult> {
  try {
    return await run();
  } catch (e) {
    if (!AISDKError.isInstance(e)) throw e;
    log.error("find: gemini failed", e);
    return { kind: "unavailable" };
  }
}

export async function findFromPhoto(_: FindResult | null, form: FormData): Promise<FindResult> {
  const profile = await currentProfile();
  if (!profile) return { kind: "no-profile" };
  const photo = form.get("photo");
  if (
    !(photo instanceof File) ||
    photo.size === 0 ||
    photo.size > maxBytes ||
    !imageTypes.includes(photo.type)
  ) {
    return { kind: "bad-image" };
  }
  const filters = { ...filtersFrom(form), under21: profile.ageBand !== "21plus" };
  if (!(await allowSearch(getDb(), profile.id))) return { kind: "busy" };
  return guarded(async () => {
    const { food, dish } = await identifyDish(
      new Uint8Array(await photo.arrayBuffer()),
      photo.type,
    );
    if (!food || !dish.trim()) return { kind: "not-food" };
    const spots = await spotsFor(getDb(), dish, filters, profile.homeStationId);
    return { kind: "spots", dish, spots };
  });
}

const queryInput = z.string().trim().min(2).max(60);

export async function tasteOfHome(_: FindResult | null, form: FormData): Promise<FindResult> {
  const profile = await currentProfile();
  if (!profile) return { kind: "no-profile" };
  const query = queryInput.safeParse(form.get("query"));
  if (!query.success) return { kind: "spots", dish: null, spots: [] };
  const filters = { ...filtersFrom(form), under21: profile.ageBand !== "21plus" };
  if (!(await allowSearch(getDb(), profile.id))) return { kind: "busy" };
  return guarded(async () => ({
    kind: "spots",
    dish: null,
    spots: await spotsFor(
      getDb(),
      `${query.data} food`,
      filters,
      profile.homeStationId,
    ),
  }));
}
