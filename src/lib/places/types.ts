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

/** Categories that are 21+ by what they are (F1.5, F4.9). */
export const adultCategories: readonly PlaceCategory[] = ["bar", "club"];

/** How far a spot can be from a station to count as near it, in walking meters (F4.5, DATA 3.5). */
export const maxWalkM = 600;

/** Categories where people eat, so the minimum food grade applies (F4.5, F11.5). */
export const gradedCategories: readonly PlaceCategory[] = ["food", "coffee", "dessert"];

export const grades = ["A", "B", "C"] as const;
export type Grade = (typeof grades)[number];

export const violationLevels = ["*", "**", "***"] as const;

/**
 * The latest routine inspection matched to a spot (F11.1, F11.2): its grade, date, points, the
 * city's license number and the violations cited, worst first.
 */
export const inspectionGradeSchema = z.object({
  letter: z.enum(grades),
  date: z.iso.date(),
  points: z.number().int().nonnegative(),
  license: z.string(),
  violations: z.array(z.object({ level: z.enum(violationLevels), text: z.string() })),
});
export type InspectionGrade = z.infer<typeof inspectionGradeSchema>;

/**
 * A spot from `data/places.json`. `stations` lists every station within 600 m walking, nearest
 * first (D-046). `address` is the house number and street when OpenStreetMap has both. `price`
 * is 1 to 3, or null when unknown. `grade` is null when no inspection record matches (F11.4).
 */
export const placeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: z.enum(placeCategories),
    lat: z.number(),
    lon: z.number(),
    stations: z.array(z.object({ id: z.string(), walkM: z.number().int().nonnegative() })),
    address: z.object({ number: z.string(), street: z.string() }).nullable(),
    ageRule: z.enum(["all", "21plus"]),
    price: z.number().int().min(1).max(3).nullable(),
    hours: z.string().nullable(),
    grade: inspectionGradeSchema.nullable(),
  })
  .refine((place) => !adultCategories.includes(place.category) || place.ageRule === "21plus", {
    message: "Bars and clubs are 21+",
  });
export type Place = z.infer<typeof placeSchema>;
