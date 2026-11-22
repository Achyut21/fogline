import { z } from "zod";

export const placeCategories = [
  "food",
  "coffee",
  "dessert",
  "bar",
  "club",
  "culture",
  "park",
] as const;
export type PlaceCategory = (typeof placeCategories)[number];

/** Categories where people eat, so the minimum food grade applies (F4.5, F11.5). */
export const gradedCategories: readonly PlaceCategory[] = ["food", "coffee", "dessert"];

export const grades = ["A", "B", "C"] as const;
export type Grade = (typeof grades)[number];

/**
 * A spot from `data/places.json`. `stations` lists every station within 600 m walking, nearest
 * first (D-046). `price` is 1 to 3, or null when OpenStreetMap doesn't say. `grade` is null when
 * no inspection record matches (F11.4).
 */
export const placeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: z.enum(placeCategories),
    lat: z.number(),
    lon: z.number(),
    stations: z.array(z.object({ id: z.string(), walkM: z.number().int().nonnegative() })),
    ageRule: z.enum(["all", "21plus"]),
    price: z.number().int().min(1).max(3).nullable(),
    hours: z.string().nullable(),
    grade: z.object({ letter: z.enum(grades), date: z.iso.date() }).nullable(),
  })
  .refine((place) => !["bar", "club"].includes(place.category) || place.ageRule === "21plus", {
    message: "Bars and clubs are 21+",
  });
export type Place = z.infer<typeof placeSchema>;
