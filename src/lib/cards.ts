import { z } from "zod";
import { grades, placeCategories } from "@/lib/places/types";

export const factMaxLength = 140;

const https = z.url({ protocol: /^https$/ });

/**
 * One station's stop card in `data/station-cards.json` (F3.3, DATA 2.4): a fact from a nearby
 * Wikipedia article, the article's image with its credit, and one nearby all-ages spot.
 */
export const cardSchema = z.object({
  station: z.string(),
  story: z
    .object({
      title: z.string().min(1),
      url: https,
      /** One sentence written by Gemini from the article's intro only. */
      fact: z.string().min(1).max(factMaxLength),
    })
    .nullable(),
  image: z
    .object({
      url: https,
      page: https,
      author: z.string().min(1),
      license: z.string().min(1),
      licenseUrl: z.url().nullable(),
    })
    .nullable(),
  spot: z
    .object({
      id: z.string(),
      name: z.string(),
      category: z.enum(placeCategories),
      grade: z.enum(grades).nullable(),
    })
    .nullable(),
});
export type StationCard = z.infer<typeof cardSchema>;
